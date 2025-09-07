import nodemailer from 'nodemailer';
import { getTestMessageUrl } from 'nodemailer';

// Custom Error Classes for Professional Error Handling
export class EmailConfigurationError extends Error {
  constructor(service: string, missingVars: string[]) {
    super(`Email service configuration incomplete for ${service}. Missing required environment variables: ${missingVars.join(', ')}`);
    this.name = 'EmailConfigurationError';
  }
}

export class EmailServiceError extends Error {
  constructor(service: string, operation: string, originalError?: Error) {
    super(`Email service (${service}) failed during ${operation}${originalError ? ': ' + originalError.message : ''}`);
    this.name = 'EmailServiceError';
  }
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  testUrl?: string;
  error?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private emailService: string;

  constructor() {
    this.emailService = process.env.EMAIL_SERVICE || 'ethereal';
  }

  async initialize(): Promise<void> {
    if (this.transporter) return;

    try {
      switch (this.emailService.toLowerCase()) {
        case 'ethereal':
          await this.initializeEthereal();
          break;
        case 'mailgun':
          await this.initializeMailgun();
          break;
        case 'gmail':
          await this.initializeGmail();
          break;
        default:
          throw new Error(`Unsupported email service: ${this.emailService}. Supported services: ethereal, mailgun, gmail`);
      }
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      throw error;
    }
  }

  private async initializeEthereal(): Promise<void> {
    // Initializing Ethereal Email for development
    
    const etherealHost = process.env.ETHEREAL_HOST || 'smtp.ethereal.email';
    const etherealPort = parseInt(process.env.ETHEREAL_PORT || '587');
    const etherealUser = process.env.ETHEREAL_USER;
    const etherealPass = process.env.ETHEREAL_PASS;

    const missingVars = [];
    if (!etherealUser) missingVars.push('ETHEREAL_USER');
    if (!etherealPass) missingVars.push('ETHEREAL_PASS');
    
    if (missingVars.length > 0) {
      throw new EmailConfigurationError('Ethereal', missingVars);
    }
    
    this.transporter = nodemailer.createTransport({
      host: etherealHost,
      port: etherealPort,
      secure: false,
      auth: {
        user: etherealUser,
        pass: etherealPass,
      },
    });

    console.log('📧 Email server started (Development mode - Ethereal)');
  }

  private async initializeMailgun(): Promise<void> {
    // Initializing Mailgun for production
    
    const mailgunHost = process.env.MAILGUN_SMTP_SERVER;
    const mailgunPort = parseInt(process.env.MAILGUN_SMTP_PORT || '587');
    const mailgunUser = process.env.MAILGUN_SMTP_LOGIN;
    const mailgunPass = process.env.MAILGUN_SMTP_PASSWORD;

    const missingVars = [];
    if (!mailgunHost) missingVars.push('MAILGUN_SMTP_SERVER');
    if (!mailgunUser) missingVars.push('MAILGUN_SMTP_LOGIN');
    if (!mailgunPass) missingVars.push('MAILGUN_SMTP_PASSWORD');
    
    if (missingVars.length > 0) {
      throw new EmailConfigurationError('Mailgun', missingVars);
    }

    this.transporter = nodemailer.createTransport({
      host: mailgunHost,
      port: mailgunPort,
      secure: mailgunPort === 465,
      auth: {
        user: mailgunUser,
        pass: mailgunPass,
      },
    });

    // Verify connection
    try {
      if (this.transporter) {
        await this.transporter.verify();
      }
      console.log('📧 Email server started (Production mode - Mailgun)');
    } catch (error) {
      throw new EmailServiceError('Mailgun', 'connection verification', error as Error);
    }
  }

  private async initializeGmail(): Promise<void> {
    // Initializing Gmail SMTP
    
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS;

    const missingVars = [];
    if (!gmailUser) missingVars.push('GMAIL_USER');
    if (!gmailPass) missingVars.push('GMAIL_PASS');
    
    if (missingVars.length > 0) {
      throw new EmailConfigurationError('Gmail', missingVars);
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass, // Use App Password, not regular password
      },
    });

    // Verify connection
    try {
      if (this.transporter) {
        await this.transporter.verify();
      }
      console.log('📧 Email server started (Gmail)');
    } catch (error) {
      throw new EmailServiceError('Gmail', 'connection verification', error as Error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      await this.initialize();

      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      let fromEmail: string;
      switch (this.emailService.toLowerCase()) {
        case 'ethereal':
          fromEmail = process.env.ETHEREAL_FROM || 'noreply@cornven.test';
          break;
        case 'mailgun':
          fromEmail = process.env.MAILGUN_FROM || 'noreply@cornven.com';
          break;
        case 'gmail':
          fromEmail = process.env.GMAIL_FROM || process.env.GMAIL_USER || 'noreply@gmail.com';
          break;
        default:
          fromEmail = 'noreply@cornven.com';
      }

      const mailOptions = {
        from: fromEmail,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      };

      const info = await this.transporter.sendMail(mailOptions);

      const result: EmailResult = {
        success: true,
        messageId: info.messageId,
      };

      if (this.emailService === 'ethereal') {
        const testUrl = getTestMessageUrl(info);
        result.testUrl = testUrl || undefined;
        console.log('📧 Email sent successfully (Ethereal - Development)');
        if (testUrl) {
          console.log('🔗 Preview link:', testUrl);
        }
      } else {
        console.log(`📧 Email sent successfully (${this.emailService})`);
      }

      return result;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendBulkEmails(emails: EmailOptions[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    
    for (const email of emails) {
      const result = await this.sendEmail(email);
      results.push(result);
      
      // Add small delay between emails to avoid rate limiting
      if (this.emailService !== 'ethereal') {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  getServiceInfo(): { service: string; mode: string } {
    const serviceMap: { [key: string]: { service: string; mode: string } } = {
      ethereal: { service: 'Ethereal', mode: 'Development' },
      mailgun: { service: 'Mailgun', mode: 'Production' },
      gmail: { service: 'Gmail', mode: 'Production' },
    };
    
    return serviceMap[this.emailService.toLowerCase()] || { service: 'Unknown', mode: 'Unknown' };
  }
}

// Singleton instance
export const emailService = new EmailService();
export default emailService;