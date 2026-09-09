import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type {
  User,
  Category,
  Product,
  ProductAvailability,
  DayAvailability,
  Address,
  Card,
  Order,
  SendOTPResponse,
  VerifyOTPResponse,
  PaginatedResponse,
  BusinessSettings,
  DeliveryZone,
  Review,
  ReviewStats,
  CreateReviewInput,
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  sendOTP: async (phoneNumber: string): Promise<SendOTPResponse> => {
    const { data } = await api.post('/auth/send-otp', { phone_number: phoneNumber });
    return data;
  },

  verifyOTP: async (phoneNumber: string, code: string, deviceId: string): Promise<VerifyOTPResponse> => {
    const { data } = await api.post('/auth/verify-otp', {
      phone_number: phoneNumber,
      code,
      device_id: deviceId,
    });
    return data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    localStorage.removeItem('auth_token');
  },
};

// Categories API
export const categoriesApi = {
  getAll: async (): Promise<Category[]> => {
    const { data } = await api.get('/categories');
    return data.categories || data;
  },
};

// Products API
export const productsApi = {
  getAll: async (params?: {
    category_id?: string;
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }): Promise<PaginatedResponse<Product>> => {
    const { data } = await api.get('/products', { params });
    return data;
  },

  getById: async (id: string): Promise<Product> => {
    const { data } = await api.get(`/products/${id}`);
    return data.product || data;
  },

  checkAvailability: async (
    id: string,
    startDate: string,
    endDate: string,
    quantity?: number
  ): Promise<ProductAvailability> => {
    const { data } = await api.get(`/products/${id}/availability`, {
      params: { start_date: startDate, end_date: endDate, quantity },
    });
    return data;
  },

  getAvailabilityCalendar: async (
    id: string,
    month: string // YYYY-MM format
  ): Promise<DayAvailability[]> => {
    const { data } = await api.get(`/products/${id}/availability`, {
      params: { month },
    });
    return data.days || data;
  },
};

// Reviews API
export const reviewsApi = {
  getByProduct: async (
    productId: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResponse<Review>> => {
    const { data } = await api.get(`/products/${productId}/reviews`, { params });
    return data;
  },

  getStats: async (productId: string): Promise<ReviewStats> => {
    const { data } = await api.get(`/products/${productId}/reviews/stats`);
    return data.stats || data;
  },

  create: async (input: CreateReviewInput): Promise<Review> => {
    const { data } = await api.post(`/products/${input.productId}/reviews`, {
      rating: input.rating,
      comment: input.comment,
    });
    return data.review || data;
  },
};

// User API
export const userApi = {
  getProfile: async (): Promise<User> => {
    const { data } = await api.get('/user/profile');
    return data.user || data;
  },

  updateProfile: async (name: string): Promise<User> => {
    const { data } = await api.post('/user/profile', { name });
    return data.user || data;
  },

  // Addresses
  getAddresses: async (): Promise<Address[]> => {
    const { data } = await api.get('/user/addresses');
    return data.addresses || data;
  },

  createAddress: async (address: Omit<Address, 'id' | 'userId' | 'createdAt'>): Promise<Address> => {
    const { data } = await api.post('/user/addresses', address);
    return data.address || data;
  },

  updateAddress: async (id: string, address: Partial<Address>): Promise<Address> => {
    const { data } = await api.put(`/user/addresses/${id}`, address);
    return data.address || data;
  },

  deleteAddress: async (id: string): Promise<void> => {
    await api.delete(`/user/addresses/${id}`);
  },

  setDefaultAddress: async (id: string): Promise<void> => {
    await api.post(`/user/addresses/${id}/default`);
  },

  // Favorites
  getFavorites: async (): Promise<Product[]> => {
    const { data } = await api.get('/user/favorites');
    return data.favorites || data;
  },

  addToFavorites: async (productId: string): Promise<void> => {
    await api.post(`/user/favorites/${productId}`);
  },

  removeFromFavorites: async (productId: string): Promise<void> => {
    await api.delete(`/user/favorites/${productId}`);
  },

  // Cards
  getCards: async (): Promise<Card[]> => {
    const { data } = await api.get('/user/cards');
    return data.cards || data;
  },

  addCard: async (cardNumber: string, expiryDate: string): Promise<Card> => {
    const { data } = await api.post('/user/cards', { card_number: cardNumber, expiry_date: expiryDate });
    return data.card || data;
  },

  deleteCard: async (id: string): Promise<void> => {
    await api.delete(`/user/cards/${id}`);
  },

  setDefaultCard: async (id: string): Promise<void> => {
    await api.post(`/user/cards/${id}/default`);
  },
};

// Orders API
export const ordersApi = {
  create: async (order: {
    items: { product_id: string; quantity: number }[];
    rental_start_date: string;
    rental_end_date: string;
    delivery_type: 'DELIVERY' | 'SELF_PICKUP';
    address_id?: string;
    payment_method: 'PAYME' | 'CLICK' | 'UZUM';
    notes?: string;
  }): Promise<Order> => {
    const { data } = await api.post('/orders', order);
    return data.order || data;
  },

  getMyOrders: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Order>> => {
    const { data } = await api.get('/orders/my-orders', { params });
    return data;
  },

  getById: async (id: string): Promise<Order> => {
    const { data } = await api.get(`/orders/${id}`);
    return data.order || data;
  },
};

// Business Settings API
export const settingsApi = {
  getBusinessSettings: async (): Promise<BusinessSettings> => {
    const { data } = await api.get('/settings/business');
    return data.settings || data;
  },

  getDeliveryZones: async (): Promise<DeliveryZone[]> => {
    const { data } = await api.get('/settings/delivery-zones');
    return data.zones || data;
  },
};

export default api;
