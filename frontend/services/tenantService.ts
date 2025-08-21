import { authService } from "./authService";

const API_BASE_URL = typeof window !== 'undefined' 
  ? `${window.location.origin}/api` 
  : 'http://localhost:3001/api';

export interface AddTenantRequest {
  name: string;
  email: string;
  password: string;
  phone: string;
  businessName: string;
  address: string;
  notes?: string;
}

export interface AddTenantResponse {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
  tenants: Array<{
    id: string;
    userId: string;
    businessName: string;
    address: string;
    notes: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface ViewTenantsResponse {
  id: string;
  userId: string;
  businessName: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  rentals: Array<{
    id: string;
    tenantId: string;
    cubeId: string;
    startDate: string;
    endDate: string;
    status: "ACTIVE" | "INACTIVE" | "EXPIRED";
    dailyRent: number;
    lastPayment: string | null;
    createdAt: string;
    updatedAt: string;
    allocatedById: string;
    cube: {
      id: string;
      code: string;
      size: string;
      pricePerMonth: number;
      status: "AVAILABLE" | "RENTED" | "MAINTENANCE";
      createdAt: string;
      updatedAt: string;
    };
  }>;
}

export interface CubeAllocationRequest {
  tenantId: string;
  cubeId: string;
  startDate: string;
  endDate: string;
}

export interface CubeAllocationResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export interface AvailableCube {
  id: string;
  code: string;
  size: string;
  pricePerMonth: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

class TenantService {
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async addTenant(tenantData: AddTenantRequest): Promise<{
    success: boolean;
    data?: { tenantId: string };
    message?: string;
  }> {
    try {
      const token = authService.getAuthToken();
      if (!token) {
        throw new Error("Authentication token not found. Please login again.");
      }

      const response = await this.makeRequest(
        "/admin/add-tenant",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(tenantData),
        }
      );

      // Extract tenant ID from the response
      const tenantId = response.tenants?.[0]?.id;

      if (!tenantId) {
        throw new Error("Tenant ID not found in response");
      }

      return {
        success: true,
        data: { tenantId },
        message: "Tenant created successfully",
      };
    } catch (error) {
      console.error("Error in addTenant:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to create tenant",
      };
    }
  }

  async viewAllTenants(): Promise<ViewTenantsResponse[]> {
    const token = authService.getAuthToken();
    if (!token) {
      throw new Error("Authentication token not found. Please login again.");
    }

    return this.makeRequest(
      "/admin/tenants-allocations",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  }

  async viewAvailableCubes(): Promise<AvailableCube[]> {
    try {
      const token = authService.getAuthToken();
      if (!token) {
        throw new Error("Authentication token not found. Please login again.");
      }

      return await this.makeRequest(
        "/admin/cubes",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error("Error fetching available cubes:", error);
      throw error;
    }
  }

  async allocateCube(
    allocationData: CubeAllocationRequest
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const token = authService.getAuthToken();
      if (!token) {
        throw new Error("Authentication token not found. Please login again.");
      }

      // Format dates to ISO string
      const formattedData = {
        ...allocationData,
        startDate: new Date(allocationData.startDate).toISOString(),
        endDate: new Date(allocationData.endDate).toISOString(),
      };

      const response = await this.makeRequest(
        "/admin/tenant-cube-allocation",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formattedData),
        }
      );

      return {
        success: true,
        data: response,
        message: "Cube allocated successfully",
      };
    } catch (error) {
      console.error("Error in allocateCube:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to allocate cube",
      };
    }
  }

  // Helper method to generate a default password
  generateDefaultPassword(): string {
    return "Tenant@1234";
  }

  // Helper method to validate phone number
  validatePhoneNumber(phone: string): boolean {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, "");

    // Check for valid Australian phone number formats
    // Mobile: 04xxxxxxxx (10 digits starting with 04)
    // Landline: 0[2-8]xxxxxxxx (10 digits starting with 02-08)
    // International: +61xxxxxxxxx (starts with +61)

    if (cleaned.startsWith("61")) {
      // International format: +61xxxxxxxxx (should be 11 digits total)
      return cleaned.length === 11 && /^61[2-9]\d{8}$/.test(cleaned);
    }

    if (cleaned.startsWith("0")) {
      // Australian format: 0xxxxxxxxx (should be 10 digits)
      return cleaned.length === 10 && /^0[2-9]\d{8}$/.test(cleaned);
    }

    // If it's 9 digits, assume it's missing the leading 0
    if (cleaned.length === 9) {
      return /^[2-9]\d{8}$/.test(cleaned);
    }

    return false;
  }

  // Helper method to format phone number
  formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, "");

    // If it starts with 61 (international format), convert to Australian format
    if (cleaned.startsWith("61") && cleaned.length === 11) {
      return `0${cleaned.substring(2)}`;
    }

    // If it starts with 0, keep Australian format
    if (cleaned.startsWith("0") && cleaned.length === 10) {
      return cleaned;
    }

    // If it's 9 digits, add leading 0 for Australian format
    if (cleaned.length === 9) {
      return `0${cleaned}`;
    }

    // Return as is if we can't determine the format
    return phone;
  }
}

export const tenantService = new TenantService();
