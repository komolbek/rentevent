import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth/admin-middleware'
import { createTranslator } from '@/lib/i18n'
import { z } from 'zod'

const createTemplateSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'Slug must contain only lowercase letters, numbers, and underscores'),
  name: z.string().min(1).max(200),
  body_ru: z.string().min(1).max(2000),
  body_uz: z.string().max(2000).optional().nullable(),
  body_en: z.string().max(2000).optional().nullable(),
  variables: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const t = createTranslator(req)

  if (req.method === 'GET') {
    const {
      page = '1',
      limit = '50',
      search,
      is_active,
    } = req.query

    const pageNum = parseInt(page as string, 10)
    const limitNum = Math.min(parseInt(limit as string, 10), 100)
    const skip = (pageNum - 1) * limitNum

    const where: any = {}

    if (search) {
      where.OR = [
        { slug: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    if (is_active !== undefined) {
      where.isActive = is_active === 'true'
    }

    const [templates, totalCount] = await Promise.all([
      prisma.smsTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.smsTemplate.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limitNum)

    return res.status(200).json({
      success: true,
      data: templates.map(formatTemplate),
      pagination: {
        current_page: pageNum,
        limit: limitNum,
        total_count: totalCount,
        total_pages: totalPages,
        has_more: pageNum < totalPages,
      },
    })
  }

  if (req.method === 'POST') {
    try {
      const body = createTemplateSchema.parse(req.body)

      // Check if slug already exists
      const existing = await prisma.smsTemplate.findUnique({
        where: { slug: body.slug },
      })

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Template with this slug already exists',
        })
      }

      const template = await prisma.smsTemplate.create({
        data: {
          slug: body.slug,
          name: body.name,
          bodyRu: body.body_ru,
          bodyUz: body.body_uz,
          bodyEn: body.body_en,
          variables: body.variables || [],
          isActive: body.is_active ?? true,
        },
      })

      return res.status(201).json({
        success: true,
        data: formatTemplate(template),
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: t('validationError'),
          errors: error.errors,
        })
      }

      console.error('[API_ERROR] POST /api/admin/sms-templates:', error)
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

function formatTemplate(template: any) {
  return {
    id: template.id,
    slug: template.slug,
    name: template.name,
    body_ru: template.bodyRu,
    body_uz: template.bodyUz,
    body_en: template.bodyEn,
    variables: template.variables,
    is_active: template.isActive,
    created_at: template.createdAt,
    updated_at: template.updatedAt,
  }
}

export default requireAdminAuth(handler)
