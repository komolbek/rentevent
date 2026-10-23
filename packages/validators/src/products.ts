import { z } from 'zod';

const specificationsSchema = z.object({
  width: z.string().optional().nullable(),
  height: z.string().optional().nullable(),
  depth: z.string().optional().nullable(),
  weight: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
});

const pricingTierSchema = z.object({
  days: z.number().int().positive(),
  total_price: z.number().int().positive(),
});

const quantityPricingSchema = z.object({
  quantity: z.number().int().positive(),
  total_price: z.number().int().positive(),
});

export const createProductSchema = z.object({
  name: z.string().min(1),
  category_id: z.string(),
  photos: z.array(z.string()).max(5).optional(),
  daily_price: z.number().int().positive(),
  total_stock: z.number().int().positive(),
  is_active: z.boolean().optional(),
  specifications: specificationsSchema.optional(),
  pricing_tiers: z.array(pricingTierSchema).optional(),
  quantity_pricing: z.array(quantityPricingSchema).optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  category_id: z.string().optional(),
  photos: z.array(z.string()).max(5).optional(),
  daily_price: z.number().int().positive().optional(),
  total_stock: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
  specifications: specificationsSchema.optional(),
  pricing_tiers: z.array(pricingTierSchema).optional(),
  quantity_pricing: z.array(quantityPricingSchema).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
