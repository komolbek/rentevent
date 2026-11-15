import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { assertPhotoUrls } from '../common/photo-urls';

interface CreateReviewDto {
  product_id: string;
  rating: number;
  comment?: string;
  photos?: string[];
}

interface UpdateReviewDto {
  rating?: number;
  comment?: string;
  photos?: string[];
}

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createReview(userId: string, dto: CreateReviewDto) {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const photos = assertPhotoUrls(dto.photos);

    // Verify user has a DELIVERED or RETURNED order containing this product
    const qualifyingOrder = await this.prisma.order.findFirst({
      where: {
        userId,
        status: { in: ['DELIVERED', 'RETURNED'] },
        items: {
          some: { productId: dto.product_id },
        },
      },
    });

    if (!qualifyingOrder) {
      throw new ForbiddenException(
        'You can only review products from delivered or returned orders',
      );
    }

    // Check uniqueness (user + product)
    const existing = await this.prisma.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: dto.product_id,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'You have already reviewed this product',
      );
    }

    return this.prisma.review.create({
      data: {
        userId,
        productId: dto.product_id,
        orderId: qualifyingOrder.id,
        rating: dto.rating,
        comment: dto.comment,
        photos,
      },
      include: {
        user: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    });
  }

  async updateReview(userId: string, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    if (dto.rating !== undefined && (dto.rating < 1 || dto.rating > 5)) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const photos = dto.photos !== undefined ? assertPhotoUrls(dto.photos) : undefined;

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(dto.rating !== undefined && { rating: dto.rating }),
        ...(dto.comment !== undefined && { comment: dto.comment }),
        ...(photos !== undefined && { photos }),
      },
      include: {
        user: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    });
  }

  async deleteReview(userId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    return { message: 'Review deleted successfully' };
  }
}
