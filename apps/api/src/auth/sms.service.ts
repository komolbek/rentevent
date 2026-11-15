import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { maskPhone } from '../common/mask-phone';

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
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

@Injectable()
export class SmsService implements OnModuleInit {
  private readonly logger = new Logger(SmsService.name);
  private devOTPLog: DevOTPEntry[] = [];

  onModuleInit(): void {
    if (this.isMockInProduction()) {
      this.logger.error(
        'SMS_PROVIDER is "mock" (or unset) with NODE_ENV=production: no SMS will be sent, OTP codes are not logged or stored. Set SMS_PROVIDER to gateway or eskiz.',
      );
    }
  }

  /** Mock provider in production: OTPs must never be printed or kept. */
  isMockInProduction(): boolean {
    return (
      (process.env.SMS_PROVIDER || 'mock') === 'mock' &&
      process.env.NODE_ENV === 'production'
    );
  }

  getDevOTPLog(): DevOTPEntry[] {
    return [...this.devOTPLog];
  }

  clearDevOTPLog(): void {
    this.devOTPLog.length = 0;
  }

  isMockMode(): boolean {
    return (process.env.SMS_PROVIDER || 'mock') === 'mock' && !this.isMockInProduction();
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

  private async send(phoneNumber: string, message: string): Promise<SMSResult> {
    const provider = process.env.SMS_PROVIDER || 'mock';
    switch (provider) {
      case 'gateway':
        return this.sendGateway(phoneNumber, message);
      case 'eskiz':
        return this.sendEskiz(phoneNumber, message);
      default:
        return this.sendMock(phoneNumber, message);
    }
  }

  private async sendMock(phoneNumber: string, message: string): Promise<SMSResult> {
    if (this.isMockInProduction()) {
      // Safe degradation: nothing is delivered and no code is printed.
      return { success: false, error: 'SMS provider not configured' };
    }
    console.log(`[MOCK SMS] To: ${maskPhone(phoneNumber)} | ${message}`);
    return { success: true, messageId: `mock_${Date.now()}` };
  }

  private async sendGateway(phoneNumber: string, message: string): Promise<SMSResult> {
    const gatewayUrl = process.env.SMS_GATEWAY_URL;
    const apiKey = process.env.SMS_GATEWAY_API_KEY;
    if (!gatewayUrl || !apiKey) {
      return { success: false, error: 'SMS gateway not configured' };
    }
    try {
      const phone = phoneNumber.replace(/^\+/, '');
      const response = await fetch(`${gatewayUrl}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({ phone, message }),
      });
      const data = await response.json();
      if (response.ok && data.status === 'sent') {
        return { success: true, messageId: data.id };
      }
      return { success: false, error: data.errorMessage || 'SMS sending failed' };
    } catch {
      return { success: false, error: 'SMS gateway request failed' };
    }
  }

  private async sendEskiz(phoneNumber: string, message: string): Promise<SMSResult> {
    const token = process.env.ESKIZ_API_TOKEN;
    if (!token) return { success: false, error: 'SMS provider not configured' };
    try {
      const phone = phoneNumber.replace(/^\+/, '');
      const response = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile_phone: phone, message, from: process.env.SMS_SENDER || '4210' }),
      });
      const data = await response.json();
      if (response.ok && data.status === 'waiting') {
        return { success: true, messageId: data.id?.toString() };
      }
      return { success: false, error: data.message || 'SMS sending failed' };
    } catch {
      return { success: false, error: 'SMS sending failed' };
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
