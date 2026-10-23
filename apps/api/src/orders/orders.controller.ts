import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { UserAuthGuard } from '../common/guards/user-auth.guard';
import { UserId } from '../common/decorators';

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
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
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
