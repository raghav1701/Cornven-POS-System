import { PrismaClient } from '@prisma/client';
import { emailService } from './emailService';
import { EmailTemplates } from '../templates/emailTemplates';

interface StockAlert {
  id: string;
  productName: string;
  variantName: string;
  currentStock: number;
  threshold: number;
  barcode: string;
  tenantName: string;
  alertType: 'low_stock' | 'out_of_stock';
}

interface MonitoringStats {
  totalVariants: number;
  lowStockAlerts: number;
  outOfStockAlerts: number;
  emailsSent: number;
  errors: number;
}

export class StockMonitorService {
  private prisma: PrismaClient;
  private emailService = emailService;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastRunTime: Date | null = null;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Start the stock monitoring service with 24-hour intervals
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    
    // Initialize email service
    await this.emailService.initialize();
    
    // Run initial check
    await this.performStockCheck();
    
    // Schedule checks every 24 hours (86400000 ms)
    this.intervalId = setInterval(async () => {
      await this.performStockCheck();
    }, 24 * 60 * 60 * 1000);
    
    this.isRunning = true;
  }

  /**
   * Stop the stock monitoring service
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
  }

  /**
   * Perform a manual stock check (can be called independently)
   */
  async performStockCheck(): Promise<MonitoringStats> {
    console.log('🔍 Checking low stock and out-of-stock products...');
    const startTime = new Date();

    const stats: MonitoringStats = {
      totalVariants: 0,
      lowStockAlerts: 0,
      outOfStockAlerts: 0,
      emailsSent: 0,
      errors: 0
    };

    try {
      // Get all product variants with their products and tenants
      const variants = await this.prisma.productVariant.findMany({
        include: {
          product: {
            include: {
              tenant: true
            }
          }
        },
        where: {
          product: {
            tenantId: {
              not: undefined
            }
          }
        }
      });

      stats.totalVariants = variants.length;

      const alerts: StockAlert[] = [];

      // Check each variant for stock issues
      for (const variant of variants) {
        if (!variant.product.tenant) continue;

        const alert: StockAlert = {
          id: variant.id,
          productName: variant.product.name,
          variantName: `${variant.color} - ${variant.size}`,
          currentStock: variant.stock,
          threshold: variant.lowStockThreshold,
          barcode: variant.barcode,
          tenantName: variant.product.tenant.businessName,
          alertType: variant.stock === 0 ? 'out_of_stock' : 'low_stock'
        };

        // Check for out of stock
        if (variant.stock === 0) {
          alerts.push(alert);
          stats.outOfStockAlerts++;
        }
        // Check for low stock (but not zero)
        else if (variant.stock <= variant.lowStockThreshold && variant.stock > 0) {
          alerts.push(alert);
          stats.lowStockAlerts++;
        }
      }

      // Send email alerts
      if (alerts.length > 0) {
        console.log(`📦 Found ${stats.lowStockAlerts} low stock items and ${stats.outOfStockAlerts} out-of-stock items`);
        await this.sendStockAlerts(alerts, stats);
      } else {
        console.log('✅ All products have adequate stock levels');
      }

      // Update last run time
      this.lastRunTime = startTime;

      // Update last run time
      this.lastRunTime = startTime;

    } catch (error) {
      console.error('❌ Error during stock check:', error);
      stats.errors++;
    }

    return stats;
  }

  /**
   * Send stock alert emails
   */
  private async sendStockAlerts(alerts: StockAlert[], stats: MonitoringStats): Promise<void> {

    // Group alerts by tenant for batch sending
    const alertsByTenant = new Map<string, StockAlert[]>();
    
    for (const alert of alerts) {
      if (!alertsByTenant.has(alert.tenantName)) {
        alertsByTenant.set(alert.tenantName, []);
      }
      alertsByTenant.get(alert.tenantName)!.push(alert);
    }

    // Send emails for each tenant
    for (const [tenantName, tenantAlerts] of alertsByTenant) {
      try {
        // Get tenant admin emails (using the tenant's user relationship)
        const tenant = await this.prisma.tenant.findFirst({
          where: { businessName: tenantName },
          include: {
            user: true
          }
        });

        if (!tenant || !tenant.user) {
          continue;
        }

        // Send individual emails for each alert
        for (const alert of tenantAlerts) {
          const emailData = {
            productName: alert.productName,
            variantName: alert.variantName,
            currentStock: alert.currentStock,
            threshold: alert.threshold,
            barcode: alert.barcode,
            tenantName: alert.tenantName
          };

          let template;
          if (alert.alertType === 'out_of_stock') {
            template = EmailTemplates.outOfStockAlert({
              ...emailData,
              lastSaleDate: undefined // You can add this if you track last sale dates
            });
          } else {
            template = EmailTemplates.lowStockAlert(emailData);
          }

          // Send to the tenant's user
          try {
            console.log(`📧 Sending ${alert.alertType.replace('_', ' ')} alert to ${tenant.user.email}`);
            await this.emailService.sendEmail({
              to: tenant.user.email,
              subject: template.subject,
              html: template.html,
              text: template.text
            });
            
            stats.emailsSent++;
          } catch (emailError) {
            console.error(`❌ Failed to send email to ${tenant.user.email}:`, emailError);
            stats.errors++;
          }
        }

      } catch (error) {
        console.error(`❌ Error processing alerts for tenant ${tenantName}:`, error);
        stats.errors++;
      }
    }
  }

  /**
   * Get service status and statistics
   */
  getStatus(): {
    isRunning: boolean;
    lastRunTime: Date | null;
    nextRunTime: Date | null;
  } {
    const nextRunTime = this.lastRunTime 
      ? new Date(this.lastRunTime.getTime() + 24 * 60 * 60 * 1000)
      : null;

    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      nextRunTime
    };
  }

  /**
   * Force an immediate stock check (for testing or manual triggers)
   */
  async forceCheck(): Promise<MonitoringStats> {
    return await this.performStockCheck();
  }

  /**
   * Update the check interval (in hours)
   */
  updateInterval(hours: number): void {
    if (this.isRunning) {
      this.stop();
    }

    // Restart with new interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(async () => {
      await this.performStockCheck();
    }, hours * 60 * 60 * 1000);

    // Interval updated
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stop();
    await this.prisma.$disconnect();
  }
}

// Export singleton instance
export const stockMonitorService = new StockMonitorService();