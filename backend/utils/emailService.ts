import nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailConfig {
  service: 'ethereal' | 'mailgun';
  host?: string;
  port?: number;
  secure?: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export class EmailService {
  private transporter?: Transporter;
  private config?: EmailConfig;

  constructor() {
    // Initialize lazily to ensure environment variables are loaded
  }

  private ensureInitialized() {
    if (!this.config || !this.transporter) {
      this.config = this.getEmailConfig();
      this.transporter = this.createTransporter();
    }
  }

  private getEmailConfig(): EmailConfig {
    const emailService = process.env.EMAIL_SERVICE as 'ethereal' | 'mailgun' || 'ethereal';
    
    if (emailService === 'mailgun') {
      return {
        service: 'mailgun',
        host: process.env.MAILGUN_SMTP_HOST || 'smtp.mailgun.org',
        port: parseInt(process.env.MAILGUN_SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.MAILGUN_SMTP_USER || '',
          pass: process.env.MAILGUN_SMTP_PASS || ''
        }
      };
    }
    
    // Default to Ethereal for testing
    const etherealUser = process.env.ETHEREAL_USER;
    const etherealPass = process.env.ETHEREAL_PASS;
    
    if (!etherealUser || !etherealPass) {
      throw new Error('Missing Ethereal credentials: ETHEREAL_USER and ETHEREAL_PASS must be set');
    }
    
    return {
      service: 'ethereal',
      host: process.env.ETHEREAL_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.ETHEREAL_PORT || '587'),
      secure: false,
      auth: {
        user: etherealUser,
        pass: etherealPass
      }
    };
  }

  private createTransporter(): Transporter {
    if (!this.config) {
      throw new Error('EmailService not properly initialized');
    }
    return nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    this.ensureInitialized();
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@cornven.com',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      };

      const info = await this.transporter!.sendMail(mailOptions);
      
      if (this.config!.service === 'ethereal') {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }
      
      console.log('Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendCombinedLowStockAlert({
    tenantEmail,
    tenantName,
    lowStockItems
  }: {
    tenantEmail: string;
    tenantName: string;
    lowStockItems: Array<{
      name: string;
      sku: string;
      currentStock: number;
      threshold: number;
      price: number;
      category: string;
      color?: string;
      size?: string;
      type: 'product' | 'variant';
    }>;
  }): Promise<boolean> {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    const subject = `Low Stock Alert - ${tenantName}`;
    
    // Generate table rows for text version
    const textRows = lowStockItems.map((item, index) => {
      const variantText = item.type === 'variant' && item.color && item.size 
        ? `${item.color}, ${item.size}` 
        : 'Standard';
      const deficit = item.threshold - item.currentStock;
      const status = item.currentStock === 0 ? 'OUT OF STOCK' : 
                    item.currentStock <= item.threshold ? 'LOW STOCK' : 'OK';
      
      return `${index + 1}. ${item.name}\n   SKU: ${item.sku}\n   Variant: ${variantText}\n   Current Stock: ${item.currentStock}\n   Threshold: ${item.threshold}\n   Price: $${item.price.toFixed(2)}\n   Category: ${item.category}\n   Status: ${status}\n   Deficit: ${deficit} units\n`;
    }).join('\n');
    
    const text = `
Low Stock Alert

Hello ${tenantName},

We've detected ${lowStockItems.length} item(s) in your store "${tenantName}" that are currently below their stock thresholds and require immediate attention.

Low Stock Items:

${textRows}

This is an automated notification from Cornven POS System
Generated on: ${currentDate}, ${currentTime}
    `;
    
    // Generate card-based layout for HTML version
    const htmlRows = lowStockItems.map((item, index) => {
      const variantText = item.type === 'variant' && item.color && item.size 
        ? `${item.color}, ${item.size}` 
        : 'Standard';
      const deficit = item.threshold - item.currentStock;
      const status = item.currentStock === 0 ? 'OUT OF STOCK' : 'LOW STOCK';
      const statusColor = item.currentStock === 0 ? '#dc3545' : '#ff6b35';
      const statusBgColor = item.currentStock === 0 ? '#fff5f5' : '#fff8f0';
      const stockIcon = item.currentStock === 0 ? '❌' : '⚠️';
      
      return `
        <div style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border: 1px solid #e9ecef; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.2s ease;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div style="flex: 1;">
              <h4 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 16px; font-weight: 600; line-height: 1.3;">${stockIcon} ${item.name}</h4>
              <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
                <span style="background-color: #e9ecef; color: #495057; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 500;">SKU: ${item.sku}</span>
                <span style="background-color: #e3f2fd; color: #1976d2; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 500;">📂 ${item.category}</span>
                <span style="background-color: #f3e5f5; color: #7b1fa2; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 500;">🏷️ ${variantText}</span>
              </div>
            </div>
            <div style="text-align: right; margin-left: 16px;">
              <div style="background-color: ${statusBgColor}; color: ${statusColor}; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 8px; border: 1px solid ${statusColor}20;">${status}</div>
              <div style="color: #28a745; font-weight: 600; font-size: 16px;">💰 $${item.price.toFixed(2)}</div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #e9ecef;">
            <div style="display: flex; align-items: center; gap: 16px;">
              <div style="text-align: center;">
                <div style="color: #6c757d; font-size: 11px; font-weight: 500; text-transform: uppercase; margin-bottom: 2px;">Current Stock</div>
                <div style="color: ${statusColor}; font-weight: 700; font-size: 18px;">${item.currentStock}</div>
              </div>
              <div style="text-align: center;">
                <div style="color: #6c757d; font-size: 11px; font-weight: 500; text-transform: uppercase; margin-bottom: 2px;">Threshold</div>
                <div style="color: #6c757d; font-weight: 600; font-size: 16px;">${item.threshold}</div>
              </div>
              <div style="text-align: center;">
                <div style="color: #6c757d; font-size: 11px; font-weight: 500; text-transform: uppercase; margin-bottom: 2px;">Deficit</div>
                <div style="color: #dc3545; font-weight: 600; font-size: 16px;">${deficit}</div>
              </div>
            </div>
            <div style="background-color: #f8f9fa; color: #495057; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 500;">#${index + 1}</div>
          </div>
        </div>`;
    }).join('');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Low Stock Alert</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 800px; margin: 0 auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #e8eaed;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%); padding: 30px 40px; text-align: center;">
            <div style="background-color: #ffffff; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">📊</div>
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 500;">Inventory Alert</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 15px;">Stock level notification for your attention</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px;">
            
            <!-- Introduction -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #5f6368; margin: 0 0 15px 0; font-size: 18px; font-weight: 500;">Hello ${tenantName},</h2>
              <p style="color: #5f6368; margin: 0; line-height: 1.6; font-size: 15px;">We've detected <strong>${lowStockItems.length} item(s)</strong> in your store that are currently below their stock thresholds.</p>
            </div>
            
            <!-- Products Cards -->
            <div style="margin-bottom: 30px;">
              <h3 style="color: #5f6368; margin: 0 0 20px 0; font-size: 16px; font-weight: 500; border-bottom: 1px solid #e8eaed; padding-bottom: 10px; display: inline-block;">Products Requiring Attention</h3>
              <div style="margin-top: 20px;">
                ${htmlRows}
              </div>
            </div>
            
            <!-- Action Section -->
            <div style="background-color: #fef7e0; border-left: 4px solid #fbbc04; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
              <div style="color: #b06000; font-size: 14px; line-height: 1.5;">Please review the above items and restock as necessary to maintain optimal inventory levels.</div>
            </div>
            
            <!-- Action Button -->
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="#" style="display: inline-block; background-color: #1a73e8; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 14px; box-shadow: 0 2px 8px rgba(26, 115, 232, 0.2);">View Inventory</a>
            </div>
            
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #6c757d; margin: 0 0 10px 0; font-size: 14px;">This is an automated notification from <strong>Cornven POS System</strong></p>
            <p style="color: #6c757d; margin: 0; font-size: 12px;">Generated on: ${currentDate}, ${currentTime}</p>
          </div>
          
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: tenantEmail,
      subject,
      text,
      html
    });
  }

  async sendLowStockAlert({
    tenantEmail,
    tenantName,
    productName,
    productSku,
    currentStock,
    threshold,
    price,
    category,
    isVariant = false,
    variantDetails
  }: {
    tenantEmail: string;
    tenantName: string;
    productName: string;
    productSku?: string;
    currentStock: number;
    threshold: number;
    price?: number;
    category?: string;
    isVariant?: boolean;
    variantDetails?: { color: string; size: string; sku?: string };
  }): Promise<boolean> {
    const variantText = isVariant && variantDetails 
      ? `${variantDetails.color}, ${variantDetails.size}` 
      : 'L';
    
    const displaySku = variantDetails?.sku || productSku || 'N/A';
    const displayPrice = price ? `$${price.toFixed(2)}` : 'N/A';
    const displayCategory = category || 'N/A';
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    const subject = `Low Stock Alert`;
    
    const text = `
Low Stock Alert

One of your products is running low on stock

Product Information

Product Name: ${productName}
SKU: ${displaySku}
Size/Variant: ${variantText}
Current Stock: ${currentStock}
Price: ${displayPrice}
Tenant: ${tenantName}
Category: ${displayCategory}

Stock Level Warning
Current stock (${currentStock}) is below the threshold of ${threshold} units.
Please restock this item as soon as possible.

This is an automated notification from Cornven POS System
Generated on: ${currentDate}, ${currentTime}
    `;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Low Stock Alert</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #e8eaed;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%); padding: 30px 40px; text-align: center;">
            <div style="background-color: #ffffff; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">📊</div>
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 500;">Inventory Alert</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 15px;">Stock level notification for your attention</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px;">
            
            <!-- Product Information Section -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #5f6368; margin: 0 0 20px 0; font-size: 18px; font-weight: 500; border-bottom: 1px solid #e8eaed; padding-bottom: 12px;">Product Information</h2>
              
              <div style="background-color: #fafbfc; border: 1px solid #e8eaed; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
                <div style="margin-bottom: 16px;">
                  <div style="color: #3c4043; font-size: 16px; font-weight: 500; margin-bottom: 8px;">${productName}</div>
                  <div style="color: #5f6368; font-size: 14px; margin-bottom: 12px;">SKU: ${displaySku}</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
                    <span style="background-color: #f1f3f4; color: #5f6368; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${displayCategory}</span>
                    <span style="background-color: #f1f3f4; color: #5f6368; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${variantText}</span>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #e8eaed;">
                  <div>
                    <div style="color: #5f6368; font-size: 12px; margin-bottom: 2px;">Current Stock</div>
                    <div style="color: #ea4335; font-weight: 500; font-size: 16px;">${currentStock}</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="color: #5f6368; font-size: 12px; margin-bottom: 2px;">Price</div>
                    <div style="color: #137333; font-weight: 500; font-size: 16px;">${displayPrice}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Notice Section -->
            <div style="background-color: #fef7e0; border-left: 4px solid #fbbc04; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
              <div style="color: #b06000; font-size: 14px; line-height: 1.5;">Current stock (${currentStock}) is below the threshold of ${threshold} units. Please restock this item as soon as possible.</div>
            </div>
            
            <!-- Action Button -->
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="#" style="display: inline-block; background-color: #1a73e8; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 14px; box-shadow: 0 2px 8px rgba(26, 115, 232, 0.2);">View Inventory</a>
            </div>
            
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #6c757d; margin: 0 0 10px 0; font-size: 14px;">This is an automated notification from <strong>Cornven POS System</strong></p>
            <p style="color: #6c757d; margin: 0; font-size: 12px;">Generated on: ${currentDate}, ${currentTime}</p>
          </div>
          
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: tenantEmail,
      subject,
      text,
      html
    });
  }

  async sendOutOfStockAlert({
    tenantEmail,
    tenantName,
    productName,
    productSku,
    price,
    category,
    isVariant = false,
    variantDetails
  }: {
    tenantEmail: string;
    tenantName: string;
    productName: string;
    productSku?: string;
    price?: number;
    category?: string;
    isVariant?: boolean;
    variantDetails?: { color: string; size: string; sku?: string };
  }): Promise<boolean> {
    const variantText = isVariant && variantDetails 
      ? `${variantDetails.color}, ${variantDetails.size}` 
      : 'Standard';
    
    const displaySku = variantDetails?.sku || productSku || 'N/A';
    const displayPrice = price ? `$${price.toFixed(2)}` : 'N/A';
    const displayCategory = category || 'N/A';
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    const subject = `Stock Alert - ${productName}`;
    
    const text = `
OUT OF STOCK ALERT

Your product is now completely out of stock!

Product Information

Product Name: ${productName}
SKU: ${displaySku}
Size/Variant: ${variantText}
Current Stock: 0
Price: ${displayPrice}
Tenant: ${tenantName}
Category: ${displayCategory}

URGENT ACTION REQUIRED
This product is now completely out of stock and unavailable for sale.
Immediate restocking is required to avoid lost sales.

This is an automated notification from Cornven POS System
Generated on: ${currentDate}, ${currentTime}
    `;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Out of Stock Alert</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #e8eaed;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%); padding: 30px 40px; text-align: center;">
            <div style="background-color: #ffffff; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">📊</div>
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 500;">Inventory Alert</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 15px;">Stock level notification for your attention</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px;">
            
            <!-- Product Information Section -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #5f6368; margin: 0 0 20px 0; font-size: 16px; font-weight: 500; border-bottom: 1px solid #e8eaed; padding-bottom: 10px;">Product Information</h2>
              
              <div style="background-color: #fafbfc; border: 1px solid #e8eaed; border-radius: 8px; padding: 20px;">
                 <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                   <div style="flex: 1;">
                     <h3 style="margin: 0 0 12px 0; color: #3c4043; font-size: 16px; font-weight: 500; line-height: 1.3;">${productName}</h3>
                     <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
                       <span style="background-color: #f1f3f4; color: #5f6368; padding: 4px 8px; border-radius: 4px; font-size: 12px;">SKU: ${displaySku}</span>
                       <span style="background-color: #f1f3f4; color: #5f6368; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${displayCategory}</span>
                       <span style="background-color: #f1f3f4; color: #5f6368; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${variantText}</span>
                       <span style="background-color: #f1f3f4; color: #5f6368; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${tenantName}</span>
                     </div>
                   </div>
                   <div style="text-align: right; margin-left: 20px;">
                     <div style="background-color: #fef7e0; color: #b06000; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 500; margin-bottom: 8px;">Out of Stock</div>
                     <div style="color: #137333; font-weight: 500; font-size: 16px;">${displayPrice}</div>
                   </div>
                 </div>
                 <div style="display: flex; justify-content: center; align-items: center; padding-top: 16px; border-top: 1px solid #dee2e6;">
                   <div style="text-align: center; background-color: #fef7e0; padding: 12px 20px; border-radius: 6px;">
                     <div style="color: #b06000; font-size: 12px; font-weight: 500; margin-bottom: 4px;">Current Stock Level</div>
                     <div style="color: #b06000; font-weight: 600; font-size: 20px;">0</div>
                     <div style="color: #b06000; font-size: 11px; margin-top: 2px;">Needs restocking</div>
                   </div>
                 </div>
               </div>
            </div>
            
            <!-- Action Required Section -->
            <div style="background-color: #fef7e0; border-left: 4px solid #fbbc04; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
              <div style="color: #b06000; font-size: 14px; line-height: 1.5;">This product is currently out of stock and unavailable for sale. Please consider restocking to maintain inventory availability.</div>
            </div>
            
            <!-- Action Button -->
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="#" style="display: inline-block; background-color: #1a73e8; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 14px; box-shadow: 0 2px 8px rgba(26, 115, 232, 0.2);">View Inventory</a>
            </div>
            
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #6c757d; margin: 0 0 10px 0; font-size: 14px;">This is an automated notification from <strong>Cornven POS System</strong></p>
            <p style="color: #6c757d; margin: 0; font-size: 12px;">Generated on: ${currentDate}, ${currentTime}</p>
          </div>
          
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: tenantEmail,
      subject,
      text,
      html
    });
  }

  async testConnection(): Promise<boolean> {
    this.ensureInitialized();
    try {
      await this.transporter!.verify();
      console.log('Email service connection verified successfully');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();