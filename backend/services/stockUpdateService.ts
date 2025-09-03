import { PrismaClient } from '@prisma/client';
import { emailService, EmailOptions } from './emailService';
import { EmailTemplates } from '../templates/emailTemplates';

interface StockUpdateData {
  variantId: string;
  newStock: number;
  reason?: 'sale' | 'manual_update' | 'return' | 'adjustment';
}

export class StockUpdateService {
  private prisma: PrismaClient;
  private emailService = emailService;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Update stock and check for low stock alerts
   */
  async updateStock(data: StockUpdateData): Promise<{
    success: boolean;
    variant?: any;
    alertSent?: boolean;
    error?: string;
  }> {
    try {
      // Get variant with product and tenant info
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: data.variantId },
        include: {
          product: {
            include: {
              tenant: true
            }
          }
        }
      });

      if (!variant) {
        return { success: false, error: 'Variant not found' };
      }

      // Create a variant object with the NEW stock value for alert checking
      const variantWithNewStock = {
        ...variant,
        stock: data.newStock
      };

      // Check if NEW stock is below threshold
      const alertSent = await this.checkAndSendAlert(variantWithNewStock, data.reason);

      return {
        success: true,
        variant: variantWithNewStock,
        alertSent
      };
    } catch (error) {
      console.error('Stock update service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if variant needs alert and send email
   */
  private async checkAndSendAlert(variant: any, reason?: string): Promise<boolean> {
    try {
      const isLowStock = variant.stock <= variant.lowStockThreshold && variant.stock > 0;
      const isOutOfStock = variant.stock === 0;

      if (!isLowStock && !isOutOfStock) {
        return false;
      }

      const alertType = isOutOfStock ? 'out_of_stock' : 'low_stock';
      
      await this.sendStockAlert({
        id: variant.id,
        productName: variant.product.name,
        variantName: `${variant.color} - ${variant.size}`,
        currentStock: variant.stock,
        threshold: variant.lowStockThreshold,
        barcode: variant.barcode,
        tenantName: variant.product.tenant.businessName,
        alertType
      });

      return true;
    } catch (error) {
      console.error('Alert check failed:', error);
      return false;
    }
  }

  /**
   * Send stock alert email
   */
  private async sendStockAlert(alert: any): Promise<void> {
    try {
      if (!this.emailService) {
        return;
      }

      // Get the tenant's email address from the database
      const tenant = await this.prisma.tenant.findFirst({
        where: { businessName: alert.tenantName },
        include: {
          user: true
        }
      });

      if (!tenant || !tenant.user) {
        return;
      }

      const subject = alert.alertType === 'out_of_stock'
        ? `🚨 OUT OF STOCK: ${alert.productName}`
        : `⚠️ LOW STOCK ALERT: ${alert.productName}`;

      const emailTemplate = alert.alertType === 'out_of_stock'
        ? EmailTemplates.outOfStockAlert({
            productName: alert.productName,
            variantName: alert.variantName,
            barcode: alert.barcode,
            tenantName: alert.tenantName
          })
        : EmailTemplates.lowStockAlert({
            productName: alert.productName,
            variantName: alert.variantName,
            currentStock: alert.currentStock,
            threshold: alert.threshold,
            barcode: alert.barcode,
            tenantName: alert.tenantName
          });

      const emailOptions: EmailOptions = {
        to: tenant.user.email, // Send to the actual tenant's email
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text
      };

      const emailResult = await this.emailService.sendEmail(emailOptions);

      // Email sent successfully
    } catch (error) {
      console.error('Failed to send stock alert:', error);
      throw error;
    }
  }

  /**
   * Strip HTML tags from content to create plain text
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export const stockUpdateService = new StockUpdateService();