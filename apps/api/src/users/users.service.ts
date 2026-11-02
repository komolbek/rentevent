import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma.service';

const TASHKENT_BOUNDS = {
  lat: { min: 41.15, max: 41.45 },
  lng: { min: 69.05, max: 69.45 },
};

const MAX_ADDRESSES = 5;

/** Orders still in progress: the account cannot be deleted until they finish. */
const OPEN_ORDER_STATUSES = ['CONFIRMED', 'PREPARING', 'DELIVERED'] as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ==================== PROFILE ====================

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        name: true,
        language: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, name: string) {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Name is required');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
      select: {
        id: true,
        phoneNumber: true,
        name: true,
        language: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Deletes the account by anonymizing it (docs/spec/account-deletion.md).
   * Orders, items, returns and extensions stay for accounting and keep
   * pointing at the user row; everything that identifies the person is
   * removed and every session is revoked.
   */
  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const openOrders = await this.prisma.order.count({
      where: { userId, deletedAt: null, status: { in: [...OPEN_ORDER_STATUSES] } },
    });
    if (openOrders > 0) {
      throw new ConflictException(
        'Account has orders in progress. Cancel them or wait until they are returned.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.session.deleteMany({ where: { userId } }),
      // Orders keep their numbers and amounts but lose the link to the address.
      this.prisma.order.updateMany({
        where: { userId, deliveryAddressId: { not: null } },
        data: { deliveryAddressId: null },
      }),
      this.prisma.address.deleteMany({ where: { userId } }),
      this.prisma.favorite.deleteMany({ where: { userId } }),
      this.prisma.review.deleteMany({ where: { userId } }),
      this.prisma.notification.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          // Frees the number (unique) so the person can sign up again later
          // as a new, empty account; the placeholder is not a phone number.
          phoneNumber: `deleted:${userId}:${crypto.randomBytes(6).toString('hex')}`,
          name: null,
          isActive: false,
          deletedAt: new Date(),
        },
      }),
    ]);

    return { success: true };
  }

  // ==================== ADDRESSES ====================

  async getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(
    userId: string,
    data: {
      title: string;
      full_address: string;
      city: string;
      district?: string;
      street?: string;
      building?: string;
      apartment?: string;
      entrance?: string;
      floor?: string;
      latitude?: number;
      longitude?: number;
      is_default?: boolean;
    },
  ) {
    const count = await this.prisma.address.count({ where: { userId } });
    if (count >= MAX_ADDRESSES) {
      throw new BadRequestException(`Maximum of ${MAX_ADDRESSES} addresses allowed`);
    }

    if (data.latitude !== undefined && data.longitude !== undefined) {
      this.validateTashkentBounds(data.latitude, data.longitude);
    }

    const isFirst = count === 0;
    const isDefault = data.is_default ?? isFirst;

    if (isDefault && count > 0) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({
      data: {
        userId,
        title: data.title,
        fullAddress: data.full_address,
        city: data.city,
        district: data.district,
        street: data.street,
        building: data.building,
        apartment: data.apartment,
        entrance: data.entrance,
        floor: data.floor,
        latitude: data.latitude,
        longitude: data.longitude,
        isDefault: isDefault,
      },
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.address.delete({ where: { id: addressId } });

    if (address.isDefault) {
      const nextDefault = await this.prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (nextDefault) {
        await this.prisma.address.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }

    return { success: true };
  }

  async setDefaultAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.$transaction([
      this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      }),
    ]);

    return { success: true };
  }

  // ==================== FAVORITES ====================

  async getFavorites(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            photos: true,
            dailyPrice: true,
            isActive: true,
          },
        },
      },
    });

    return favorites.map((fav) => ({
      id: fav.id,
      createdAt: fav.createdAt,
      product: fav.product,
    }));
  }

  async addFavorite(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    try {
      const favorite = await this.prisma.favorite.create({
        data: { userId, productId },
      });
      return favorite;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Product is already in favorites');
      }
      throw error;
    }
  }

  async removeFavorite(userId: string, productId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    await this.prisma.favorite.delete({
      where: { id: favorite.id },
    });

    return { success: true };
  }

  // ==================== HELPERS ====================

  private validateTashkentBounds(latitude: number, longitude: number) {
    if (
      latitude < TASHKENT_BOUNDS.lat.min ||
      latitude > TASHKENT_BOUNDS.lat.max ||
      longitude < TASHKENT_BOUNDS.lng.min ||
      longitude > TASHKENT_BOUNDS.lng.max
    ) {
      throw new BadRequestException(
        'Address coordinates must be within Tashkent bounds',
      );
    }
  }
}
