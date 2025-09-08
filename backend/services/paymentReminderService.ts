import { prisma } from "../prisma/prisma";
import { emailService } from "./emailService";
import { summarizeRental } from "../utils/billing";
import { EmailTemplates } from "../templates/emailTemplates";

type PaymentReminderType = 'SEVEN_DAY_ADVANCE' | 'ONE_DAY_DUE' | 'OVERDUE';

interface ReminderStats {
  processed: number;
  sent: number;
  skipped: number;
  errors: number;
  results: Array<{
    rentalId: string;
    tenantName: string;
    reminderType: PaymentReminderType;
    dueDate: Date;
    amountDue: number;
    emailSent: boolean;
    error?: string;
  }>;
}

class PaymentReminderService {
  /**
   * Manually trigger payment reminders for all active rentals
   * This checks all rentals and sends appropriate reminders based on due dates
   */
  async triggerPaymentReminders(): Promise<ReminderStats> {
    const stats: ReminderStats = {
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: 0,
      results: []
    };

    try {
      // Get all active rentals with tenant and cube information
      const rentals = await prisma.rental.findMany({
        where: {
          status: 'ACTIVE'
        },
        include: {
          tenant: {
            include: {
              user: true
            }
          },
          cube: true,
          payments: true
        }
      });

      const now = new Date();

      // Process each rental
      for (const rental of rentals) {
        stats.processed++;
        
        try {
          // Get rental summary for payment calculations
          const summary = summarizeRental(rental, rental.payments || []);
          
          // Debug: Rental summary (can be removed in production)
          console.log(`🔍 Processing rental ${rental.id} (${rental.tenant.businessName}) - Accrued: $${summary.accruedToDate}, Balance: $${summary.balanceDue}`);
          
          // Send reminders if there's any accrued amount or balance due
          if (summary.accruedToDate > 0 || summary.balanceDue > 0) {
            const initialSentCount = stats.sent;
            
            // Check for 7-day advance reminder
            await this.checkSevenDayReminder(rental, summary, now, stats);
            
            // Check for 1-day due reminder
            await this.checkOneDayReminder(rental, summary, now, stats);
            
            // Check for overdue reminder
            await this.checkOverdueReminder(rental, summary, now, stats);
            
            // If no standard reminders were sent for this rental but there's significant accrued amount, send a general reminder
            const reminderSentForThisRental = stats.sent > initialSentCount;
            if (!reminderSentForThisRental && summary.accruedToDate > 50) {
              // Check if we already sent a general reminder for this due date
              const existingGeneralReminder = await (prisma as any).paymentReminder.findFirst({
                where: {
                  rentalId: rental.id,
                  reminderType: 'SEVEN_DAY_ADVANCE',
                  dueDate: summary.nextDueDate
                }
              });
              
              if (!existingGeneralReminder) {
                console.log(`   💰 Sending reminder for accrued amount: $${summary.accruedToDate}`);
                await this.sendReminder(
                  rental,
                  'SEVEN_DAY_ADVANCE', // Use 7-day template as default
                  summary.nextDueDate,
                  summary.accruedToDate,
                  stats
                );
              } else {
                console.log(`   ⏭️  General reminder already sent for this due date`);
              }
            }
          } else {
            // Rental skipped - no accrued amount or balance due
            stats.skipped++;
          }
        } catch (error) {
          stats.errors++;
          stats.results.push({
            rentalId: rental.id,
            tenantName: rental.tenant.businessName,
            reminderType: 'SEVEN_DAY_ADVANCE',
            dueDate: new Date(),
            amountDue: 0,
            emailSent: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return stats;
    } catch (error) {
      console.error('Error in triggerPaymentReminders:', error);
      throw error;
    }
  }

  /**
   * Check if rental needs 7-day advance reminder
   */
  private async checkSevenDayReminder(
    rental: any,
    summary: any,
    now: Date,
    stats: ReminderStats
  ): Promise<void> {
    // Use the nextDueDate from the billing summary
    const nextDueDate = summary.nextDueDate;
    
    // Check if we're 7 days before due date
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(now.getDate() + 7);
    
    if (sevenDaysFromNow >= nextDueDate) {
      // Check if we already sent this reminder
       const existingReminder = await (prisma as any).paymentReminder.findFirst({
        where: {
          rentalId: rental.id,
          reminderType: 'SEVEN_DAY_ADVANCE',
          dueDate: nextDueDate
        }
      });
      
      if (!existingReminder) {
        // Use accruedToDate from billing summary for 7-day advance reminder
        // This shows the tenant what they currently owe (accrued rent)
        const amountDue = summary.accruedToDate;
        
        await this.sendReminder(
          rental,
          'SEVEN_DAY_ADVANCE',
          nextDueDate,
          amountDue,
          stats
        );
      } else {
        stats.skipped++;
      }
    }
  }

  /**
   * Check if rental needs 1-day due reminder
   */
  private async checkOneDayReminder(
    rental: any,
    summary: any,
    now: Date,
    stats: ReminderStats
  ): Promise<void> {
    // Use the nextDueDate from the billing summary
    const nextDueDate = summary.nextDueDate;
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(now.getDate() + 1);
    
    if (oneDayFromNow >= nextDueDate) {
      const existingReminder = await (prisma as any).paymentReminder.findFirst({
        where: {
          rentalId: rental.id,
          reminderType: 'ONE_DAY_DUE',
          dueDate: nextDueDate
        }
      });
      
      if (!existingReminder) {
        // Calculate actual amount owed from completed billing periods
        const actualAmountDue = Math.max(0, summary.dueToDate - summary.totalPaid);
        
        await this.sendReminder(
          rental,
          'ONE_DAY_DUE',
          nextDueDate,
          actualAmountDue,
          stats
        );
      } else {
        stats.skipped++;
      }
    }
  }

  /**
   * Check if rental needs overdue reminder
   */
  private async checkOverdueReminder(
    rental: any,
    summary: any,
    now: Date,
    stats: ReminderStats
  ): Promise<void> {
    // Use the overdue flag and lastDueDate from the billing summary
    if (summary.overdue) {
      const existingReminder = await (prisma as any).paymentReminder.findFirst({
        where: {
          rentalId: rental.id,
          reminderType: 'OVERDUE',
          dueDate: summary.lastDueDate
        }
      });
      
      if (!existingReminder) {
        // Calculate total amount owed including unbilled if lease ended
        const leaseEnded = new Date(now) >= new Date(rental.endDate);
        const totalOwed = summary.dueToDate + (leaseEnded ? summary.unbilledAccrued : 0) - summary.totalPaid;
        const overdueAmount = Math.max(0, totalOwed);
        
        await this.sendReminder(
          rental,
          'OVERDUE',
          summary.lastDueDate,
          overdueAmount,
          stats
        );
      } else {
        stats.skipped++;
      }
    }
  }

  /**
   * Send reminder email and record in database
   */
  private async sendReminder(
    rental: any,
    reminderType: PaymentReminderType,
    dueDate: Date,
    amountDue: number,
    stats: ReminderStats
  ): Promise<void> {
    try {
      // Get fresh billing summary for comprehensive email data
      const payments = await (prisma as any).payment.findMany({
        where: { rentalId: rental.id },
        select: { amount: true, paidAt: true }
      });
      const summary = summarizeRental(rental, payments);
      
      // Determine the correct amount due based on reminder type and billing variables
      let correctAmountDue: number;
      switch (reminderType) {
        case 'SEVEN_DAY_ADVANCE':
          // For 7-day advance: show total accrued amount (what they owe so far)
          correctAmountDue = summary.accruedToDate;
          break;
        case 'ONE_DAY_DUE':
          // For 1-day due: show balance due (what's officially owed minus payments)
          correctAmountDue = summary.balanceDue;
          break;
        case 'OVERDUE':
          // For overdue: use the amount passed from checkOverdueReminder calculation
          correctAmountDue = amountDue;
          break;
        default:
          correctAmountDue = amountDue;
      }

      const emailData = {
        tenantName: rental.tenant.businessName,
        cubeCode: rental.cube?.code || 'N/A',
        dueDate: dueDate.toLocaleDateString(),
        amountDue: summary.accruedToDate.toFixed(2),
        dailyRent: rental.dailyRent.toFixed(2),
        totalPaid: summary.totalPaid.toFixed(2),
        reminderType
      };
      
      // Get email template
       const template = this.getEmailTemplate(reminderType, emailData);
      
      // Send email
      const emailResult = await emailService.sendEmail({
        to: rental.tenant.user.email,
        subject: template.subject,
        html: template.html
      });
      
      const emailSent = emailResult.success;

      // Record the reminder in database
       await (prisma as any).paymentReminder.create({
        data: {
          rentalId: rental.id,
          reminderType,
          dueDate,
          emailSent
        }
      });

      if (emailSent) {
        stats.sent++;
      }

      stats.results.push({
        rentalId: rental.id,
        tenantName: rental.tenant.businessName,
        reminderType,
        dueDate,
        amountDue,
        emailSent,
        error: emailSent ? undefined : emailResult.error
      });
    } catch (error) {
      stats.errors++;
      stats.results.push({
        rentalId: rental.id,
        tenantName: rental.tenant.businessName,
        reminderType,
        dueDate,
        amountDue,
        emailSent: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get reminder history for a specific rental or all rentals
   */
  async getReminderHistory(rentalId?: string): Promise<any[]> {
    const reminders = await (prisma as any).paymentReminder.findMany({
      where: rentalId ? { rentalId } : {},
      include: {
        rental: {
          include: {
            tenant: { 
              select: { 
                businessName: true,
                user: { select: { email: true } }
              } 
            },
            cube: { select: { code: true } }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return reminders;
  }

  /**
   * Get all overdue rentals that need immediate attention
   */
  async getOverdueRentals(): Promise<any[]> {
    const overdueRentals = await (prisma as any).paymentReminder.findMany({
      where: {
        reminderType: 'OVERDUE'
      },
      include: {
        rental: {
          include: {
            tenant: { 
              select: { 
                businessName: true,
                user: { select: { email: true } }
              } 
            },
            cube: { select: { code: true } }
          }
        }
      },
      orderBy: {
        dueDate: 'asc'
      }
    });

    return overdueRentals;
  }

   /**
    * Get email template based on reminder type
    */
   private getEmailTemplate(reminderType: PaymentReminderType, data: any) {
     const templateData = {
       tenantName: data.tenantName,
       cubeCode: data.cubeCode,
       dueDate: data.dueDate,
       amountDue: data.amountDue,
       dailyRent: data.dailyRent,
       totalPaid: data.totalPaid,
       accruedToDate: data.accruedToDate,
       unbilledAccrued: data.unbilledAccrued,
       nextDueDate: data.nextDueDate,
       startDate: new Date().toLocaleDateString(),
       endDate: new Date().toLocaleDateString()
     };

     switch (reminderType) {
       case 'SEVEN_DAY_ADVANCE':
         return EmailTemplates.paymentReminder7Day(templateData);
       case 'ONE_DAY_DUE':
         return EmailTemplates.paymentReminder1Day(templateData);
       case 'OVERDUE':
         return EmailTemplates.paymentReminderOverdue(templateData);
       default:
         throw new Error(`Unknown reminder type: ${reminderType}`);
     }
   }
}

export const paymentReminderService = new PaymentReminderService();
export default paymentReminderService;