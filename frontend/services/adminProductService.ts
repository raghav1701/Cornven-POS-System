// Admin Product Service for managing product approvals and filtering

export interface ProductVariant {
  id: string;
  productId: string;
  color: string;
  size: string;
  price: number;
  stock: number;
  sku: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  barcode?: string;
  barcodeType?: string;
  imageKey?: string | null;
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
  private baseUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api` 
    : 'https://cornven-pos-system.vercel.app/api';

  private getAuthHeaders(): Record<string, string> {
    // Client-side: check for token
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('cornven_token');
      if (!token) {
        // Return empty headers to trigger fallback to mock data
        return {
          'Content-Type': 'application/json',
        };
      }
      
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    }
    
    // Server-side: return basic headers
    return {
      'Content-Type': 'application/json',
    };
  }

  async getProducts(tenantId?: string): Promise<AdminProduct[]> {
    try {
      const headers = this.getAuthHeaders();
      
      // If no auth token, skip API call and use mock data directly
      if (!headers.Authorization) {
        console.log('No auth token found, using mock data');
        return this.getMockProducts(tenantId);
      }
      
      const queryParams = new URLSearchParams();
      if (tenantId) {
        queryParams.append('tenantId', tenantId);
      }
      
      const url = `${this.baseUrl}/admin/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        console.log(`API error (${response.status}), falling back to mock data`);
        return this.getMockProducts(tenantId);
      }

      const data = await response.json();
      // Handle both direct array and { products: [...] } response formats
      return Array.isArray(data) ? data : (data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      
      // Fallback to mock data for development/testing
      return this.getMockProducts(tenantId);
    }
  }

  private getMockProducts(tenantId?: string): AdminProduct[] {
    const mockProducts: AdminProduct[] = [
      {
        id: 'b4612b60-75da-4348-9cdb-5020a876fce6',
        tenantId: '02eddcb3-0dca-4cc8-90e2-2c61319eda75',
        name: 'Bag',
        description: 'Bag',
        price: 100,
        stock: 20,
        category: 'Bag',
        sku: 'BAG-001',
        status: 'PENDING',
        createdAt: '2025-09-07T00:21:10.777Z',
        updatedAt: '2025-09-07T00:21:10.777Z',
        tenant: {
          id: '02eddcb3-0dca-4cc8-90e2-2c61319eda75',
          businessName: 'Rex Enterprises'
        },
        variants: [
          {
            id: 'f8685241-2f89-4ec6-9e4a-188ec6691634',
            productId: 'b4612b60-75da-4348-9cdb-5020a876fce6',
            color: 'Black',
            size: '20',
            price: 100,
            stock: 9,
            sku: 'BAG-001-BLK-20',
            status: 'APPROVED',
            barcode: 'HZQHCJEXLRXK8PE',
            barcodeType: 'CODE128',
            imageKey: 'product-variants/2b7f3ea9-ecc1-454a-9a26-c1ecbdd0da03.jpeg',
            createdAt: '2025-09-07T00:21:10.777Z',
            updatedAt: '2025-09-07T00:22:42.415Z'
          },
          {
            id: '3ed5f056-657b-4610-8e98-247213742eec',
            productId: 'b4612b60-75da-4348-9cdb-5020a876fce6',
            color: 'Blue',
            size: '20',
            price: 100,
            stock: 11,
            sku: 'BAG-001-BLU-20',
            status: 'APPROVED',
            barcode: 'ZKBZADAZEXDJK6XN',
            barcodeType: 'CODE128',
            imageKey: 'product-variants/939893cd-646b-40be-9661-72bc13f39aea.jpeg',
            createdAt: '2025-09-07T00:21:10.777Z',
            updatedAt: '2025-09-07T00:22:45.007Z'
          }
        ],
        logs: []
      },
      {
        id: 'fcd1e140-86e9-453d-9fa8-76cb3acb311b',
        tenantId: '9a0ad105-6a86-44d9-a1e5-214c8ea91052',
        name: 'Mouse pad',
        description: 'Mouse pad with palm rest',
        price: 12,
        stock: 26,
        category: 'Accessories',
        sku: 'ACC-002',
        status: 'APPROVED',
        createdAt: '2025-09-06T09:21:15.404Z',
        updatedAt: '2025-09-06T09:21:15.404Z',
        tenant: {
          id: '9a0ad105-6a86-44d9-a1e5-214c8ea91052',
          businessName: 'John Arts Pvt Ltd'
        },
        variants: [
          {
            id: '9350a8d9-9aa6-4eea-aac9-17c1c99347d4',
            productId: 'fcd1e140-86e9-453d-9fa8-76cb3acb311b',
            color: 'Black',
            size: 'M',
            price: 12,
            stock: 11,
            sku: 'ACC-002-BLK-M',
            status: 'APPROVED',
            barcode: '9EBT5EYODVWMXECH',
            barcodeType: 'CODE128',
            imageKey: 'product-variants/7eecd4b7-6ec8-4630-9427-ae8e53df45e4.png',
            createdAt: '2025-09-06T09:21:15.404Z',
            updatedAt: '2025-09-07T09:30:56.030Z'
          },
          {
            id: '027ec929-683f-4cae-8e83-0e85df253387',
            productId: 'fcd1e140-86e9-453d-9fa8-76cb3acb311b',
            color: 'Blue',
            size: 'M',
            price: 11,
            stock: 15,
            sku: 'ACC-002-BLU-M',
            status: 'APPROVED',
            barcode: 'ZKBZADAZEXDJK6XN',
            barcodeType: 'CODE128',
            imageKey: 'product-variants/939893cd-646b-40be-9661-72bc13f39aea.jpeg',
            createdAt: '2025-09-06T09:21:15.404Z',
            updatedAt: '2025-09-07T09:30:56.030Z'
          }
        ],
        logs: []
      }
    ];
    
    // Filter by tenantId if provided
    if (tenantId) {
      return mockProducts.filter(product => product.tenantId === tenantId);
    }
    
    return mockProducts;
  }

  async approveProduct(productId: string, approve: boolean): Promise<AdminProduct> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/products/${productId}/approve`, {
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

  async approveVariant(productId: string, variantId: string, approve: boolean): Promise<any> {
    const token = localStorage.getItem('cornven_token');
    const response = await fetch(`https://cornven-pos-system.vercel.app/admin/variants/${variantId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ approve }),
    });

    if (!response.ok) {
      throw new Error('Failed to update variant approval');
    }

    return response.json();
  }

  async rejectVariant(productId: string, variantId: string): Promise<any> {
    return this.approveVariant(productId, variantId, false);
  }

  async lookupByBarcode(barcode: string): Promise<any> {
    try {
      const token = localStorage.getItem('cornven_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`https://cornven-pos-system.vercel.app/variants/lookup?barcode=${encodeURIComponent(barcode)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Product not found');
        }
        throw new Error(`Failed to lookup barcode: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error looking up barcode:', error);
      throw error;
    }
  }
}

export const adminProductService = new AdminProductService();