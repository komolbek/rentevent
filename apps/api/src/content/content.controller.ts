import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { ContentService, ContentBody, ContentKind } from './content.service';

@ApiTags('Content')
@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('hero-slides')
  @ApiOperation({ summary: 'Active home hero slides, in display order' })
  heroSlides() {
    return this.content.listPublic('heroSlide');
  }

  @Get('inspirations')
  @ApiOperation({ summary: 'Active inspirations, in display order' })
  inspirations() {
    return this.content.listPublic('inspiration');
  }
}

/** One admin CRUD controller per content kind, same routes for both. */
function adminContentController(path: string, kind: ContentKind) {
  @ApiTags('Admin')
  @UseGuards(AdminAuthGuard)
  @Controller(`admin/${path}`)
  class AdminContentController {
    constructor(readonly content: ContentService) {}

    @Get()
    @ApiOperation({ summary: `List all ${path}` })
    findAll() {
      return this.content.listAll(kind);
    }

    @Post('reorder')
    @ApiOperation({ summary: `Persist a new ${path} order` })
    reorder(@Body() body: { orderedIds: string[] }) {
      return this.content.reorder(kind, body.orderedIds);
    }

    @Post()
    @ApiOperation({ summary: `Create one of ${path}` })
    create(@Body() body: ContentBody) {
      return this.content.create(kind, body);
    }

    @Patch(':id')
    @ApiOperation({ summary: `Update one of ${path}` })
    update(@Param('id') id: string, @Body() body: ContentBody) {
      return this.content.update(kind, id, body);
    }

    @Delete(':id')
    @ApiOperation({ summary: `Delete one of ${path}` })
    delete(@Param('id') id: string) {
      return this.content.delete(kind, id);
    }
  }
  return AdminContentController;
}

export const AdminHeroSlidesController = adminContentController('hero-slides', 'heroSlide');
export const AdminInspirationsController = adminContentController('inspirations', 'inspiration');
