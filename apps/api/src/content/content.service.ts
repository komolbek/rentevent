import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { isAllowedImageUrl, isAllowedLinkUrl } from '@rentevent/validators';
import { PrismaService } from '../common/prisma.service';
import { AdminUploadService } from '../admin/admin-upload.service';

/**
 * Admin-managed home page content: hero slides and "Inspirations". Both are
 * ordered, localized (ru base + _uz/_en) cards with an image, so they share
 * one snake_case mapping; each kind lists the text fields it carries.
 */
export type ContentKind = 'heroSlide' | 'inspiration';

const TEXT_FIELDS: Record<ContentKind, string[]> = {
  heroSlide: ['title', 'subtitle', 'cta_label'],
  inspiration: ['title', 'description'],
};
// Single-language fields, beyond image/active/order.
const PLAIN_FIELDS: Record<ContentKind, string[]> = {
  heroSlide: ['cta_url'],
  inspiration: ['link_url'],
};

const camel = (snake: string) => snake.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const LOCALES = ['', '_uz', '_en'];

export type ContentBody = Record<string, unknown>;

export const MAX_HERO_SLIDES = 10;
export const MAX_REORDER_IDS = 50;
const MAX_URL = 500;
const MAX_KEY = 200;
const MAX_ALT = 200;
// Hero text caps (inspirations are not capped here, they predate the rule).
const HERO_MAX_LEN: Record<string, number> = { title: 120, subtitle: 300, cta_label: 40 };

const TASHKENT_OFFSET_MS = 5 * 3600 * 1000; // UTC+5, no DST

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `YYYY-MM-DD` -> UTC instant of that day's start (or last millisecond) in Tashkent time. */
export function parseTashkentDay(value: string, endOfDay: boolean): Date | null {
  const m = DAY_RE.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null;
  const ms = probe.getTime() + (endOfDay ? 86400000 - 1 : 0) - TASHKENT_OFFSET_MS;
  return new Date(ms);
}

/** Inverse of `parseTashkentDay`: the Tashkent calendar day of an instant. */
export function formatTashkentDay(date: Date): string {
  return new Date(date.getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

/** Prisma `where` for the public list: active, and inside the schedule window for hero slides. */
export function publicWhere(kind: ContentKind, now: Date) {
  if (kind !== 'heroSlide') return { isActive: true };
  return {
    isActive: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ],
  };
}

/** Validates the reorder payload shape; existence is checked against the DB by the caller. */
export function validateOrderedIds(orderedIds: unknown): string[] {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw new BadRequestException('orderedIds must be a non-empty array');
  }
  if (orderedIds.length > MAX_REORDER_IDS) {
    throw new BadRequestException(`orderedIds must have at most ${MAX_REORDER_IDS} items`);
  }
  if (!orderedIds.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 100)) {
    throw new BadRequestException('orderedIds must be non-empty strings');
  }
  if (new Set(orderedIds).size !== orderedIds.length) {
    throw new BadRequestException('orderedIds must be unique');
  }
  return orderedIds as string[];
}

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: AdminUploadService,
  ) {}

  // Prisma delegates for the two models have identical method shapes.
  private model(kind: ContentKind): any {
    return kind === 'heroSlide' ? this.prisma.heroSlide : this.prisma.inspiration;
  }

  private toRow(kind: ContentKind, r: any) {
    const row: Record<string, unknown> = {
      id: r.id,
      image_url: r.imageUrl,
      is_active: r.isActive,
      display_order: r.displayOrder,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    };
    if (kind === 'heroSlide') {
      row.image_key = r.imageKey ?? null;
      row.mobile_image_url = r.mobileImageUrl ?? null;
      row.mobile_image_key = r.mobileImageKey ?? null;
      row.focal_x = r.focalX ?? null;
      row.focal_y = r.focalY ?? null;
      row.alt = r.alt ?? null;
      row.starts_at = r.startsAt ? formatTashkentDay(r.startsAt) : null;
      row.ends_at = r.endsAt ? formatTashkentDay(r.endsAt) : null;
    }
    for (const f of TEXT_FIELDS[kind]) {
      for (const l of LOCALES) row[`${f}${l}`] = r[camel(`${f}${l}`)] ?? null;
    }
    for (const f of PLAIN_FIELDS[kind]) row[f] = r[camel(f)] ?? null;
    return row;
  }

  /**
   * Validates and maps a snake_case body to Prisma data. `existing` (update only)
   * lets cross-field rules (mobile key needs its URL, end >= start) see stored values.
   */
  private mapInput(kind: ContentKind, body: ContentBody, existing?: any) {
    const out: Record<string, unknown> = {};
    const hero = kind === 'heroSlide';
    const keys = [
      'image_url',
      ...(hero ? ['image_key', 'mobile_image_url', 'mobile_image_key'] : []),
      ...TEXT_FIELDS[kind].flatMap((f) => LOCALES.map((l) => `${f}${l}`)),
      ...PLAIN_FIELDS[kind],
    ];
    for (const key of keys) {
      const v = body[key];
      if (v === undefined) continue;
      if (v !== null && typeof v !== 'string') throw new BadRequestException(`${key} must be a string`);
      // Empty optional text is stored as null so the storefront falls back cleanly.
      const empty = typeof v === 'string' && v.trim() === '';
      const value = empty && key !== 'title' ? null : v;
      if (typeof value === 'string') {
        const base = key.replace(/_(uz|en)$/, '');
        const cap = hero ? HERO_MAX_LEN[base] : undefined;
        if (cap && value.length > cap) throw new BadRequestException(`${key} must be at most ${cap} characters`);
        if (key.endsWith('_url') && value.length > MAX_URL) {
          throw new BadRequestException(`${key} must be at most ${MAX_URL} characters`);
        }
        if (key.endsWith('_key') && value.length > MAX_KEY) {
          throw new BadRequestException(`${key} must be at most ${MAX_KEY} characters`);
        }
        if ((key === 'image_url' || key === 'mobile_image_url') && !isAllowedImageUrl(value)) {
          throw new BadRequestException(`${key} must be an https UploadThing image URL`);
        }
        if ((key === 'cta_url' || key === 'link_url') && !isAllowedLinkUrl(value)) {
          throw new BadRequestException(`${key} must be a path starting with / or an http(s) URL`);
        }
      }
      out[camel(key)] = value;
    }
    if (body.is_active !== undefined) out.isActive = Boolean(body.is_active);
    if (body.display_order !== undefined) out.displayOrder = Number(body.display_order) || 0;

    if (hero) {
      // alt
      if (body.alt !== undefined) {
        if (body.alt !== null && typeof body.alt !== 'string') throw new BadRequestException('alt must be a string');
        const alt = typeof body.alt === 'string' ? body.alt.trim() : null;
        if (alt && alt.length > MAX_ALT) throw new BadRequestException(`alt must be at most ${MAX_ALT} characters`);
        out.alt = alt || null;
      }
      // focal point: integers 0-100, independent
      for (const key of ['focal_x', 'focal_y'] as const) {
        const v = body[key];
        if (v === undefined) continue;
        if (v !== null && (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 100)) {
          throw new BadRequestException(`${key} must be an integer from 0 to 100`);
        }
        out[camel(key)] = v;
      }
      // mobile key only together with its URL; clearing the URL clears the key
      const mobileUrl = 'mobileImageUrl' in out ? out.mobileImageUrl : existing?.mobileImageUrl;
      if (out.mobileImageUrl === null) out.mobileImageKey = null;
      if (typeof out.mobileImageKey === 'string' && !mobileUrl) {
        throw new BadRequestException('mobile_image_key requires mobile_image_url');
      }
      // schedule
      const days: Record<string, string | null> = {};
      for (const key of ['starts_at', 'ends_at'] as const) {
        const v = body[key];
        if (v === undefined) continue;
        if (v === null || v === '') {
          out[camel(key)] = null;
          days[key] = null;
          continue;
        }
        const parsed = typeof v === 'string' ? parseTashkentDay(v, key === 'ends_at') : null;
        if (!parsed) throw new BadRequestException(`${key} must be a date YYYY-MM-DD`);
        out[camel(key)] = parsed;
        days[key] = v as string;
      }
      const start = 'starts_at' in days ? days.starts_at : existing?.startsAt ? formatTashkentDay(existing.startsAt) : null;
      const end = 'ends_at' in days ? days.ends_at : existing?.endsAt ? formatTashkentDay(existing.endsAt) : null;
      if (start && end && end < start) throw new BadRequestException('ends_at must not be before starts_at');
    }
    return out;
  }

  async listPublic(kind: ContentKind, now: Date = new Date()) {
    const rows = await this.model(kind).findMany({
      where: publicWhere(kind, now),
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return { items: rows.map((r: unknown) => this.toRow(kind, r)) };
  }

  async listAll(kind: ContentKind) {
    const rows = await this.model(kind).findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return { items: rows.map((r: unknown) => this.toRow(kind, r)) };
  }

  async create(kind: ContentKind, body: ContentBody) {
    const data = this.mapInput(kind, body);
    if (!data.imageUrl) throw new BadRequestException('image_url is required');
    // An image-only hero slide stores title ''; inspirations still need one.
    if (kind === 'inspiration' && (!data.title || !String(data.title).trim())) {
      throw new BadRequestException('title is required');
    }
    if (kind === 'heroSlide') {
      data.title ??= '';
      if ((await this.model(kind).count()) >= MAX_HERO_SLIDES) {
        throw new BadRequestException(`At most ${MAX_HERO_SLIDES} hero slides`);
      }
    }
    // New items go to the end of the list.
    const last = await this.model(kind).findFirst({ orderBy: { displayOrder: 'desc' } });
    const created = await this.model(kind).create({
      data: { displayOrder: (last?.displayOrder ?? -1) + 1, ...data },
    });
    return this.toRow(kind, created);
  }

  async update(kind: ContentKind, id: string, body: ContentBody) {
    const existing = await this.model(kind).findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Not found');
    const data = this.mapInput(kind, body, existing);
    if (data.imageUrl === null) throw new BadRequestException('image_url is required');
    if (kind === 'inspiration' && data.title !== undefined && !String(data.title ?? '').trim()) {
      throw new BadRequestException('title is required');
    }
    if (kind === 'heroSlide') {
      // A replaced photo makes the stored key stale: never keep the old key next to a new URL.
      if (data.imageUrl !== undefined && data.imageUrl !== existing.imageUrl && !('imageKey' in data)) {
        data.imageKey = null;
      }
      if (data.mobileImageUrl !== undefined && data.mobileImageUrl !== existing.mobileImageUrl && !('mobileImageKey' in data)) {
        data.mobileImageKey = null;
      }
    }
    const updated = await this.model(kind).update({ where: { id }, data });
    if (kind === 'heroSlide') await this.cleanupReplacedFiles(existing, updated);
    return this.toRow(kind, updated);
  }

  async delete(kind: ContentKind, id: string) {
    const existing = await this.model(kind).findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Not found');
    await this.model(kind).delete({ where: { id } });
    if (kind === 'heroSlide') await this.deleteKeys([existing.imageKey, existing.mobileImageKey]);
    return { deleted: true };
  }

  /** After a successful update: delete the photos the slide no longer uses. */
  private async cleanupReplacedFiles(before: any, after: any) {
    const keep = new Set([after.imageKey, after.mobileImageKey].filter(Boolean));
    const old: Array<string | null | undefined> = [];
    if (before.imageUrl !== after.imageUrl) old.push(before.imageKey);
    if (before.mobileImageUrl !== after.mobileImageUrl) old.push(before.mobileImageKey);
    await this.deleteKeys(old.filter((k) => !keep.has(k)));
  }

  /** Best-effort: `deleteFile` never throws, so the DB change always stands. */
  private async deleteKeys(keys: Array<string | null | undefined>) {
    for (const key of new Set(keys.filter(Boolean))) {
      await this.uploads.deleteFile(key).catch(() => false);
    }
  }

  async reorder(kind: ContentKind, orderedIds: unknown) {
    const ids = validateOrderedIds(orderedIds);
    const found = await this.model(kind).findMany({ where: { id: { in: ids } }, select: { id: true } });
    if (found.length !== ids.length) throw new BadRequestException('orderedIds contains unknown ids');
    await this.prisma.$transaction(
      ids.map((id, index) => this.model(kind).update({ where: { id }, data: { displayOrder: index } })),
    );
    return { reordered: true };
  }
}
