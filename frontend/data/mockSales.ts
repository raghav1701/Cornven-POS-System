import { Sale, SaleItem, PaymentRecord, TenantSalesReport, DashboardStats } from '@/types/sales';

// Mock sales data
export const mockSales: Sale[] = [
  
];

// Mock payment records
export const mockPaymentRecords: PaymentRecord[] = [
 
];

// Mock tenant sales reports
export const mockTenantSalesReports: TenantSalesReport[] = [
 
];

// Mock dashboard stats
export const mockDashboardStats: DashboardStats = {
  totalSales: 3,
  totalRevenue: 51.41,
  totalCommission: 8.01,
  activeProducts: 8,
  activeTenants: 1,
  lowStockProducts: 2,
  pendingPayments: 1,
  recentSales: mockSales.slice(0, 5),
  topProducts: [
  ]
};

// Utility functions
export const generateSaleNumber = (): string => {
  const timestamp = Date.now();
  return `SAL-${timestamp.toString().slice(-6)}`;
};

export const calculateCommission = (price: number, rate: number): number => {
  return Math.round((price * rate / 100) * 100) / 100;
};

export const getSalesByTenant = (tenantId: string): Sale[] => {
  return mockSales.filter(sale => 
    sale.items.some(item => item.tenantId === tenantId)
  );
};

export const getPaymentsByTenant = (tenantId: string): PaymentRecord[] => {
  return mockPaymentRecords.filter(payment => payment.tenantId === tenantId);
};

export const getTenantCommissionTotal = (tenantId: string): number => {
  const sales = getSalesByTenant(tenantId);
  return sales.reduce((total, sale) => {
    const tenantItems = sale.items.filter(item => item.tenantId === tenantId);
    return total + tenantItems.reduce((itemTotal, item) => itemTotal + item.commissionAmount, 0);
  }, 0);
};

export const getSalesByDateRange = (startDate: string, endDate: string): Sale[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return mockSales.filter(sale => {
    const saleDate = new Date(sale.timestamp);
    return saleDate >= start && saleDate <= end;
  });
};