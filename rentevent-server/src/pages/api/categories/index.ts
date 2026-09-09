import prisma from '@/lib/db'
import { withErrorHandler } from '@/lib/api/error-handler'

export default withErrorHandler({ methods: ['GET'] }, async (req, res) => {
  const { parent_id } = req.query

  const where: any = { isActive: true }

  if (parent_id && typeof parent_id === 'string') {
    where.parentCategoryId = parent_id
  } else {
    where.parentCategoryId = null
  }

  const categories = await prisma.category.findMany({
    where,
    include: {
      children: {
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          iconName: true,
          displayOrder: true,
        },
      },
      _count: { select: { products: true, children: true } },
    },
    orderBy: { displayOrder: 'asc' },
  })

  return res.status(200).json({
    success: true,
    data: categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      image_url: cat.imageUrl,
      icon_name: cat.iconName,
      parent_category_id: cat.parentCategoryId,
      display_order: cat.displayOrder,
      is_active: cat.isActive,
      children_count: cat._count.children,
      products_count: cat._count.products,
      children: cat.children.map((child) => ({
        id: child.id,
        name: child.name,
        image_url: child.imageUrl,
        icon_name: child.iconName,
        display_order: child.displayOrder,
      })),
      created_at: cat.createdAt,
    })),
  })
})
