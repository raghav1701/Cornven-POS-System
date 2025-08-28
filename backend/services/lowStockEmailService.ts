import { PrismaClient } from '@prisma/client';
import { EmailService } from '../utils/emailService';

const prisma = new PrismaClient();

interface LowStockItem {
  type: 'product' | 'variant';
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  threshold: number;
  deficit: number;
  price: number;
  category: string;
  color?: string;
  size?: string;
}

interface TenantLowStockData {
  tenantId: string;
  businessName: string;
  email: string;
  lowStockItems: LowStockItem[];
}

/**
 * Get all low stock items grouped by tenant
 */
export async function getLowStockItemsGroupedByTenant(): Promise<TenantLowStockData[]> {
  const tenants = await prisma.tenant.findMany({
    include: {
      user: {
        select: { email: true }
      },
      products: {
        include: {
          variants: true
        }
      }
    }
  });

  const tenantLowStockData: TenantLowStockData[] = [];

  for (const tenant of tenants) {
    const lowStockItems: LowStockItem[] = [];

    // Check each product
    for (const product of tenant.products) {
      // Calculate total stock from variants
      const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
      
      // Check product-level stock (exclude items with 0 stock as they trigger out-of-stock alerts)
      if (totalStock > 0 && totalStock <= (product.lowStockThreshold || 0)) {
        lowStockItems.push({
          type: 'product',
          id: product.id,
          name: product.name,
          sku: product.sku || 'N/A',
          currentStock: totalStock,
          threshold: product.lowStockThreshold || 0,
          deficit: (product.lowStockThreshold || 0) - totalStock,
          price: product.price,
          category: product.category || 'Uncategorized'
        });
      }

      // Check variant-level stock (exclude items with 0 stock as they trigger out-of-stock alerts)
      for (const variant of product.variants) {
        if (variant.stock > 0 && variant.stock <= (variant.lowStockThreshold || 0)) {
          lowStockItems.push({
            type: 'variant',
            id: variant.id,
            name: `${product.name} (${variant.color || 'N/A'} - ${variant.size || 'N/A'})`,
            sku: variant.sku || 'N/A',
            currentStock: variant.stock,
            threshold: variant.lowStockThreshold || 0,
            deficit: (variant.lowStockThreshold || 0) - variant.stock,
            price: variant.price,
            category: product.category || 'Uncategorized',
            color: variant.color || undefined,
            size: variant.size || undefined
          });
        }
      }
    }

    // Only include tenants with low stock items
    if (lowStockItems.length > 0) {
      tenantLowStockData.push({
        tenantId: tenant.id,
        businessName: tenant.businessName,
        email: tenant.user?.email || '',
        lowStockItems
      });
    }
  }

  return tenantLowStockData;
}

/**
 * Send low stock emails to all affected tenants
 */
export async function sendLowStockEmailsToAllTenants(): Promise<{ success: number; failed: number; details: string[] }> {
  const results = {
    success: 0,
    failed: 0,
    details: [] as string[]
  };

  try {
    const tenantLowStockData = await getLowStockItemsGroupedByTenant();
    
    if (tenantLowStockData.length === 0) {
      results.details.push('No tenants with low stock items found');
      return results;
    }

    for (const tenantData of tenantLowStockData) {
      try {
        if (!tenantData.email) {
          results.failed++;
          results.details.push(`Failed: ${tenantData.businessName} - No email address`);
          continue;
        }

        // Send combined email with all low stock items in a table
        const emailService = new EmailService();
        await emailService.sendCombinedLowStockAlert({
          tenantEmail: tenantData.email,
          tenantName: tenantData.businessName,
          lowStockItems: tenantData.lowStockItems.map(item => ({
            name: item.name,
            sku: item.sku,
            currentStock: item.currentStock,
            threshold: item.threshold,
            price: item.price,
            category: item.category,
            color: item.color,
            size: item.size,
            type: item.type
          }))
        });

        results.success++;
        results.details.push(`Success: ${tenantData.businessName} (${tenantData.lowStockItems.length} items)`);
      } catch (error) {
        results.failed++;
        results.details.push(`Failed: ${tenantData.businessName} - ${error}`);
      }
    }
  } catch (error) {
    results.failed++;
    results.details.push(`System error: ${error}`);
  }

  return results;
}

/**
 * Check if a specific product/variant should trigger a low stock alert
 * Used for real-time triggers on stock updates
 */
export async function checkAndSendLowStockAlert(
  productId: string, 
  variantId?: string
): Promise<boolean> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        tenant: {
          include: {
            user: { select: { email: true } }
          }
        },
        variants: true
      }
    });

    if (!product || !product.tenant.user?.email) {
      return false;
    }

    const lowStockItems: LowStockItem[] = [];

    if (variantId) {
      // Check specific variant (exclude items with 0 stock as they trigger out-of-stock alerts)
      const variant = product.variants.find(v => v.id === variantId);
      if (variant && variant.stock > 0 && variant.stock <= (variant.lowStockThreshold || 0)) {
        lowStockItems.push({
          type: 'variant',
          id: variant.id,
          name: `${product.name} (${variant.color || 'N/A'} - ${variant.size || 'N/A'})`,
          sku: variant.sku || 'N/A',
          currentStock: variant.stock,
          threshold: variant.lowStockThreshold || 0,
          deficit: (variant.lowStockThreshold || 0) - variant.stock,
          price: variant.price,
          category: product.category || 'Uncategorized',
          color: variant.color || undefined,
          size: variant.size || undefined
        });
      }
    } else {
      // Calculate total stock from variants
      const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
      
      // Check product-level stock (exclude items with 0 stock as they trigger out-of-stock alerts)
      if (totalStock > 0 && totalStock <= (product.lowStockThreshold || 0)) {
        lowStockItems.push({
          type: 'product',
          id: product.id,
          name: product.name,
          sku: product.sku || 'N/A',
          currentStock: totalStock,
          threshold: product.lowStockThreshold || 0,
          deficit: (product.lowStockThreshold || 0) - totalStock,
          price: product.price,
          category: product.category || 'Uncategorized'
        });
      }
    }

    if (lowStockItems.length > 0) {
      // Send email for the low stock item
      const item = lowStockItems[0]; // Should only be one item in this context
      const emailService = new EmailService();
      await emailService.sendLowStockAlert({
        tenantEmail: product.tenant.user.email,
        tenantName: product.tenant.businessName,
        productName: item.name,
        productSku: item.sku,
        currentStock: item.currentStock,
        threshold: item.threshold,
        price: item.price,
        category: item.category,
        isVariant: item.type === 'variant',
        variantDetails: item.color && item.size ? {
          color: item.color,
          size: item.size,
          sku: item.sku
        } : undefined
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error in checkAndSendLowStockAlert:', error);
    return false;
  }
}

/**
 * Get low stock statistics for monitoring
 */
export async function getLowStockStatistics(): Promise<{
  totalTenants: number;
  tenantsWithLowStock: number;
  totalLowStockItems: number;
  criticalItems: number;
}> {
  const tenantLowStockData = await getLowStockItemsGroupedByTenant();
  
  const totalLowStockItems = tenantLowStockData.reduce(
    (sum, tenant) => sum + tenant.lowStockItems.length, 
    0
  );
  
  const criticalItems = tenantLowStockData.reduce(
    (sum, tenant) => sum + tenant.lowStockItems.filter(item => item.currentStock === 0).length,
    0
  );

  const totalTenants = await prisma.tenant.count();

  return {
    totalTenants,
    tenantsWithLowStock: tenantLowStockData.length,
    totalLowStockItems,
    criticalItems
  };
}