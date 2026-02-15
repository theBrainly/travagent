import axios from 'axios';
import { API_URL } from '../config';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('agent');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data: { email: string; password: string; role?: string }) => api.post('/auth/login', data),
  register: (data: Record<string, unknown>) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/me'),
  checkApprovalStatus: () => api.get('/auth/approval-status'),
};

// Customers
export const customerAPI = {
  getAll: (params?: Record<string, any>) => api.get('/customers', { params }),
  getById: (id: string) => api.get(`/customers/${id}`),
  create: (data: Record<string, unknown>) => api.post('/customers', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

// Bookings
export const bookingAPI = {
  getAll: (params?: Record<string, any>) => api.get('/bookings', { params }),
  getById: (id: string) => api.get(`/bookings/${id}`),
  create: (data: Record<string, unknown>) => api.post('/bookings', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/bookings/${id}`, data),
  updateStatus: (id: string, status: string) => api.patch(`/bookings/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/bookings/${id}`),
};

// Itineraries
export const itineraryAPI = {
  getAll: (params?: Record<string, any>) => api.get('/itineraries', { params }),
  getById: (id: string) => api.get(`/itineraries/${id}`),
  create: (data: Record<string, unknown>) => api.post('/itineraries', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/itineraries/${id}`, data),
  delete: (id: string) => api.delete(`/itineraries/${id}`),
};

// Leads
export const leadAPI = {
  getAll: (params?: Record<string, any>) => api.get('/leads', { params }),
  getById: (id: string) => api.get(`/leads/${id}`),
  create: (data: Record<string, unknown>) => api.post('/leads', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/leads/${id}`, data),
  convertToBooking: (id: string) => api.post(`/leads/${id}/convert`),
  delete: (id: string) => api.delete(`/leads/${id}`),
};

// Payments
export const paymentAPI = {
  getAll: (params?: Record<string, any>) => api.get('/payments', { params }),
  getById: (id: string) => api.get(`/payments/${id}`),
  create: (data: Record<string, unknown>) => api.post('/payments', data),
};

// Commissions
export const commissionAPI = {
  getAll: (params?: Record<string, any>) => api.get('/commissions', { params }),
  getByAgent: (agentId: string, params?: Record<string, any>) => api.get(`/commissions/agent/${agentId}`, { params }),
  approve: (id: string) => api.patch(`/commissions/${id}/approve`),
  markPaid: (id: string) => api.patch(`/commissions/${id}/pay`),
};

// Dashboard
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentBookings: () => api.get('/dashboard/recent-bookings'),
};

// Agents (Admin management)
export const agentAPI = {
  getPending: () => api.get('/agents/pending'),
  approve: (id: string) => api.patch(`/agents/${id}/approve`),
  reject: (id: string, reason?: string) => api.patch(`/agents/${id}/reject`, { reason }),
  getAll: (params?: Record<string, any>) => api.get('/agents', { params }),
};

// Analytics
export const analyticsAPI = {
  getRevenue: (params?: Record<string, any>) => api.get('/dashboard/analytics/revenue', { params }),
  getBookings: (params?: Record<string, any>) => api.get('/dashboard/analytics/bookings', { params }),
  getConversion: (params?: Record<string, any>) => api.get('/dashboard/analytics/conversion', { params }),
  getTopAgents: (params?: Record<string, any>) => api.get('/dashboard/analytics/top-agents', { params }),
  getGrowth: (params?: Record<string, any>) => api.get('/dashboard/analytics/monthly-growth', { params }),
  getOverview: (params?: Record<string, any>) => api.get('/dashboard/analytics/overview', { params }),
};

// Uploads
export const uploadAPI = {
  uploadSingle: (file: File, category: string, linkedTo?: { model: string; documentId: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (linkedTo) {
      formData.append('linkedModel', linkedTo.model);
      formData.append('linkedId', linkedTo.documentId);
    }
    return api.post('/uploads/single', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadMultiple: (files: File[], category: string, linkedTo?: { model: string; documentId: string }) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('category', category);
    if (linkedTo) {
      formData.append('linkedModel', linkedTo.model);
      formData.append('linkedId', linkedTo.documentId);
    }
    return api.post('/uploads/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  delete: (id: string) => api.delete(`/uploads/${id}`),
  getByResource: (model: string, id: string) => api.get(`/uploads/${model.toLowerCase()}/${id}`),
};

// Permissions
export const permissionAPI = {
  getAll: () => api.get('/permissions'),
  getMy: () => api.get('/permissions/me'),
  getByRole: (role: string) => api.get(`/permissions/${role}`),
  update: (role: string, permissions: Record<string, boolean>) => api.put(`/permissions/${role}`, permissions),
  reset: () => api.post('/permissions/reset'),
};

export default api;
