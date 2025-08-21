export interface Sale {
  id: string;
  saleNumber: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'qr';
  paymentStatus: 'completed' | 'pending' | 'failed';
  customerId?: string;
  customerName?: string;
  cashierId: string;
  cashierName: string;
  timestamp: string;
  notes?: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  tenantId: string;
  tenantName: string;
  commissionRate: number;
  commissionAmount: number;
}

export interface PaymentRecord {
  id: string;
  tenantId: string;
  tenantName: string;
  amount: number;
  type: 'rent' | 'commission';
  status: 'paid' | 'pending' | 'overdue';
  dueDate: string;
  paidDate?: string;
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'online';
  reference?: string;
  notes?: string;
  createdAt: string;
  startDate: string;
  endDate?: string;
}

export interface TenantSalesReport {
  tenantId: string;
  tenantName: string;
  period: {
    start: string;
    end: string;
  };
  totalSales: number;
  totalCommission: number;
  totalItems: number;
  topProducts: {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }[];
  salesByDay: {
    date: string;
    sales: number;
    items: number;
  }[];
}

export interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  totalCommission: number;
  activeProducts: number;
  activeTenants: number;
  lowStockProducts: number;
  pendingPayments: number;
  recentSales: Sale[];
  topProducts: {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }[];
}