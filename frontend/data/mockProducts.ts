import { Product, Category, InventoryChange, LowStockAlert, DeliveryLog } from '@/types/product';

// Mock categories
export const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Stickers', description: 'Decorative stickers and decals', productCount: 15 },
  { id: 'cat-2', name: 'Earrings', description: 'Handmade earrings and jewelry', productCount: 12 },
  { id: 'cat-3', name: 'Keychains', description: 'Custom keychains and accessories', productCount: 8 },
  { id: 'cat-4', name: 'Prints', description: 'Art prints and posters', productCount: 10 },
  { id: 'cat-5', name: 'Pins', description: 'Enamel pins and badges', productCount: 6 },
  { id: 'cat-6', name: 'Bookmarks', description: 'Decorative bookmarks', productCount: 4 },
];

// Mock products
export const mockProducts: Product[] = [

 
];

// Mock inventory changes
export const mockInventoryChanges: InventoryChange[] = [
  
];

// Mock low stock alerts
export const mockLowStockAlerts: LowStockAlert[] = [
  
];

export const mockDeliveryLogs: DeliveryLog[] = [
  
];

// Utility functions
export const generateBarcode = (prefix: string = 'CRV'): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

export const generateSKU = (tenantName: string, category: string): string => {
  const tenantCode = tenantName.split(' ').map(word => word.charAt(0)).join('').toUpperCase();
  const categoryCode = category.substring(0, 3).toUpperCase();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${tenantCode}-${categoryCode}-${random}`;
};

export const getProductsByCategory = (category: string): Product[] => {
  return mockProducts.filter(product => product.category === category);
};

export const getProductsByTenant = (tenantId: string): Product[] => {
  return mockProducts.filter(product => product.tenantId === tenantId);
};

export const getLowStockProducts = (threshold?: number): Product[] => {
  return mockProducts.filter(product => 
    product.stock <= (threshold || product.lowStockThreshold)
  );
};

export const searchProducts = (query: string): Product[] => {
  const lowercaseQuery = query.toLowerCase();
  return mockProducts.filter(product =>
    product.name.toLowerCase().includes(lowercaseQuery) ||
    product.description?.toLowerCase().includes(lowercaseQuery) ||
    product.barcode.toLowerCase().includes(lowercaseQuery) ||
    product.sku.toLowerCase().includes(lowercaseQuery) ||
    product.tenantName.toLowerCase().includes(lowercaseQuery) ||
    product.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};

export const filterProducts = (filter: any): Product[] => {
  return mockProducts.filter(product => {
    if (filter.category && product.category !== filter.category) return false;
    if (filter.tenantId && product.tenantId !== filter.tenantId) return false;
    if (filter.status && product.status !== filter.status) return false;
    if (filter.deliveryMethod && product.deliveryMethod !== filter.deliveryMethod) return false;
    if (filter.lowStock && product.stock > product.lowStockThreshold) return false;
    if (filter.search) {
      const query = filter.search.toLowerCase();
      const matches = product.name.toLowerCase().includes(query) ||
                     product.description?.toLowerCase().includes(query) ||
                     product.barcode.toLowerCase().includes(query) ||
                     product.sku.toLowerCase().includes(query) ||
                     product.tenantName.toLowerCase().includes(query) ||
                     product.tags?.some(tag => tag.toLowerCase().includes(query));
      if (!matches) return false;
    }
    return true;
  });
};

// Excel export utility
export const exportProductsToCSV = (products: Product[]): string => {
  const headers = [
    'SKU', 'Barcode', 'Name', 'Price', 'Stock', 'Category', 
    'Tenant Name', 'Description', 'Status', 'Commission Rate', 
    'Delivery Method', 'Low Stock Threshold', 'Weight', 'Tags'
  ];
  
  const csvContent = [
    headers.join(','),
    ...products.map(product => [
      product.sku,
      product.barcode,
      `"${product.name}"`,
      product.price,
      product.stock,
      product.category,
      `"${product.tenantName}"`,
      `"${product.description || ''}"`,
      product.status,
      product.commissionRate,
      product.deliveryMethod,
      product.lowStockThreshold,
      product.weight || '',
      `"${product.tags?.join(';') || ''}"`
    ].join(','))
  ].join('\n');
  
  return csvContent;
};

// Mock batch import function
export const importProductsFromCSV = (csvData: string): any => {
  const lines = csvData.split('\n');
  const headers = lines[0].split(',');
  const dataLines = lines.slice(1);
  
  const results = {
    success: true,
    totalRows: dataLines.length,
    successfulRows: 0,
    failedRows: 0,
    errors: [] as any[],
    importedProducts: [] as Product[]
  };
  
  dataLines.forEach((line, index) => {
    try {
      const values = line.split(',');
      if (values.length < headers.length) {
        results.errors.push({
          row: index + 2,
          field: 'general',
          message: 'Insufficient data columns'
        });
        results.failedRows++;
        return;
      }
      
      const product: Product = {
        id: `imported-${Date.now()}-${index}`,
        sku: values[0] || generateSKU('Imported', values[5] || 'General'),
        barcode: values[1] || generateBarcode(),
        name: values[2].replace(/"/g, ''),
        price: parseFloat(values[3]) || 0,
        stock: parseInt(values[4]) || 0,
        category: values[5] || 'General',
        tenantId: 'tenant-1', // Default tenant
        tenantName: values[6].replace(/"/g, '') || 'Unknown Artist',
        description: values[7].replace(/"/g, ''),
        status: (values[8] as any) || 'active',
        commissionRate: parseFloat(values[9]) || 15,
        deliveryMethod: (values[10] as any) || 'handover',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'import-system',
        lowStockThreshold: parseInt(values[11]) || 5,
        weight: parseFloat(values[12]) || undefined,
        tags: values[13] ? values[13].replace(/"/g, '').split(';') : []
      };
      
      results.importedProducts.push(product);
      results.successfulRows++;
    } catch (error) {
      results.errors.push({
        row: index + 2,
        field: 'general',
        message: 'Failed to parse row data'
      });
      results.failedRows++;
    }
  });
  
  if (results.failedRows > 0) {
    results.success = false;
  }
  
  return results;
};