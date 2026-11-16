import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { OtpService } from './otp.service';
import { SessionService } from './session.service';
import { SmsService } from './sms.service';
import { RateLimitService } from '../common/rate-limit.service';
import { SmsQuotaService } from './sms-quota.service';
import { logSmsBlocked } from './sms-log';
import { RateLimitedException, otpBadRequest, smsUnavailable } from './otp-errors';
import { normalizeUzPhone } from '../common/phone';

const INVALID_PHONE = 'Неверный номер телефона';

/** Customer verify-otp limits (same shape as the admin reset limits). */
export const VERIFY_LIMITS = {
  perPhone: { max: 5, windowMs: 15 * 60 * 1000 },
  perIp: { max: 20, windowMs: 15 * 60 * 1000 },
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private otpService: OtpService,
    private sessionService: SessionService,
    private smsService: SmsService,
    private rateLimitService: RateLimitService,
    private smsQuota: SmsQuotaService,
  ) {}

  async sendOtp(rawPhone: unknown, ip: string) {
    const phoneNumber = normalizeUzPhone(rawPhone);
    if (!phoneNumber) throw otpBadRequest(INVALID_PHONE, 'invalid_phone');

    // A test-auth phone never reaches the provider: no SMS, no global budget.
    const isTestPhone = this.otpService.isTestPhone(phoneNumber);

    // Provider outage: answer at once, no row written, no budget used.
    if (!isTestPhone && this.smsService.isCircuitOpen()) {
      logSmsBlocked({ reason: 'breaker_open', purpose: 'login', phone: phoneNumber });
      throw smsUnavailable();
    }

    // Every cap is checked before any is recorded (a rejection burns nothing);
    // the slots are given back below when the SMS could not be sent.
    const reservation = this.smsQuota.reserve(phoneNumber, ip, { noSms: isTestPhone });

    let result;
    try {
      result = await this.otpService.issueAndSend(
        'login',
        phoneNumber,
        (code) => this.smsService.sendOTP(phoneNumber, code),
        { allowTestAuth: true },
      );
    } catch (e) {
      this.smsQuota.refund(reservation);
      throw e;
    }
    if (!result.success) {
      this.smsQuota.refund(reservation);
      throw smsUnavailable();
    }

    return { success: true, message: 'Код отправлен' };
  }

  /**
   * Finds the user for a canonical phone. Rows created before phones were
   * normalized hold whatever the client sent (`998…` without the plus, most
   * often), so those spellings are matched too; the canonical row wins. A
   * legacy row keeps its spelling (no rewrite), so no duplicate is ever created.
   */
  private async findUserByPhone(phoneNumber: string) {
    const digits = phoneNumber.slice(1);
    const matches = await this.prisma.user.findMany({
      where: { phoneNumber: { in: [phoneNumber, digits] } },
    });
    return matches.find((u) => u.phoneNumber === phoneNumber) ?? matches[0] ?? null;
  }

  async verifyOtp(rawPhone: unknown, code: string, deviceId: string, ip: string) {
    const phoneNumber = normalizeUzPhone(rawPhone);
    if (!phoneNumber) throw otpBadRequest(INVALID_PHONE, 'invalid_phone');
    if (typeof code !== 'string') throw otpBadRequest('Неверный код', 'invalid_code');

    // Counters are in-memory per instance (fix plan D7/F18); every attempt counts.
    const phoneLimit = this.rateLimitService.check(
      'otp_verify_phone',
      phoneNumber,
      VERIFY_LIMITS.perPhone.max,
      VERIFY_LIMITS.perPhone.windowMs,
    );
    const ipLimit = this.rateLimitService.check(
      'otp_verify_ip',
      ip,
      VERIFY_LIMITS.perIp.max,
      VERIFY_LIMITS.perIp.windowMs,
    );
    if (!phoneLimit.allowed || !ipLimit.allowed) {
      throw new RateLimitedException(
        Math.max(phoneLimit.retryAfterMs, ipLimit.retryAfterMs),
        'Слишком много запросов. Попробуйте позже.',
      );
    }

    const result = await this.otpService.verify('login', phoneNumber, code);

    if (!result.valid) {
      throw otpBadRequest(
        result.error || 'Неверный код',
        result.reason === 'not_found' ? 'code_expired' : 'invalid_code',
      );
    }

    // Find or create user
    let user = await this.findUserByPhone(phoneNumber);

    if (!user) {
      user = await this.prisma.user.create({
        data: { phoneNumber },
      });
    }

    const token = await this.sessionService.create(user.id, deviceId);

    // Return the user in the same camelCase shape as GET /user/profile so every
    // client sees one consistent User payload across endpoints.
    return {
      success: true,
      token,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  async logout(token: string) {
    await this.sessionService.invalidate(token);
    return { success: true, message: 'Logged out' };
  }
}
