export interface EmailTemplateData {
  [key: string]: any;
}

export class EmailTemplates {
  /**
   * Low Stock Alert Template
   */
  static lowStockAlert(data: {
    productName: string;
    variantName: string;
    currentStock: number;
    threshold: number;
    barcode: string;
    tenantName: string;
  }): { subject: string; html: string; text: string } {
    const subject = `🚨 Low Stock Alert: ${data.productName} - ${data.variantName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          .urgent { color: #d63384; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🚨 Low Stock Alert</h2>
            <p>Immediate attention required for inventory management</p>
          </div>
          
          <div class="alert">
            <h3 class="urgent">Stock Level Critical</h3>
            <p>The following product variant has reached a critically low stock level:</p>
          </div>
          
          <div class="details">
            <h4>Product Details:</h4>
            <ul>
              <li><strong>Product:</strong> ${data.productName}</li>
              <li><strong>Variant:</strong> ${data.variantName}</li>
              <li><strong>Current Stock:</strong> <span class="urgent">${data.currentStock} units</span></li>
              <li><strong>Low Stock Threshold:</strong> ${data.threshold} units</li>
              <li><strong>Barcode:</strong> ${data.barcode}</li>
              <li><strong>Tenant:</strong> ${data.tenantName}</li>
            </ul>
          </div>
          
          <p><strong>Action Required:</strong> Please restock this item immediately to avoid stockouts and potential lost sales.</p>
          
          <div class="footer">
            <p>This is an automated alert from your Cornven POS System.</p>
            <p>Generated at: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
🚨 LOW STOCK ALERT

Product: ${data.productName}
Variant: ${data.variantName}
Current Stock: ${data.currentStock} units
Threshold: ${data.threshold} units
Barcode: ${data.barcode}
Tenant: ${data.tenantName}

Action Required: Please restock this item immediately to avoid stockouts.

Generated at: ${new Date().toLocaleString()}
    `.trim();
    
    return { subject, html, text };
  }

  /**
   * Out of Stock Alert Template
   */
  static outOfStockAlert(data: {
    productName: string;
    variantName: string;
    barcode: string;
    tenantName: string;
    lastSaleDate?: string;
  }): { subject: string; html: string; text: string } {
    const subject = `🔴 OUT OF STOCK: ${data.productName} - ${data.variantName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .alert { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          .critical { color: #dc3545; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔴 Out of Stock Alert</h2>
            <p>Critical inventory shortage detected</p>
          </div>
          
          <div class="alert">
            <h3 class="critical">ZERO STOCK REMAINING</h3>
            <p>The following product variant is completely out of stock:</p>
          </div>
          
          <div class="details">
            <h4>Product Details:</h4>
            <ul>
              <li><strong>Product:</strong> ${data.productName}</li>
              <li><strong>Variant:</strong> ${data.variantName}</li>
              <li><strong>Current Stock:</strong> <span class="critical">0 units</span></li>
              <li><strong>Barcode:</strong> ${data.barcode}</li>
              <li><strong>Tenant:</strong> ${data.tenantName}</li>
              ${data.lastSaleDate ? `<li><strong>Last Sale:</strong> ${data.lastSaleDate}</li>` : ''}
            </ul>
          </div>
          
          <p><strong>Immediate Action Required:</strong> This item is unavailable for sale. Please restock immediately to resume sales.</p>
          
          <div class="footer">
            <p>This is an automated alert from your Cornven POS System.</p>
            <p>Generated at: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
🔴 OUT OF STOCK ALERT

Product: ${data.productName}
Variant: ${data.variantName}
Current Stock: 0 units
Barcode: ${data.barcode}
Tenant: ${data.tenantName}
${data.lastSaleDate ? `Last Sale: ${data.lastSaleDate}\n` : ''}
Immediate Action Required: This item is unavailable for sale. Please restock immediately.

Generated at: ${new Date().toLocaleString()}
    `.trim();
    
    return { subject, html, text };
  }

  /**
   * Product Submission Alert Template
   */
  static productSubmissionAlert(data: {
    productName: string;
    submittedBy: string;
    tenantName: string;
    variantCount: number;
    submissionDate: string;
    status: 'pending' | 'approved' | 'rejected';
    variants?: Array<{
      color: string;
      size: string;
      price: number;
      stock: number;
    }>;
  }): { subject: string; html: string; text: string } {
    const statusEmoji = {
      pending: '⏳',
      approved: '✅',
      rejected: '❌'
    };
    
    const subject = `${statusEmoji[data.status]} Product Submission: ${data.productName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .status-pending { background: #fff3cd; border: 1px solid #ffeaa7; }
          .status-approved { background: #d1edff; border: 1px solid #b8daff; }
          .status-rejected { background: #f8d7da; border: 1px solid #f5c6cb; }
          .status-box { padding: 15px; border-radius: 5px; margin: 15px 0; }
          .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${statusEmoji[data.status]} Product Submission Notification</h2>
            <p>Product submission status update</p>
          </div>
          
          <div class="status-box status-${data.status}">
            <h3>Status: ${data.status.toUpperCase()}</h3>
            <p>A product submission has been ${data.status}.</p>
          </div>
          
          <div class="details">
            <h4>Submission Details:</h4>
            <ul>
              <li><strong>Product Name:</strong> ${data.productName}</li>
              <li><strong>Submitted By:</strong> ${data.submittedBy}</li>
              <li><strong>Tenant:</strong> ${data.tenantName}</li>
              <li><strong>Variant Count:</strong> ${data.variantCount}</li>
              <li><strong>Submission Date:</strong> ${data.submissionDate}</li>
              <li><strong>Current Status:</strong> ${data.status.toUpperCase()}</li>
            </ul>
          </div>
          
          ${data.variants && data.variants.length > 0 ? `
          <div class="details">
            <h4>Variant Details:</h4>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;">
              <thead>
                <tr style="background-color: #e9ecef;">
                  <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left; font-size: 14px;">Color</th>
                  <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left; font-size: 14px;">Size</th>
                  <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right; font-size: 14px;">Price</th>
                  <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right; font-size: 14px;">Stock</th>
                </tr>
              </thead>
              <tbody>
                ${data.variants.map(variant => `
                <tr>
                  <td style="border: 1px solid #dee2e6; padding: 8px; font-size: 14px;">${variant.color}</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; font-size: 14px;">${variant.size}</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right; font-size: 14px;">$${variant.price.toFixed(2)}</td>
                  <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right; font-size: 14px;">${variant.stock}</td>
                </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}
          
          ${data.status === 'pending' ? 
            '<p><strong>Next Steps:</strong> This submission is awaiting review and approval.</p>' :
            data.status === 'approved' ? 
            '<p><strong>Great News:</strong> This product has been approved and is now available in the system.</p>' :
            '<p><strong>Action Required:</strong> This submission was rejected. Please review and resubmit with corrections.</p>'
          }
          
          <div class="footer">
            <p>This is an automated notification from your Cornven POS System.</p>
            <p>Generated at: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
${statusEmoji[data.status]} PRODUCT SUBMISSION NOTIFICATION

Product Name: ${data.productName}
Submitted By: ${data.submittedBy}
Tenant: ${data.tenantName}
Variant Count: ${data.variantCount}
Submission Date: ${data.submissionDate}
Status: ${data.status.toUpperCase()}

${data.variants && data.variants.length > 0 ? `
VARIANT DETAILS:
${data.variants.map((variant, index) => `
Variant ${index + 1}:
  Color: ${variant.color}
  Size: ${variant.size}
  Price: $${variant.price.toFixed(2)}
  Stock: ${variant.stock}`).join('')}
` : ''}
${data.status === 'pending' ? 
  'Next Steps: This submission is awaiting review and approval.' :
  data.status === 'approved' ? 
  'Great News: This product has been approved and is now available in the system.' :
  'Action Required: This submission was rejected. Please review and resubmit with corrections.'
}

Generated at: ${new Date().toLocaleString()}
    `.trim();
    
    return { subject, html, text };
  }

  /**
   * Product approval/rejection notification template
   */
  static productApprovalAlert(data: {
    tenantName: string;
    productName: string;
    variantDetails: string;
    status: 'APPROVED' | 'REJECTED';
    approvalDate: string;
  }): { subject: string; html: string; text: string } {
    const statusEmoji = '';
    const statusText = data.status === 'APPROVED' ? 'Approved' : 'Rejected';
    const statusColor = data.status === 'APPROVED' ? '#28a745' : '#dc3545';
    
    const subject = `Product ${statusText}: ${data.productName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .status-approved { background: #d4edda; border: 1px solid #c3e6cb; }
          .status-rejected { background: #f8d7da; border: 1px solid #f5c6cb; }
          .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header status-${data.status.toLowerCase()}">
            <h2 style="margin: 0; color: ${statusColor};">Product ${statusText}</h2>
            <p style="margin: 5px 0 0 0; color: #666;">Your product submission has been reviewed.</p>
          </div>
          
          <div class="details">
            <h4>Product Details:</h4>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li><strong>Product Name:</strong> ${data.productName}</li>
              <li><strong>Variant:</strong> ${data.variantDetails}</li>
              <li><strong>Tenant:</strong> ${data.tenantName}</li>
              <li><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText.toUpperCase()}</span></li>
              <li><strong>Decision Date:</strong> ${data.approvalDate}</li>
            </ul>
          </div>
          
          ${data.status === 'APPROVED' ? 
            '<div style="background: #d4edda; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745;"><strong>🎉 Congratulations!</strong><br>Your product variant has been approved and is now available in the system.</div>' :
            '<div style="background: #f8d7da; padding: 15px; border-radius: 5px; border-left: 4px solid #dc3545;"><strong>📝 Action Required</strong><br>Your product variant was not approved. Please review the submission and make necessary corrections before resubmitting.</div>'
          }
          
          <div class="footer">
            <p>This is an automated notification from your Cornven POS System.</p>
            <p>Generated at: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
PRODUCT ${statusText.toUpperCase()}

Hello ${data.tenantName},

Your product submission has been reviewed.

PRODUCT DETAILS:
- Product Name: ${data.productName}
- Variant: ${data.variantDetails}
- Status: ${statusText.toUpperCase()}
- Decision Date: ${data.approvalDate}

${data.status === 'APPROVED' ? 
  'CONGRATULATIONS! Your product variant has been approved and is now available in the system.' :
  'ACTION REQUIRED: Your product variant was not approved. Please review the submission and make necessary corrections before resubmitting.'
}

Generated at: ${new Date().toLocaleString()}
    `.trim();
    
    return { subject, html, text };
  }

  /**
   * Generic notification template for custom alerts
   */
  static genericAlert(data: {
    title: string;
    message: string;
    details?: { [key: string]: any };
    priority: 'low' | 'medium' | 'high' | 'critical';
  }): { subject: string; html: string; text: string } {
    const priorityEmoji = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨',
      critical: '🔴'
    };
    
    const subject = `${priorityEmoji[data.priority]} ${data.title}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .message { padding: 15px; border-radius: 5px; margin: 15px 0; }
          .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${priorityEmoji[data.priority]} ${data.title}</h2>
            <p>Priority: ${data.priority.toUpperCase()}</p>
          </div>
          
          <div class="message">
            <p>${data.message}</p>
          </div>
          
          ${data.details ? `
            <div class="details">
              <h4>Additional Details:</h4>
              <ul>
                ${Object.entries(data.details).map(([key, value]) => 
                  `<li><strong>${key}:</strong> ${value}</li>`
                ).join('')}
              </ul>
            </div>
          ` : ''}
          
          <div class="footer">
            <p>This is an automated notification from your Cornven POS System.</p>
            <p>Generated at: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
${priorityEmoji[data.priority]} ${data.title.toUpperCase()}

Priority: ${data.priority.toUpperCase()}

${data.message}

${data.details ? 
  Object.entries(data.details).map(([key, value]) => `${key}: ${value}`).join('\n') + '\n\n' : 
  ''
}Generated at: ${new Date().toLocaleString()}
    `.trim();
    
    return { subject, html, text };
  }

  /**
   * 7-Day Payment Reminder Template
   */
  static paymentReminder7Day(data: {
    tenantName: string;
    cubeCode: string;
    dueDate: string;
    amountDue: string;
    dailyRent: string;
    totalPaid?: string;
    balanceDue: string;
    startDate?: string;
    endDate?: string;
    billingPeriodStart?: string;
    billingPeriodEnd?: string;
    leaseStartDate?: string;
    leaseEndDate?: string;
  }): { subject: string; html: string; text: string } {
    const subject = `Payment Reminder: Rent Due in 7 Days - Cube ${data.cubeCode}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .reminder { background: #fff3e0; border: 1px solid #ffcc02; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          .amount { color: #1976d2; font-weight: bold; font-size: 18px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Payment Reminder</h2>
            <p>Your rental payment is due in 7 days</p>
          </div>
          
          <div class="reminder">
            <h3>Friendly Reminder</h3>
            <p>Dear ${data.tenantName},</p>
            <p>This is a friendly reminder that your rental payment for <strong>Cube ${data.cubeCode}</strong> is due on <strong>${data.dueDate}</strong>.</p>
          </div>
          
          <div class="details">
            <h4>Payment Details:</h4>
            <ul>
              <li><strong>Billing Period:</strong> ${data.billingPeriodStart || 'N/A'} - ${data.billingPeriodEnd || 'N/A'}</li>
              <li><strong>Cube ID:</strong> ${data.cubeCode}</li>
              <li><strong>Tenant Name:</strong> ${data.tenantName}</li>
              <li><strong>Balance Due:</strong> <span class="amount">$${data.balanceDue}</span></li>
              <li><strong>Daily Rent:</strong> $${data.dailyRent}</li>
              <li><strong>Lease Start Date:</strong> ${data.leaseStartDate || 'N/A'}</li>
              <li><strong>Lease End Date:</strong> ${data.leaseEndDate || 'N/A'}</li>
            </ul>
          </div>
          
          <p><strong>Next Steps:</strong> Please ensure your payment is made by the due date to avoid any late fees or service interruptions.</p>
          <p>If you have any questions or need assistance with payment, please contact our office.</p>
          
          <div class="footer">
            <p>Thank you for choosing Cornven Storage Solutions.</p>
            <p>Generated at: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
PAYMENT REMINDER - DUE IN 7 DAYS

Dear ${data.tenantName},

This is a friendly reminder that your rental payment is due in 7 days.

Payment Details:
- Billing Period: ${data.billingPeriodStart || 'N/A'} - ${data.billingPeriodEnd || 'N/A'}
- Cube ID: ${data.cubeCode}
- Tenant Name: ${data.tenantName}
- Balance Due: $${data.balanceDue}
- Daily Rent: $${data.dailyRent}
- Lease Start Date: ${data.leaseStartDate || 'N/A'}
- Lease End Date: ${data.leaseEndDate || 'N/A'}

Please ensure your payment is made by the due date to avoid any late fees.

Thank you for choosing Cornven Storage Solutions.
Generated at: ${new Date().toLocaleString()}
    `.trim();
    
    return { subject, html, text };
  }

  /**
   * 1-Day Payment Reminder Template
   */
  static paymentReminder1Day(data: {
    tenantName: string;
    cubeCode: string;
    dueDate: string;
    amountDue: string;
    dailyRent: string;
    totalPaid?: string;
    balanceDue: string;
    startDate?: string;
    endDate?: string;
    billingPeriodStart?: string;
    billingPeriodEnd?: string;
    leaseStartDate?: string;
    leaseEndDate?: string;
  }): { subject: string; html: string; text: string } {
    const subject = `URGENT: Payment Due Tomorrow - Cube ${data.cubeCode}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #fff3e0; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .urgent { background: #ffebee; border: 2px solid #f44336; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          .amount { color: #f44336; font-weight: bold; font-size: 20px; }
          .urgent-text { color: #f44336; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>URGENT Payment Reminder</h2>
            <p class="urgent-text">Payment due tomorrow!</p>
          </div>
          
          <div class="urgent">
            <h3 class="urgent-text">Action Required</h3>
            <p>Dear ${data.tenantName},</p>
            <p><strong>URGENT:</strong> Your rental payment for <strong>Cube ${data.cubeCode}</strong> is due <strong>TOMORROW (${data.dueDate})</strong>.</p>
            <p>Please arrange payment immediately to avoid late fees and potential service interruption.</p>
          </div>
          
          <div class="details">
            <h4>Payment Details:</h4>
            <ul>
              <li><strong>Billing Period:</strong> ${data.billingPeriodStart || 'N/A'} - ${data.billingPeriodEnd || 'N/A'}</li>
              <li><strong>Cube ID:</strong> ${data.cubeCode}</li>
              <li><strong>Tenant Name:</strong> ${data.tenantName}</li>
              <li><strong>Balance Due:</strong> <span class="amount">$${data.balanceDue}</span></li>
              <li><strong>Daily Rent:</strong> $${data.dailyRent}</li>
              <li><strong>Lease Start Date:</strong> ${data.leaseStartDate || 'N/A'}</li>
              <li><strong>Lease End Date:</strong> ${data.leaseEndDate || 'N/A'}</li>
            </ul>
          </div>
          
          <p><strong>IMMEDIATE ACTION REQUIRED:</strong> Please make your payment today to ensure it processes before the due date.</p>
          <p>Contact our office immediately if you need assistance or have any payment concerns.</p>
          
          <div class="footer">
            <p>Cornven Storage Solutions - Payment Services</p>
            <p>Generated at: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
URGENT PAYMENT REMINDER - DUE TOMORROW

Dear ${data.tenantName},

URGENT: Your rental payment for Cube ${data.cubeCode} is due TOMORROW (${data.dueDate}).

Payment Details:
- Billing Period: ${data.billingPeriodStart || 'N/A'} - ${data.billingPeriodEnd || 'N/A'}
- Cube ID: ${data.cubeCode}
- Tenant Name: ${data.tenantName}
- Balance Due: $${data.balanceDue}
- Daily Rent: $${data.dailyRent}
- Lease Start Date: ${data.leaseStartDate || 'N/A'}
- Lease End Date: ${data.leaseEndDate || 'N/A'}

IMMEDIATE ACTION REQUIRED: Please make your payment today to avoid late fees.

Contact our office immediately if you need assistance.

Cornven Storage Solutions - Payment Services
Generated at: ${new Date().toLocaleString()}
    `.trim();
    
    return { subject, html, text };
  }

  /**
   * Overdue Payment Reminder Template
   */
  static paymentReminderOverdue(data: {
    tenantName: string;
    cubeCode: string;
    dueDate: string;
    amountDue: string;
    dailyRent: string;
    totalPaid?: string;
    balanceDue?: string;
    startDate?: string;
    endDate?: string;
    billingPeriodStart?: string;
    billingPeriodEnd?: string;
    leaseStartDate?: string;
    leaseEndDate?: string;
  }): { subject: string; html: string; text: string } {
    const subject = `OVERDUE NOTICE: Immediate Payment Required - Cube ${data.cubeCode}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ffebee; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 2px solid #f44336; }
          .overdue { background: #ffcdd2; border: 2px solid #d32f2f; padding: 20px; border-radius: 5px; margin: 15px 0; }
          .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .consequences { background: #fff3e0; border: 1px solid #ff9800; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          .amount { color: #d32f2f; font-weight: bold; font-size: 22px; }
          .overdue-text { color: #d32f2f; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 class="overdue-text">OVERDUE PAYMENT NOTICE</h2>
            <p class="overdue-text">Immediate payment required</p>
          </div>
          
          <div class="overdue">
            <h3 class="overdue-text">PAYMENT OVERDUE</h3>
            <p>Dear ${data.tenantName},</p>
            <p><strong>NOTICE:</strong> Your rental payment for <strong>Cube ${data.cubeCode}</strong> was due on <strong>${data.dueDate}</strong> and is now <strong class="overdue-text">OVERDUE</strong>.</p>
            <p><strong>IMMEDIATE PAYMENT IS REQUIRED</strong> to avoid further action.</p>
          </div>
          
          <div class="details">
            <h4>Overdue Payment Details:</h4>
            <ul>
              <li><strong>Billing Period:</strong> ${data.billingPeriodStart || 'N/A'} - ${data.billingPeriodEnd || 'N/A'}</li>
              <li><strong>Cube ID:</strong> ${data.cubeCode}</li>
              <li><strong>Tenant Name:</strong> ${data.tenantName}</li>
              <li><strong>Balance Due:</strong> <span class="amount">$${data.balanceDue || data.amountDue}</span></li>
              <li><strong>Daily Rent:</strong> $${data.dailyRent}</li>
              <li><strong>Lease Start Date:</strong> ${data.leaseStartDate || 'N/A'}</li>
              <li><strong>Lease End Date:</strong> ${data.leaseEndDate || 'N/A'}</li>
            </ul>
          </div>
          
          <div class="consequences">
            <h4>Important Notice:</h4>
            <p>Failure to make immediate payment may result in:</p>
            <ul>
              <li>Additional late fees and penalties</li>
              <li>Suspension of storage access</li>
              <li>Potential termination of rental agreement</li>
              <li>Collection proceedings</li>
            </ul>
          </div>
          
          <p><strong>CONTACT US IMMEDIATELY:</strong> Please make your payment or contact our office today to discuss payment arrangements.</p>
          
          <div class="footer">
            <p>Cornven Storage Solutions - Collections Department</p>
            <p>Generated at: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
OVERDUE PAYMENT NOTICE

Dear ${data.tenantName},

NOTICE: Your rental payment for Cube ${data.cubeCode} was due on ${data.dueDate} and is now OVERDUE.

Overdue Payment Details:
- Billing Period: ${data.billingPeriodStart || 'N/A'} - ${data.billingPeriodEnd || 'N/A'}
- Cube ID: ${data.cubeCode}
- Tenant Name: ${data.tenantName}
- Balance Due: $${data.balanceDue || data.amountDue}
- Daily Rent: $${data.dailyRent}
- Lease Start Date: ${data.leaseStartDate || 'N/A'}
- Lease End Date: ${data.leaseEndDate || 'N/A'}

IMMEDIATE PAYMENT IS REQUIRED to avoid:
- Additional late fees and penalties
- Suspension of storage access
- Potential termination of rental agreement
- Collection proceedings

CONTACT US IMMEDIATELY to make payment or discuss arrangements.

Cornven Storage Solutions - Collections Department
Generated at: ${new Date().toLocaleString()}
    `.trim();
    
    return { subject, html, text };
  }
}