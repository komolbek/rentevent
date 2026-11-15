import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LimitPipe, PagePipe, MAX_ADMIN_PAGE_LIMIT } from '../common/pagination';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { AdminReviewsService } from './admin-reviews.service';

@ApiTags('Admin')
@UseGuards(AdminAuthGuard)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly adminReviewsService: AdminReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'List all reviews with pagination, filter by product/visibility/rating' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'product_id', required: false, type: String })
  @ApiQuery({ name: 'is_visible', required: false, type: String })
  @ApiQuery({ name: 'rating', required: false, type: Number })
  async findAll(
    @Query('page', new PagePipe()) page: number,
    @Query('limit', new LimitPipe(20, MAX_ADMIN_PAGE_LIMIT)) limit: number,
    @Query('product_id') productId?: string,
    @Query('is_visible') isVisible?: string,
    @Query('rating') rating?: string,
  ) {
    return this.adminReviewsService.findAll({
      page,
      limit,
      productId,
      isVisible,
      rating: rating ? parseInt(rating, 10) : undefined,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Toggle review visibility' })
  async toggleVisibility(
    @Param('id') id: string,
    @Body() body: { isVisible: boolean },
  ) {
    return this.adminReviewsService.toggleVisibility(id);
  }
}
