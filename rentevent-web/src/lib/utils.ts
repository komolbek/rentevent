import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format price in UZS with space separators
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price).replace(/,/g, ' ');
}

// Format price with currency
export function formatPriceWithCurrency(price: number): string {
  return `${formatPrice(price)} UZS`;
}

// Format phone number for display (+998 XX XXX XX XX)
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('998')) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10, 12)}`;
  }
  return phone;
}

// Parse phone number for API (remove formatting)
export function parsePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('998')) {
    return `+${cleaned}`;
  }
  if (cleaned.length === 9) {
    return `+998${cleaned}`;
  }
  return phone;
}

// Calculate rental days between two dates
export function calculateRentalDays(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1); // Include both start and end dates
}

// Format date for display
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

// Format date short
export function formatDateShort(date: string | Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
  }).format(d);
}

// Format date for API (YYYY-MM-DD)
export function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Get order status label
export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    CONFIRMED: 'Подтверждён',
    PREPARING: 'Готовится',
    DELIVERED: 'Доставлен',
    RETURNED: 'Возвращён',
    CANCELLED: 'Отменён',
  };
  return labels[status] || status;
}

// Get order status color
export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    PREPARING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    RETURNED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

// Get payment method label
export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    PAYME: 'Payme',
    CLICK: 'Click',
    UZUM: 'Uzum',
  };
  return labels[method] || method;
}

// Get delivery type label
export function getDeliveryTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    DELIVERY: 'Доставка',
    SELF_PICKUP: 'Самовывоз',
  };
  return labels[type] || type;
}

// Calculate price based on pricing tiers
export function calculatePrice(
  dailyPrice: number,
  rentalDays: number,
  quantity: number,
  pricingTiers: { minDays: number; maxDays: number | null; dailyPrice: number }[],
  quantityPricing: { minQuantity: number; maxQuantity: number | null; pricePerUnit: number }[]
): { totalPrice: number; dailyPriceUsed: number; savings: number } {
  let effectiveDailyPrice = dailyPrice;

  // Check for quantity discount first (for single-day rentals)
  if (rentalDays === 1 && quantityPricing.length > 0) {
    const qp = quantityPricing
      .filter(q => quantity >= q.minQuantity && (q.maxQuantity === null || quantity <= q.maxQuantity))
      .sort((a, b) => b.minQuantity - a.minQuantity)[0];

    if (qp) {
      effectiveDailyPrice = qp.pricePerUnit;
    }
  }

  // Check for duration discount
  if (rentalDays > 1 && pricingTiers.length > 0) {
    const tier = pricingTiers
      .filter(t => rentalDays >= t.minDays && (t.maxDays === null || rentalDays <= t.maxDays))
      .sort((a, b) => b.minDays - a.minDays)[0];

    if (tier) {
      effectiveDailyPrice = tier.dailyPrice;
    }
  }

  const totalPrice = effectiveDailyPrice * rentalDays * quantity;
  const fullPrice = dailyPrice * rentalDays * quantity;
  const savings = fullPrice - totalPrice;

  return {
    totalPrice,
    dailyPriceUsed: effectiveDailyPrice,
    savings: Math.max(0, savings),
  };
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Debounce function
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Check if date is today
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

// Get tomorrow's date
export function getTomorrow(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

// Add days to date
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
