import { PrismaClient } from '@prisma/client';
import { emailService } from './emailService';
import { formatDateToReadable } from '../utils/paymentReminderUtils';
import { EmailTemplates } from '../templates/emailTemplates';
import { calculateOverdueBalance, formatOverdueDetails, getCompletedCycleBoundaries } from '../utils/overdueCalculation';
import { getAESTToday, daysBetweenAEST, toAESTDateOnly, addDaysAEST } from '../utils/aestDateUtils';
import { prisma } from '../prisma/prisma';

// Helper function to get 14-day billing cycle boundaries using AEST
function getCycleBoundaries(startDate: Date, currentDate: Date): { cycleStart: Date; cycleEnd: Date } {
  // Calculate days since start using AEST
  const daysSinceStart = daysBetweenAEST(startDate, currentDate);
  
  // Calculate which 14-day cycle we're in (0-based)
  const cycleNumber = Math.floor(daysSinceStart / 14);
  
  // Calculate cycle boundaries using AEST
  const cycleStart = addDaysAEST(toAESTDateOnly(startDate), cycleNumber * 14);
  const cycleEnd = addDaysAEST(toAESTDateOnly(startDate), (cycleNumber + 1) * 14);
  
  return { cycleStart, cycleEnd };
}

function getPreviousCycleBoundaries(startDate: Date, currentDate: Date): { cycleStart: Date; cycleEnd: Date } {
  // Calculate days since start using AEST
  const daysSinceStart = daysBetweenAEST(startDate, currentDate);
  
  // Calculate which 14-day cycle we're in (0-based)
  const currentCycleNumber = Math.floor(daysSinceStart / 14);
  
  // Get previous cycle (currentCycleNumber - 1)
  const previousCycleNumber = Math.max(0, currentCycleNumber - 1);
  
  // Calculate previous cycle boundaries using AEST
  const cycleStart = addDaysAEST(toAESTDateOnly(startDate), previousCycleNumber * 14);
  const cycleEnd = addDaysAEST(toAESTDateOnly(startDate), (previousCycleNumber + 1) * 14);
  
  return { cycleStart, cycleEnd };
}

// Note: All date calculations now use AEST timezone via aestDateUtils

export interface RentalWithRelations {
  id: string;
  startDate: Date;
  endDate: Date;
  dailyRent: number;
  tenant: {
    id: string;
    businessName: string;
    address: string | null;
    notes: string | null;
    user: {
      id: string;
      email: string;
      name: string;
      phone: string | null;
    };
  };
  cube: {
    id: string;
    code: string;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    paidAt: Date;
    receivedById: string | null;
    note: string | null;
    createdAt: Date;
  }>;
}

export enum ReminderType {
  SEVEN_DAY_ADVANCE = 'SEVEN_DAY_ADVANCE',
  ONE_DAY_DUE = 'ONE_DAY_DUE',
  OVERDUE = 'OVERDUE'
}

export class PaymentReminderService {
  async triggerPaymentReminders(): Promise<{
    processed: number;
    emailsSent: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let processed = 0;
    let emailsSent = 0;

    try {
      // Get all active rentals with tenant and payment information
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

      console.log(`Found ${rentals.length} active rentals to process`);

      for (const rental of rentals) {
        try {
          processed++;
          
          console.log(`Processing rental ${rental.id} for tenant ${rental.tenant.businessName}`);

          // Check for different reminder types using custom logic
          const sevenDayResult = await this.checkSevenDayReminder(rental as RentalWithRelations);
          const oneDayResult = await this.checkOneDayReminder(rental as RentalWithRelations);
          const overdueResult = await this.checkOverdueReminder(rental as RentalWithRelations);

          if (sevenDayResult.sent) emailsSent++;
          if (oneDayResult.sent) emailsSent++;
          if (overdueResult.sent) emailsSent++;

          if (sevenDayResult.error) errors.push(sevenDayResult.error);
          if (oneDayResult.error) errors.push(oneDayResult.error);
          if (overdueResult.error) errors.push(overdueResult.error);

        } catch (error) {
          const errorMsg = `Error processing rental ${rental.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

    } catch (error) {
      const errorMsg = `Error fetching rentals: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    return {
      processed,
      emailsSent,
      errors
    };
  }

  private async checkSevenDayReminder(
    rental: RentalWithRelations
  ): Promise<{ sent: boolean; error?: string }> {
    try {
      const today = getAESTToday();
      
      // ═══════════════════════════════════════════════════════════════
      //                    📊 SEVEN DAY REMINDER ANALYSIS
      // ═══════════════════════════════════════════════════════════════
      
      console.log('\n🔍 Processing Seven Day Reminder for:', rental.tenant.businessName);
      console.log('📍 Cube:', rental.cube?.code || 'N/A');
      console.log('📅 Analysis Date:', today.toISOString().split('T')[0]);
      
      // 📋 RENTAL PERIOD INFORMATION
      console.log('\n📋 Rental Period:');
      console.log('   ├─ Start Date:', rental.startDate.toISOString().split('T')[0]);
      console.log('   ├─ End Date:', rental.endDate.toISOString().split('T')[0]);
      const duration = Math.ceil((rental.endDate.getTime() - rental.startDate.getTime()) / (1000 * 60 * 60 * 24));
      console.log('   └─ Total Duration:', duration, 'days');
      
      // ⏰ TIME CALCULATIONS (Following your exact logic)
      const dayPassed = daysBetweenAEST(rental.startDate, today);
      const billingCycle = 14;
      const currentCycle = Math.floor(dayPassed / billingCycle) + 1;
      const flag = (currentCycle * billingCycle) - duration;
      
      console.log('\n⏰ Time Analysis:');
      console.log('   ├─ Days Elapsed:', dayPassed, 'days');
      console.log('   ├─ Billing Cycle:', billingCycle, 'days');
      console.log('   ├─ Current Cycle:', currentCycle);
      console.log('   └─ Cycle Flag:', flag);
      
      // 💰 FINANCIAL CALCULATIONS (Your exact formula)
      const amountPaid = rental.payments.reduce((sum, payment) => sum + payment.amount, 0);
      
      let balanceDue: number;
      if (flag <= 0) {
        // If flag is 0 or negative: balanceDue = (billingCycle)(currentCycle)(dailyRent) - amountPaid
        balanceDue = (billingCycle * currentCycle * rental.dailyRent) - amountPaid;
      } else {
        // If flag is positive: balanceDue = (billingCycle)(currentCycle)(dailyRent) - amountPaid - (flag)(dailyRent)
        balanceDue = (billingCycle * currentCycle * rental.dailyRent) - amountPaid - (flag * rental.dailyRent);
      }
      
      console.log('\n💰 Financial Summary:');
      console.log('   ├─ Daily Rent Rate: $' + rental.dailyRent.toFixed(2));
      console.log('   ├─ Billing Cycle: ' + billingCycle + ' days');
      console.log('   ├─ Current Cycle: ' + currentCycle);
      console.log('   ├─ Flag Value: ' + flag + (flag <= 0 ? ' (≤0: full cycles)' : ' (>0: partial cycle)'));
      console.log('   ├─ Total Payments: $' + amountPaid.toFixed(2), `(${rental.payments.length} payments)`);
      console.log('   └─ Balance Due: $' + balanceDue.toFixed(2));
      
      console.log('\n' + '═'.repeat(65));
      
      // Get cycle boundaries for 14-day billing cycle
      const { cycleStart, cycleEnd } = getCycleBoundaries(rental.startDate, today);
      
      // Calculate days until cycle end (due date)
      const daysUntilDue = Math.ceil((cycleEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`Seven day check for rental ${rental.id}: days until due = ${daysUntilDue}`);
      
      if (daysUntilDue === 7) {
        // Check if we already sent this reminder for this cycle
        const existingReminder = await prisma.paymentReminder.findFirst({
          where: {
            rentalId: rental.id,
            reminderType: ReminderType.SEVEN_DAY_ADVANCE,
            dueDate: cycleEnd
          }
        });

        if (existingReminder) {
          console.log(`Seven day reminder already sent for rental ${rental.id} with due date ${cycleEnd.toISOString()}`);
          return { sent: false };
        }

        // Calculate balance due using your exact formula
        const totalPaid = rental.payments.reduce((sum, payment) => sum + payment.amount, 0);
        const duration = Math.ceil((rental.endDate.getTime() - rental.startDate.getTime()) / (1000 * 60 * 60 * 24));
        const dayPassed = daysBetweenAEST(rental.startDate, today);
        const billingCycle = 14;
        const currentCycle = Math.floor(dayPassed / billingCycle) + 1;
        const flag = (currentCycle * billingCycle) - duration;
        
        let serviceBalanceDue: number;
        if (flag <= 0) {
          serviceBalanceDue = (billingCycle * currentCycle * rental.dailyRent) - totalPaid;
        } else {
          serviceBalanceDue = (billingCycle * currentCycle * rental.dailyRent) - totalPaid - (flag * rental.dailyRent);
        }

        // Validate amount
        if (serviceBalanceDue <= 0) {
           const error = `Invalid amount due: must be greater than 0 for ${rental.tenant.businessName}'s ${ReminderType.SEVEN_DAY_ADVANCE} reminder with due date ${cycleEnd.toISOString()} and amount due ${serviceBalanceDue}`;
           console.error(error);
           return { sent: false, error };
         }

        return await this.sendReminder(
          rental,
          ReminderType.SEVEN_DAY_ADVANCE,
          serviceBalanceDue,
          cycleEnd
        );
      }
      
      return { sent: false };
    } catch (error) {
      const errorMsg = `Error in seven day reminder check for rental ${rental.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return { sent: false, error: errorMsg };
    }
  }

  private async checkOneDayReminder(
    rental: RentalWithRelations
  ): Promise<{ sent: boolean; error?: string }> {
    try {
      const today = getAESTToday();
      
      // Get cycle boundaries for 14-day billing cycle
      const { cycleStart, cycleEnd } = getCycleBoundaries(rental.startDate, today);
      
      // Calculate days until cycle end (due date)
      const daysUntilDue = Math.ceil((cycleEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`One day check for rental ${rental.id}: days until due = ${daysUntilDue}`);
      
      if (daysUntilDue === 1) {
        // Check if we already sent this reminder for this cycle
        const existingReminder = await prisma.paymentReminder.findFirst({
          where: {
            rentalId: rental.id,
            reminderType: ReminderType.ONE_DAY_DUE,
            dueDate: cycleEnd
          }
        });

        if (existingReminder) {
          console.log(`One day reminder already sent for rental ${rental.id} with due date ${cycleEnd.toISOString()}`);
          return { sent: false };
        }

        // Calculate balance due using your exact formula
        const totalPaid = rental.payments.reduce((sum, payment) => sum + payment.amount, 0);
        const duration = Math.ceil((rental.endDate.getTime() - rental.startDate.getTime()) / (1000 * 60 * 60 * 24));
        const dayPassed = daysBetweenAEST(rental.startDate, today);
        const billingCycle = 14;
        const currentCycle = Math.floor(dayPassed / billingCycle) + 1;
        const flag = (currentCycle * billingCycle) - duration;
        
        let balanceDue: number;
        if (flag <= 0) {
          balanceDue = (billingCycle * currentCycle * rental.dailyRent) - totalPaid;
        } else {
          balanceDue = (billingCycle * currentCycle * rental.dailyRent) - totalPaid - (flag * rental.dailyRent);
        }

        // Validate amount
        if (balanceDue <= 0) {
           const error = `Invalid amount due: must be greater than 0 for ${rental.tenant.businessName}'s ${ReminderType.ONE_DAY_DUE} reminder with due date ${cycleEnd.toISOString()} and amount due ${balanceDue}`;
           console.error(error);
           return { sent: false, error };
         }

        return await this.sendReminder(
          rental,
          ReminderType.ONE_DAY_DUE,
          balanceDue,
          cycleEnd
        );
      }
      
      return { sent: false };
    } catch (error) {
      const errorMsg = `Error in one day reminder check for rental ${rental.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return { sent: false, error: errorMsg };
    }
  }



  private async checkOverdueReminder(
    rental: RentalWithRelations
  ): Promise<{ sent: boolean; error?: string }> {
    try {
      const today = getAESTToday();
      const totalPaid = rental.payments.reduce((sum, payment) => sum + payment.amount, 0);
      
      // Use new overdue calculation logic for completed cycles only
      const overdueResult = calculateOverdueBalance(
        rental.startDate,
        today,
        rental.endDate,
        rental.dailyRent,
        totalPaid,
        14 // billing cycle
      );
      
      console.log(`\n${'═'.repeat(65)}`);
      console.log(`🔍 OVERDUE CHECK - ${rental.tenant.businessName}`);
      console.log(`${'═'.repeat(65)}`);
      console.log(`📊 ${formatOverdueDetails(overdueResult)}`);
      console.log(`${'═'.repeat(65)}\n`);
      
      if (overdueResult.shouldTriggerOverdue) {
        // Get the last completed cycle boundaries for due date
        const lastCompletedCycle = overdueResult.completedCycles - 1;
        const { cycleEnd } = getCompletedCycleBoundaries(rental.startDate, lastCompletedCycle, 14);
        
        // Check if we already sent this reminder for this completed cycle
        const existingReminder = await prisma.paymentReminder.findFirst({
          where: {
            rentalId: rental.id,
            reminderType: ReminderType.OVERDUE,
            dueDate: cycleEnd
          }
        });

        if (existingReminder) {
          console.log(`⚠️  Overdue reminder already sent for rental ${rental.id} with due date ${cycleEnd.toISOString()}`);
          return { sent: false };
        }

        // Validate amount
        if (overdueResult.balanceDue <= 0) {
           const error = `Invalid amount due: must be greater than 0 for ${rental.tenant.businessName}'s ${ReminderType.OVERDUE} reminder with due date ${cycleEnd.toISOString()} and amount due ${overdueResult.balanceDue}`;
           console.error(error);
           return { sent: false, error };
         }

        console.log(`📧 Sending overdue reminder: $${overdueResult.balanceDue.toFixed(2)} due from ${overdueResult.completedCycles} completed cycles`);
        
        return await this.sendReminder(
          rental,
          ReminderType.OVERDUE,
          overdueResult.balanceDue,
          cycleEnd
        );
      }
      
      console.log(`✅ No overdue reminder needed - either no completed cycles or balance is paid`);
      return { sent: false };
    } catch (error) {
      const errorMsg = `Error in overdue reminder check for rental ${rental.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return { sent: false, error: errorMsg };
    }
  }

  private async sendReminder(
    rental: RentalWithRelations,
    reminderType: ReminderType,
    amount: number,
    dueDate: Date
  ): Promise<{ sent: boolean; error?: string }> {
    try {
      console.log(`Sending ${reminderType} reminder for rental ${rental.id}, amount: ${amount}, due date: ${dueDate.toISOString()}`);
      
      // Get billing cycle boundaries based on reminder type
      const today = getAESTToday();
      let cycleStart: Date, cycleEnd: Date;
      
      if (reminderType === ReminderType.OVERDUE) {
        // For overdue reminders, use previous cycle boundaries (when the balance was actually due)
        const boundaries = getPreviousCycleBoundaries(rental.startDate, today);
        cycleStart = boundaries.cycleStart;
        cycleEnd = boundaries.cycleEnd;
      } else {
        // For advance reminders, use current cycle boundaries
        const boundaries = getCycleBoundaries(rental.startDate, today);
        cycleStart = boundaries.cycleStart;
        cycleEnd = boundaries.cycleEnd;
      }
      
      // Get email template data
      const emailData = {
        tenantName: rental.tenant.businessName,
        cubeCode: rental.cube?.code || 'N/A',
        dueDate: formatDateToReadable(dueDate),
        amountDue: amount.toFixed(2),
        dailyRent: rental.dailyRent.toFixed(2),
        totalPaid: rental.payments.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2),
        balanceDue: amount.toFixed(2),
        startDate: formatDateToReadable(rental.startDate),
        endDate: formatDateToReadable(rental.endDate),
        billingPeriodStart: formatDateToReadable(cycleStart),
        billingPeriodEnd: formatDateToReadable(cycleEnd),
        leaseStartDate: formatDateToReadable(rental.startDate),
        leaseEndDate: formatDateToReadable(rental.endDate)
      };
      
      // Get email template based on reminder type
      let template;
      switch (reminderType) {
        case ReminderType.SEVEN_DAY_ADVANCE:
          template = EmailTemplates.paymentReminder7Day(emailData);
          break;
        case ReminderType.ONE_DAY_DUE:
          template = EmailTemplates.paymentReminder1Day(emailData);
          break;
        case ReminderType.OVERDUE:
          template = EmailTemplates.paymentReminderOverdue(emailData);
          break;
        default:
          throw new Error(`Unknown reminder type: ${reminderType}`);
      }
      
      // Send email
      await emailService.sendEmail({
        to: rental.tenant.user.email,
        subject: template.subject,
        html: template.html
      });

      // Record the reminder in database
       await prisma.paymentReminder.create({
         data: {
           rentalId: rental.id,
           reminderType,
           dueDate,
           emailSent: true
         }
       });

      console.log(`Successfully sent ${reminderType} reminder for rental ${rental.id}`);
      return { sent: true };
    } catch (error) {
      const errorMsg = `Error sending ${reminderType} reminder for rental ${rental.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return { sent: false, error: errorMsg };
    }
  }

}

export const paymentReminderService = new PaymentReminderService();
export default paymentReminderService;
