import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';

import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminProductsController } from './admin-products.controller';
import { AdminProductsService } from './admin-products.service';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminCategoriesService } from './admin-categories.service';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';
import { AdminReturnsController } from './admin-returns.controller';
import { AdminReturnsService } from './admin-returns.service';
import { AdminReviewsController } from './admin-reviews.controller';
import { AdminReviewsService } from './admin-reviews.service';
import { AdminExtensionsController } from './admin-extensions.controller';
import { AdminExtensionsService } from './admin-extensions.service';
import { AdminDeliveryZonesController } from './admin-delivery-zones.controller';
import { AdminDeliveryZonesService } from './admin-delivery-zones.service';
import { AdminStaffController } from './admin-staff.controller';
import { AdminStaffService } from './admin-staff.service';
import { AdminCustomersController } from './admin-customers.controller';
import { AdminCustomersService } from './admin-customers.service';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminSettingsService } from './admin-settings.service';
import { AdminUploadController } from './admin-upload.controller';
import { AdminUploadService } from './admin-upload.service';
import { devOtpControllers } from './admin-dev-otp.controller';

@Module({
  imports: [AuthModule],
  controllers: [
    AdminAuthController,
    AdminDashboardController,
    AdminProductsController,
    AdminCategoriesController,
    AdminOrdersController,
    AdminReturnsController,
    AdminReviewsController,
    AdminExtensionsController,
    AdminDeliveryZonesController,
    AdminStaffController,
    AdminCustomersController,
    AdminSettingsController,
    AdminUploadController,
    ...devOtpControllers(process.env.NODE_ENV),
  ],
  providers: [
    AdminAuthService,
    AdminDashboardService,
    AdminProductsService,
    AdminCategoriesService,
    AdminOrdersService,
    AdminReturnsService,
    AdminReviewsService,
    AdminExtensionsService,
    AdminDeliveryZonesService,
    AdminStaffService,
    AdminCustomersService,
    AdminSettingsService,
    AdminUploadService,
  ],
})
export class AdminModule {}
