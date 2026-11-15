import { z } from 'zod';
import { phoneNumberSchema } from './common';

// Categories
export const createCategorySchema = z.object({
  name: z.string().min(1),
  image_url: z.string().optional().nullable(),
  icon_name: z.string().optional().nullable(),
  parent_category_id: z.string().optional().nullable(),
  display_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  id: z.string(),
});

// Business Settings
export const updateSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  working_hours: z.string().optional(),
  telegram_url: z.string().optional().nullable(),
});

// Delivery Zones
export const createDeliveryZoneSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().int().min(0),
  is_free: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export const updateDeliveryZoneSchema = createDeliveryZoneSchema.partial();

// Staff
export const createStaffSchema = z.object({
  phone_number: phoneNumberSchema,
  name: z.string().min(1),
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER']),
});

export const updateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER']).optional(),
  is_active: z.boolean().optional(),
});

// SMS Templates
export const createSmsTemplateSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'Slug must contain only lowercase letters, numbers, and underscores'),
  name: z.string().min(1).max(200),
  body_ru: z.string().min(1).max(2000),
  body_uz: z.string().max(2000).optional().nullable(),
  body_en: z.string().max(2000).optional().nullable(),
  variables: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

export const updateSmsTemplateSchema = createSmsTemplateSchema.partial();

// Customers
export const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
  admin_note: z.string().optional().nullable(),
});

// Reviews (admin)
export const toggleReviewVisibilitySchema = z.object({
  is_visible: z.boolean(),
});

// Admin Auth
export const adminLoginSchema = z.object({
  phone_number: phoneNumberSchema,
  password: z.string().min(1),
});

export const setPasswordSchema = z.object({
  password: z.string().min(10),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(10),
});

// Order Status
export const updateOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'PREPARING', 'DELIVERED', 'RETURNED', 'CANCELLED']),
  notes: z.string().optional().nullable(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type CreateDeliveryZoneInput = z.infer<typeof createDeliveryZoneSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type CreateSmsTemplateInput = z.infer<typeof createSmsTemplateSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
