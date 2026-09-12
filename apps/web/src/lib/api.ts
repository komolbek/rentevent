import axios from 'axios';
import type {
  PaginatedResponse,
  IUser,
  ICategory,
  IProduct,
  IDayAvailability,
  IOrder,
  IAddress,
  ICard,
  IReview,
  IReviewStats,
  IBusinessSettings,
  IDeliveryZone,
  IReturnRequest,
  IRentalExtension,
} from '@rentevent/types';

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const getBaseURL = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  // Production fallback when env var not baked into build
  if (typeof window !== 'undefined' && window.location.hostname === 'rentevent.uz') {
    return 'https://api.rentevent.uz/api';
  }
  return 'http://localhost:4000';
};

const axiosInstance = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach Bearer token and language header
axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const token = parsed?.state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // ignore parse errors
      }
    }
    // Add language header
    try {
      const langRaw = localStorage.getItem('language-storage');
      if (langRaw) {
        const langState = JSON.parse(langRaw);
        const locale = langState.state?.locale || 'ru';
        config.headers['X-Language'] = locale;
      }
    } catch {
      // ignore parse errors
    }
  }
  return config;
});

// Response interceptor: unwrap { success, data } envelope and redirect on 401
axiosInstance.interceptors.response.use(
  (response) => {
    const body = response.data;
    // Unwrap { success: true, data: ... } envelope from API
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      return body.data;
    }
    // For responses without data field (e.g. { success: true, token, user })
    return body;
  },
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth-storage');
      // Also clear the auth-token cookie read by the Next.js middleware
      document.cookie = 'auth-token=; path=/; max-age=0; SameSite=Lax';
      if (!window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  },
);

// Typed request helpers — interceptor unwraps ApiResponse so callers get T directly
const api = {
  get<T>(url: string, config?: Parameters<typeof axiosInstance.get>[1]): Promise<T> {
    return axiosInstance.get(url, config) as unknown as Promise<T>;
  },
  post<T>(url: string, data?: unknown, config?: Parameters<typeof axiosInstance.post>[2]): Promise<T> {
    return axiosInstance.post(url, data, config) as unknown as Promise<T>;
  },
  put<T>(url: string, data?: unknown, config?: Parameters<typeof axiosInstance.put>[2]): Promise<T> {
    return axiosInstance.put(url, data, config) as unknown as Promise<T>;
  },
  patch<T>(url: string, data?: unknown, config?: Parameters<typeof axiosInstance.patch>[2]): Promise<T> {
    return axiosInstance.patch(url, data, config) as unknown as Promise<T>;
  },
  delete<T>(url: string, config?: Parameters<typeof axiosInstance.delete>[1]): Promise<T> {
    return axiosInstance.delete(url, config) as unknown as Promise<T>;
  },
};

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export const authApi = {
  sendOtp(phone_number: string) {
    return api.post<void>('/auth/send-otp', { phone_number });
  },

  verifyOtp(phone_number: string, code: string, device_id: string) {
    return api.post<{ token: string; user: IUser }>('/auth/verify-otp', {
      phone_number,
      code,
      device_id,
    });
  },

  logout() {
    return api.post<void>('/auth/logout');
  },
};

// ---------------------------------------------------------------------------
// Categories API
// ---------------------------------------------------------------------------

export const categoriesApi = {
  getAll() {
    return api.get<ICategory[]>('/categories');
  },
};

// ---------------------------------------------------------------------------
// Products API
// ---------------------------------------------------------------------------

export const productsApi = {
  getAll(params?: {
    page?: number;
    limit?: number;
    category_id?: string;
    search?: string;
    sort?: 'newest' | 'popular' | 'price_asc' | 'price_desc';
    /** YYYY-MM-DD; with end_date, filters to products free for the whole period. */
    start_date?: string;
    end_date?: string;
  }) {
    return api.get<PaginatedResponse<IProduct>>('/products', { params });
  },

  getById(id: string) {
    return api.get<IProduct>(`/products/${id}`);
  },

  checkAvailability(
    id: string,
    params: { start_date: string; end_date: string; quantity?: number },
  ) {
    return api.get<IDayAvailability[]>(`/products/${id}/availability`, { params });
  },

  getReviews(id: string, params?: { page?: number; limit?: number }) {
    return api.get<{ reviews: PaginatedResponse<IReview>; stats: IReviewStats }>(
      `/products/${id}/reviews`,
      { params },
    );
  },
};

export interface EventItem {
  id: string;
  title: string;
  title_uz: string | null;
  title_en: string | null;
  description: string | null;
  description_uz: string | null;
  description_en: string | null;
  image_url: string | null;
  venue: string | null;
  city: string | null;
  start_date: string;
  end_date: string | null;
  website_url: string | null;
  is_active: boolean;
}

export const eventsApi = {
  getAll() {
    return api.get<{ items: EventItem[] }>('/events');
  },
  getById(id: string) {
    return api.get<EventItem>(`/events/${id}`);
  },
};

export interface SetItemPublic {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    name_uz: string | null;
    name_en: string | null;
    daily_price: number;
    photos: string[];
    total_stock: number;
    category_name: string | null;
  } | null;
}

export interface SetPublic {
  id: string;
  name: string;
  name_uz: string | null;
  name_en: string | null;
  description: string | null;
  description_uz: string | null;
  description_en: string | null;
  photos: string[];
  daily_price: number;
  items_count: number;
  items: SetItemPublic[];
}

export const setsApi = {
  getAll() {
    return api.get<{ items: SetPublic[] }>('/sets');
  },
  getById(id: string) {
    return api.get<SetPublic>(`/sets/${id}`);
  },
};

// ---------------------------------------------------------------------------
// Reviews API
// ---------------------------------------------------------------------------

export const reviewsApi = {
  create(data: { product_id: string; rating: number; comment?: string; photos?: string[] }) {
    return api.post<IReview>('/reviews', data);
  },

  update(id: string, data: { rating?: number; comment?: string; photos?: string[] }) {
    return api.put<IReview>(`/reviews/${id}`, data);
  },

  delete(id: string) {
    return api.delete<void>(`/reviews/${id}`);
  },
};

// ---------------------------------------------------------------------------
// User API
// ---------------------------------------------------------------------------

export const userApi = {
  getProfile() {
    return api.get<IUser>('/user/profile');
  },

  updateProfile(name: string) {
    return api.post<IUser>('/user/profile', { name });
  },

  // Addresses
  getAddresses() {
    return api.get<IAddress[]>('/user/addresses');
  },

  createAddress(data: {
    title: string;
    full_address: string;
    city: string;
    district?: string;
    street?: string;
    building?: string;
    apartment?: string;
    entrance?: string;
    floor?: string;
    latitude?: number;
    longitude?: number;
    is_default?: boolean;
  }) {
    return api.post<IAddress>('/user/addresses', data);
  },

  deleteAddress(addressId: string) {
    return api.delete<void>(`/user/addresses/${addressId}`);
  },

  setDefaultAddress(addressId: string) {
    return api.post<void>(`/user/addresses/${addressId}/default`);
  },

  // Cards
  getCards() {
    return api.get<ICard[]>('/user/cards');
  },

  addCard(data: {
    card_number: string;
    card_holder: string;
    expiry_month: number;
    expiry_year: number;
  }) {
    return api.post<ICard>('/user/cards', data);
  },

  deleteCard(cardId: string) {
    return api.delete<void>(`/user/cards/${cardId}`);
  },

  setDefaultCard(cardId: string) {
    return api.post<void>(`/user/cards/${cardId}/default`);
  },

  // Favorites
  getFavorites() {
    return api.get<IProduct[]>('/user/favorites');
  },

  addFavorite(product_id: string) {
    return api.post<void>('/user/favorites', { product_id });
  },

  removeFavorite(productId: string) {
    return api.delete<void>(`/user/favorites/${productId}`);
  },
};

// ---------------------------------------------------------------------------
// Orders API
// ---------------------------------------------------------------------------

export const ordersApi = {
  create(data: {
    items: { product_id: string; quantity: number }[];
    rental_start_date: string;
    rental_end_date: string;
    delivery_type: 'DELIVERY' | 'SELF_PICKUP';
    delivery_address_id?: string;
    payment_method: string;
    company_name?: string;
    company_inn?: string;
    notes?: string;
  }) {
    return api.post<IOrder>('/orders', data);
  },

  getMyOrders(params?: { page?: number; limit?: number; status?: string }) {
    return api.get<PaginatedResponse<IOrder>>('/orders/my-orders', { params });
  },

  getById(id: string) {
    return api.get<IOrder>(`/orders/${id}`);
  },

  cancel(id: string) {
    return api.post<void>(`/orders/${id}/cancel`);
  },
};

// ---------------------------------------------------------------------------
// Payments API
// ---------------------------------------------------------------------------

export const paymentsApi = {
  multicardCheckout(orderId: string) {
    return api.post<{ checkout_url: string }>(
      `/payments/multicard/checkout/${orderId}`,
    );
  },
};

// ---------------------------------------------------------------------------
// Returns API
// ---------------------------------------------------------------------------

export const returnsApi = {
  create(data: { order_id: string; reason?: string; photos?: string[] }) {
    return api.post<IReturnRequest>('/returns', data);
  },

  getMyReturns(params?: { page?: number; limit?: number }) {
    return api.get<PaginatedResponse<IReturnRequest>>('/returns/my-returns', { params });
  },

  getById(id: string) {
    return api.get<IReturnRequest>(`/returns/${id}`);
  },
};

// ---------------------------------------------------------------------------
// Extensions API
// ---------------------------------------------------------------------------

export const extensionsApi = {
  create(data: { order_id: string; additional_days: number; notes?: string }) {
    return api.post<IRentalExtension>('/extensions', data);
  },

  getMyExtensions(params?: { page?: number; limit?: number }) {
    return api.get<PaginatedResponse<IRentalExtension>>('/extensions/my-extensions', { params });
  },
};

// ---------------------------------------------------------------------------
// Business Settings API
// ---------------------------------------------------------------------------

export const settingsApi = {
  getBusinessInfo() {
    return api.get<IBusinessSettings & { deliveryZones: IDeliveryZone[] }>(
      '/business/info',
    );
  },
};

export default api;
