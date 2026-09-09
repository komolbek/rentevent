import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth/admin-middleware'
import { createTranslator } from '@/lib/i18n'
import { z } from 'zod'

const updateTemplateSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'Slug must contain only lowercase letters, numbers, and underscores').optional(),
  name: z.string().min(1).max(200).optional(),
  body_ru: z.string().min(1).max(2000).optional(),
  body_uz: z.string().max(2000).optional().nullable(),
  body_en: z.string().max(2000).optional().nullable(),
  variables: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const t = createTranslator(req)
  const { id } = req.query

  if (req.method === 'PUT') {
    try {
      const body = updateTemplateSchema.parse(req.body)

      const template = await prisma.smsTemplate.findUnique({
        where: { id: id as string },
      })

      if (!template) {
        return res.status(404).json({
          success: false,
          message: t('notFound'),
        })
      }

      // If slug is changing, check for uniqueness
      if (body.slug && body.slug !== template.slug) {
        const existing = await prisma.smsTemplate.findUnique({
          where: { slug: body.slug },
        })
        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'Template with this slug already exists',
          })
        }
      }

      const updated = await prisma.smsTemplate.update({
        where: { id: id as string },
        data: {
          ...(body.slug !== undefined && { slug: body.slug }),
          ...(body.name !== undefined && { name: body.name }),
          ...(body.body_ru !== undefined && { bodyRu: body.body_ru }),
          ...(body.body_uz !== undefined && { bodyUz: body.body_uz }),
          ...(body.body_en !== undefined && { bodyEn: body.body_en }),
          ...(body.variables !== undefined && { variables: body.variables }),
          ...(body.is_active !== undefined && { isActive: body.is_active }),
        },
      })

      return res.status(200).json({
        success: true,
        data: formatTemplate(updated),
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: t('validationError'),
          errors: error.errors,
        })
      }

      console.error('[API_ERROR] PUT /api/admin/sms-templates/[id]:', error)
      return res.status(500).json({
        success: false,
        message: t('internalServerError'),
      })
    }
  }

  if (req.method === 'DELETE') {
    const template = await prisma.smsTemplate.findUnique({
      where: { id: id as string },
    })

    if (!template) {
      return res.status(404).json({
        success: false,
        message: t('notFound'),
      })
    }

    await prisma.smsTemplate.delete({
      where: { id: id as string },
    })

    return res.status(200).json({
      success: true,
      message: 'Template deleted',
    })
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
