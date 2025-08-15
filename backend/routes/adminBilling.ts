import { Router } from "express";
import { Role, PaymentMethod } from "@prisma/client";
import { requireAuth } from "../middleware/auth";
import prisma from "../prisma/prisma";
import { summarizeRental } from "../utils/billing";

const router = Router();
router.use(...requireAuth(Role.ADMIN));

/**
 * POST /admin/rentals/:id/payments
 * Record a payment for a rental
 * Body: { amount: number; method: PaymentMethod; paidAt?: string; note?: string }
 */
router.post("/rentals/:id/payments", async (req, res) => {
  const { id } = req.params;
  const { amount, method, paidAt, note } = req.body as {
    amount?: number;
    method?: PaymentMethod;
    paidAt?: string;
    note?: string;
  };

  if (amount == null || amount <= 0 || !method) {
    res.status(400).json({ error: "amount (>0) and method are required" });
    return;
  }

  try {
    const rental = await prisma.rental.findUnique({ where: { id } });
    if (!rental) {
      res.status(404).json({ error: "Rental not found" });
      return;
    }

    const payment = await prisma.payment.create({
      data: {
        rentalId: id,
        amount,
        method,
        note,
        receivedById: req.user!.userId,
        ...(paidAt ? { paidAt: new Date(paidAt) } : {}),
      },
    });

    const payments = await prisma.payment.findMany({
      where: { rentalId: id },
      orderBy: { paidAt: "desc" },
    });
    const summary = summarizeRental(rental, payments);

    res.status(201).json({ payment, summary });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to record payment" });
  }
});

/**
 * GET /admin/rentals/:id/payments
 * List payment history for a rental + balance summary
 */
router.get("/rentals/:id/payments", async (req, res) => {
  const { id } = req.params;
  try {
    const rental = await prisma.rental.findUnique({ where: { id } });
    if (!rental) {
      res.status(404).json({ error: "Rental not found" });
      return;
    }
    const payments = await prisma.payment.findMany({
      where: { rentalId: id },
      orderBy: { paidAt: "desc" },
      include: { receivedBy: { select: { id: true, name: true } } },
    });
    const summary = summarizeRental(rental, payments);
    res.json({ payments, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

/**
 * GET /admin/rentals/overdue
 * Returns rentals with a positive balance where at least one period is overdue
 */
router.get("/rentals/overdue", async (_req, res) => {
  try {
    const rentals = await prisma.rental.findMany({
      include: {
        tenant: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        cube: true,
      },
    });

    // group payments by rental to avoid N+1 queries
    const paymentsByRental: Record<string, { amount: number; paidAt: Date }[]> =
      {};
    const allPayments = await prisma.payment.findMany({
      orderBy: { paidAt: "asc" },
      select: { rentalId: true, amount: true, paidAt: true },
    });
    for (const p of allPayments) {
      (paymentsByRental[p.rentalId] ||= []).push(p);
    }

    const overdueList = rentals
      .map((r) => {
        const summary = summarizeRental(
          r,
          paymentsByRental[r.id] || [],
          { graceDays: 5 } // or your preferred grace
        );
        return { rental: r, summary };
      })
      // ↓ use balanceDue, not balance
      .filter(({ summary }) => summary.overdue && summary.balanceDue > 0)
      .sort((a, b) => b.summary.balanceDue - a.summary.balanceDue);

    res.json(overdueList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to compute overdue rentals" });
  }
});

export default router;
