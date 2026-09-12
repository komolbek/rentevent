// ==================== Enums ====================

export enum StaffRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
}

export enum OrderStatus {
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
}

export enum DeliveryType {
  DELIVERY = 'DELIVERY',
  SELF_PICKUP = 'SELF_PICKUP',
}

export enum PaymentMethod {
  CASH = 'CASH',
  ONLINE = 'ONLINE',
  UZUM = 'UZUM',
  RAHMAT = 'RAHMAT',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

export enum CorporateInvoiceStatus {
  PENDING = 'PENDING',
  OFFER_SENT = 'OFFER_SENT',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum ReturnStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  PICKUP_SCHEDULED = 'PICKUP_SCHEDULED',
  PICKED_UP = 'PICKED_UP',
  INSPECTED = 'INSPECTED',
  REFUND_ISSUED = 'REFUND_ISSUED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export enum DamageLevel {
  NONE = 'NONE',
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
}

export enum ExtensionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export type CardType = 'VISA' | 'MASTERCARD' | 'HUMO' | 'UZCARD' | 'UNKNOWN';

// ==================== User & Auth ====================

export interface IUser {
  id: string;
  phoneNumber: string;
  name: string | null;
  language: string;
  isActive: boolean;
  createdAt: string;
}

export interface ICard {
  id: string;
  userId: string;
  cardNumber: string;
  cardHolder: string;
  expiryMonth: number;
  expiryYear: number;
  cardType: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ISession {
  id: string;
  sessionToken: string;
  userId: string;
  deviceId: string;
  deviceInfo: string | null;
  expires: string;
  createdAt: string;
}

export interface IAddress {
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

// ==================== Catalog ====================

export interface ICategory {
  id: string;
  name: string;
  imageUrl: string | null;
  iconName: string | null;
  parentCategoryId: string | null;
  displayOrder: number;
  isActive: boolean;
  children?: ICategory[];
  _count?: { products: number };
  createdAt: string;
}

export interface IPricingTier {
  id: string;
  productId: string;
  days: number;
  totalPrice: number;
}

export interface IQuantityPricing {
  id: string;
  productId: string;
  quantity: number;
  totalPrice: number;
}

export interface IProduct {
  id: string;
  name: string;
  nameUz?: string | null;
  nameEn?: string | null;
  description: string | null;
  descriptionUz?: string | null;
  descriptionEn?: string | null;
  categoryId: string;
  category?: ICategory;
  photos: string[];
  dailyPrice: number;
  totalStock: number;
  /**
   * Units free for the requested rental period. Present only when the
   * product list was asked for a date range (start_date / end_date);
   * otherwise fall back to totalStock.
   */
  availableStock?: number;
  isActive: boolean;
  specWidth: string | null;
  specHeight: string | null;
  specDepth: string | null;
  specWeight: string | null;
  specColor: string | null;
  specMaterial: string | null;
  minRentalDays: number;
  maxRentalDays: number;
  depositAmount: number;
  pricingTiers: IPricingTier[];
  quantityPricing: IQuantityPricing[];
  createdAt: string;
}

export interface IDayAvailability {
  date: string;
  availableQuantity: number;
  totalStock: number;
}

// ==================== Orders ====================

export interface IOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productPhoto: string | null;
  quantity: number;
  dailyPrice: number;
  totalPrice: number;
  savings: number;
}

export interface IOrder {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  deliveryType: DeliveryType;
  deliveryAddressId: string | null;
  deliveryFee: number;
  subtotal: number;
  totalAmount: number;
  totalSavings: number;
  rentalStartDate: string;
  rentalEndDate: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  companyName: string | null;
  companyInn: string | null;
  corporateInvoiceStatus: CorporateInvoiceStatus | null;
  corporateInvoiceNote: string | null;
  notes: string | null;
  adminNotes: string | null;
  items: IOrderItem[];
  deliveryAddress: IAddress | null;
  createdAt: string;
  updatedAt: string;
}

export interface IOrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  notes: string | null;
  createdAt: string;
  createdBy: string | null;
}

// ==================== Delivery ====================

export interface IDeliveryZone {
  id: string;
  name: string;
  price: number;
  isFree: boolean;
  isActive: boolean;
}

// ==================== Business Settings ====================

export interface IBusinessSettings {
  id: string;
  name: string;
  phone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  workingHours: string;
  telegramUrl: string | null;
}

// ==================== Reviews ====================

export interface IReview {
  id: string;
  userId: string;
  productId: string;
  orderId: string | null;
  rating: number;
  comment: string | null;
  photos: string[];
  isVisible: boolean;
  createdAt: string;
  user?: { name: string | null; phoneNumber: string };
}

export interface IReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, number>;
}

// ==================== Returns ====================

export interface IReturnRequest {
  id: string;
  orderId: string;
  userId: string;
  status: ReturnStatus;
  reason: string | null;
  photos: string[];
  damageLevel: DamageLevel;
  damageNotes: string | null;
  damageFee: number;
  refundAmount: number;
  pickupDate: string | null;
  inspectionNotes: string | null;
  processedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==================== Rental Extensions ====================

export interface IRentalExtension {
  id: string;
  orderId: string;
  userId: string;
  originalEndDate: string;
  newEndDate: string;
  additionalDays: number;
  additionalCost: number;
  status: ExtensionStatus;
  notes: string | null;
  processedBy: string | null;
  createdAt: string;
}

// ==================== SMS Templates ====================

export interface ISmsTemplate {
  id: string;
  slug: string;
  name: string;
  bodyRu: string;
  bodyUz: string | null;
  bodyEn: string | null;
  variables: string[];
  isActive: boolean;
}

// ==================== Staff ====================

export interface IStaff {
  id: string;
  phoneNumber: string;
  name: string;
  role: StaffRole;
  mustChangePassword: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

// ==================== Notifications ====================

export interface INotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  data: unknown;
  isRead: boolean;
  createdAt: string;
}

// ==================== API Response Types ====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
