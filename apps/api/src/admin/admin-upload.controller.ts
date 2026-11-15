import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import {
  AdminUploadService,
  MAX_UPLOAD_BYTES,
} from './admin-upload.service';

@ApiTags('Admin')
@UseGuards(AdminAuthGuard)
@Controller('admin/upload')
export class AdminUploadController {
  constructor(private adminUploadService: AdminUploadService) {}

  @Post('image')
  @ApiOperation({ summary: 'Upload image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async uploadImage(@UploadedFile() file: any) {
    return this.adminUploadService.uploadImage(file);
  }
}
