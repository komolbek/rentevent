import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { AdminProductsService } from './admin-products.service';

// Snake_case shape sent by the admin panel.
interface ProductBody {
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
  specifications?: {
    width?: string | null;
    height?: string | null;
    depth?: string | null;
    weight?: string | null;
    color?: string | null;
    material?: string | null;
  };
  min_rental_days?: number;
  max_rental_days?: number;
  deposit_amount?: number;
  is_pinned?: boolean;
  pricingTiers?: { days: number; totalPrice: number }[];
  quantityPricing?: { quantity: number; totalPrice: number }[];
}

@ApiTags('Admin')
@UseGuards(AdminAuthGuard)
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly adminProductsService: AdminProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products (pagination, search, category filter)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category_id', required: false, type: String })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('category_id') categoryId?: string,
  ) {
    return this.adminProductsService.findAll({ page, limit, search, categoryId });
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Persist a new storefront product order' })
  async reorder(@Body() body: { orderedIds: string[] }) {
    return this.adminProductsService.reorder(body.orderedIds);
  }

  @Post()
  @ApiOperation({ summary: 'Create product' })
  async create(@Body() body: ProductBody) {
    return this.adminProductsService.create(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single product' })
  async findOne(@Param('id') id: string) {
    return this.adminProductsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product' })
  async update(@Param('id') id: string, @Body() body: ProductBody) {
    return this.adminProductsService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete product (soft if it has orders, hard otherwise)' })
  async delete(@Param('id') id: string) {
    return this.adminProductsService.delete(id);
  }
}
