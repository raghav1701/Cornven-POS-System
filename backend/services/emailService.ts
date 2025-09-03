import nodemailer from 'nodemailer';
import { getTestMessageUrl } from 'nodemailer';

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
  private isEthereal: boolean;

  constructor() {
    this.isEthereal = process.env.EMAIL_SERVICE === 'ethereal';
  }

  async initialize(): Promise<void> {
    if (this.transporter) return;

    try {
      if (this.isEthereal) {
        await this.initializeEthereal();
      } else {
        await this.initializeMailgun();
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

    if (!etherealUser || !etherealPass) {
      throw new Error('Missing Ethereal configuration. Please check ETHEREAL_USER and ETHEREAL_PASS environment variables.');
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

    if (!mailgunHost || !mailgunUser || !mailgunPass) {
      throw new Error('Missing Mailgun configuration. Please check MAILGUN_SMTP_* environment variables.');
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
    if (this.transporter) {
      await this.transporter.verify();
    }
    console.log('📧 Email server started (Production mode - Mailgun)');
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      await this.initialize();

      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const fromEmail = this.isEthereal 
        ? process.env.ETHEREAL_FROM || 'noreply@cornven.test' 
        : process.env.MAILGUN_FROM || 'noreply@cornven.com';

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

      if (this.isEthereal) {
        const testUrl = getTestMessageUrl(info);
        result.testUrl = testUrl || undefined;
        console.log('📧 Email sent successfully (Development)');
        if (testUrl) {
          console.log('🔗 Preview link:', testUrl);
        }
      } else {
        console.log('📧 Email sent successfully (Production)');
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
      if (!this.isEthereal) {
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
    return {
      service: this.isEthereal ? 'Ethereal' : 'Mailgun',
      mode: this.isEthereal ? 'Development' : 'Production',
    };
  }
}

// Singleton instance
export const emailService = new EmailService();
export default emailService;