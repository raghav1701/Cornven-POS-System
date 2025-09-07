export interface RentPayment {
  id: string;
  amount: number;
  method: 'Bank Transfer' | 'Card';
  date: string;
  tenantId: string;
  status?: 'completed' | 'pending' | 'failed';
  notes?: string;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  businessName: string;
  phone: string;
  cubeId: string;
  leaseStartDate: string;
  leaseEndDate: string;
  status: 'Upcoming' | 'Active' | 'Expired' | 'Available';
  rentPayments: RentPayment[];
  businessType?: string;
  dailyRent?: number;
  securityDeposit?: number;
  address?: string;
  notes?: string;
}

export type LeaseStatus = 'Upcoming' | 'Active' | 'Expired' | 'Available';

export interface TenantFormData {
  name: string;
  email: string;
  password: string;
  businessName: string;
  phone: string;
  address: string;
  notes: string;
}