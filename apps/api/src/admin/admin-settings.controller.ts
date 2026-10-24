import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { AdminSettingsService } from './admin-settings.service';

@ApiTags('Admin')
@UseGuards(AdminAuthGuard)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private adminSettingsService: AdminSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get business settings' })
  async getSettings() {
    return this.adminSettingsService.getSettings();
  }

  @Put()
  @ApiOperation({ summary: 'Update business settings' })
  async updateSettings(
    @Body()
    body: {
      name?: string;
      phone?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      working_hours?: string;
      telegram_url?: string;
      app_store_url?: string | null;
      play_store_url?: string | null;
      product_notice?: string | null;
      product_notice_uz?: string | null;
      product_notice_en?: string | null;
    },
  ) {
    return this.adminSettingsService.updateSettings(body);
  }
}
