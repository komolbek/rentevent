import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { maskPhone } from '../common/mask-phone';
import * as crypto from 'crypto';
import type { SMSResult } from './sms.service';
import { TestAuthConfigError, parseTestAuthConfig } from './test-auth';

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 3;

@Injectable()
export class OtpService implements OnModuleInit {
  private readonly logger = new Logger(OtpService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Refuses to boot on a bad test-auth config, or when a test phone belongs to
   * a staff account (the fixed code would be a back door into admin reset).
   * Railway then keeps the previous deployment.
   */
  async onModuleInit(): Promise<void> {
    const config = parseTestAuthConfig();
    if (!config.enabled) return;
    if (process.env.NODE_ENV !== 'production') return;

    const variants = config.phones.flatMap((p) => [p, p.slice(1)]);
    const staff = await this.prisma.staff.findMany({
      where: { phoneNumber: { in: variants } },
      select: { phoneNumber: true },
    });
    if (staff.length > 0) {
      throw new TestAuthConfigError(
        `TEST_PHONE_NUMBERS contains a staff phone (${maskPhone(staff[0].phoneNumber)}); remove it`,
      );
    }
    this.logger.warn(
      `TEST AUTH IS ACTIVE IN PRODUCTION for ${config.phones.map(maskPhone).join(', ')}: a fixed code logs in, no SMS is sent. Turn it off after App Review (docs/ops/app-review-account.md).`,
    );
  }

  /** True when test-auth is switched on (`ENABLE_TEST_AUTH=true`). */
  isTestAuthEnabled(): boolean {
    return process.env.ENABLE_TEST_AUTH === 'true';
  }

  /**
   * True when `phone` (canonical `+998…`) is a test phone. Customer login only:
   * callers pass the admin reset flow no `allowTestAuth`, so a staff phone in
   * the list still gets a random code and the real SMS. A bad config fails closed.
   */
  isTestPhone(phone: string): boolean {
    if (!this.isTestAuthEnabled()) return false;
    try {
      return parseTestAuthConfig().phones.includes(phone);
    } catch {
      return false;
    }
  }

  /**
   * Stores a new code, sends it with `send`, and only when the send succeeds
   * deletes the phone's older codes. On failure the new row is deleted and the
   * previous valid code keeps working. The result of `send` is returned as is.
   * With `allowTestAuth` (customer login only) a test phone gets the fixed code
   * and `send` is not called: no SMS leaves the server.
   */
  async issueAndSend(
    phoneNumber: string,
    send: (code: string) => Promise<SMSResult>,
    opts: { allowTestAuth?: boolean } = {},
  ): Promise<SMSResult> {
    const testCode =
      opts.allowTestAuth && this.isTestPhone(phoneNumber) ? parseTestAuthConfig().code : '';
    const code = testCode || crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    const created = await this.prisma.oTP.create({
      data: { phoneNumber, code, expiresAt },
    });

    let result: SMSResult;
    try {
      result = testCode ? { success: true, messageId: 'test-auth' } : await send(code);
    } catch (e) {
      await this.prisma.oTP.deleteMany({ where: { id: created.id } });
      throw e;
    }

    if (!result.success) {
      await this.prisma.oTP.deleteMany({ where: { id: created.id } });
      return result;
    }
    // A new code replaces every older one for this phone (unverified ones
    // too), so only the latest code can ever be accepted. Other phones are
    // untouched.
    await this.prisma.oTP.deleteMany({
      where: { phoneNumber, id: { not: created.id } },
    });
    return result;
  }

  async verify(
    phoneNumber: string,
    code: string,
  ): Promise<{
    valid: boolean;
    error?: string;
    /** `not_found`: no live code for the phone; `wrong_code`: a code exists but was not accepted. */
    reason?: 'not_found' | 'wrong_code';
  }> {
    const otp = await this.prisma.oTP.findFirst({
      where: {
        phoneNumber,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      return { valid: false, error: 'Код не найден или истёк', reason: 'not_found' };
    }

    // Reserve an attempt atomically before comparing: parallel guesses cannot
    // all pass a stale `attempts` read, at most MAX_ATTEMPTS ever get through.
    const reserved = await this.prisma.oTP.updateMany({
      where: { id: otp.id, attempts: { lt: MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    if (reserved.count !== 1) {
      return { valid: false, error: 'Превышено количество попыток', reason: 'wrong_code' };
    }

    const codeMatch =
      otp.code.length === code.length &&
      crypto.timingSafeEqual(Buffer.from(otp.code), Buffer.from(code));

    if (!codeMatch) {
      return { valid: false, error: 'Неверный код', reason: 'wrong_code' };
    }

    // A code is single-use even when the correct code is submitted in parallel.
    const consumed = await this.prisma.oTP.updateMany({
      where: { id: otp.id, verified: false },
      data: { verified: true },
    });
    if (consumed.count !== 1) {
      return { valid: false, error: 'Код не найден или истёк', reason: 'not_found' };
    }

    return { valid: true };
  }
}
