import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Prisma } from '@rentevent/db';

interface Specifications {
  width?: string | null;
  height?: string | null;
  depth?: string | null;
  weight?: string | null;
  color?: string | null;
  material?: string | null;
}

// Shape the admin panel sends (snake_case + nested specifications).
interface ProductInput {
  name?: string;
  name_uz?: string | null;
  name_en?: string | null;
  description?: string | null;
  description_uz?: string | null;
  description_en?: string | null;
  category_id?: string;
  photos?: string[];
  daily_price?: number;
  total_stock?: number;
  is_active?: boolean;
  specifications?: Specifications;
  min_rental_days?: number;
  max_rental_days?: number;
  deposit_amount?: number;
  pricingTiers?: { days: number; totalPrice: number }[];
  quantityPricing?: { quantity: number; totalPrice: number }[];
}

const PRODUCT_INCLUDE = {
  category: { select: { id: true, name: true } },
  pricingTiers: { orderBy: { days: 'asc' } },
  quantityPricing: { orderBy: { quantity: 'asc' } },
  _count: { select: { orderItems: true, reviews: true, favorites: true } },
} as const;

@Injectable()
export class AdminProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private toRow(p: any) {
    return {
      id: p.id,
      name: p.name,
      name_uz: p.nameUz ?? null,
      name_en: p.nameEn ?? null,
      description: p.description ?? null,
      description_uz: p.descriptionUz ?? null,
      description_en: p.descriptionEn ?? null,
      category_id: p.categoryId,
      category_name: p.category?.name ?? null,
      photos: p.photos ?? [],
      daily_price: p.dailyPrice,
      total_stock: p.totalStock,
      is_active: p.isActive,
      specifications: {
        width: p.specWidth ?? null,
        height: p.specHeight ?? null,
        depth: p.specDepth ?? null,
        weight: p.specWeight ?? null,
        color: p.specColor ?? null,
        material: p.specMaterial ?? null,
      },
      min_rental_days: p.minRentalDays,
      max_rental_days: p.maxRentalDays,
      deposit_amount: p.depositAmount,
      pricing_tiers: p.pricingTiers ?? [],
      quantity_pricing: p.quantityPricing ?? [],
      orders_count: p._count?.orderItems ?? 0,
      created_at: p.createdAt,
    };
  }

  private mapInput(body: ProductInput): Prisma.ProductUncheckedUpdateInput {
    const out: Prisma.ProductUncheckedUpdateInput = {};
    const set = <T>(v: T | undefined, key: keyof Prisma.ProductUncheckedUpdateInput) => {
      if (v !== undefined) (out as Record<string, unknown>)[key as string] = v;
    };
    set(body.name, 'name');
    set(body.name_uz ?? undefined, 'nameUz');
    set(body.name_en ?? undefined, 'nameEn');
    set(body.description ?? undefined, 'description');
    set(body.description_uz ?? undefined, 'descriptionUz');
    set(body.description_en ?? undefined, 'descriptionEn');
    set(body.category_id, 'categoryId');
    set(body.photos, 'photos');
    set(body.daily_price, 'dailyPrice');
    set(body.total_stock, 'totalStock');
    set(body.is_active, 'isActive');
    set(body.min_rental_days, 'minRentalDays');
    set(body.max_rental_days, 'maxRentalDays');
    set(body.deposit_amount, 'depositAmount');
    if (body.specifications !== undefined) {
      const s = body.specifications || {};
      out.specWidth = s.width ?? null;
      out.specHeight = s.height ?? null;
      out.specDepth = s.depth ?? null;
      out.specWeight = s.weight ?? null;
      out.specColor = s.color ?? null;
      out.specMaterial = s.material ?? null;
    }
    return out;
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    categoryId?: string;
  }) {
    const { page, limit, search, categoryId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = { deletedAt: null };
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameUz: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: PRODUCT_INCLUDE,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: items.map((p) => this.toRow(p)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.toRow(product);
  }

  async create(data: ProductInput & { pricingTiers?: { days: number; totalPrice: number }[]; quantityPricing?: { quantity: number; totalPrice: number }[] }) {
    if (!data.category_id) {
      throw new BadRequestException('category_id is required');
    }
    const category = await this.prisma.category.findUnique({
      where: { id: data.category_id },
    });
    if (!category) throw new BadRequestException('Category not found');

    if (data.name === undefined || data.name === '') {
      throw new BadRequestException('name is required');
    }
    if (data.daily_price == null) {
      throw new BadRequestException('daily_price is required');
    }

    const mapped = this.mapInput(data);
    const { pricingTiers, quantityPricing } = data;

    const created = await this.prisma.product.create({
      data: {
        ...(mapped as Prisma.ProductUncheckedCreateInput),
        name: data.name,
        categoryId: data.category_id,
        dailyPrice: data.daily_price,
        photos: data.photos ?? [],
        pricingTiers: pricingTiers?.length
          ? { createMany: { data: pricingTiers } }
          : undefined,
        quantityPricing: quantityPricing?.length
          ? { createMany: { data: quantityPricing } }
          : undefined,
      },
      include: PRODUCT_INCLUDE,
    });
    return this.toRow(created);
  }

  async update(id: string, data: ProductInput) {
    const existing = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Product not found');

    if (data.category_id) {
      const category = await this.prisma.category.findUnique({
        where: { id: data.category_id },
      });
      if (!category) throw new BadRequestException('Category not found');
    }

    const mapped = this.mapInput(data);
    const { pricingTiers, quantityPricing } = data;

    const result = await this.prisma.$transaction(async (tx) => {
      if (pricingTiers !== undefined) {
        await tx.pricingTier.deleteMany({ where: { productId: id } });
        if (pricingTiers.length > 0) {
          await tx.pricingTier.createMany({
            data: pricingTiers.map((t) => ({ ...t, productId: id })),
          });
        }
      }
      if (quantityPricing !== undefined) {
        await tx.quantityPricing.deleteMany({ where: { productId: id } });
        if (quantityPricing.length > 0) {
          await tx.quantityPricing.createMany({
            data: quantityPricing.map((q) => ({ ...q, productId: id })),
          });
        }
      }
      return tx.product.update({
        where: { id },
        data: mapped,
        include: PRODUCT_INCLUDE,
      });
    });
    return this.toRow(result);
  }

  async delete(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { orderItems: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (product._count.orderItems > 0) {
      await this.prisma.product.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });
      return { deleted: true, soft: true };
    }

    await this.prisma.product.delete({ where: { id } });
    return { deleted: true, soft: false };
  }
}
