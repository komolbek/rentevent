import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class BusinessSettingsService {
  constructor(private prisma: PrismaService) {}

  async getBusinessInfo() {
    const [settings, deliveryZones] = await Promise.all([
      this.prisma.businessSettings.findFirst(),
      this.prisma.deliveryZone.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          price: true,
          isFree: true,
        },
      }),
    ]);

    return {
      name: settings?.name ?? 'RentEvent',
      phone: settings?.phone ?? '',
      address: settings?.address ?? '',
      latitude: settings?.latitude ?? null,
      longitude: settings?.longitude ?? null,
      workingHours: settings?.workingHours ?? '09:00 - 18:00',
      telegramUrl: settings?.telegramUrl ?? null,
      appStoreUrl: settings?.appStoreUrl ?? null,
      playStoreUrl: settings?.playStoreUrl ?? null,
      productNotice: settings?.productNotice ?? null,
      productNoticeUz: settings?.productNoticeUz ?? null,
      productNoticeEn: settings?.productNoticeEn ?? null,
      deliveryZones,
    };
  }
}
