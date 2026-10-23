import { Module } from '@nestjs/common';
import {
  ContentController,
  AdminHeroSlidesController,
  AdminInspirationsController,
} from './content.controller';
import { ContentService } from './content.service';

@Module({
  controllers: [ContentController, AdminHeroSlidesController, AdminInspirationsController],
  providers: [ContentService],
})
export class ContentModule {}
