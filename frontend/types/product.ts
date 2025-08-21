export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  tenantId: string;
  tenantName: string;
  description?: string;
  imageUrl?: string;
  status: 'active' | 'pending' | 'inactive';
  commissionRate: number; // Percentage
  deliveryMethod: 'handover' | 'consignment';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lowStockThreshold: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  tags?: string[];
}

export interface ProductFormData {
  name: string;
  price: number;
  stock: number;
  category: string;
  description?: string;
  imageUrl?: string;
  commissionRate: number;
  deliveryMethod: 'handover' | 'consignment';
  lowStockThreshold: number;
}

export interface InventoryChange {
  id: string;
  productId: string;
  productName: string;
  changeType: 'stock_in' | 'stock_out' | 'adjustment' | 'sale';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  timestamp: string;
  userId: string;
  userName: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  productCount: number;
}

export interface LowStockAlert {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  tenantId: string;
  tenantName: string;
  createdAt: string;
  acknowledged: boolean;
}

export interface DeliveryLog {
  id: string;
  productId: string;
  productName: string;
  tenantId: string;
  tenantName: string;
  deliveryMethod: 'handover' | 'consignment';
  quantity: number;
  deliveryDate: string;
  receivedBy: string;
  deliveredBy: string;
  status: 'pending' | 'delivered' | 'returned';
  notes?: string;
  signature?: string;
  photos?: string[];
}

export interface BatchImportResult {
  success: boolean;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errors: {
    row: number;
    field: string;
    message: string;
  }[];
  importedProducts: Product[];
}

export interface InventoryFilter {
  category?: string;
  tenantId?: string;
  status?: 'active' | 'pending' | 'inactive';
  deliveryMethod?: 'handover' | 'consignment';
  lowStock?: boolean;
  search?: string;
  stockStatus?: 'low' | 'normal' | 'out' | '';
  priceRange?: {
    min?: number;
    max?: number;
  };
}