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
import { ReturnsService } from './returns.service';
import { UserAuthGuard } from '../common/guards/user-auth.guard';
import { UserId } from '../common/decorators';
import { parseLimit, parsePage } from '../common/pagination';

@ApiTags('Returns')
@ApiBearerAuth()
@UseGuards(UserAuthGuard)
@Controller('returns')
export class ReturnsController {
  constructor(private returnsService: ReturnsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a return request' })
  async createReturn(
    @UserId() userId: string,
    @Body()
    body: {
      order_id: string;
      reason?: string;
      photos?: string[];
    },
  ) {
    return this.returnsService.createReturn(userId, body);
  }

  @Get('my-returns')
  @ApiOperation({ summary: 'List current user return requests' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getMyReturns(
    @UserId() userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.returnsService.getMyReturns(userId, {
      page: parsePage(page),
      limit: parseLimit(limit, 10),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get return request details' })
  async getReturn(
    @UserId() userId: string,
    @Param('id') id: string,
  ) {
    return this.returnsService.getReturn(userId, id);
  }
}
