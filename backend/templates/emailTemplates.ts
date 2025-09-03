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
}