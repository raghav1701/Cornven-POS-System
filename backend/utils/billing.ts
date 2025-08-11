import { Rental, Payment } from "@prisma/client";

/**
 * Billing model:
 * - Each "period" is one month from the rental's start day-of-month to the next.
 * - expectedDue is numberOfPeriodsElapsed * monthlyRent (capped by endDate).
 * - balance = expectedDue - totalPaid
 * - overdue = balance > 0 AND there is at least one due period whose due date <= now
 */
export function addMonths(anchor: Date, n: number) {
  const d = new Date(anchor);
  d.setMonth(d.getMonth() + n);
  return d;
}

export function periodsElapsed(start: Date, endExclusive: Date) {
  if (endExclusive <= start) return 0;
  let count = 0;
  let cursor = new Date(start);
  while (true) {
    const next = addMonths(cursor, 1);
    if (next > endExclusive) break;
    count++;
    cursor = next;
  }
  return count;
}

export function nextDueDate(start: Date, now: Date) {
  if (now <= start) return start;
  let cursor = new Date(start);
  while (addMonths(cursor, 1) <= now) {
    cursor = addMonths(cursor, 1);
  }
  // cursor is the most recent due boundary <= now
  return addMonths(cursor, 1); // next boundary after the most recent one
}

export function summarizeRental(rental: Rental, payments: Payment[]) {
  const now = new Date();
  const start = new Date(rental.startDate);
  const end = new Date(rental.endDate);

  // periods that should already be paid (cap at end)
  const effectiveNow = now < end ? now : end;
  const duePeriods = periodsElapsed(start, effectiveNow);
  const expectedDue = duePeriods * rental.monthlyRent;

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const balance = +(expectedDue - totalPaid).toFixed(2);

  // when is the *next* period due?
  const nextDue = nextDueDate(start, now);

  const overdue = balance > 0 && now >= nextDue && now < end;

  return {
    expectedDue,
    totalPaid,
    balance,
    duePeriods,
    nextDueDate: nextDue,
    overdue,
  };
}
