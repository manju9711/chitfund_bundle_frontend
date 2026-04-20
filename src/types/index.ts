export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'admin' | 'manager';
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  whatsappNumber?: string;
  address?: string;
  city?: string;
  aadharNumber?: string;
  panNumber?: string;
  schemeId?: string;
  schemeName?: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

export interface ChitScheme {
  id: string;
  name: string;
  totalAmount: number;
  duration: number; // in months
  monthlyInstallment: number;
  startDate: string;
  endDate: string;
  chitFrequency: 'week' | 'month';
  chitType: 'fixed' | 'auction';
  status: 'active' | 'completed' | 'cancelled';
  totalMembers: number;
  currentMembers: number;
  hasPayments?: boolean; // true if any installment has been paid
  completedInstallments?: number; // count of completed installments
  overdueAfterMonths?: number; // consecutive unpaid months before considered overdue (default: 3)
}

export interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  schemeId: string;
  schemeName: string;
  installmentAmount?: number;
  amount: number;
  paymentDate: string;
  month: number;
  status: 'paid' | 'pending' | 'overdue';
}

export interface PaymentScheduleRow {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  entryId: string;
  month: number;
  dueDate: string;
  dueAmount: number;
  paidAmount: number;
  paidDate: string | null;
  status: 'paid' | 'pending' | 'overdue';
}

export interface PaymentSchedule {
  schemeId: string;
  schemeName: string;
  duration: number;
  monthlyInstallment: number;
  startDate: string;
  rows: PaymentScheduleRow[];
}


export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  name: string;
}

export interface ChitSchedule {
  id: string;
  schemeId: string;
  monthNumber: number;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  allocationType: 'auction' | 'fixed' | 'pending';
  allocationDate?: string;
  status: 'pending' | 'allocated' | 'completed' | 'cancelled';
  amountReceived?: number;
}

export interface ChitScheduleGroup {
  schemeId: string;
  schemeName: string;
  duration: number;
  totalAmount: number;
  chitType: 'fixed' | 'auction';
  chitFrequency: 'week' | 'month';
  schedules: ChitSchedule[];
}

