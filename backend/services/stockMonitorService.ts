// stockMonitorService.ts
import type { PrismaClient } from "@prisma/client";
import prisma from "../prisma/prisma";
import { emailService } from "./emailService";
import { EmailTemplates } from "../templates/emailTemplates";

interface StockAlert {
  id: string;
  productName: string;
  variantName: string;
  currentStock: number;
  threshold: number;
  barcode: string;
  tenantName: string;
  alertType: "low_stock" | "out_of_stock";
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
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastRunTime: Date | null = null;
  private monitoringIntervalHours: number;

  // ← Inject prisma (defaults to the shared singleton)
  constructor(prismaClient: PrismaClient = prisma) {
    this.prisma = prismaClient;
    const envInterval = parseInt(
      process.env.STOCK_MONITOR_INTERVAL_HOURS || "24",
      10
    );
    this.monitoringIntervalHours =
      isNaN(envInterval) || envInterval <= 0 ? 24 : envInterval;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    await this.emailService.initialize();
    await this.performStockCheck();

    this.intervalId = setInterval(async () => {
      await this.performStockCheck();
    }, this.monitoringIntervalHours * 60 * 60 * 1000);

    this.isRunning = true;
  }

  stop(): void {
    if (!this.isRunning) return;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  async performStockCheck(): Promise<MonitoringStats> {
    console.log("🔍 Checking low stock and out-of-stock products...");
    const startTime = new Date();

    const stats: MonitoringStats = {
      totalVariants: 0,
      lowStockAlerts: 0,
      outOfStockAlerts: 0,
      emailsSent: 0,
      errors: 0,
    };

    try {
      const variants = await this.prisma.productVariant.findMany({
        include: {
          product: {
            include: { tenant: true },
          },
        },
        where: {
          product: {
            tenantId: { not: undefined },
          },
        },
      });

      stats.totalVariants = variants.length;

      const alerts: StockAlert[] = [];

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
          alertType: variant.stock === 0 ? "out_of_stock" : "low_stock",
        };

        if (variant.stock === 0) {
          alerts.push(alert);
          stats.outOfStockAlerts++;
        } else if (variant.stock <= variant.lowStockThreshold) {
          alerts.push(alert);
          stats.lowStockAlerts++;
        }
      }

      if (alerts.length > 0) {
        console.log(
          `📦 Found ${stats.lowStockAlerts} low stock and ${stats.outOfStockAlerts} out-of-stock items`
        );
        await this.sendStockAlerts(alerts, stats);
      } else {
        console.log("✅ All products have adequate stock levels");
      }

      this.lastRunTime = startTime;
    } catch (error) {
      console.error("❌ Error during stock check:", error);
      stats.errors++;
    }

    return stats;
  }

  private async sendStockAlerts(
    alerts: StockAlert[],
    stats: MonitoringStats
  ): Promise<void> {
    const alertsByTenant = new Map<string, StockAlert[]>();

    for (const alert of alerts) {
      if (!alertsByTenant.has(alert.tenantName))
        alertsByTenant.set(alert.tenantName, []);
      alertsByTenant.get(alert.tenantName)!.push(alert);
    }

    for (const [tenantName, tenantAlerts] of alertsByTenant) {
      try {
        const tenant = await this.prisma.tenant.findFirst({
          where: { businessName: tenantName },
          include: { user: true },
        });
        if (!tenant?.user) continue;

        for (const alert of tenantAlerts) {
          const base = {
            productName: alert.productName,
            variantName: alert.variantName,
            currentStock: alert.currentStock,
            threshold: alert.threshold,
            barcode: alert.barcode,
            tenantName: alert.tenantName,
          };

          const template =
            alert.alertType === "out_of_stock"
              ? EmailTemplates.outOfStockAlert({
                  ...base,
                  lastSaleDate: undefined,
                })
              : EmailTemplates.lowStockAlert(base);

          try {
            console.log(
              `📧 Sending ${alert.alertType.replace("_", " ")} alert to ${
                tenant.user.email
              }`
            );
            await this.emailService.sendEmail({
              to: tenant.user.email,
              subject: template.subject,
              html: template.html,
              text: template.text,
            });
            stats.emailsSent++;
          } catch (emailError) {
            console.error(
              `❌ Failed to send email to ${tenant.user.email}:`,
              emailError
            );
            stats.errors++;
          }
        }
      } catch (error) {
        console.error(
          `❌ Error processing alerts for tenant ${tenantName}:`,
          error
        );
        stats.errors++;
      }
    }
  }

  getStatus() {
    const nextRunTime = this.lastRunTime
      ? new Date(
          this.lastRunTime.getTime() +
            this.monitoringIntervalHours * 60 * 60 * 1000
        )
      : null;

    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      nextRunTime,
      monitoringIntervalHours: this.monitoringIntervalHours,
    };
  }

  async forceCheck(): Promise<MonitoringStats> {
    return this.performStockCheck();
  }

  updateInterval(hours: number): void {
    this.monitoringIntervalHours =
      hours > 0 ? hours : this.monitoringIntervalHours;
    if (this.isRunning) {
      this.stop();
      // Fire and forget; caller can await if desired
      void this.start();
    }
  }

  // IMPORTANT (serverless): don't disconnect the shared client
  async cleanup(): Promise<void> {
    this.stop();
    // no prisma.$disconnect() here (singleton reused across invocations)
  }
}

export const stockMonitorService = new StockMonitorService();
