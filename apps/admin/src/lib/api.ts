import axios from "axios";

const getBaseURL = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  // Production fallback when env var not baked into build
  if (typeof window !== 'undefined' && window.location.hostname === 'admin.rentevent.uz') {
    return 'https://api.rentevent.uz/api';
  }
  return 'http://localhost:4000/api';
};

export const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Auth ────────────────────────────────────────────────────────────────────

export const adminAuthApi = {
  login: (data: { phone: string; password: string }) =>
    api.post("/admin/auth/login", data),

  logout: () => api.post("/admin/auth/logout"),

  checkSession: () => api.get("/admin/auth/session"),

  setPassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post("/admin/auth/set-password", data),

  forgotPassword: (data: { email: string }) =>
    api.post("/admin/auth/forgot-password", data),

  resetPassword: (data: { token: string; newPassword: string }) =>
    api.post("/admin/auth/reset-password", data),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const adminDashboardApi = {
  getStats: () => api.get("/admin/dashboard"),
};

// ─── Products ────────────────────────────────────────────────────────────────

export const adminProductsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/admin/products", { params }),
  get: (id: string) => api.get(`/admin/products/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post("/admin/products", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/products/${id}`, data),
  delete: (id: string) => api.delete(`/admin/products/${id}`),
  reorder: (data: { orderedIds: string[] }) =>
    api.post("/admin/products/reorder", data),
};

// ─── Categories ──────────────────────────────────────────────────────────────

export const adminCategoriesApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/admin/categories", { params }),
  get: (id: string) => api.get(`/admin/categories/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post("/admin/categories", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/categories/${id}`, data),
  delete: (id: string, force?: boolean) =>
    api.delete(`/admin/categories/${id}`, force ? { params: { force: 'true' } } : undefined),
  reorder: (data: { orderedIds: string[] }) =>
    api.post("/admin/categories/reorder", data),
};

// ─── Orders ──────────────────────────────────────────────────────────────────

export const adminOrdersApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/admin/orders", { params }),
  get: (id: string) => api.get(`/admin/orders/${id}`),
  updateStatus: (id: string, data: { status: string }) =>
    api.patch(`/admin/orders/${id}/status`, data),
  updateCorporateStatus: (
    id: string,
    data: { status: 'PENDING' | 'OFFER_SENT' | 'PAID' | 'CANCELLED'; note?: string },
  ) => api.patch(`/admin/orders/${id}/corporate-status`, data),
};

// ─── Returns ─────────────────────────────────────────────────────────────────

export const adminReturnsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/admin/returns", { params }),
  get: (id: string) => api.get(`/admin/returns/${id}`),
  process: (id: string, data: Record<string, unknown>) =>
    api.post(`/admin/returns/${id}/process`, data),
};

// ─── Reviews ─────────────────────────────────────────────────────────────────

export const adminReviewsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/admin/reviews", { params }),
  approve: (id: string) => api.post(`/admin/reviews/${id}/approve`),
  reject: (id: string) => api.post(`/admin/reviews/${id}/reject`),
};

// ─── Extensions ──────────────────────────────────────────────────────────────

export const adminExtensionsApi = {
  list: () => api.get("/admin/extensions"),
  toggle: (id: string, data: { enabled: boolean }) =>
    api.patch(`/admin/extensions/${id}`, data),
};

// ─── Staff ───────────────────────────────────────────────────────────────────

export const adminStaffApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/admin/staff", { params }),
  get: (id: string) => api.get(`/admin/staff/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post("/admin/staff", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/staff/${id}`, data),
  delete: (id: string) => api.delete(`/admin/staff/${id}`),
};

// ─── Customers ───────────────────────────────────────────────────────────────

export const adminCustomersApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/admin/customers", { params }),
  get: (id: string) => api.get(`/admin/customers/${id}`),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/customers/${id}`, data),
};

// ─── Settings ────────────────────────────────────────────────────────────────

export const adminSettingsApi = {
  get: () => api.get("/admin/settings"),
  update: (data: Record<string, unknown>) =>
    api.put("/admin/settings", data),
};

// ─── Delivery Zones ──────────────────────────────────────────────────────────

export const adminDeliveryZonesApi = {
  list: () => api.get("/admin/delivery-zones"),
  create: (data: Record<string, unknown>) =>
    api.post("/admin/delivery-zones", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/delivery-zones/${id}`, data),
  delete: (id: string) => api.delete(`/admin/delivery-zones/${id}`),
};

// ─── SMS Templates ───────────────────────────────────────────────────────────

export const adminSmsTemplatesApi = {
  list: () => api.get("/admin/sms-templates"),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/sms-templates/${id}`, data),
};

// ─── Upload ──────────────────────────────────────────────────────────────────

export const adminEventsApi = {
  list: () => api.get("/admin/events"),
  create: (data: Record<string, unknown>) => api.post("/admin/events", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/events/${id}`, data),
  delete: (id: string) => api.delete(`/admin/events/${id}`),
  reorder: (data: { orderedIds: string[] }) =>
    api.post("/admin/events/reorder", data),
  getPrices: (id: string) => api.get(`/admin/events/${id}/prices`),
  setPrices: (
    id: string,
    data: { prices: { product_id: string; daily_price?: number | null; featured?: boolean }[] },
  ) => api.put(`/admin/events/${id}/prices`, data),
};

// ─── Home content (hero slides, inspirations) ────────────────────────────────

const contentApi = (path: string) => ({
  list: () => api.get(`/admin/${path}`),
  create: (data: Record<string, unknown>) => api.post(`/admin/${path}`, data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/${path}/${id}`, data),
  delete: (id: string) => api.delete(`/admin/${path}/${id}`),
  reorder: (data: { orderedIds: string[] }) =>
    api.post(`/admin/${path}/reorder`, data),
});

export const adminHeroSlidesApi = contentApi("hero-slides");
export const adminInspirationsApi = contentApi("inspirations");

export const adminSetsApi = {
  list: () => api.get("/admin/sets"),
  create: (data: Record<string, unknown>) => api.post("/admin/sets", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/sets/${id}`, data),
  delete: (id: string) => api.delete(`/admin/sets/${id}`),
  reorder: (data: { orderedIds: string[] }) =>
    api.post("/admin/sets/reorder", data),
};

export const adminUploadApi = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/admin/upload/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ─── Dev OTP ─────────────────────────────────────────────────────────────────

export const adminDevOtpApi = {
  list: () => api.get("/admin/dev/otp"),
};

