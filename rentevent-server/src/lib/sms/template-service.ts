import prisma from '@/lib/db'

export interface TemplateRenderResult {
  body: string
  slug: string
  name: string
}

/**
 * Render an SMS template by slug with variable substitution.
 *
 * Variables in the template body are denoted by {variable_name}.
 * The `variables` parameter is a record of variable name to value.
 *
 * @param slug - The template slug (e.g., "order_confirmed")
 * @param variables - Key-value pairs for variable substitution
 * @param language - Language code: "ru", "uz", or "en"
 * @returns The rendered template or null if not found/inactive
 */
export async function renderTemplate(
  slug: string,
  variables: Record<string, string>,
  language: 'ru' | 'uz' | 'en' = 'ru'
): Promise<TemplateRenderResult | null> {
  const template = await prisma.smsTemplate.findUnique({
    where: { slug },
  })

  if (!template || !template.isActive) {
    return null
  }

  // Select the body based on the requested language, falling back to Russian
  let body: string
  switch (language) {
    case 'uz':
      body = template.bodyUz || template.bodyRu
      break
    case 'en':
      body = template.bodyEn || template.bodyRu
      break
    default:
      body = template.bodyRu
  }

  // Substitute variables: replace {variable_name} with actual values
  const rendered = body.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match
  })

  return {
    body: rendered,
    slug: template.slug,
    name: template.name,
  }
}

/**
 * Get all available variable names from a template body.
 */
export function extractVariables(body: string): string[] {
  const matches = body.match(/\{(\w+)\}/g)
  if (!matches) return []
  return [...new Set(matches.map((m) => m.slice(1, -1)))]
}
