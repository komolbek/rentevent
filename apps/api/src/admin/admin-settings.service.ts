import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class AdminSettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    const settings = await this.prisma.businessSettings.findFirst();

    return {
      settings: settings || {
        id: 'default',
        name: 'RentEvent',
        phone: '',
        address: '',
        latitude: null,
        longitude: null,
        workingHours: '09:00 - 18:00',
        telegramUrl: null,
        appStoreUrl: null,
        playStoreUrl: null,
        productNotice: null,
        productNoticeUz: null,
        productNoticeEn: null,
      },
    };
  }

  async updateSettings(data: {
    name?: string;
    phone?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    working_hours?: string;
    telegram_url?: string;
    app_store_url?: string | null;
    play_store_url?: string | null;
    product_notice?: string | null;
    product_notice_uz?: string | null;
    product_notice_en?: string | null;
  }) {
    const settings = await this.prisma.businessSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.working_hours !== undefined && { workingHours: data.working_hours }),
        ...(data.telegram_url !== undefined && { telegramUrl: data.telegram_url }),
        ...(data.app_store_url !== undefined && { appStoreUrl: data.app_store_url || null }),
        ...(data.play_store_url !== undefined && { playStoreUrl: data.play_store_url || null }),
        ...(data.product_notice !== undefined && { productNotice: data.product_notice?.trim() || null }),
        ...(data.product_notice_uz !== undefined && { productNoticeUz: data.product_notice_uz?.trim() || null }),
        ...(data.product_notice_en !== undefined && { productNoticeEn: data.product_notice_en?.trim() || null }),
      },
      update: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.working_hours !== undefined && { workingHours: data.working_hours }),
        ...(data.telegram_url !== undefined && { telegramUrl: data.telegram_url }),
        ...(data.app_store_url !== undefined && { appStoreUrl: data.app_store_url || null }),
        ...(data.play_store_url !== undefined && { playStoreUrl: data.play_store_url || null }),
        ...(data.product_notice !== undefined && { productNotice: data.product_notice?.trim() || null }),
        ...(data.product_notice_uz !== undefined && { productNoticeUz: data.product_notice_uz?.trim() || null }),
        ...(data.product_notice_en !== undefined && { productNoticeEn: data.product_notice_en?.trim() || null }),
      },
    });

    return { settings };
  }
}
