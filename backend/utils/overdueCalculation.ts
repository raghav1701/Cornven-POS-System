/**
 * Overdue Balance Calculation Utility
 * Calculates balance due from COMPLETED previous cycles only
 * Does not include current incomplete cycle
 */

export interface OverdueCalculationResult {
  balanceDue: number;
  completedCycles: number;
  daysOverdue: number;
  shouldTriggerOverdue: boolean;
  details: {
    duration: number;
    daysPassed: number;
    billingCycle: number;
    totalPaid: number;
    completedCyclesAmount: number;
  };
}

/**
 * Calculate overdue balance based on completed cycles only
 * @param startDate - Rental start date
 * @param currentDate - Current date
 * @param endDate - Rental end date
 * @param dailyRent - Daily rent amount
 * @param totalPaid - Total amount paid so far
 * @param billingCycle - Billing cycle in days (default 14)
 * @returns OverdueCalculationResult
 */
export function calculateOverdueBalance(
  startDate: Date,
  currentDate: Date,
  endDate: Date,
  dailyRent: number,
  totalPaid: number,
  billingCycle: number = 14
): OverdueCalculationResult {
  // Calculate basic variables
  const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysPassed = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate COMPLETED cycles only (not current incomplete cycle)
  const completedCycles = Math.floor(daysPassed / billingCycle);
  
  // Calculate amount due from completed cycles only
  const completedCyclesAmount = completedCycles * billingCycle * dailyRent;
  
  // Calculate balance due from completed cycles
  const balanceDue = Math.max(0, completedCyclesAmount - totalPaid);
  
  // Calculate days overdue (days past the last completed cycle)
  const lastCompletedCycleEnd = completedCycles * billingCycle;
  const daysOverdue = Math.max(0, daysPassed - lastCompletedCycleEnd);
  
  // Should trigger overdue if:
  // 1. We have completed at least one cycle
  // 2. There's an unpaid balance from completed cycles
  // 3. We're past the end of the last completed cycle
  const shouldTriggerOverdue = completedCycles > 0 && balanceDue > 0 && daysOverdue > 0;
  
  return {
    balanceDue,
    completedCycles,
    daysOverdue,
    shouldTriggerOverdue,
    details: {
      duration,
      daysPassed,
      billingCycle,
      totalPaid,
      completedCyclesAmount
    }
  };
}

/**
 * Get cycle boundaries for a specific completed cycle
 * @param startDate - Rental start date
 * @param cycleNumber - Cycle number (0-based)
 * @param billingCycle - Billing cycle in days
 * @returns Cycle start and end dates
 */
export function getCompletedCycleBoundaries(
  startDate: Date,
  cycleNumber: number,
  billingCycle: number = 14
): { cycleStart: Date; cycleEnd: Date } {
  const cycleStart = new Date(startDate.getTime() + (cycleNumber * billingCycle * 24 * 60 * 60 * 1000));
  const cycleEnd = new Date(startDate.getTime() + ((cycleNumber + 1) * billingCycle * 24 * 60 * 60 * 1000));
  
  return { cycleStart, cycleEnd };
}

/**
 * Helper function to format overdue calculation details for logging
 */
export function formatOverdueDetails(result: OverdueCalculationResult): string {
  return [
    `Completed Cycles: ${result.completedCycles}`,
    `Days Overdue: ${result.daysOverdue}`,
    `Balance Due (from completed cycles): $${result.balanceDue.toFixed(2)}`,
    `Total Paid: $${result.details.totalPaid.toFixed(2)}`,
    `Amount Due from Completed Cycles: $${result.details.completedCyclesAmount.toFixed(2)}`,
    `Should Trigger: ${result.shouldTriggerOverdue ? 'YES' : 'NO'}`
  ].join(' | ');
}