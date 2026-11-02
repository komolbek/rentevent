import { Module } from '@nestjs/common';
import { OrdersController, OrderQuoteController } from './orders.controller';
import { RateLimitService } from '../common/rate-limit.service';
import { OrdersService } from './orders.service';

@Module({
  controllers: [OrderQuoteController, OrdersController],
  providers: [OrdersService, RateLimitService],
  exports: [OrdersService],
})
export class OrdersModule {}
