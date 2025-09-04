import { authService } from './authService';

const API_BASE_URL = typeof window !== 'undefined' 
  ? `${window.location.origin}/api` 
  : 'https://cornven-pos-system.vercel.app/api';

export interface TenantDetails {
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
    status: string;
    dailyRent: number;
    lastPayment: string | null;
    createdAt: string;
    updatedAt: string;
    allocatedById: string;
    cube: {
      id: string;
      code: string;
      size: string;
      pricePerDay: number;
      status: string;
      createdAt: string;
      updatedAt: string;
    };
  }>;
}

// Interface for variant in API request (what we send)
export interface ProductVariantRequest {
  color: string;
  size: string;
  price: number;
  stock: number;
}

// Interface for variant in API response (what we receive)
export interface ProductVariant {
  id: string;
  productId: string;
  color: string;
  size: string;
  price: number;
  stock: number;
  barcode: string;
  barcodeType: string;
  status: string;
  imageKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantProduct {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  variants: ProductVariant[];
  logs?: Array<{
    id: string;
    productId: string;
    userId: string;
    changeType: string;
    previousValue: string | null;
    newValue: string;
    createdAt: string;
  }>;
}

export interface AddProductRequest {
  name: string;
  description: string;
  category: string;
  variants: ProductVariantRequest[];
}

export interface UpdateStockRequest {
  productId: string;
  stock: number;
}

class TenantPortalService {
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = authService.getAuthToken();
    if (!token) {
      // Redirect to auth page if no token
      if (typeof window !== 'undefined') {
        window.location.href = '/auth';
      }
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        // Clear invalid token and redirect to auth page
        authService.removeAuthToken();
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cornven_user');
          window.location.href = '/auth';
        }
        throw new Error('Authentication failed. Please login again.');
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async getTenantDetails(): Promise<TenantDetails> {
    try {
      return await this.makeRequest("/tenant/my-details", {
        method: "GET",
      });
    } catch (error) {
      console.error("Error fetching tenant details:", error);
      throw error;
    }
  }

  async getTenantProducts(): Promise<TenantProduct[]> {
    try {
      return await this.makeRequest("/tenant/products", {
        method: "GET",
      });
    } catch (error) {
      console.error("Error fetching tenant products:", error);
      throw error;
    }
  }

  async addProduct(productData: AddProductRequest): Promise<{ success: boolean; data?: TenantProduct; message?: string }> {
    try {
      const data = await this.makeRequest('/tenant/products', {
        method: 'POST',
        body: JSON.stringify(productData),
      });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error adding product:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Network error occurred while adding product' 
      };
    }
  }

  async updateProductStock(productId: string, price: number, stock: number): Promise<TenantProduct> {
    return await this.makeRequest(`/tenant/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ price, stock }),
    });
  }

  async updateVariant(productId: string, variantId: string, price: number, stock: number): Promise<ProductVariant> {
    return await this.makeRequest(`/tenant/products/${productId}/variants/${variantId}`, {
      method: 'PUT',
      body: JSON.stringify({ price: price.toString(), stock: stock.toString() }),
    });
  }

  async deleteVariant(productId: string, variantId: string): Promise<void> {
    return await this.makeRequest(`/tenant/products/${productId}/variants/${variantId}`, {
      method: 'DELETE',
    });
  }

  async getProductLogs(productId: string): Promise<Array<{
    id: string;
    productId: string;
    userId: string;
    changeType: string;
    previousValue: string | null;
    newValue: string;
    createdAt: string;
  }>> {
    return await this.makeRequest(`/tenant/products/${productId}/logs`);
  }

  // S3 Image Upload Methods
  async generateImageUploadUrl(variantId: string, contentType: string, ext: string): Promise<{
    uploadUrl: string;
    key: string;
    expiresIn: number;
  }> {
    return await this.makeRequest(`/variants/${variantId}/image/upload-url`, {
      method: 'POST',
      body: JSON.stringify({ contentType, ext }),
    });
  }

  async uploadImageToS3(uploadUrl: string, imageFile: File): Promise<Response> {
    console.log('Uploading to S3 URL:', uploadUrl);
    console.log('File type:', imageFile.type, 'File size:', imageFile.size);
    
    try {
      console.log('Making fetch request to S3...');
      
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
          const response = await fetch(uploadUrl, {
            method: 'PUT',
            body: imageFile,
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          console.log('S3 upload response:', response.status, response.statusText);
          
          if (!response.ok) {
            console.error('S3 upload failed with status:', response.status);
            const responseText = await response.text().catch(() => 'Unable to read response');
            console.error('S3 error response:', responseText);
          }
          
          return response;
        } catch (fetchError) {
          clearTimeout(timeoutId);
          
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            console.error('S3 upload timed out after 30 seconds');
            throw new Error('Upload timed out');
          }
          
          // Log additional details for network errors
           if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
             console.error('Network fetch failed. This could be due to:');
             console.error('1. CORS policy restrictions on the S3 bucket');
             console.error('2. Network connectivity issues');
             console.error('3. Invalid or expired presigned URL');
             console.error('4. Placeholder checksum causing signature mismatch');
             console.error('Upload URL:', cleanUrl);
           }
          
          throw fetchError;
        }
    } catch (error) {
      console.error('S3 upload error:', error);
      console.error('Error type:', error instanceof TypeError ? 'TypeError' : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async commitImageKey(variantId: string, key: string): Promise<ProductVariant> {
    console.log('=== COMMITTING IMAGE KEY ===');
    console.log('Variant ID:', variantId);
    console.log('Image Key:', key);
    return await this.makeRequest(`/variants/${variantId}/image/commit`, {
      method: 'POST',
      body: JSON.stringify({ key }),
    });
  }
}

export const tenantPortalService = new TenantPortalService();