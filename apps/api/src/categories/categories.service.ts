import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findActiveWithChildren() {
    const categories = await this.prisma.category.findMany({
      where: {
        isActive: true,
        parentCategoryId: null,
      },
      orderBy: { displayOrder: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            _count: {
              select: {
                products: { where: { isActive: true } },
              },
            },
          },
        },
        _count: {
          select: {
            products: { where: { isActive: true } },
          },
        },
      },
    });

    // The shape the storefront's shared `ICategory` promises: `_count.products`,
    // `parentCategoryId`, `isActive`, `createdAt`. `productCount` stays as
    // well — the iOS app decodes it.
    return categories.map((category) => ({
      ...toPublic(category),
      children: category.children.map(toPublic),
    }));
  }
}

type CategoryRow = {
  id: string;
  name: string;
  imageUrl: string | null;
  iconName: string | null;
  parentCategoryId: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  _count: { products: number };
};

function toPublic(c: CategoryRow) {
  return {
    id: c.id,
    name: c.name,
    imageUrl: c.imageUrl,
    iconName: c.iconName,
    parentCategoryId: c.parentCategoryId,
    displayOrder: c.displayOrder,
    isActive: c.isActive,
    createdAt: c.createdAt,
    productCount: c._count.products,
    _count: { products: c._count.products },
  };
}
