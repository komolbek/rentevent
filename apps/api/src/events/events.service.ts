import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

interface EventInput {
  title?: string;
  title_uz?: string | null;
  title_en?: string | null;
  description?: string | null;
  description_uz?: string | null;
  description_en?: string | null;
  image_url?: string | null;
  venue?: string | null;
  city?: string | null;
  start_date?: string;
  end_date?: string | null;
  website_url?: string | null;
  is_active?: boolean;
  display_order?: number;
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  private toRow(e: any) {
    return {
      id: e.id,
      title: e.title,
      title_uz: e.titleUz ?? null,
      title_en: e.titleEn ?? null,
      description: e.description ?? null,
      description_uz: e.descriptionUz ?? null,
      description_en: e.descriptionEn ?? null,
      image_url: e.imageUrl ?? null,
      venue: e.venue ?? null,
      city: e.city ?? null,
      start_date: e.startDate,
      end_date: e.endDate ?? null,
      website_url: e.websiteUrl ?? null,
      is_active: e.isActive,
      display_order: e.displayOrder,
      ...(e._count && { event_prices_count: e._count.productPrices }),
      created_at: e.createdAt,
    };
  }

  private mapInput(body: EventInput) {
    const out: Record<string, unknown> = {};
    const set = (v: unknown, key: string) => {
      if (v !== undefined) out[key] = v;
    };
    set(body.title, 'title');
    set(body.title_uz ?? undefined, 'titleUz');
    set(body.title_en ?? undefined, 'titleEn');
    set(body.description ?? undefined, 'description');
    set(body.description_uz ?? undefined, 'descriptionUz');
    set(body.description_en ?? undefined, 'descriptionEn');
    set(body.image_url ?? undefined, 'imageUrl');
    set(body.venue ?? undefined, 'venue');
    set(body.city ?? undefined, 'city');
    if (body.start_date !== undefined) out.startDate = new Date(body.start_date);
    if (body.end_date !== undefined)
      out.endDate = body.end_date ? new Date(body.end_date) : null;
    set(body.website_url ?? undefined, 'websiteUrl');
    set(body.is_active, 'isActive');
    set(body.display_order, 'displayOrder');
    return out;
  }

  /** Public: active events, upcoming first (by start date, then manual order). */
  async findAllPublic() {
    const events = await this.prisma.event.findMany({
      where: { isActive: true },
      orderBy: [{ startDate: 'asc' }, { displayOrder: 'asc' }],
    });
    return { items: events.map((e) => this.toRow(e)) };
  }

  async findOnePublic(id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, isActive: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    return this.toRow(event);
  }

  // ── Admin ──────────────────────────────────────────────────────────────
  async findAll() {
    const events = await this.prisma.event.findMany({
      orderBy: [{ startDate: 'asc' }, { displayOrder: 'asc' }],
      include: { _count: { select: { productPrices: true } } },
    });
    return { items: events.map((e) => this.toRow(e)) };
  }

  async create(body: EventInput) {
    if (!body.title) throw new BadRequestException('title is required');
    if (!body.start_date) throw new BadRequestException('start_date is required');
    const created = await this.prisma.event.create({
      data: {
        ...(this.mapInput(body) as any),
        title: body.title,
        startDate: new Date(body.start_date),
      },
    });
    return this.toRow(created);
  }

  async update(id: string, body: EventInput) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Event not found');
    const updated = await this.prisma.event.update({
      where: { id },
      data: this.mapInput(body),
    });
    return this.toRow(updated);
  }

  async delete(id: string) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Event not found');
    await this.prisma.event.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Every product with its normal price and this event's price (null = the
   * event uses the normal price), for the admin price table.
   */
  async getPrices(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    const [products, prices] = await Promise.all([
      this.prisma.product.findMany({
        where: { deletedAt: null },
        orderBy: [{ category: { displayOrder: 'asc' } }, { isPinned: 'desc' }, { displayOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          photos: true,
          dailyPrice: true,
          isActive: true,
          category: { select: { id: true, name: true } },
        },
      }),
      this.prisma.eventProductPrice.findMany({ where: { eventId: id } }),
    ]);
    const byProduct = new Map(prices.map((p) => [p.productId, p.dailyPrice]));
    return {
      event: this.toRow(event),
      items: products.map((p) => ({
        product_id: p.id,
        product_name: p.name,
        photo: p.photos[0] ?? null,
        category_id: p.category.id,
        category_name: p.category.name,
        is_active: p.isActive,
        daily_price: p.dailyPrice,
        event_daily_price: byProduct.get(p.id) ?? null,
      })),
    };
  }

  /**
   * Upsert event prices; a null/empty price removes the override so the
   * product falls back to its normal price. Only the rows sent are touched.
   */
  async setPrices(id: string, prices: { product_id: string; daily_price: number | null }[]) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    if (!Array.isArray(prices)) throw new BadRequestException('prices must be an array');
    for (const p of prices) {
      if (!p?.product_id) throw new BadRequestException('product_id is required');
      if (p.daily_price != null && (!Number.isInteger(p.daily_price) || p.daily_price < 0)) {
        throw new BadRequestException('daily_price must be a non-negative integer');
      }
    }
    await this.prisma.$transaction(
      prices.map((p) =>
        p.daily_price == null
          ? this.prisma.eventProductPrice.deleteMany({
              where: { eventId: id, productId: p.product_id },
            })
          : this.prisma.eventProductPrice.upsert({
              where: { eventId_productId: { eventId: id, productId: p.product_id } },
              create: { eventId: id, productId: p.product_id, dailyPrice: p.daily_price },
              update: { dailyPrice: p.daily_price },
            }),
      ),
    );
    return this.getPrices(id);
  }

  async reorder(orderedIds: string[]) {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new BadRequestException('orderedIds must be a non-empty array');
    }
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.event.update({
          where: { id },
          data: { displayOrder: index },
        }),
      ),
    );
    return { reordered: true };
  }
}
