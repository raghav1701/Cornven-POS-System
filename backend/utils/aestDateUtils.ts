/**
 * AEST Date Utilities for Business Operations
 * Handles timezone conversion from UTC to Australian Eastern Standard Time
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Convert any date to AEST date-only (handles AEDT automatically)
 */
export function toAESTDateOnly(d: Date): Date {
  // Get the date components in Australia/Sydney timezone
  const aestDateStr = d.toLocaleDateString("en-CA", {timeZone: "Australia/Sydney"});
  const [year, month, day] = aestDateStr.split('-');
  // Use UTC methods to avoid timezone conversion
  return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
}

/**
 * Get current date in AEST timezone
 */
export function getAESTToday(): Date {
  return toAESTDateOnly(new Date());
}

/**
 * Calculate days between two dates using AEST timezone
 */
export function daysBetweenAEST(a: Date, b: Date): number {
  const A = toAESTDateOnly(a);
  const B = toAESTDateOnly(b);
  return Math.max(0, Math.floor((B.getTime() - A.getTime()) / MS_PER_DAY));
}

/**
 * Add days to a date in AEST
 */
export function addDaysAEST(d: Date, n: number): Date {
  const aestDate = toAESTDateOnly(d);
  return new Date(aestDate.getTime() + n * MS_PER_DAY);
}