import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Response } from 'express';

/** Stable machine-readable codes for the customer and admin OTP endpoints. */
export type OtpErrorCode =
  | 'invalid_phone'
  | 'invalid_code'
  | 'code_expired'
  | 'rate_limited'
  | 'sms_unavailable';

/** 400 with the Russian `message` clients already show, plus a stable `code`. */
export function otpBadRequest(message: string, code: OtpErrorCode): BadRequestException {
  return new BadRequestException({ statusCode: 400, message, code });
}

export function smsUnavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException({
    statusCode: 503,
    message: 'Не удалось отправить SMS. Попробуйте позже.',
    code: 'sms_unavailable',
  });
}

/** 429 carrying the wait in seconds; `RateLimitedFilter` also sends it as `Retry-After`. */
export class RateLimitedException extends HttpException {
  readonly retryAfterSeconds: number;

  constructor(retryAfterMs: number, message?: string) {
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: message ?? `Слишком много запросов. Повторите через ${retryAfterSeconds} с.`,
        code: 'rate_limited',
        retry_after_seconds: retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

@Catch(RateLimitedException)
export class RateLimitedFilter implements ExceptionFilter {
  catch(exception: RateLimitedException, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    res.setHeader('Retry-After', String(exception.retryAfterSeconds));
    res.status(exception.getStatus()).json(exception.getResponse());
  }
}
