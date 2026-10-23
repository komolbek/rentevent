import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ReturnsModule } from './returns/returns.module';
import { ExtensionsModule } from './extensions/extensions.module';
import { UsersModule } from './users/users.module';
import { BusinessSettingsModule } from './business-settings/business-settings.module';
import { PaymentsModule } from './payments/payments.module';
import { EventsModule } from './events/events.module';
import { ContentModule } from './content/content.module';
import { SetsModule } from './sets/sets.module';
import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AdminModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    ReviewsModule,
    ReturnsModule,
    ExtensionsModule,
    UsersModule,
    BusinessSettingsModule,
    PaymentsModule,
    EventsModule,
    ContentModule,
    SetsModule,
  ],
})
export class AppModule {}
