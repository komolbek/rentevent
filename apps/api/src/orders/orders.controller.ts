import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OrdersService, QuoteOrderDto } from './orders.service';
import { UserAuthGuard } from '../common/guards/user-auth.guard';
import { UserId } from '../common/decorators';
import { RateLimitService } from '../common/rate-limit.service';
import { clientIp } from '../common/client-ip';
import { parseLimit, parsePage } from '../common/pagination';

/** Quotes need no account (a guest cart shows totals too), so they are rate-limited per IP. */
const QUOTE_LIMIT = { max: 30, windowMs: 60 * 1000 };

@ApiTags('Orders')
@Controller('orders')
export class OrderQuoteController {
  constructor(
    private ordersService: OrdersService,
    private rateLimitService: RateLimitService,
  ) {}

  @Post('quote')
  @ApiOperation({
    summary: 'Price a cart without creating an order',
    description:
      'Same body as POST /orders; delivery, payment and company fields are ignored. ' +
      'Runs the same validation, availability check and pricing as order creation and writes nothing.',
  })
  async quote(@Req() req: Request, @Body() body: QuoteOrderDto) {
    const limit = this.rateLimitService.check(
      'order_quote',
      clientIp(req),
      QUOTE_LIMIT.max,
      QUOTE_LIMIT.windowMs,
    );
    if (!limit.allowed) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    return this.ordersService.quoteOrder(body ?? ({} as QuoteOrderDto));
  }
}

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(UserAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  async createOrder(
    @UserId() userId: string,
    @Body()
    body: {
      items: { product_id: string; quantity: number }[];
      rental_start_date: string;
      rental_end_date: string;
      delivery_type: 'DELIVERY' | 'SELF_PICKUP';
      delivery_address_id?: string;
      payment_method: string;
      company_name?: string;
      company_inn?: string;
      event_id?: string;
      notes?: string;
    },
  ) {
    return this.ordersService.createOrder(userId, body);
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'List current user orders' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getMyOrders(
    @UserId() userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.ordersService.getMyOrders(userId, {
      page: parsePage(page),
      limit: parseLimit(limit, 10),
      status: status || undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details' })
  async getOrder(
    @UserId() userId: string,
    @Param('id') id: string,
  ) {
    return this.ordersService.getOrder(userId, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  async cancelOrder(
    @UserId() userId: string,
    @Param('id') id: string,
  ) {
    return this.ordersService.cancelOrder(userId, id);
  }
}
