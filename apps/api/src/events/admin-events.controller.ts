import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { EventsService } from './events.service';

interface EventBody {
  title?: string;
  title_uz?: string | null;
  title_en?: string | null;
  description?: string | null;
  description_uz?: string | null;
  description_en?: string | null;
  image_url?: string | null;
  venue?: string | null;
  city?: string | null;
  start_date?: string;
  end_date?: string | null;
  website_url?: string | null;
  is_active?: boolean;
  display_order?: number;
}

@ApiTags('Admin')
@UseGuards(AdminAuthGuard)
@Controller('admin/events')
export class AdminEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'List all events' })
  async findAll() {
    return this.eventsService.findAll();
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Persist a new event display order' })
  async reorder(@Body() body: { orderedIds: string[] }) {
    return this.eventsService.reorder(body.orderedIds);
  }

  @Get(':id/prices')
  @ApiOperation({ summary: 'Every product with its normal and event daily price' })
  async getPrices(@Param('id') id: string) {
    return this.eventsService.getPrices(id);
  }

  @Put(':id/prices')
  @ApiOperation({ summary: 'Set event prices; daily_price null removes the override' })
  async setPrices(
    @Param('id') id: string,
    @Body() body: { prices: { product_id: string; daily_price: number | null }[] },
  ) {
    return this.eventsService.setPrices(id, body.prices);
  }

  @Post()
  @ApiOperation({ summary: 'Create event' })
  async create(@Body() body: EventBody) {
    return this.eventsService.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update event' })
  async update(@Param('id') id: string, @Body() body: EventBody) {
    return this.eventsService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete event' })
  async delete(@Param('id') id: string) {
    return this.eventsService.delete(id);
  }
}
