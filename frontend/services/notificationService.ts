// Notification Service for Email and SMS Alerts
// This is a mock implementation for development - replace with actual service in production

export interface NotificationConfig {
  email?: {
    enabled: boolean;
    provider: 'sendgrid' | 'mailgun' | 'ses';
    apiKey?: string;
    fromEmail: string;
  };
  sms?: {
    enabled: boolean;
    provider: 'twilio' | 'aws-sns';
    apiKey?: string;
    fromNumber: string;
  };
}

export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  type: 'rent_due' | 'rent_overdue' | 'lease_expiring' | 'payment_confirmation';
}

export interface SMSNotification {
  to: string;
  message: string;
  type: 'rent_due' | 'rent_overdue' | 'lease_expiring' | 'payment_confirmation';
}

// Mock configuration - replace with environment variables in production
const notificationConfig: NotificationConfig = {
  email: {
    enabled: true,
    provider: 'sendgrid',
    fromEmail: 'noreply@cornven.com'
  },
  sms: {
    enabled: true,
    provider: 'twilio',
    fromNumber: '+61400000000'
  }
};

class NotificationService {
  private config: NotificationConfig;

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  // Email notification methods
  async sendEmail(notification: EmailNotification): Promise<boolean> {
    try {
      if (!this.config.email?.enabled) {
        console.log('Email notifications disabled');
        return false;
      }

      // Mock email sending - replace with actual email service
      console.log('📧 Sending Email:', {
        to: notification.to,
        subject: notification.subject,
        type: notification.type,
        timestamp: new Date().toISOString()
      });

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In production, implement actual email sending:
      // switch (this.config.email.provider) {
      //   case 'sendgrid':
      //     return await this.sendWithSendGrid(notification);
      //   case 'mailgun':
      //     return await this.sendWithMailgun(notification);
      //   case 'ses':
      //     return await this.sendWithSES(notification);
      // }

      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  async sendSMS(notification: SMSNotification): Promise<boolean> {
    try {
      if (!this.config.sms?.enabled) {
        console.log('SMS notifications disabled');
        return false;
      }

      // Mock SMS sending - replace with actual SMS service
      console.log('📱 Sending SMS:', {
        to: notification.to,
        message: notification.message.substring(0, 50) + '...',
        type: notification.type,
        timestamp: new Date().toISOString()
      });

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // In production, implement actual SMS sending:
      // switch (this.config.sms.provider) {
      //   case 'twilio':
      //     return await this.sendWithTwilio(notification);
      //   case 'aws-sns':
      //     return await this.sendWithAWSSNS(notification);
      // }

      return true;
    } catch (error) {
      console.error('SMS sending failed:', error);
      return false;
    }
  }

  // Rent due notification
  async sendRentDueNotification(tenantEmail: string, tenantPhone: string, tenantName: string, amount: number, dueDate: string): Promise<void> {
    const emailNotification: EmailNotification = {
      to: tenantEmail,
      subject: 'Rent Payment Due - Cornven Cube Space',
      body: `
        Dear ${tenantName},

        This is a friendly reminder that your rent payment is due.

        Amount Due: $${amount.toFixed(2)}
        Due Date: ${new Date(dueDate).toLocaleDateString()}

        Please make your payment through the tenant portal or contact us if you have any questions.

        Best regards,
        Cornven Management Team
      `,
      type: 'rent_due'
    };

    const smsNotification: SMSNotification = {
      to: tenantPhone,
      message: `Hi ${tenantName}, your rent payment of $${amount.toFixed(2)} is due on ${new Date(dueDate).toLocaleDateString()}. Please pay through the tenant portal. - Cornven`,
      type: 'rent_due'
    };

    await Promise.all([
      this.sendEmail(emailNotification),
      this.sendSMS(smsNotification)
    ]);
  }

  // Overdue notification
  async sendOverdueNotification(tenantEmail: string, tenantPhone: string, tenantName: string, amount: number, daysPastDue: number): Promise<void> {
    const emailNotification: EmailNotification = {
      to: tenantEmail,
      subject: 'URGENT: Overdue Rent Payment - Cornven Cube Space',
      body: `
        Dear ${tenantName},

        Your rent payment is now ${daysPastDue} days overdue.

        Overdue Amount: $${amount.toFixed(2)}
        Days Past Due: ${daysPastDue}

        Please make your payment immediately to avoid any disruption to your cube space rental.
        Contact us immediately if you're experiencing difficulties.

        Urgent regards,
        Cornven Management Team
      `,
      type: 'rent_overdue'
    };

    const smsNotification: SMSNotification = {
      to: tenantPhone,
      message: `URGENT: ${tenantName}, your rent payment of $${amount.toFixed(2)} is ${daysPastDue} days overdue. Please pay immediately to avoid service disruption. - Cornven`,
      type: 'rent_overdue'
    };

    await Promise.all([
      this.sendEmail(emailNotification),
      this.sendSMS(smsNotification)
    ]);
  }

  // Lease expiring notification
  async sendLeaseExpiringNotification(tenantEmail: string, tenantPhone: string, tenantName: string, expiryDate: string, daysUntilExpiry: number): Promise<void> {
    const emailNotification: EmailNotification = {
      to: tenantEmail,
      subject: 'Lease Expiring Soon - Cornven Cube Space',
      body: `
        Dear ${tenantName},

        Your cube space lease is expiring soon.

        Expiry Date: ${new Date(expiryDate).toLocaleDateString()}
        Days Remaining: ${daysUntilExpiry}

        Please contact us to discuss renewal options or to arrange the return of your cube space.

        Best regards,
        Cornven Management Team
      `,
      type: 'lease_expiring'
    };

    const smsNotification: SMSNotification = {
      to: tenantPhone,
      message: `Hi ${tenantName}, your cube lease expires in ${daysUntilExpiry} days (${new Date(expiryDate).toLocaleDateString()}). Contact us for renewal. - Cornven`,
      type: 'lease_expiring'
    };

    await Promise.all([
      this.sendEmail(emailNotification),
      this.sendSMS(smsNotification)
    ]);
  }

  // Payment confirmation
  async sendPaymentConfirmation(tenantEmail: string, tenantPhone: string, tenantName: string, amount: number, paymentDate: string): Promise<void> {
    const emailNotification: EmailNotification = {
      to: tenantEmail,
      subject: 'Payment Confirmation - Cornven Cube Space',
      body: `
        Dear ${tenantName},

        Thank you for your payment!

        Amount Paid: $${amount.toFixed(2)}
        Payment Date: ${new Date(paymentDate).toLocaleDateString()}

        Your payment has been successfully processed and your account is up to date.

        Best regards,
        Cornven Management Team
      `,
      type: 'payment_confirmation'
    };

    const smsNotification: SMSNotification = {
      to: tenantPhone,
      message: `Payment confirmed! $${amount.toFixed(2)} received on ${new Date(paymentDate).toLocaleDateString()}. Thank you! - Cornven`,
      type: 'payment_confirmation'
    };

    await Promise.all([
      this.sendEmail(emailNotification),
      this.sendSMS(smsNotification)
    ]);
  }
}

// Export singleton instance
export const notificationService = new NotificationService(notificationConfig);

// Export utility functions for checking notification status
export const checkRentDueNotifications = async (tenants: any[]): Promise<void> => {
  const today = new Date();
  const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

  for (const tenant of tenants) {
    if (tenant.status !== 'Active') continue;

    // Check for upcoming rent due (3 days before)
    const nextRentDue = new Date(tenant.leaseStartDate);
    nextRentDue.setMonth(nextRentDue.getMonth() + 1); // Assuming Daily Rent

    if (nextRentDue <= threeDaysFromNow && nextRentDue > today) {
      await notificationService.sendRentDueNotification(
        tenant.email,
        tenant.phone,
        tenant.name,
        tenant.dailyRent || 200, // Default rent amount
        nextRentDue.toISOString()
      );
    }
  }
};

export const checkOverdueNotifications = async (tenants: any[]): Promise<void> => {
  const today = new Date();

  for (const tenant of tenants) {
    if (tenant.status !== 'Active') continue;

    // Check for overdue payments
    const lastPayment = tenant.rentPayments?.[tenant.rentPayments.length - 1];
    if (lastPayment) {
      const lastPaymentDate = new Date(lastPayment.date);
      const daysSinceLastPayment = Math.floor((today.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceLastPayment > 30) { // Assuming Daily Rent cycle
        await notificationService.sendOverdueNotification(
          tenant.email,
          tenant.phone,
          tenant.name,
          tenant.dailyRent || 200,
          daysSinceLastPayment - 30
        );
      }
    }
  }
};

export const checkLeaseExpiryNotifications = async (tenants: any[]): Promise<void> => {
  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  for (const tenant of tenants) {
    const leaseEndDate = new Date(tenant.leaseEndDate);
    
    if (leaseEndDate <= thirtyDaysFromNow && leaseEndDate > today) {
      const daysUntilExpiry = Math.ceil((leaseEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      await notificationService.sendLeaseExpiringNotification(
        tenant.email,
        tenant.phone,
        tenant.name,
        tenant.leaseEndDate,
        daysUntilExpiry
      );
    }
  }
};