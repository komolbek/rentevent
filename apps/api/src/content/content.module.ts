import { Module } from '@nestjs/common';
import {
  ContentController,
  AdminHeroSlidesController,
  AdminInspirationsController,
} from './content.controller';
import { ContentService } from './content.service';
import { AdminUploadService } from '../admin/admin-upload.service';

@Module({
  controllers: [ContentController, AdminHeroSlidesController, AdminInspirationsController],
  providers: [ContentService, AdminUploadService],
})
export class ContentModule {}
