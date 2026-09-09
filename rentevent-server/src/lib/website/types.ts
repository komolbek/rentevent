// User types
export interface User {
  id: string;
  phoneNumber: string;
  name: string | null;
  createdAt: string;
}

// Category types
export interface Category {
  id: string;
  name: string;
  icon: string | null;
  image: string | null;
  displayOrder: number;
  isActive: boolean;
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
  days: number;
  totalPrice: number;
}

export interface QuantityPricing {
  quantity: number;
  totalPrice: number;
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
  minRentalDays: number;
  maxRentalDays: number;
  depositAmount: number;
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
export type PaymentMethod = 'CASH' | 'ONLINE' | 'PAYME' | 'CLICK' | 'UZUM';
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
