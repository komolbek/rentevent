// User types
export interface User {
  id: string;
  phone_number: string;
  name: string | null;
  created_at: string;
}

// Category types
export interface CategoryChild {
  id: string;
  name: string;
  image_url: string | null;
  icon_name: string | null;
  display_order: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  image: string | null;
  icon_name?: string | null;
  image_url?: string | null;
  parent_category_id?: string | null;
  displayOrder: number;
  isActive: boolean;
  children_count?: number;
  products_count?: number;
  children?: CategoryChild[];
  createdAt: string;
  _count?: {
    products: number;
  };
}

// Product types
export interface ProductSpecifications {
  width?: number;
  height?: number;
  depth?: number;
  weight?: number;
  color?: string;
  material?: string;
}

export interface PricingTier {
  id: string;
  productId: string;
  minDays: number;
  maxDays: number | null;
  dailyPrice: number;
}

export interface QuantityPricing {
  id: string;
  productId: string;
  minQuantity: number;
  maxQuantity: number | null;
  pricePerUnit: number;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  category?: Category;
  photos: string[];
  specifications: ProductSpecifications;
  dailyPrice: number;
  pricingTiers: PricingTier[];
  quantityPricing: QuantityPricing[];
  totalStock: number;
  isActive: boolean;
  createdAt: string;
}

export interface ProductAvailability {
  available: boolean;
  availableQuantity: number;
  totalStock: number;
  reservedQuantity: number;
}

// Address types
export interface Address {
  id: string;
  userId: string;
  title: string;
  fullAddress: string;
  city: string;
  district: string | null;
  street: string | null;
  building: string | null;
  apartment: string | null;
  entrance: string | null;
  floor: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  createdAt: string;
}

// Card types
export type CardType = 'VISA' | 'MASTERCARD' | 'HUMO' | 'UZCARD' | 'UNKNOWN';

export interface Card {
  id: string;
  userId: string;
  cardNumber: string; // Masked
  cardType: CardType;
  expiryDate: string;
  isDefault: boolean;
  createdAt: string;
}

// Order types
export type OrderStatus = 'CONFIRMED' | 'PREPARING' | 'DELIVERED' | 'RETURNED' | 'CANCELLED';
export type DeliveryType = 'DELIVERY' | 'SELF_PICKUP';
export type PaymentMethod = 'PAYME' | 'CLICK' | 'UZUM';
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product: Product;
  quantity: number;
  dailyPrice: number;
  totalPrice: number;
  rentalDays: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  deliveryType: DeliveryType;
  deliveryAddress: Address | null;
  deliveryAddressId: string | null;
  deliveryFee: number;
  subtotal: number;
  totalAmount: number;
  totalSavings: number;
  rentalStartDate: string;
  rentalEndDate: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Cart types
export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  rentalStartDate: string;
  rentalEndDate: string;
  rentalDays: number;
  dailyPrice: number;
  totalPrice: number;
  savings: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  totalSavings: number;
  deliveryFee: number;
  total: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Auth types
export interface SendOTPResponse {
  success: boolean;
  message: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  token: string;
  user: User;
}

// Business Settings
export interface BusinessSettings {
  id: string;
  businessName: string;
  address: string;
  phone: string;
  email: string | null;
  workingHours: {
    [key: string]: { open: string; close: string; isClosed?: boolean };
  };
  latitude: number | null;
  longitude: number | null;
}

// Delivery Zone
export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  isActive: boolean;
}

// Review types
export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, number>; // { 1: 2, 2: 5, 3: 10, 4: 20, 5: 50 }
}

export interface CreateReviewInput {
  productId: string;
  rating: number;
  comment: string;
}

// Return Request types
export interface ReturnRequest {
  id: string;
  orderId: string;
  userId: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
}

// Rental Extension types
export interface RentalExtension {
  id: string;
  orderId: string;
  userId: string;
  originalEndDate: string;
  newEndDate: string;
  additionalDays: number;
  additionalCost: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

// Product Availability by Date
export interface DayAvailability {
  date: string;
  availableQuantity: number;
  totalStock: number;
}
