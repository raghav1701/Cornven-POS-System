import { authService } from './authService';

export interface TenantUser {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface Cube {
  id: string;
  code: string;
  size: string;
  pricePerMonth: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Rental {
  id: string;
  tenantId: string;
  cubeId: string;
  startDate: string;
  endDate: string;
  status: string;
  dailyRent: number;
  lastPayment: string | null;
  createdAt: string;
  updatedAt: string;
  allocatedById: string;
  cube: Cube;
}

export interface AdminTenant {
  id: string;
  userId: string;
  businessName: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  user: TenantUser;
  rentals: Rental[];
}

class AdminTenantService {
  private baseUrl = '/api';

  async getTenants(): Promise<AdminTenant[]> {
    try {
      console.log('Fetching tenants from local API:', `${this.baseUrl}/admin/tenants-allocations`);
      
      const token = authService.getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('Using token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');

      const response = await fetch(`${this.baseUrl}/admin/tenants-allocations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      console.log('Successfully fetched tenants:', Array.isArray(data) ? data.length : 'Not array', 'items');
      console.log('Raw tenant data:', data);
      return data;
    } catch (error) {
      console.error('Error fetching tenants:', error);
      throw error;
    }
  }

  async getAllTenants(): Promise<AdminTenant[]> {
    return this.getTenants();
  }
}

export const adminTenantService = new AdminTenantService();
export default adminTenantService;