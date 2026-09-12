import { Controller, Get, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List active products with filtering, sorting, and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'category_id', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['newest', 'popular', 'price_asc', 'price_desc'],
  })
  @ApiQuery({
    name: 'start_date',
    required: false,
    type: String,
    example: '2026-09-13',
    description: 'With end_date: only products with a free unit on every day of the range; adds availableStock to each item',
  })
  @ApiQuery({ name: 'end_date', required: false, type: String, example: '2026-09-16' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('category_id') categoryId?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: 'newest' | 'popular' | 'price_asc' | 'price_desc',
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.productsService.findAll({
      page,
      limit,
      category_id: categoryId,
      search,
      sort,
      start_date: startDate,
      end_date: endDate,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single product with pricing tiers and quantity pricing' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Check product availability for a date range' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'start_date', required: true, type: String, example: '2025-06-01' })
  @ApiQuery({ name: 'end_date', required: true, type: String, example: '2025-06-07' })
  @ApiQuery({ name: 'quantity', required: false, type: Number })
  async checkAvailability(
    @Param('id') id: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('quantity') quantity?: string,
  ) {
    return this.productsService.checkAvailability(
      id,
      startDate,
      endDate,
      quantity ? parseInt(quantity, 10) : undefined,
    );
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: 'Get reviews for a product with average rating' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getReviews(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.productsService.getReviews(id, page, limit);
  }
}
