import {
  Controller,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { StaffId } from '../common/decorators';
import { AdminExtensionsService } from './admin-extensions.service';
import { ExtensionStatus } from '@rentevent/db';

@ApiTags('Admin')
@UseGuards(AdminAuthGuard)
@Controller('admin/extensions')
export class AdminExtensionsController {
  constructor(
    private readonly adminExtensionsService: AdminExtensionsService,
  ) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Approve or reject rental extension' })
  async processExtension(
    @Param('id') id: string,
    @StaffId() staffId: string,
    @Body() body: { status: ExtensionStatus; notes?: string },
  ) {
    return this.adminExtensionsService.processExtension(id, staffId, body);
  }
}
