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
import { StaffId } from '../common/decorators';
import { AdminReturnsService } from './admin-returns.service';
import { ReturnStatus, DamageLevel } from '@rentevent/db';

@ApiTags('Admin')
@UseGuards(AdminAuthGuard)
@Controller('admin/returns')
export class AdminReturnsController {
  constructor(private readonly adminReturnsService: AdminReturnsService) {}

  @Get()
  @ApiOperation({ summary: 'List all returns with pagination, status filter' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  async findAll(
    @Query('page', new PagePipe()) page: number,
    @Query('limit', new LimitPipe(20, MAX_ADMIN_PAGE_LIMIT)) limit: number,
    @Query('status') status?: string,
  ) {
    return this.adminReturnsService.findAll({ page, limit, status });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update return: status, damage info, refund, pickup, inspection' })
  async update(
    @Param('id') id: string,
    @StaffId() staffId: string,
    @Body()
    body: {
      status?: ReturnStatus;
      damageLevel?: DamageLevel;
      damageNotes?: string;
      damageFee?: number;
      refundAmount?: number;
      pickupDate?: string;
      inspectionNotes?: string;
    },
  ) {
    return this.adminReturnsService.update(id, staffId, body);
  }
}
