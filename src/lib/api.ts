import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://backend-api-sr9h.onrender.com/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach token to every request if available
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// --- Auth ---
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    dateOfBirth?: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  };
}

export const authApi = {
  login: (data: LoginRequest) => api.post<AuthResponse>("/auth/login", data),
  register: (data: RegisterRequest) => api.post<AuthResponse>("/auth/register", data),
  refresh: (token: string, refreshToken: string) =>
    api.post<AuthResponse>("/auth/refresh", { token, refreshToken }),
  logout: () => api.post("/auth/logout"),
  forgotPassword: (email: string) => api.post("/auth/forgot-password", { email }),
  resetPassword: (data: { email: string; token: string; newPassword: string }) =>
    api.post("/auth/reset-password", data),
  getOidcConfig: () => api.get("/auth/.well-known/openid-configuration"),
};

// --- Users ---
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: string;
}

export const userApi = {
  getAll: () => api.get<User[]>("/users"),
  getById: (id: number) => api.get<User>(`/users/${id}`),
  create: (data: UserFormData) => api.post<User>("/users", data),
  update: (id: number, data: UserFormData) => api.put<User>(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
};

// --- Customers ---
export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CustomerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export const customerApi = {
  getAll: () => api.get<Customer[]>("/customers"),
  getById: (id: number) => api.get<Customer>(`/customers/${id}`),
  create: (data: CustomerFormData) => api.post<Customer>("/customers", data),
  update: (id: number, data: CustomerFormData) => api.put<Customer>(`/customers/${id}`, data),
  delete: (id: number) => api.delete(`/customers/${id}`),
};

// --- Inventory ---
export interface InventoryItem {
  id: number;
  productName: string;
  productDescription?: string;
  sku?: string;
  stockQuantity: number;
  unitPrice: number;
  isAvailable: boolean;
  createdAt: string;
}

export interface InventoryFormData {
  productName: string;
  productDescription?: string;
  sku?: string;
  stockQuantity: number;
  unitPrice: number;
  isAvailable: boolean;
}

export const inventoryApi = {
  getAll: () => api.get<InventoryItem[]>("/inventory"),
  getById: (id: number) => api.get<InventoryItem>(`/inventory/${id}`),
  create: (data: InventoryFormData) => api.post<InventoryItem>("/inventory", data),
  update: (id: number, data: InventoryFormData) => api.put<InventoryItem>(`/inventory/${id}`, data),
  delete: (id: number) => api.delete(`/inventory/${id}`),
};

// --- Orders ---
export interface OrderItemDto {
  id: number;
  inventoryId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: number;
  customerId: number;
  orderNumber: string;
  orderDate: string;
  status: string;
  totalAmount: number;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  shippingCountry?: string;
  notes?: string;
  createdAt: string;
  orderItems: OrderItemDto[];
}

export interface CreateOrderItemData {
  inventoryId: number;
  quantity: number;
}

export interface CreateOrderData {
  customerId: number;
  orderDate: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  shippingCountry?: string;
  notes?: string;
  orderItems: CreateOrderItemData[];
}

export interface UpdateOrderData {
  customerId?: number;
  orderDate?: string;
  status?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  shippingCountry?: string;
  notes?: string;
}

export interface AddOrderItemData {
  inventoryId: number;
  quantity: number;
}

export interface UpdateOrderItemData {
  quantity: number;
}

export const orderApi = {
  getAll: () => api.get<Order[]>("/orders"),
  getById: (id: number) => api.get<Order>(`/orders/${id}`),
  getByCustomer: (customerId: number) => api.get<Order[]>(`/orders/customer/${customerId}`),
  getByDateRange: (fromDate: string, toDate: string) =>
    api.get<Order[]>("/orders/filter/date-range", { params: { fromDate, toDate } }),
  create: (data: CreateOrderData) => api.post<Order>("/orders", data),
  update: (id: number, data: UpdateOrderData) => api.put<Order>(`/orders/${id}`, data),
  delete: (id: number) => api.delete(`/orders/${id}`),
  addItem: (orderId: number, data: AddOrderItemData) =>
    api.post<Order>(`/orders/${orderId}/items`, data),
  updateItem: (orderId: number, itemId: number, data: UpdateOrderItemData) =>
    api.put<Order>(`/orders/${orderId}/items/${itemId}`, data),
  removeItem: (orderId: number, itemId: number) =>
    api.delete<Order>(`/orders/${orderId}/items/${itemId}`),
};

// --- Payment Orders ---
export interface PaymentOrderItemDto {
  id: number;
  orderItemId: number;
  orderId: number;
  orderNumber: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  orderItemTotalPrice: number;
  amountPaid: number;
}

export interface PaymentOrder {
  id: number;
  customerId: number;
  customerName: string;
  paymentOrderNumber: string;
  paymentDate: string;
  status: string;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  paymentOrderItems: PaymentOrderItemDto[];
}

export interface CreatePaymentOrderItemData {
  orderItemId: number;
  quantity: number;
  amountPaid: number;
}

export interface CreatePaymentOrderData {
  customerId: number;
  paymentDate: string;
  notes?: string;
  paymentOrderItems: CreatePaymentOrderItemData[];
}

export interface UpdatePaymentOrderData {
  customerId?: number;
  paymentDate?: string;
  status?: string;
  notes?: string;
}

export interface AddPaymentOrderItemData {
  orderItemId: number;
  quantity: number;
  amountPaid: number;
}

export interface UpdatePaymentOrderItemData {
  quantity: number;
  amountPaid: number;
}

export const paymentOrderApi = {
  getAll: () => api.get<PaymentOrder[]>("/paymentorders"),
  getById: (id: number) => api.get<PaymentOrder>(`/paymentorders/${id}`),
  getByCustomer: (customerId: number) => api.get<PaymentOrder[]>(`/paymentorders/customer/${customerId}`),
  create: (data: CreatePaymentOrderData) => api.post<PaymentOrder>("/paymentorders", data),
  update: (id: number, data: UpdatePaymentOrderData) => api.put<PaymentOrder>(`/paymentorders/${id}`, data),
  delete: (id: number) => api.delete(`/paymentorders/${id}`),
  addItem: (paymentOrderId: number, data: AddPaymentOrderItemData) =>
    api.post<PaymentOrder>(`/paymentorders/${paymentOrderId}/items`, data),
  updateItem: (paymentOrderId: number, itemId: number, data: UpdatePaymentOrderItemData) =>
    api.put<PaymentOrder>(`/paymentorders/${paymentOrderId}/items/${itemId}`, data),
  removeItem: (paymentOrderId: number, itemId: number) =>
    api.delete<PaymentOrder>(`/paymentorders/${paymentOrderId}/items/${itemId}`),
};

export default api;
