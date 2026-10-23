import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

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

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

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
    };
    for (const f of TEXT_FIELDS[kind]) {
      for (const l of LOCALES) row[`${f}${l}`] = r[camel(`${f}${l}`)] ?? null;
    }
    for (const f of PLAIN_FIELDS[kind]) row[f] = r[camel(f)] ?? null;
    return row;
  }

  private mapInput(kind: ContentKind, body: ContentBody) {
    const out: Record<string, unknown> = {};
    const keys = [
      'image_url',
      ...TEXT_FIELDS[kind].flatMap((f) => LOCALES.map((l) => `${f}${l}`)),
      ...PLAIN_FIELDS[kind],
    ];
    for (const key of keys) {
      const v = body[key];
      if (v === undefined) continue;
      if (v !== null && typeof v !== 'string') throw new BadRequestException(`${key} must be a string`);
      // Empty optional text is stored as null so the storefront falls back cleanly.
      out[camel(key)] = typeof v === 'string' && v.trim() === '' && key !== 'title' ? null : v;
    }
    if (body.is_active !== undefined) out.isActive = Boolean(body.is_active);
    if (body.display_order !== undefined) out.displayOrder = Number(body.display_order) || 0;
    return out;
  }

  async listPublic(kind: ContentKind) {
    const rows = await this.model(kind).findMany({
      where: { isActive: true },
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
    if (!data.title || !String(data.title).trim()) throw new BadRequestException('title is required');
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
    const data = this.mapInput(kind, body);
    if (data.imageUrl === null) throw new BadRequestException('image_url is required');
    if (data.title !== undefined && !String(data.title ?? '').trim()) {
      throw new BadRequestException('title is required');
    }
    const updated = await this.model(kind).update({ where: { id }, data });
    return this.toRow(kind, updated);
  }

  async delete(kind: ContentKind, id: string) {
    const existing = await this.model(kind).findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Not found');
    await this.model(kind).delete({ where: { id } });
    return { deleted: true };
  }

  async reorder(kind: ContentKind, orderedIds: string[]) {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new BadRequestException('orderedIds must be a non-empty array');
    }
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.model(kind).update({ where: { id }, data: { displayOrder: index } }),
      ),
    );
    return { reordered: true };
  }
}
