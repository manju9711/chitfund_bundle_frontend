import axios from 'axios';
import { User, Customer, ChitScheme, Payment, LoginCredentials, RegisterData, ChitSchedule, ChitScheduleGroup } from '../types';

// Update this URL to match your backend server
// For XAMPP/WAMP: http://localhost/chitfund-admin-portal/backend/api
// For PHP built-in server: http://localhost:8000/api
// For Production: https://pcstech.in/chitfund_api/api
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:8000/api' 
    : 'https://pcstech.in/chitfund_api/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiService = {
  // Authentication
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const response = await api.post('/auth/login.php', credentials);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Login failed');
  },

  async register(data: RegisterData): Promise<{ user: User; token: string }> {
    const response = await api.post('/auth/register.php', data);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Registration failed');
  },

  async logout(): Promise<void> {
    await api.get('/auth/logout.php');
  },

  // Customers
  async getCustomers(): Promise<Customer[]> {
    const response = await api.get('/customers/index.php');
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to fetch customers');
  },

  async getCustomerById(id: string): Promise<Customer | undefined> {
    const response = await api.get(`/customers/get.php?id=${id}`);
    if (response.data.success) {
      return response.data.data;
    }
    if (response.status === 404) {
      return undefined;
    }
    throw new Error(response.data.message || 'Failed to fetch customer');
  },

  async addCustomer(customer: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> {
    const response = await api.post('/customers/index.php', customer);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to add customer');
  },

  async updateCustomer(id: string, customer: Partial<Omit<Customer, 'id' | 'createdAt'>>): Promise<Customer> {
    const response = await api.put(`/customers/update.php?id=${id}`, customer);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to update customer');
  },

  async deleteCustomer(id: string): Promise<void> {
    const response = await api.delete(`/customers/delete.php?id=${id}`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete customer');
    }
  },

  // Chit Schemes
  async getSchemes(): Promise<ChitScheme[]> {
    const response = await api.get('/schemes/index.php');
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to fetch schemes');
  },

  async getSchemeById(id: string): Promise<ChitScheme | undefined> {
    const response = await api.get(`/schemes/get.php?id=${id}`);
    if (response.data.success) {
      return response.data.data;
    }
    if (response.status === 404) {
      return undefined;
    }
    throw new Error(response.data.message || 'Failed to fetch scheme');
  },

  async addScheme(scheme: Omit<ChitScheme, 'id'>): Promise<ChitScheme> {
    const response = await api.post('/schemes/index.php', scheme);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to create scheme');
  },

  async updateScheme(id: string, scheme: Partial<Omit<ChitScheme, 'id'>>): Promise<ChitScheme> {
    const response = await api.put(`/schemes/update.php?id=${id}`, scheme);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to update scheme');
  },

  async deleteScheme(id: string): Promise<void> {
    const response = await api.delete(`/schemes/delete.php?id=${id}`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete scheme');
    }
  },

  // Payments
  async getPayments(): Promise<Payment[]> {
    const response = await api.get('/payments/index.php');
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to fetch payments');
  },

  async createPayment(payment: { customerId: string; schemeId: string; amount: number; paymentDate: string; installmentNumber: number }): Promise<any> {
    const response = await api.post('/payments/create.php', payment);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to create payment');
    }
    return response.data.data;
  },

  async getPaymentSchedule(schemeId: string): Promise<any> {
    const response = await api.get(`/payments/get_schedule.php?schemeId=${schemeId}`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch payment schedule');
    }
    return response.data.data;
  },

  // Chit Schedules
  async getSchedules(schemeId?: string): Promise<ChitSchedule[] | ChitScheduleGroup[]> {
    const url = schemeId ? `/schedules/index.php?schemeId=${schemeId}` : '/schedules/index.php';
    const response = await api.get(url);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to fetch schedules');
  },

  async generateSchedule(schemeId: string): Promise<void> {
    const response = await api.post('/schedules/generate.php', { schemeId });
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to generate schedule');
    }
  },

  async allocateSchedule(scheduleId: string, customerId: string, allocationDate?: string, amountReceived?: number): Promise<void> {
    const response = await api.post('/schedules/allocate.php', {
      scheduleId,
      customerId: customerId || null,
      allocationDate,
      amountReceived
    });
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to allocate schedule');
    }
  },

  async autoAllocateMembers(schemeId: string): Promise<any> {
    const response = await api.post('/schedules/auto_allocate.php', { schemeId });
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to auto allocate members');
    }
    return response.data.data;
  },

  async reallocateAllMembers(schemeId: string): Promise<any> {
    const response = await api.post('/schedules/reallocate_all.php', { schemeId });
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to reallocate all members');
    }
    return response.data.data;
  },

  async getSchemeMembers(schemeId: string): Promise<Customer[]> {
    const response = await api.get(`/schemes/get_members.php?schemeId=${schemeId}`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch scheme members');
    }
    return response.data.data;
  },

  async addCustomersToScheme(schemeId: string, customerIds: string[]): Promise<any> {
    const response = await api.post('/schemes/add_customers.php', { schemeId, customerIds });
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to add customers to scheme');
    }
    return response.data.data;
  },

  async getCustomerDetail(customerId: string): Promise<any> {
    const response = await api.get(`/customers/get_detail.php?id=${customerId}`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch customer detail');
    }
    return response.data.data;
  },

  async getMemberSummary(schemeId: string): Promise<any> {
    const response = await api.get(`/schedules/member_summary.php?schemeId=${schemeId}`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch member summary');
    }
    return response.data.data;
  },

  async redistributeMembers(schemeId: string): Promise<any> {
    const response = await api.post('/schedules/redistribute.php', { schemeId });
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to redistribute members');
    }
    return response.data.data;
  },

  // Auctions (PHP backend)
  async getAuctions(schemeId?: string, status?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (schemeId) params.set('schemeId', schemeId);
    if (status) params.set('status', status);
    const response = await api.get(`/auctions/index.php?${params}`);
    if (response.data.success) return response.data.data;
    throw new Error(response.data.message || 'Failed to fetch auctions');
  },
  async getAuction(id: string): Promise<any> {
    const response = await api.get(`/auctions/get.php?id=${id}`);
    if (response.data.success) return response.data.data;
    throw new Error(response.data.message || 'Failed to fetch auction');
  },
  async createAuction(schemeId: string, auctionDate: string, monthNumber?: number): Promise<any> {
    const response = await api.post('/auctions/index.php', { schemeId, auctionDate, monthNumber });
    if (response.data.success) return response.data.data;
    throw new Error(response.data.message || 'Failed to create auction');
  },
  async submitBid(auctionId: string, customerId: string | number, discountAmount: number): Promise<any> {
    const response = await api.post('/auctions/bids.php', { auctionId, customerId: String(customerId), discountAmount });
    if (response.data.success) return response.data.data;
    throw new Error(response.data.message || 'Failed to submit bid');
  },
  async declareWinner(auctionId: string): Promise<any> {
    const response = await api.post('/auctions/declare_winner.php', { auctionId });
    if (response.data.success) return response.data.data;
    throw new Error(response.data.message || 'Failed to declare winner');
  },
};

