import { Injectable, Logger } from '@nestjs/common';
import { RateLimitService } from '../common/rate-limit.service';
import { RateLimitedException } from './otp-errors';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * SMS send caps, shared by the customer send-otp and the admin forgot-password
 * flows (an SMS costs the same whoever asks). Counters are in memory per API
 * instance and reset on deploy (fix plan D7/F18); the gateway's own caps are
 * the durable backstop.
 */
export const SMS_LIMITS = {
  phoneCooldown: { max: 1, windowMs: MINUTE },
  phoneHour: { max: 5, windowMs: HOUR },
  phoneDay: { max: 10, windowMs: DAY },
  ipWindow: { max: 10, windowMs: 15 * MINUTE },
  ipDay: { max: 30, windowMs: DAY },
};

export const DEFAULT_SMS_DAILY_CAP = 1000;
const WARN_RATIO = 0.7;

export function smsDailyCap(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.SMS_DAILY_CAP);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_SMS_DAILY_CAP;
}

type Slot = { namespace: string; key: string; windowMs: number; at: number };

/** The events one send recorded; hand it back to `refund` if the SMS was not sent. */
export interface SmsReservation {
  slots: Slot[];
}

@Injectable()
export class SmsQuotaService {
  private readonly logger = new Logger(SmsQuotaService.name);

  constructor(private readonly rateLimit: RateLimitService) {}

  /**
   * Checks every cap first and records only when all pass, so a rejection burns
   * nothing. Throws `RateLimitedException` (429, `retry_after_seconds`).
   */
  reserve(phone: string, ip: string, opts: { noSms?: boolean } = {}): SmsReservation {
    const cap = smsDailyCap();
    const checks: Array<[string, string, { max: number; windowMs: number }]> = [
      ['sms_phone_cooldown', phone, SMS_LIMITS.phoneCooldown],
      ['sms_phone_hour', phone, SMS_LIMITS.phoneHour],
      ['sms_phone_day', phone, SMS_LIMITS.phoneDay],
      ['sms_ip_window', ip, SMS_LIMITS.ipWindow],
      ['sms_ip_day', ip, SMS_LIMITS.ipDay],
      ['sms_global_day', 'all', { max: cap, windowMs: DAY }],
    ];
    // No SMS leaves the server (test-auth phone): the phone and IP attempt caps
    // still apply, the global SMS budget is neither checked nor consumed.
    if (opts.noSms) checks.pop();

    let retryAfterMs = -1;
    for (const [ns, key, limit] of checks) {
      if (this.rateLimit.count(ns, key, limit.windowMs) >= limit.max) {
        retryAfterMs = Math.max(retryAfterMs, this.rateLimit.retryAfterMs(ns, key, limit.windowMs));
      }
    }
    if (retryAfterMs >= 0) throw new RateLimitedException(retryAfterMs);

    const slots = checks.map(([namespace, key, limit]) => ({
      namespace,
      key,
      windowMs: limit.windowMs,
      at: this.rateLimit.record(namespace, key, limit.windowMs),
    }));

    const used = opts.noSms ? 0 : this.rateLimit.count('sms_global_day', 'all', DAY);
    if (!opts.noSms && used === Math.ceil(cap * WARN_RATIO)) {
      this.logger.warn(`SMS daily ceiling at ${used}/${cap} (70 %): check for abuse or a campaign`);
    }
    return { slots };
  }

  /** Gives the budget back after a send that failed. */
  refund(reservation: SmsReservation): void {
    for (const s of reservation.slots) this.rateLimit.refund(s.namespace, s.key, s.at);
  }
}
