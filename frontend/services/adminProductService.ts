// Admin Product Service for managing product approvals and filtering

export interface ProductVariant {
  id: string;
  productId: string;
  color: string;
  size: string;
  price: number;
  stock: number;
  sku: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductLog {
  id: string;
  productId: string;
  productVariantId?: string | null;
  userId: string;
  changeType: string;
  previousValue: string | null;
  newValue: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

export interface Tenant {
  id: string;
  businessName: string;
}

export interface AdminProduct {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  sku: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  tenant: Tenant;
  variants?: ProductVariant[];
  logs?: ProductLog[];
  imageUrl?: string;
}

export interface ProductApprovalRequest {
  approve: string; // "true" or "false"
}

class AdminProductService {
  private getAuthHeaders() {
    const token = localStorage.getItem('cornven_token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getProducts(tenantId?: string): Promise<AdminProduct[]> {
    try {
      const queryParams = new URLSearchParams();
      if (tenantId) {
        queryParams.append('tenantId', tenantId);
      }
      
      const url = `/api/admin/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch products');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching products:', error);
      
      // Return mock data for testing when API is not available
      const mockProducts: AdminProduct[] = [
        {
          id: 'prod-1',
          tenantId: 'tenant-1',
          name: 'Handcrafted Ceramic Vase',
          description: 'Beautiful handmade ceramic vase with unique glaze pattern',
          price: 89.99,
          stock: 5,
          category: 'Ceramics',
          sku: 'CER-001',
          status: 'PENDING',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
          tenant: {
            id: 'tenant-1',
            businessName: 'Art Corner Studio'
          },
          logs: []
        },
        {
          id: 'prod-2',
          tenantId: 'tenant-2',
          name: 'Silver Pendant Necklace',
          description: 'Elegant silver pendant with moonstone',
          price: 125.00,
          stock: 3,
          category: 'Jewelry',
          sku: 'JEW-002',
          status: 'PENDING',
          createdAt: '2024-01-16T14:20:00Z',
          updatedAt: '2024-01-16T14:20:00Z',
          tenant: {
            id: 'tenant-2',
            businessName: 'Luna\'s Jewelry'
          },
          logs: []
        },
        {
          id: 'prod-3',
          tenantId: 'tenant-1',
          name: 'Abstract Canvas Painting',
          description: 'Original abstract painting on canvas',
          price: 299.99,
          stock: 1,
          category: 'Paintings',
          sku: 'ART-003',
          status: 'APPROVED',
          createdAt: '2024-01-10T09:15:00Z',
          updatedAt: '2024-01-12T16:45:00Z',
          tenant: {
            id: 'tenant-1',
            businessName: 'Art Corner Studio'
          },
          logs: []
        }
      ];
      
      // Filter by tenantId if provided
      if (tenantId) {
        return mockProducts.filter(product => product.tenantId === tenantId);
      }
      
      return mockProducts;
    }
  }

  async approveProduct(productId: string, approve: boolean): Promise<AdminProduct> {
    try {
      const response = await fetch(`/api/admin/products/${productId}/approve`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          approve: approve.toString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update product approval');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating product approval:', error);
      throw error;
    }
  }

  async rejectProduct(productId: string): Promise<AdminProduct> {
    return this.approveProduct(productId, false);
  }

  async getAllProducts(): Promise<AdminProduct[]> {
    return this.getProducts();
  }
}

export const adminProductService = new AdminProductService();