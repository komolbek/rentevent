import { createHmac } from 'crypto';
import { Logger } from '@nestjs/common';
import { maskPhone } from '../common/mask-phone';

/**
 * Structured, privacy-safe log lines for the SMS path (audit S16/S21). Pure formatters
 * only take already-safe fields: they never receive the code or the message text, and the
 * phone is masked here. Formats are documented in docs/ops/sms-monitoring.md.
 */
export type SmsPurpose = 'login' | 'admin_reset';

export type SmsStatusClass =
  | 'timeout'
  | 'network'
  | 'http_429'
  | 'http_5xx'
  | 'breaker_open'
  | 'quota'
  | 'config';

export type SmsBlockReason =
  | 'phone_cooldown'
  | 'phone_hour'
  | 'phone_day'
  | 'ip_15m'
  | 'ip_day'
  | 'global_daily'
  | 'breaker_open'
  | 'test_auth';

export interface SmsSendLog {
  purpose: SmsPurpose;
  provider: 'gateway' | 'mock' | '-';
  ok: boolean;
  ms: number;
  messageId?: string;
  /** HTTP status of a delivered answer (`200`, `http_401`), a status class, or `mock`. */
  status: string;
  phone: unknown;
}

/** A gateway-supplied id is untrusted: keep a short safe token, otherwise `-`. */
export function safeToken(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '-';
  const s = String(value);
  return /^[A-Za-z0-9_.:-]{1,64}$/.test(s) ? s : '-';
}

export function formatSmsSend(e: SmsSendLog): string {
  const ms = Number.isFinite(e.ms) ? Math.max(0, Math.round(e.ms)) : 0;
  return (
    `sms_send purpose=${e.purpose} provider=${e.provider} ok=${e.ok} ms=${ms} ` +
    `msgId=${safeToken(e.messageId)} status=${safeToken(e.status)} phone=${maskPhone(e.phone)}`
  );
}

/** Short keyed hash prefix of an IP: enough to group one abuser, useless as an address. */
export function hashIp(ip: string): string {
  return createHmac('sha256', process.env.OTP_PEPPER || 'sms-log').update(ip).digest('hex').slice(0, 8);
}

export function formatSmsBlocked(e: {
  reason: SmsBlockReason;
  purpose: SmsPurpose;
  phone: unknown;
  ip?: string;
}): string {
  const ip = e.ip && (e.reason === 'ip_15m' || e.reason === 'ip_day') ? ` ip=${hashIp(e.ip)}` : '';
  return `sms_blocked reason=${e.reason} purpose=${e.purpose} phone=${maskPhone(e.phone)}${ip}`;
}

export function formatSmsDaily(total: number, cap: number): string {
  const pct = cap > 0 ? Math.floor((total / cap) * 100) : 0;
  return `sms_daily total=${total} cap=${cap} pct=${pct}`;
}

export const DAILY_THRESHOLDS_PCT = [50, 70, 90, 100] as const;

/** Reports each threshold at most once per UTC day; cheap, in memory, no I/O. */
export class DailyThresholds {
  private day = '';
  private fired = new Set<number>();

  /** Returns the highest newly crossed threshold (percent), or null. */
  crossed(total: number, cap: number, now: Date = new Date()): number | null {
    const day = now.toISOString().slice(0, 10);
    if (day !== this.day) {
      this.day = day;
      this.fired.clear();
    }
    let hit: number | null = null;
    for (const pct of DAILY_THRESHOLDS_PCT) {
      if (total >= Math.ceil((cap * pct) / 100) && !this.fired.has(pct)) {
        this.fired.add(pct);
        hit = pct;
      }
    }
    return hit;
  }
}

const logger = new Logger('sms');

/** Synchronous, never throws: a log problem must not break a send. */
export function logSmsSend(e: SmsSendLog): void {
  try {
    if (e.ok) logger.log(formatSmsSend(e));
    else logger.warn(formatSmsSend(e));
  } catch {
    /* ignore */
  }
}

export function logSmsBlocked(e: Parameters<typeof formatSmsBlocked>[0]): void {
  try {
    logger.warn(formatSmsBlocked(e));
  } catch {
    /* ignore */
  }
}

export function logSmsDaily(total: number, cap: number, pct: number): void {
  try {
    const line = formatSmsDaily(total, cap);
    if (pct >= 70) logger.warn(line);
    else logger.log(line);
  } catch {
    /* ignore */
  }
}
