import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma.service';
import { RateLimitService } from '../common/rate-limit.service';
import { OtpService } from '../auth/otp.service';
import { SmsService } from '../auth/sms.service';
import { createAdminSession } from '../common/guards/admin-auth.guard';
import { normalizeUzPhone } from '../common/phone';
import { maskPhone } from '../common/mask-phone';
import { assertAdminPassword } from '../common/password';

const MINUTE = 60 * 1000;

/**
 * Forgot-password limits. Counters live in the memory of a single API instance
 * and reset on every deploy/restart (fix plan D7/F18: needs a shared store
 * before scaling).
 */
export const RESET_LIMITS = {
  sendPerPhone: { max: 3, windowMs: 15 * MINUTE },
  sendPerIp: { max: 10, windowMs: 60 * MINUTE },
  verifyPerPhone: { max: 5, windowMs: 15 * MINUTE },
  verifyPerIp: { max: 20, windowMs: 15 * MINUTE },
  // Failed verifications per phone; at the cap the reset flow is locked.
  failedPerPhone: { max: 10, windowMs: 24 * 60 * MINUTE },
};

interface ResetTokenEntry {
  staffId: string;
  phone: string;
  expiresAt: number;
}

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);
  private resetTokens = new Map<string, ResetTokenEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimitService: RateLimitService,
    private readonly otpService: OtpService,
    private readonly smsService: SmsService,
  ) {}

  async login(
    phone: string,
    password: string,
  ): Promise<{
    sessionToken: string;
    staff: { id: string; name: string; role: string; phoneNumber: string };
    mustChangePassword: boolean;
  }> {
    const rateCheck = this.rateLimitService.check(
      'admin_login',
      phone,
      5,
      15 * 60 * 1000,
    );
    if (!rateCheck.allowed) {
      throw new HttpException(
        `Too many login attempts. Try again in ${Math.ceil(rateCheck.retryAfterMs / 1000)} seconds`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const staff = await this.prisma.staff.findUnique({
      where: { phoneNumber: phone },
    });

    if (!staff || !staff.isActive || staff.deletedAt) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    if (!staff.passwordHash) {
      throw new UnauthorizedException(
        'Password not set. Use "Forgot password" to receive an SMS code and set one.',
      );
    }

    const passwordValid = await bcrypt.compare(password, staff.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    const sessionToken = createAdminSession(staff.id);

    await this.prisma.staff.update({
      where: { id: staff.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      sessionToken,
      staff: {
        id: staff.id,
        name: staff.name,
        role: staff.role,
        phoneNumber: staff.phoneNumber,
      },
      mustChangePassword: staff.mustChangePassword,
    };
  }

  async getStaffById(staffId: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        phoneNumber: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    return staff;
  }

  async setPassword(
    staffId: string,
    newPassword: string,
    currentPassword?: string,
  ): Promise<void> {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    if (!staff.mustChangePassword && staff.passwordHash) {
      if (!currentPassword) {
        throw new BadRequestException('Current password is required');
      }
      const valid = await bcrypt.compare(currentPassword, staff.passwordHash);
      if (!valid) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    assertAdminPassword(newPassword);

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.staff.update({
      where: { id: staffId },
      data: { passwordHash, mustChangePassword: false },
    });
  }

  private normalizeResetPhone(phone: string): string {
    const normalized = normalizeUzPhone(phone);
    if (!normalized) {
      throw new BadRequestException('Неверный номер телефона');
    }
    return normalized;
  }

  private tooMany(retryAfterMs: number): HttpException {
    const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
    const wait = minutes >= 60 ? `${Math.ceil(minutes / 60)} ч.` : `${minutes} мин.`;
    return new HttpException(
      `Слишком много попыток. Повторите через ${wait}`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /** Throws 429 when the key is at its cap; records nothing. */
  private assertBelow(
    namespace: string,
    key: string,
    limit: { max: number; windowMs: number },
  ): void {
    if (this.rateLimitService.count(namespace, key, limit.windowMs) >= limit.max) {
      throw this.tooMany(
        this.rateLimitService.retryAfterMs(namespace, key, limit.windowMs),
      );
    }
  }

  async forgotPasswordSendOtp(rawPhone: string, ip: string): Promise<void> {
    const phone = this.normalizeResetPhone(rawPhone);
    this.assertBelow('admin_reset_failed', phone, RESET_LIMITS.failedPerPhone);

    // Check both limits before recording, so a rejection by one does not burn the other.
    this.assertBelow('admin_reset_send_phone', phone, RESET_LIMITS.sendPerPhone);
    this.assertBelow('admin_reset_send_ip', ip, RESET_LIMITS.sendPerIp);
    this.rateLimitService.record('admin_reset_send_phone', phone, RESET_LIMITS.sendPerPhone.windowMs);
    this.rateLimitService.record('admin_reset_send_ip', ip, RESET_LIMITS.sendPerIp.windowMs);

    this.logger.log(`[forgot-password] send-otp requested for ${maskPhone(phone)}`);

    const staff = await this.prisma.staff.findUnique({
      where: { phoneNumber: phone },
    });

    if (!staff) {
      this.logger.warn(`[forgot-password] no staff record for ${maskPhone(phone)}; silently returning`);
      return;
    }
    if (!staff.isActive || staff.deletedAt) {
      this.logger.warn(
        `[forgot-password] staff ${staff.id} is inactive or soft-deleted (isActive=${staff.isActive}, deletedAt=${staff.deletedAt?.toISOString() ?? 'null'}); silently returning`,
      );
      return;
    }

    const code = await this.otpService.generate(phone);
    const result = await this.smsService.sendAdminOTP(phone, code);
    this.logger.log(
      `[forgot-password] OTP dispatched to ${maskPhone(phone)} via ${process.env.SMS_PROVIDER || 'mock'} (success=${result.success}${result.error ? `, error=${result.error}` : ''})`,
    );
  }

  async forgotPasswordVerifyOtp(
    rawPhone: string,
    code: string,
    ip: string,
  ): Promise<{ resetToken: string }> {
    const phone = this.normalizeResetPhone(rawPhone);
    // Malformed codes are rejected before any counter is touched.
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      throw new BadRequestException('Код должен состоять из 6 цифр');
    }

    this.assertBelow('admin_reset_failed', phone, RESET_LIMITS.failedPerPhone);
    this.assertBelow('admin_reset_verify_phone', phone, RESET_LIMITS.verifyPerPhone);
    this.assertBelow('admin_reset_verify_ip', ip, RESET_LIMITS.verifyPerIp);
    this.rateLimitService.record('admin_reset_verify_phone', phone, RESET_LIMITS.verifyPerPhone.windowMs);
    this.rateLimitService.record('admin_reset_verify_ip', ip, RESET_LIMITS.verifyPerIp.windowMs);

    // One message for unknown phone, no live code and wrong code (no enumeration).
    const invalid = () => new BadRequestException('Неверный или просроченный код');

    const staff = await this.prisma.staff.findUnique({
      where: { phoneNumber: phone },
    });
    if (!staff || !staff.isActive || staff.deletedAt) throw invalid();

    const result = await this.otpService.verify(phone, code);
    if (!result.valid) {
      // Only a wrong guess against a live code counts toward the lockout, so
      // nobody can lock a real user out before a code has been issued.
      if (result.reason === 'wrong_code') {
        this.rateLimitService.record('admin_reset_failed', phone, RESET_LIMITS.failedPerPhone.windowMs);
      }
      throw invalid();
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    this.resetTokens.set(resetToken, {
      staffId: staff.id,
      phone,
      expiresAt,
    });

    // Cleanup expired tokens
    this.cleanupExpiredTokens();

    return { resetToken };
  }

  async resetPasswordWithToken(
    resetToken: string,
    newPassword: string,
  ): Promise<void> {
    const entry = this.resetTokens.get(resetToken);

    if (!entry || entry.expiresAt < Date.now()) {
      this.resetTokens.delete(resetToken);
      throw new BadRequestException(
        'Ссылка для сброса недействительна или устарела. Начните заново.',
      );
    }

    assertAdminPassword(newPassword);

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.staff.update({
      where: { id: entry.staffId },
      data: { passwordHash, mustChangePassword: false },
    });

    this.resetTokens.delete(resetToken);
  }

  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, entry] of this.resetTokens.entries()) {
      if (entry.expiresAt < now) {
        this.resetTokens.delete(token);
      }
    }
  }
}
