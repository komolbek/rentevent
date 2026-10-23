import { z } from 'zod';

export const createOrderSchema = z.object({
  items: z.array(z.object({
    product_id: z.string(),
    quantity: z.number().int().positive(),
  })).min(1),
  delivery_type: z.enum(['DELIVERY', 'SELF_PICKUP']),
  delivery_address_id: z.string().optional().nullable(),
  rental_start_date: z.string(),
  rental_end_date: z.string(),
  payment_method: z.enum(['PAYME', 'CLICK', 'UZUM']),
  card_id: z.string().optional().nullable(),
  event_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
