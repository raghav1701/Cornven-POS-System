import { Rental, Payment } from "@prisma/client";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUTCDateOnly(d: Date) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}
function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * MS_PER_DAY);
}
/** whole UTC days from a (inclusive) to b (exclusive) */
function daysBetween(a: Date, b: Date) {
  const A = toUTCDateOnly(a);
  const B = toUTCDateOnly(b);
  return Math.max(0, Math.floor((B.getTime() - A.getTime()) / MS_PER_DAY));
}

/**
 * Per-day accrual; due every 14 days:
 * - accruedToDate = dailyRent * daysElapsed (to min(now, endDate))
 * - dueToDate     = dailyRent * (full 14-day blocks elapsed), UNLESS lease ended → then all accrued is due
 * - balanceDue    = dueToDate - totalPaid
 * - unbilledAccrued = accruedToDate - dueToDate (not yet due in the current open fortnight)
 * - overdue       = balanceDue > 0 and (past end OR past (lastBoundary + graceDays))
 */
export function summarizeRental(
  rental: Rental,
  payments: Pick<Payment, "amount" | "paidAt">[],
  opts?: { graceDays?: number }
) {
  const graceDays = opts?.graceDays ?? 0;

  const now = new Date();
  const start = toUTCDateOnly(new Date(rental.startDate));
  const end = toUTCDateOnly(new Date(rental.endDate));

  // no accrual after lease end
  const effectiveNow = now < end ? toUTCDateOnly(now) : end;

  // 1) Accrual (per-day, constant rate)
  const elapsedDays = daysBetween(start, effectiveNow);
  const accruedToDate = +(elapsedDays * rental.dailyRent).toFixed(2);

  // 2) Fortnight boundaries
  const daysSinceStart = elapsedDays; // same window
  const fortnightsElapsed = Math.floor(daysSinceStart / 14);

  const lastBoundary = addDays(start, 14 * fortnightsElapsed);
  const nextBoundary = addDays(start, 14 * (fortnightsElapsed + 1));

  // 3) What is DUE now?
  //    - If lease ended: everything accrued is now due
  //    - Else: only full 14-day blocks are due
  const totalRentalDays = daysBetween(start, end);
  const dueDaysBlocks = Math.min(14 * fortnightsElapsed, totalRentalDays);
  const dueToDateOngoing = +(dueDaysBlocks * rental.dailyRent).toFixed(2);
  const leaseEnded = effectiveNow.getTime() === end.getTime();
  const dueToDate = leaseEnded ? accruedToDate : dueToDateOngoing;

  // 4) Payments
  const totalPaid = +payments.reduce((s, p) => s + p.amount, 0).toFixed(2);

  // 5) Balances
  const balanceDue = +(dueToDate - totalPaid).toFixed(2);
  const unbilledAccrued = +(accruedToDate - dueToDate).toFixed(2);

  // 6) Overdue
  const graceCutoff = addDays(lastBoundary, graceDays);
  const pastEnd = now >= end;
  const anyCompletedFortnight = fortnightsElapsed > 0;
  const overdue =
    balanceDue > 0 &&
    (pastEnd || (anyCompletedFortnight && toUTCDateOnly(now) >= graceCutoff));

  return {
    // primary
    accruedToDate, // total accrued so far (per-day)
    dueToDate, // amount that *should* be paid by now (fortnightly)
    totalPaid,
    balanceDue, // outstanding from dueToDate
    unbilledAccrued, // accrued since last boundary, not yet due

    // meta
    fortnightsElapsed,
    lastDueDate: lastBoundary,
    nextDueDate: nextBoundary < end ? nextBoundary : end,
    overdue,

    // back-compat (old callers used expectedDue)
    expectedDue: dueToDate,
  };
}
