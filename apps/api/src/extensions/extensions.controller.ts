import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ExtensionsService } from './extensions.service';
import { UserAuthGuard } from '../common/guards/user-auth.guard';
import { UserId } from '../common/decorators';
import { parseLimit, parsePage } from '../common/pagination';

@ApiTags('Extensions')
@ApiBearerAuth()
@UseGuards(UserAuthGuard)
@Controller('extensions')
export class ExtensionsController {
  constructor(private extensionsService: ExtensionsService) {}

  @Post()
  @ApiOperation({ summary: 'Request a rental extension' })
  async createExtension(
    @UserId() userId: string,
    @Body()
    body: {
      order_id: string;
      additional_days: number;
      notes?: string;
    },
  ) {
    return this.extensionsService.createExtension(userId, body);
  }

  @Get('my-extensions')
  @ApiOperation({ summary: 'List current user rental extensions' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getMyExtensions(
    @UserId() userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.extensionsService.getMyExtensions(userId, {
      page: parsePage(page),
      limit: parseLimit(limit, 10),
    });
  }
}
