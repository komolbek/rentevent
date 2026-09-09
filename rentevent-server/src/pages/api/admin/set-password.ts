import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'
import { getStaffFromSession } from '@/lib/auth/admin-middleware'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  const staff = await getStaffFromSession(req)

  if (!staff) {
    return res.status(401).json({ success: false, message: 'Не авторизован' })
  }

  const { password, confirmPassword } = req.body

  if (!password || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Введите пароль и подтверждение',
    })
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Пароли не совпадают',
    })
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Пароль должен содержать минимум 6 символов',
    })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.staff.update({
    where: { id: staff.id },
    data: {
      passwordHash,
      mustChangePassword: false,
      lastLoginAt: new Date(),
    },
  })

  return res.status(200).json({
    success: true,
    message: 'Пароль установлен успешно',
  })
}
