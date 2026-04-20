import axios from 'axios';

const AUCTION_API = import.meta.env.VITE_AUCTION_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: AUCTION_API,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auction_token') || localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const auctionApi = {
  async login(username: string, password: string) {
    const { data } = await api.post('/auth/login', { username, password });
    if (data.success) return data.data;
    throw new Error(data.message || 'Login failed');
  },
  async getMe() {
    const { data } = await api.get('/auth/me');
    if (data.success) return data.data;
    throw new Error(data.message || 'Not authenticated');
  },
  async getChitGroups() {
    const { data } = await api.get('/chit-groups');
    if (data.success) return data.data;
    throw new Error(data.message || 'Failed to fetch chit groups');
  },
  async getChitGroup(id: string) {
    const { data } = await api.get(`/chit-groups/${id}`);
    if (data.success) return data.data;
    throw new Error(data.message || 'Failed to fetch chit group');
  },
  async createChitGroup(scheme: any) {
    const { data } = await api.post('/chit-groups', scheme);
    if (data.success) return data.data;
    throw new Error(data.message || 'Failed to create chit group');
  },
  async addMembers(schemeId: string, customerIds: number[]) {
    const { data } = await api.post(`/chit-groups/${schemeId}/members`, { customerIds });
    if (data.success) return data.data;
    throw new Error(data.message || 'Failed to add members');
  },
  async getMembers(schemeId: string) {
    const { data } = await api.get(`/chit-groups/${schemeId}/members`);
    if (data.success) return data.data;
    throw new Error(data.message || 'Failed to fetch members');
  },
  async getCustomers() {
    const { data } = await api.get('/members/customers');
    if (data.success) return data.data;
    throw new Error(data.message || 'Failed to fetch customers');
  },
  async getAuctions(schemeId?: string, status?: string) {
    const params = new URLSearchParams();
    if (schemeId) params.set('schemeId', schemeId);
    if (status) params.set('status', status);
    const { data } = await api.get(`/auctions?${params}`);
    if (data.success) return data.data;
    throw new Error(data.message || 'Failed to fetch auctions');
  },
  async getAuction(id: string) {
    const { data } = await api.get(`/auctions/${id}`);
    if (data.success) return data.data;
    throw new Error(data.message || 'Failed to fetch auction');
  },
  async createAuction(schemeId: string, auctionDate: string, monthNumber?: number) {
    const { data } = await api.post('/auctions', { schemeId, auctionDate, monthNumber });
    if (data.success) return data.data;
    throw new Error(data.message || 'Failed to create auction');
  },
  async submitBid(auctionId: string, customerId: number, discountAmount: number) {
    const { data } = await api.post(`/auctions/${auctionId}/bids`, { customerId, discountAmount });
    if (data.success) return data.data;
    throw new Error(data.message || 'Failed to submit bid');
  },
  async getBids(auctionId: string) {
    const { data } = await api.get(`/auctions/${auctionId}/bids`);
    if (data.success) return data.data;
    throw new Error(data.message || 'Failed to fetch bids');
  },
  async declareWinner(auctionId: string) {
    const { data } = await api.post(`/auctions/${auctionId}/declare-winner`);
    if (data.success) return data.data;
    throw new Error(data.message || 'Failed to declare winner');
  },
  async getReportsDashboard() {
    const { data } = await api.get('/reports/dashboard');
    if (data.success) return data.data;
    throw new Error(data.message || 'Failed to fetch dashboard');
  },
  async getDividends(customerId?: number) {
    const params = customerId ? `?customerId=${customerId}` : '';
    const { data } = await api.get(`/reports/dividends${params}`);
    if (data.success) return data.data;
    throw new Error(data.message || 'Failed to fetch dividends');
  },
  async getMyDividends() {
    const { data } = await api.get('/members/my-dividends');
    if (data.success) return data.data;
    throw new Error(data.message || 'Failed to fetch dividends');
  },
  async getMyPayments() {
    const { data } = await api.get('/members/my-payments');
    if (data.success) return data.data;
    throw new Error(data.message || 'Failed to fetch payments');
  },
};
