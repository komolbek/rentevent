import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth/admin-middleware'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const staffRole = (req as any).staffRole
  const currentStaffId = (req as any).staffId
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid ID' })
  }

  // Only OWNER can manage staff
  if (staffRole !== 'OWNER') {
    return res.status(403).json({
      success: false,
      message: 'Недостаточно прав',
    })
  }

  // PUT - Update staff
  if (req.method === 'PUT') {
    const { name, role, isActive } = req.body

    // Prevent deactivating yourself
    if (id === currentStaffId && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'Нельзя деактивировать свой аккаунт',
      })
    }

    const existing = await prisma.staff.findUnique({ where: { id } })

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Сотрудник не найден',
      })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (role !== undefined) {
      const validRoles = ['OWNER', 'ADMIN', 'MANAGER']
      if (validRoles.includes(role)) updateData.role = role
    }
    if (isActive !== undefined) updateData.isActive = isActive

    const updated = await prisma.staff.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        phoneNumber: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
      },
    })

    return res.status(200).json({
      success: true,
      staff: updated,
      message: 'Данные обновлены',
    })
  }

  // DELETE - Delete staff
  if (req.method === 'DELETE') {
    // Prevent deleting yourself
    if (id === currentStaffId) {
      return res.status(400).json({
        success: false,
        message: 'Нельзя удалить свой аккаунт',
      })
    }

    const existing = await prisma.staff.findUnique({ where: { id } })

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Сотрудник не найден',
      })
    }

    await prisma.staff.delete({ where: { id } })

    return res.status(200).json({
      success: true,
      message: 'Сотрудник удалён',
    })
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed',
  })
}

export default requireAdminAuth(handler)
