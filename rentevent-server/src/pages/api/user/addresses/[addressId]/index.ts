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
  const { addressId } = req.query

  if (typeof addressId !== 'string') {
    return res.status(400).json({
      success: false,
      message: t('badRequest'),
    })
  }

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

  if (req.method === 'DELETE') {
    try {
      // If deleting default address, set another as default
      if (address.isDefault) {
        const otherAddress = await prisma.address.findFirst({
          where: { userId, id: { not: addressId } },
          orderBy: { createdAt: 'desc' },
        })

        if (otherAddress) {
          await prisma.address.update({
            where: { id: otherAddress.id },
            data: { isDefault: true },
          })
        }
      }

      await prisma.address.delete({
        where: { id: addressId },
      })

      return res.status(200).json({
        success: true,
        message: t('addressDeleted'),
      })
    } catch (error) {
      console.error('Delete address error:', error)
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

export default withAuth(handler)
