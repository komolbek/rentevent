import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { withAuth } from '@/lib/auth/middleware'
import { createTranslator } from '@/lib/i18n'

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const t = createTranslator(req)

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: t('methodNotAllowed'),
    })
  }

  const { addressId } = req.query

  if (typeof addressId !== 'string') {
    return res.status(400).json({
      success: false,
      message: t('badRequest'),
    })
  }

  try {
    // Verify address belongs to user
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    })

    if (!address) {
      return res.status(404).json({
        success: false,
        message: t('addressNotFound'),
      })
    }

    // Unset all other defaults and set this one
    await prisma.$transaction([
      prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      }),
      prisma.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      }),
    ])

    const updatedAddress = await prisma.address.findUnique({
      where: { id: addressId },
    })

    return res.status(200).json({
      success: true,
      message: t('addressSetDefault'),
      data: {
        id: updatedAddress!.id,
        user_id: updatedAddress!.userId,
        title: updatedAddress!.title,
        full_address: updatedAddress!.fullAddress,
        city: updatedAddress!.city,
        district: updatedAddress!.district,
        street: updatedAddress!.street,
        building: updatedAddress!.building,
        apartment: updatedAddress!.apartment,
        entrance: updatedAddress!.entrance,
        floor: updatedAddress!.floor,
        latitude: updatedAddress!.latitude ? Number(updatedAddress!.latitude) : null,
        longitude: updatedAddress!.longitude ? Number(updatedAddress!.longitude) : null,
        is_default: updatedAddress!.isDefault,
        created_at: updatedAddress!.createdAt,
      },
    })
  } catch (error) {
    console.error('Set default address error:', error)
    return res.status(500).json({
      success: false,
      message: t('internalServerError'),
    })
  }
}

export default withAuth(handler)
