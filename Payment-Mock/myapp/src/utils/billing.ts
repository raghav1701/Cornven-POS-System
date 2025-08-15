// src/utils/billing.ts
import { Payment } from "../types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUTCDateOnly(d: Date) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}
function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * MS_PER_DAY);
}
function daysBetween(a: Date, b: Date) {
  const A = toUTCDateOnly(a);
  const B = toUTCDateOnly(b);
  return Math.max(0, Math.floor((B.getTime() - A.getTime()) / MS_PER_DAY));
}

/**
 * Per-day accrual; fortnight (14d) billing:
 * - accruedToDate = dailyRent * daysElapsed (to min(now, endDate))
 * - dueToDate = dailyRent * (full 14-day blocks), unless lease ended ➜ all accrued due
 * - balanceDue = dueToDate - totalPaid
 * - unbilledAccrued = accruedToDate - dueToDate
 * - overdue = balanceDue>0 AND (lease ended OR boundary passed) with 0 grace
 */
export function summarizeRentalFront(
  rental: { startDate: string; endDate: string; dailyRent: number },
  payments: Pick<Payment, "amount" | "paidAt">[],
  opts?: { graceDays?: number }
) {
  const graceDays = opts?.graceDays ?? 0;

  const now = new Date();
  const start = toUTCDateOnly(new Date(rental.startDate));
  const end = toUTCDateOnly(new Date(rental.endDate));
  const effectiveNow = now < end ? toUTCDateOnly(now) : end;

  // 1) Accrual
  const elapsedDays = daysBetween(start, effectiveNow);
  const accruedToDate = +(elapsedDays * rental.dailyRent).toFixed(2);

  // 2) Fortnight boundaries
  const fortnightsElapsed = Math.floor(elapsedDays / 14);
  const lastBoundary = addDays(start, 14 * fortnightsElapsed);
  const nextBoundary = addDays(start, 14 * (fortnightsElapsed + 1));

  // 3) Due computation
  const totalRentalDays = daysBetween(start, end);
  const dueDaysBlocks = Math.min(14 * fortnightsElapsed, totalRentalDays);
  const dueOngoing = +(dueDaysBlocks * rental.dailyRent).toFixed(2);
  const leaseEnded = effectiveNow.getTime() === end.getTime();
  const dueToDate = leaseEnded ? accruedToDate : dueOngoing;

  // 4) Payments
  const totalPaid = +payments.reduce((s, p) => s + p.amount, 0).toFixed(2);

  // 5) Balances
  const balanceDue = +(dueToDate - totalPaid).toFixed(2);
  const unbilledAccrued = +(accruedToDate - dueToDate).toFixed(2);

  // 6) Overdue (0-day grace by default)
  const graceCutoff = addDays(lastBoundary, graceDays);
  const pastEnd = now >= end;
  const anyCompletedFortnight = fortnightsElapsed > 0;
  const overdue =
    balanceDue > 0 &&
    (pastEnd || (anyCompletedFortnight && toUTCDateOnly(now) >= graceCutoff));

  return {
    accruedToDate,
    dueToDate,
    totalPaid,
    balanceDue,
    unbilledAccrued,
    fortnightsElapsed,
    lastDueDate: lastBoundary,
    nextDueDate: nextBoundary < end ? nextBoundary : end,
    overdue,
    expectedDue: dueToDate,
  };
}
