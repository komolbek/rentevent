import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth/admin-middleware'
import { createTranslator } from '@/lib/i18n'
import { z } from 'zod'

const settingsSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  working_hours: z.string().optional(),
  telegram_url: z.string().optional().nullable(),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const t = createTranslator(req)

  // GET - Get business settings
  if (req.method === 'GET') {
    try {
      let settings = await prisma.businessSettings.findUnique({
        where: { id: 'default' },
      })

      // Create default settings if not exists
      if (!settings) {
        settings = await prisma.businessSettings.create({
          data: {
            id: 'default',
            name: 'RentEvent',
            phone: '',
            address: '',
            workingHours: '09:00 - 18:00',
            telegramUrl: null,
          },
        })
      }

      return res.status(200).json({
        success: true,
        data: {
          name: settings.name,
          phone: settings.phone,
          address: settings.address,
          latitude: settings.latitude ? settings.latitude.toString() : null,
          longitude: settings.longitude ? settings.longitude.toString() : null,
          working_hours: settings.workingHours,
          telegram_url: settings.telegramUrl,
        },
      })
    } catch (error) {
      console.error('Admin get settings error:', error)
      return res.status(500).json({
        success: false,
        message: t('internalServerError'),
      })
    }
  }

  // PUT - Update business settings
  if (req.method === 'PUT') {
    try {
      const body = settingsSchema.parse(req.body)

      const updateData: any = {}
      if (body.name !== undefined) updateData.name = body.name
      if (body.phone !== undefined) updateData.phone = body.phone
      if (body.address !== undefined) updateData.address = body.address
      if (body.latitude !== undefined) updateData.latitude = body.latitude
      if (body.longitude !== undefined) updateData.longitude = body.longitude
      if (body.working_hours !== undefined) updateData.workingHours = body.working_hours
      if (body.telegram_url !== undefined) updateData.telegramUrl = body.telegram_url

      const settings = await prisma.businessSettings.upsert({
        where: { id: 'default' },
        update: updateData,
        create: {
          id: 'default',
          name: body.name || 'RentEvent',
          phone: body.phone || '',
          address: body.address || '',
          latitude: body.latitude,
          longitude: body.longitude,
          workingHours: body.working_hours || '09:00 - 18:00',
          telegramUrl: body.telegram_url,
        },
      })

      return res.status(200).json({
        success: true,
        data: {
          name: settings.name,
          phone: settings.phone,
          address: settings.address,
          latitude: settings.latitude ? settings.latitude.toString() : null,
          longitude: settings.longitude ? settings.longitude.toString() : null,
          working_hours: settings.workingHours,
          telegram_url: settings.telegramUrl,
        },
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: t('validationError'),
          errors: error.errors,
        })
      }

      console.error('Admin update settings error:', error)
      return res.status(500).json({
        success: false,
        message: t('internalServerError'),
      })
    }
  }

  return res.status(405).json({
    success: false,
    message: t('methodNotAllowed'),
  })
}

export default requireAdminAuth(handler)
