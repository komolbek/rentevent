/**
 * Order pricing: the one place that turns cart items into money.
 * Used by both POST /orders (create) and POST /orders/quote, so a quote
 * always equals the order the same cart would create.
 */

export interface PricedProduct {
  id: string;
  name: string;
  photos: string[];
  dailyPrice: number;
  pricingTiers: { days: number; totalPrice: number }[];
  quantityPricing: { quantity: number; totalPrice: number }[];
}

export interface PricingInput {
  items: { product_id: string; quantity: number }[];
  products: Map<string, PricedProduct>;
  rentalDays: number;
  /** Event price per product id (only rows that have a price). */
  eventPrices: Map<string, number>;
  /** FLAT: the event price covers the whole fair, whatever the day count. */
  flat: boolean;
}

export interface PricedItem {
  productId: string;
  productName: string;
  productPhoto: string | null;
  quantity: number;
  dailyPrice: number;
  totalPrice: number;
  savings: number;
}

export interface PricedOrder {
  items: PricedItem[];
  subtotal: number;
  totalAmount: number;
  totalSavings: number;
}

export function priceOrder(input: PricingInput): PricedOrder {
  const { items, products, rentalDays, eventPrices, flat } = input;
  let subtotal = 0;
  let totalSavings = 0;
  const priced: PricedItem[] = [];

  for (const item of items) {
    const product = products.get(item.product_id)!;

    // Event prices replace the product's own price (and its tiers) for
    // the products the event lists; everything else keeps normal pricing.
    const eventPrice = eventPrices.get(product.id);
    if (eventPrice !== undefined) {
      const itemTotal = flat
        ? eventPrice * item.quantity
        : eventPrice * rentalDays * item.quantity;
      subtotal += itemTotal;
      priced.push({
        productId: product.id,
        productName: product.name,
        productPhoto: product.photos[0] || null,
        quantity: item.quantity,
        // Per-day equivalent, so "qty × daily × days" still adds up in admin.
        dailyPrice: flat ? Math.round(eventPrice / rentalDays) : eventPrice,
        totalPrice: itemTotal,
        savings: 0,
      });
      continue;
    }

    // Determine per-unit price from pricing tiers
    let unitPrice: number;
    const matchingTier = product.pricingTiers
      .filter((t) => t.days <= rentalDays)
      .sort((a, b) => b.days - a.days)[0];

    if (matchingTier) {
      unitPrice = matchingTier.totalPrice;
    } else {
      unitPrice = product.dailyPrice * rentalDays;
    }

    // Apply quantity pricing discount
    const matchingQty = product.quantityPricing
      .filter((q) => q.quantity <= item.quantity)
      .sort((a, b) => b.quantity - a.quantity)[0];

    let itemTotal: number;
    const baseTotal = unitPrice * item.quantity;

    if (matchingQty) {
      itemTotal = matchingQty.totalPrice * rentalDays;
    } else {
      itemTotal = baseTotal;
    }

    const savings = baseTotal - itemTotal;
    subtotal += itemTotal;
    totalSavings += savings;

    priced.push({
      productId: product.id,
      productName: product.name,
      productPhoto: product.photos[0] || null,
      quantity: item.quantity,
      dailyPrice: product.dailyPrice,
      totalPrice: itemTotal,
      savings,
    });
  }

  return { items: priced, subtotal, totalAmount: subtotal, totalSavings };
}
