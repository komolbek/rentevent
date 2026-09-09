import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdminAuth } from '@/lib/auth/admin-middleware'
import { createTranslator } from '@/lib/i18n'

// Popular icon sets to search in - Lucide is commonly used in React projects
const ICON_SETS = ['lucide', 'mdi', 'heroicons', 'tabler']

// Cache for icon search results (in-memory, clears on server restart)
const iconCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 30 // 30 minutes

async function searchIconify(query: string, limit: number = 50): Promise<any[]> {
  const cacheKey = `${query}-${limit}`
  const cached = iconCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    // Use Iconify API to search icons
    // API docs: https://iconify.design/docs/api/search.html
    const prefixes = ICON_SETS.join(',')
    const url = `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=${limit}&prefixes=${prefixes}`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Iconify API error: ${response.status}`)
    }

    const data = await response.json()

    // Format the results
    const icons = (data.icons || []).map((icon: string) => {
      const [prefix, name] = icon.split(':')
      return {
        id: icon,
        name: name,
        prefix: prefix,
        // Iconify CDN URL for preview
        preview_url: `https://api.iconify.design/${prefix}/${name}.svg`,
      }
    })

    // Cache the results
    iconCache.set(cacheKey, { data: icons, timestamp: Date.now() })

    return icons
  } catch (error) {
    console.error('Icon search error:', error)
    return []
  }
}

// Get popular/suggested icons for categories
async function getPopularIcons(): Promise<any[]> {
  const cacheKey = 'popular-icons'
  const cached = iconCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  // Curated list of popular category icons
  const popularIcons = [
    // Furniture & Home
    { id: 'lucide:sofa', name: 'sofa', prefix: 'lucide', category: 'furniture' },
    { id: 'lucide:bed', name: 'bed', prefix: 'lucide', category: 'furniture' },
    { id: 'lucide:armchair', name: 'armchair', prefix: 'lucide', category: 'furniture' },
    { id: 'lucide:lamp', name: 'lamp', prefix: 'lucide', category: 'furniture' },
    { id: 'lucide:home', name: 'home', prefix: 'lucide', category: 'furniture' },

    // Events & Party
    { id: 'lucide:party-popper', name: 'party-popper', prefix: 'lucide', category: 'events' },
    { id: 'lucide:cake', name: 'cake', prefix: 'lucide', category: 'events' },
    { id: 'lucide:gift', name: 'gift', prefix: 'lucide', category: 'events' },
    { id: 'lucide:music', name: 'music', prefix: 'lucide', category: 'events' },
    { id: 'lucide:mic', name: 'mic', prefix: 'lucide', category: 'events' },

    // Tools & Equipment
    { id: 'lucide:wrench', name: 'wrench', prefix: 'lucide', category: 'tools' },
    { id: 'lucide:hammer', name: 'hammer', prefix: 'lucide', category: 'tools' },
    { id: 'lucide:drill', name: 'drill', prefix: 'lucide', category: 'tools' },
    { id: 'lucide:settings', name: 'settings', prefix: 'lucide', category: 'tools' },
    { id: 'lucide:construction', name: 'construction', prefix: 'lucide', category: 'tools' },

    // Kitchen & Dining
    { id: 'lucide:utensils', name: 'utensils', prefix: 'lucide', category: 'kitchen' },
    { id: 'lucide:chef-hat', name: 'chef-hat', prefix: 'lucide', category: 'kitchen' },
    { id: 'lucide:cooking-pot', name: 'cooking-pot', prefix: 'lucide', category: 'kitchen' },
    { id: 'lucide:refrigerator', name: 'refrigerator', prefix: 'lucide', category: 'kitchen' },
    { id: 'lucide:coffee', name: 'coffee', prefix: 'lucide', category: 'kitchen' },

    // Electronics & Tech
    { id: 'lucide:laptop', name: 'laptop', prefix: 'lucide', category: 'electronics' },
    { id: 'lucide:tv', name: 'tv', prefix: 'lucide', category: 'electronics' },
    { id: 'lucide:camera', name: 'camera', prefix: 'lucide', category: 'electronics' },
    { id: 'lucide:projector', name: 'projector', prefix: 'lucide', category: 'electronics' },
    { id: 'lucide:speaker', name: 'speaker', prefix: 'lucide', category: 'electronics' },

    // Sports & Outdoor
    { id: 'lucide:bike', name: 'bike', prefix: 'lucide', category: 'sports' },
    { id: 'lucide:dumbbell', name: 'dumbbell', prefix: 'lucide', category: 'sports' },
    { id: 'lucide:tent', name: 'tent', prefix: 'lucide', category: 'sports' },
    { id: 'lucide:mountain', name: 'mountain', prefix: 'lucide', category: 'sports' },
    { id: 'lucide:waves', name: 'waves', prefix: 'lucide', category: 'sports' },

    // Transport & Vehicles
    { id: 'lucide:car', name: 'car', prefix: 'lucide', category: 'transport' },
    { id: 'lucide:truck', name: 'truck', prefix: 'lucide', category: 'transport' },
    { id: 'lucide:bus', name: 'bus', prefix: 'lucide', category: 'transport' },
    { id: 'lucide:plane', name: 'plane', prefix: 'lucide', category: 'transport' },

    // Clothing & Fashion
    { id: 'lucide:shirt', name: 'shirt', prefix: 'lucide', category: 'fashion' },
    { id: 'lucide:scissors', name: 'scissors', prefix: 'lucide', category: 'fashion' },
    { id: 'lucide:gem', name: 'gem', prefix: 'lucide', category: 'fashion' },
    { id: 'lucide:crown', name: 'crown', prefix: 'lucide', category: 'fashion' },

    // Garden & Plants
    { id: 'lucide:flower', name: 'flower', prefix: 'lucide', category: 'garden' },
    { id: 'lucide:tree-deciduous', name: 'tree-deciduous', prefix: 'lucide', category: 'garden' },
    { id: 'lucide:leaf', name: 'leaf', prefix: 'lucide', category: 'garden' },
    { id: 'lucide:shovel', name: 'shovel', prefix: 'lucide', category: 'garden' },

    // Kids & Toys
    { id: 'lucide:baby', name: 'baby', prefix: 'lucide', category: 'kids' },
    { id: 'lucide:puzzle', name: 'puzzle', prefix: 'lucide', category: 'kids' },
    { id: 'lucide:gamepad-2', name: 'gamepad-2', prefix: 'lucide', category: 'kids' },
    { id: 'lucide:blocks', name: 'blocks', prefix: 'lucide', category: 'kids' },

    // Office & Business
    { id: 'lucide:briefcase', name: 'briefcase', prefix: 'lucide', category: 'office' },
    { id: 'lucide:printer', name: 'printer', prefix: 'lucide', category: 'office' },
    { id: 'lucide:presentation', name: 'presentation', prefix: 'lucide', category: 'office' },
    { id: 'lucide:file-text', name: 'file-text', prefix: 'lucide', category: 'office' },

    // General
    { id: 'lucide:box', name: 'box', prefix: 'lucide', category: 'general' },
    { id: 'lucide:package', name: 'package', prefix: 'lucide', category: 'general' },
    { id: 'lucide:tag', name: 'tag', prefix: 'lucide', category: 'general' },
    { id: 'lucide:star', name: 'star', prefix: 'lucide', category: 'general' },
    { id: 'lucide:heart', name: 'heart', prefix: 'lucide', category: 'general' },
    { id: 'lucide:grid', name: 'grid', prefix: 'lucide', category: 'general' },
  ].map(icon => ({
    ...icon,
    preview_url: `https://api.iconify.design/${icon.prefix}/${icon.name}.svg`,
  }))

  iconCache.set(cacheKey, { data: popularIcons, timestamp: Date.now() })

  return popularIcons
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const t = createTranslator(req)

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: t('methodNotAllowed'),
    })
  }

  try {
    const { query, limit = '50' } = req.query
    const limitNum = Math.min(parseInt(limit as string, 10), 100)

    // If no query, return popular icons
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      const popularIcons = await getPopularIcons()
      return res.status(200).json({
        success: true,
        data: popularIcons,
        source: 'popular',
      })
    }

    // Search icons using Iconify API
    const icons = await searchIconify(query.trim(), limitNum)

    return res.status(200).json({
      success: true,
      data: icons,
      source: 'search',
      query: query.trim(),
    })
  } catch (error) {
    console.error('Icon search error:', error)
    return res.status(500).json({
      success: false,
      message: t('internalServerError'),
    })
  }
}

export default requireAdminAuth(handler)
