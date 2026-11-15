import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { OtpService } from './otp.service';
import { SessionService } from './session.service';
import { SmsService } from './sms.service';
import { RateLimitService } from '../common/rate-limit.service';
import { normalizeUzPhone } from '../common/phone';

const INVALID_PHONE = 'Неверный номер телефона';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private otpService: OtpService,
    private sessionService: SessionService,
    private smsService: SmsService,
    private rateLimitService: RateLimitService,
  ) {}

  async sendOtp(rawPhone: unknown, ip: string) {
    const phoneNumber = normalizeUzPhone(rawPhone);
    if (!phoneNumber) throw new BadRequestException(INVALID_PHONE);

    // Rate limit by phone
    const phoneLimit = this.rateLimitService.check('otp_phone', phoneNumber, 3, 5 * 60 * 1000);
    if (!phoneLimit.allowed) {
      throw new HttpException('Слишком много запросов. Попробуйте позже.', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Rate limit by IP
    const ipLimit = this.rateLimitService.check('otp_ip', ip, 10, 15 * 60 * 1000);
    if (!ipLimit.allowed) {
      throw new HttpException('Слишком много запросов. Попробуйте позже.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = await this.otpService.generate(phoneNumber);
    const smsResult = await this.smsService.sendOTP(phoneNumber, code);

    if (!smsResult.success) {
      throw new BadRequestException('Не удалось отправить SMS');
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

  async verifyOtp(rawPhone: unknown, code: string, deviceId: string) {
    const phoneNumber = normalizeUzPhone(rawPhone);
    if (!phoneNumber) throw new BadRequestException(INVALID_PHONE);
    if (typeof code !== 'string') throw new BadRequestException('Неверный код');

    const result = await this.otpService.verify(phoneNumber, code);

    if (!result.valid) {
      throw new BadRequestException(result.error || 'Неверный код');
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
