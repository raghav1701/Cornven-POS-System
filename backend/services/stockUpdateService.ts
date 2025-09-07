// stockUpdateService.ts
import type { PrismaClient } from "@prisma/client";
import prisma from "../prisma/prisma";
import { emailService, type EmailOptions } from "./emailService";
import { EmailTemplates } from "../templates/emailTemplates";

interface StockUpdateData {
  variantId: string;
  newStock: number;
  reason?: "sale" | "manual_update" | "return" | "adjustment";
}

export class StockUpdateService {
  private prisma: PrismaClient;
  private emailService = emailService;

  // ← Inject prisma (defaults to the shared singleton)
  constructor(prismaClient: PrismaClient = prisma) {
    this.prisma = prismaClient;
  }

  async updateStock(data: StockUpdateData): Promise<{
    success: boolean;
    variant?: any;
    alertSent?: boolean;
    error?: string;
  }> {
    try {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: data.variantId },
        include: { product: { include: { tenant: true } } },
      });

      if (!variant) {
        return { success: false, error: "Variant not found" };
      }

      const variantWithNewStock = { ...variant, stock: data.newStock };
      const alertSent = await this.checkAndSendAlert(
        variantWithNewStock,
        data.reason
      );

      return { success: true, variant: variantWithNewStock, alertSent };
    } catch (error) {
      console.error("Stock update service error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async checkAndSendAlert(
    variant: any,
    _reason?: string
  ): Promise<boolean> {
    try {
      const isLowStock =
        variant.stock <= variant.lowStockThreshold && variant.stock > 0;
      const isOutOfStock = variant.stock === 0;

      if (!isLowStock && !isOutOfStock) return false;

      const alertType = isOutOfStock ? "out_of_stock" : "low_stock";

      await this.sendStockAlert({
        id: variant.id,
        productName: variant.product.name,
        variantName: `${variant.color} - ${variant.size}`,
        currentStock: variant.stock,
        threshold: variant.lowStockThreshold,
        barcode: variant.barcode,
        tenantName: variant.product.tenant.businessName,
        alertType,
      });

      return true;
    } catch (error) {
      console.error("Alert check failed:", error);
      return false;
    }
  }

  private async sendStockAlert(alert: any): Promise<void> {
    try {
      if (!this.emailService) return;

      const tenant = await this.prisma.tenant.findFirst({
        where: { businessName: alert.tenantName },
        include: { user: true },
      });
      if (!tenant?.user) return;

      const tmpl =
        alert.alertType === "out_of_stock"
          ? EmailTemplates.outOfStockAlert({
              productName: alert.productName,
              variantName: alert.variantName,
              barcode: alert.barcode,
              tenantName: alert.tenantName,
            })
          : EmailTemplates.lowStockAlert({
              productName: alert.productName,
              variantName: alert.variantName,
              currentStock: alert.currentStock,
              threshold: alert.threshold,
              barcode: alert.barcode,
              tenantName: alert.tenantName,
            });

      const emailOptions: EmailOptions = {
        to: tenant.user.email,
        subject: tmpl.subject,
        html: tmpl.html,
        text: tmpl.text,
      };

      await this.emailService.sendEmail(emailOptions);
    } catch (error) {
      console.error("Failed to send stock alert:", error);
      throw error;
    }
  }

  // IMPORTANT (serverless): don't disconnect the shared client
  async cleanup(): Promise<void> {
    // Intentionally empty to avoid tearing down the shared prisma client
  }
}

export const stockUpdateService = new StockUpdateService();
