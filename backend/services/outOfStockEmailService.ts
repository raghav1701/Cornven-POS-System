import { PrismaClient } from '@prisma/client';
import { EmailService } from '../utils/emailService';

const prisma = new PrismaClient();
const emailService = new EmailService();

/**
 * Check if a product or variant is out of stock and send email alert
 */
export async function checkAndSendOutOfStockAlert(
  tenantId: string,
  productId: string,
  variantId?: string
): Promise<void> {
  try {
    // Check if out-of-stock alerts are enabled
    const outOfStockEnabled = process.env.OUT_OF_STOCK_ALERTS_ENABLED === 'true';
    if (!outOfStockEnabled) {
      console.log('Out-of-stock alerts are disabled');
      return;
    }

    // Get tenant information
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        user: {
          select: { email: true }
        }
      }
    });

    if (!tenant) {
      console.error(`Tenant not found: ${tenantId}`);
      return;
    }

    // Get product information
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: true
      }
    });

    if (!product) {
      console.error(`Product not found: ${productId}`);
      return;
    }

    // Check if specific variant is out of stock
    if (variantId) {
      const variant = product.variants.find(v => v.id === variantId);
      if (!variant) {
        console.error(`Variant not found: ${variantId}`);
        return;
      }

      // Only send alert if stock is exactly 0
      if (variant.stock === 0) {
        console.log(`Sending out-of-stock alert for variant ${variantId} of product ${product.name}`);
        
        await emailService.sendOutOfStockAlert({
          tenantEmail: tenant.user?.email || '',
          tenantName: tenant.businessName,
          productName: product.name,
          productSku: product.sku || undefined,
          price: variant.price,
          category: product.category || undefined,
          isVariant: true,
          variantDetails: {
            color: variant.color,
            size: variant.size,
            sku: variant.sku || undefined
          }
        });
        
        console.log(`Out-of-stock alert sent successfully for variant ${variantId}`);
      }
    } else {
      // Check if main product is out of stock (when no variants exist)
      if (product.variants.length === 0 && product.stock === 0) {
        console.log(`Sending out-of-stock alert for product ${product.name}`);
        
        await emailService.sendOutOfStockAlert({
          tenantEmail: tenant.user?.email || '',
          tenantName: tenant.businessName,
          productName: product.name,
          productSku: product.sku || undefined,
          price: product.price,
          category: product.category || undefined,
          isVariant: false
        });
        
        console.log(`Out-of-stock alert sent successfully for product ${productId}`);
      }
      // Check if all variants are out of stock
      else if (product.variants.length > 0) {
        const outOfStockVariants = product.variants.filter(variant => variant.stock === 0);
        
        for (const variant of outOfStockVariants) {
          console.log(`Sending out-of-stock alert for variant ${variant.id} of product ${product.name}`);
          
          await emailService.sendOutOfStockAlert({
            tenantEmail: tenant.user?.email || '',
            tenantName: tenant.businessName,
            productName: product.name,
            productSku: product.sku || undefined,
            price: variant.price,
            category: product.category || undefined,
            isVariant: true,
            variantDetails: {
              color: variant.color,
              size: variant.size,
              sku: variant.sku || undefined
            }
          });
          
          console.log(`Out-of-stock alert sent successfully for variant ${variant.id}`);
        }
      }
    }
  } catch (error) {
    console.error('Error in checkAndSendOutOfStockAlert:', error);
    // Don't throw error to prevent disrupting main operations
  }
}

/**
 * Check all tenants for out-of-stock products and send alerts
 * This function can be used for scheduled checks
 */
export async function checkAllTenantsForOutOfStock(): Promise<void> {
  try {
    console.log('Starting out-of-stock check for all tenants...');
    
    // Check if out-of-stock alerts are enabled
    const outOfStockEnabled = process.env.OUT_OF_STOCK_ALERTS_ENABLED === 'true';
    if (!outOfStockEnabled) {
      console.log('Out-of-stock alerts are disabled');
      return;
    }

    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      include: {
        user: {
          select: { email: true }
        }
      }
    });

    let totalEmailsSent = 0;

    for (const tenant of tenants) {
      console.log(`Checking out-of-stock products for tenant: ${tenant.businessName}`);
      
      // Get all products for this tenant
      const products = await prisma.product.findMany({
        where: { tenantId: tenant.id },
        include: {
          variants: true
        }
      });

      for (const product of products) {
        // Check main product (if no variants)
        if (product.variants.length === 0 && product.stock === 0) {
          console.log(`Sending out-of-stock alert for product ${product.name} (tenant: ${tenant.businessName})`);
          
          await emailService.sendOutOfStockAlert({
            tenantEmail: tenant.user?.email || '',
            tenantName: tenant.businessName,
            productName: product.name,
            productSku: product.sku || undefined,
            price: product.price,
            category: product.category || undefined,
            isVariant: false
          });
          
          totalEmailsSent++;
        }
        // Check variants
        else if (product.variants.length > 0) {
          const outOfStockVariants = product.variants.filter(variant => variant.stock === 0);
          
          for (const variant of outOfStockVariants) {
            console.log(`Sending out-of-stock alert for variant ${variant.id} of product ${product.name} (tenant: ${tenant.businessName})`);
            
            await emailService.sendOutOfStockAlert({
              tenantEmail: tenant.user?.email || '',
              tenantName: tenant.businessName,
              productName: product.name,
              productSku: product.sku || undefined,
              price: variant.price,
              category: product.category || undefined,
              isVariant: true,
              variantDetails: {
                color: variant.color,
                size: variant.size,
                sku: variant.sku || undefined
              }
            });
            
            totalEmailsSent++;
          }
        }
      }
    }

    console.log(`Out-of-stock check completed. Total emails sent: ${totalEmailsSent}`);
  } catch (error) {
    console.error('Error in checkAllTenantsForOutOfStock:', error);
  }
}