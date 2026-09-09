import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth/admin-middleware'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const staffRole = (req as any).staffRole

  // Only OWNER can manage staff
  if (staffRole !== 'OWNER') {
    return res.status(403).json({
      success: false,
      message: 'Недостаточно прав',
    })
  }

  // GET - List all staff
  if (req.method === 'GET') {
    const staff = await prisma.staff.findMany({
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
      orderBy: { createdAt: 'desc' },
    })

    return res.status(200).json({
      success: true,
      staff,
    })
  }

  // POST - Create new staff
  if (req.method === 'POST') {
    const { name, phone, role } = req.body

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Укажите имя и номер телефона',
      })
    }

    // Normalize phone
    const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`

    // Validate phone format
    if (!/^\+998\d{9}$/.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Неверный формат номера телефона',
      })
    }

    // Check if phone already exists
    const existing = await prisma.staff.findUnique({
      where: { phoneNumber: normalizedPhone },
    })

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Сотрудник с таким номером уже существует',
      })
    }

    // Validate role
    const validRoles = ['OWNER', 'ADMIN', 'MANAGER']
    const staffRole = role && validRoles.includes(role) ? role : 'MANAGER'

    const newStaff = await prisma.staff.create({
      data: {
        name: name.trim(),
        phoneNumber: normalizedPhone,
        role: staffRole,
        mustChangePassword: true,
      },
      select: {
        id: true,
        phoneNumber: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
    })

    return res.status(201).json({
      success: true,
      staff: newStaff,
      message: 'Сотрудник добавлен',
    })
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed',
  })
}

export default requireAdminAuth(handler)
