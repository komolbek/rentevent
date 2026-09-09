import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { StaffId } from '../common/decorators';
import { AdminOrdersService } from './admin-orders.service';
import { OrderStatus, CorporateInvoiceStatus } from '@rentevent/db';

@ApiTags('Admin')
@UseGuards(AdminAuthGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List all orders with pagination, status filter, search' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminOrdersService.findAll({ page, limit, status, search });
  }

  @Post(':id/status')
  @ApiOperation({ summary: 'Update order status with transition validation' })
  async updateStatus(
    @Param('id') id: string,
    @StaffId() staffId: string,
    @Body() body: { status: OrderStatus; notes?: string },
  ) {
    return this.adminOrdersService.updateStatus(id, body.status, staffId, body.notes);
  }

  @Patch(':id/corporate-status')
  @ApiOperation({ summary: 'Update corporate invoice status (BANK_TRANSFER orders)' })
  async updateCorporateStatus(
    @Param('id') id: string,
    @StaffId() staffId: string,
    @Body() body: { status: CorporateInvoiceStatus; note?: string },
  ) {
    return this.adminOrdersService.updateCorporateInvoiceStatus(
      id,
      body.status,
      staffId,
      body.note,
    );
  }
}
