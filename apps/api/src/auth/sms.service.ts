import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { maskPhone } from '../common/mask-phone';

export type SmsProvider = 'mock' | 'gateway';

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** Stable reason when `success` is false: the caller answers 503 `sms_unavailable`. */
  failure?: 'circuit_open' | 'timeout' | 'network' | 'rate_limited' | 'provider_error' | 'not_configured';
}

export interface DevOTPEntry {
  id: string;
  phoneNumber: string;
  code: string;
  type: 'customer_auth' | 'admin_reset';
  message: string;
  createdAt: string;
}

const MAX_DEV_ENTRIES = 50;

/** One provider call may take at most this long (the gateway itself waits up to 30 s for Eskiz). */
export const SMS_TIMEOUT_MS = 8000;
/** Consecutive failures that open the breaker, and for how long it stays open. */
export const BREAKER_THRESHOLD = 5;
export const BREAKER_OPEN_MS = 30_000;

export class SmsConfigError extends Error {}

/**
 * Closed set of providers. Unset or empty means `mock` (dev/test only; production
 * refuses it at boot). Anything else, including `Gateway` or `eskiz `, is a config error.
 */
export function parseSmsProvider(raw: string | undefined): SmsProvider {
  if (raw === undefined || raw === '') return 'mock';
  if (raw === 'mock' || raw === 'gateway') return raw;
  throw new SmsConfigError(
    'SMS_PROVIDER must be exactly "gateway" (production) or "mock" (dev/test only); the direct "eskiz" provider was removed',
  );
}

/** Mock output may carry the code only in these environments. */
function isDevOrTest(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
}

@Injectable()
export class SmsService implements OnModuleInit {
  private readonly logger = new Logger(SmsService.name);
  private devOTPLog: DevOTPEntry[] = [];
  private consecutiveFailures = 0;
  private breakerOpenUntil = 0;

  /** Refuses to boot on a bad config; Railway then keeps the previous deployment. */
  onModuleInit(): void {
    const provider = parseSmsProvider(process.env.SMS_PROVIDER);
    if (process.env.NODE_ENV === 'production') {
      if (provider !== 'gateway') {
        throw new SmsConfigError(
          'SMS_PROVIDER must be "gateway" when NODE_ENV=production (mock or unset would fake "code sent")',
        );
      }
      if (!process.env.SMS_GATEWAY_URL || !process.env.SMS_GATEWAY_API_KEY) {
        throw new SmsConfigError(
          'SMS_GATEWAY_URL and SMS_GATEWAY_API_KEY are required when SMS_PROVIDER=gateway',
        );
      }
    } else if (provider === 'mock' && !isDevOrTest()) {
      this.logger.warn(
        'SMS_PROVIDER is mock and NODE_ENV is not development/test: no SMS is delivered and no code is logged.',
      );
    }
  }

  getDevOTPLog(): DevOTPEntry[] {
    return [...this.devOTPLog];
  }

  clearDevOTPLog(): void {
    this.devOTPLog.length = 0;
  }

  /** Mock provider in an environment where it may expose codes (development/test). */
  isMockMode(): boolean {
    return this.provider() === 'mock' && isDevOrTest();
  }

  /** True while the breaker is open: callers answer 503 without touching the provider. */
  isCircuitOpen(): boolean {
    return Date.now() < this.breakerOpenUntil;
  }

  async sendOTP(phoneNumber: string, code: string): Promise<SMSResult> {
    const message = `RentEvent: tasdiqlash kodi ${code}. Hech kimga aytmang.`;
    if (this.isMockMode()) {
      this.addDevEntry(phoneNumber, code, 'customer_auth', message);
    }
    return this.send(phoneNumber, message);
  }

  async sendAdminOTP(phoneNumber: string, code: string): Promise<SMSResult> {
    const message = `RentEvent: parolni tiklash kodi ${code}. Hech kimga aytmang.`;
    if (this.isMockMode()) {
      this.addDevEntry(phoneNumber, code, 'admin_reset', message);
    }
    return this.send(phoneNumber, message);
  }

  private provider(): SmsProvider | null {
    try {
      return parseSmsProvider(process.env.SMS_PROVIDER);
    } catch {
      return null;
    }
  }

  private async send(phoneNumber: string, message: string): Promise<SMSResult> {
    const provider = this.provider();
    if (provider === 'mock') return this.sendMock(phoneNumber, message);
    if (provider !== 'gateway') {
      return { success: false, error: 'SMS provider not configured', failure: 'not_configured' };
    }
    if (this.isCircuitOpen()) {
      return { success: false, error: 'SMS provider temporarily unavailable', failure: 'circuit_open' };
    }
    const result = await this.sendGateway(phoneNumber, message);
    this.trackBreaker(result);
    return result;
  }

  /** Mock: nothing is delivered. The code is printed only in development/test. */
  private async sendMock(phoneNumber: string, message: string): Promise<SMSResult> {
    if (!isDevOrTest()) {
      return { success: false, error: 'SMS provider not configured', failure: 'not_configured' };
    }
    console.log(`[MOCK SMS] To: ${maskPhone(phoneNumber)} | ${message}`);
    return { success: true, messageId: `mock_${Date.now()}` };
  }

  private async sendGateway(phoneNumber: string, message: string): Promise<SMSResult> {
    const gatewayUrl = process.env.SMS_GATEWAY_URL;
    const apiKey = process.env.SMS_GATEWAY_API_KEY;
    if (!gatewayUrl || !apiKey) {
      return { success: false, error: 'SMS gateway not configured', failure: 'not_configured' };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SMS_TIMEOUT_MS);
    try {
      const phone = phoneNumber.replace(/^\+/, '');
      const response = await fetch(`${gatewayUrl}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({ phone, message }),
        signal: controller.signal,
      });
      if (response.status === 429) {
        return { success: false, error: 'SMS gateway throttled the request', failure: 'rate_limited' };
      }
      if (response.status >= 500 || response.status === 401 || response.status === 403) {
        return { success: false, error: `SMS gateway error ${response.status}`, failure: 'provider_error' };
      }
      const data = await response.json();
      if (response.ok && data?.status === 'sent') {
        return { success: true, messageId: data.id };
      }
      // A rejection of this one request (bad number, template): not a gateway outage.
      return { success: false, error: 'SMS sending failed' };
    } catch (e) {
      const aborted = controller.signal.aborted || (e as Error)?.name === 'AbortError';
      return aborted
        ? { success: false, error: 'SMS gateway timed out', failure: 'timeout' }
        : { success: false, error: 'SMS gateway request failed', failure: 'network' };
    } finally {
      clearTimeout(timer);
    }
  }

  /** Outage-type failures count toward the breaker; one success closes it. */
  private trackBreaker(result: SMSResult): void {
    if (result.success) {
      this.consecutiveFailures = 0;
      this.breakerOpenUntil = 0;
      return;
    }
    if (!result.failure) return; // request-specific rejection, not an outage
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= BREAKER_THRESHOLD) {
      this.breakerOpenUntil = Date.now() + BREAKER_OPEN_MS;
      this.logger.error(
        `SMS gateway failed ${this.consecutiveFailures} times in a row; answering 503 for ${BREAKER_OPEN_MS / 1000} s`,
      );
    }
  }

  private addDevEntry(phoneNumber: string, code: string, type: DevOTPEntry['type'], message: string) {
    this.devOTPLog.unshift({
      id: `dev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      phoneNumber,
      code,
      type,
      message,
      createdAt: new Date().toISOString(),
    });
    if (this.devOTPLog.length > MAX_DEV_ENTRIES) {
      this.devOTPLog.length = MAX_DEV_ENTRIES;
    }
  }
}
