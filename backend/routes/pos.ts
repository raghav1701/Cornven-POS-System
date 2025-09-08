// src/routes/pos.ts
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import prisma from "../prisma/prisma";
import { stockUpdateService } from "../services/stockUpdateService";

const router = Router();

const CheckoutSchema = z.object({
  idempotencyKey: z.string().min(8),
  tenantId: z.string(),
  cashierUserId: z.string().optional(),
  currency: z.string().default("AUD"),
  items: z
    .array(
      z.object({
        variantId: z.string(),
        quantity: z.number().int().positive(),
        unitPriceCents: z.number().int().nonnegative(),
        discountCents: z.number().int().nonnegative().default(0),
        taxCents: z.number().int().nonnegative().default(0),
      })
    )
    .min(1),
  payments: z
    .array(
      z.object({
        method: z.enum(["CASH", "CARD", "BANK_TRANSFER", "UPI", "OTHER"]),
        amountCents: z.number().int().positive(),
        provider: z.string().optional(),
        providerIntent: z.string().optional(),
      })
    )
    .min(1),
});

router.post("/checkout", async (req: Request, res: Response): Promise<void> => {
  const body = CheckoutSchema.parse(req.body);

  const existing = await prisma.sale.findUnique({
    where: { idempotencyKey: body.idempotencyKey },
    include: { items: true, payments: true },
  });
  if (existing) {
    res.status(200).json(existing);
    return;
  }

  const subtotal = body.items.reduce(
    (s, it) => s + it.unitPriceCents * it.quantity,
    0
  );
  const discount = body.items.reduce(
    (s, it) => s + it.discountCents * it.quantity,
    0
  );
  const tax = body.items.reduce((s, it) => s + it.taxCents * it.quantity, 0);
  const total = subtotal - discount + tax;

  const paid = body.payments.reduce((s, p) => s + p.amountCents, 0);
  if (paid !== total) {
    res.status(400).json({ error: "Payments must equal total amount." });
    return;
  }

  const impactedVariantIds: string[] = [];

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const variants = await tx.productVariant.findMany({
        where: { id: { in: body.items.map((i) => i.variantId) } },
        include: { product: { include: { tenant: true } } },
      });
      const vmap = new Map(variants.map((v) => [v.id, v]));

      for (const it of body.items) {
        const v = vmap.get(it.variantId);
        if (!v) throw new Error(`Variant ${it.variantId} not found`);
        if (!v.product.tenant || v.product.tenant.id !== body.tenantId) {
          throw new Error(
            `Variant ${it.variantId} not in tenant ${body.tenantId}`
          );
        }

        const updated = await tx.productVariant.updateMany({
          where: { id: v.id, stock: { gte: it.quantity } },
          data: { stock: { decrement: it.quantity } },
        });
        if (updated.count === 0)
          throw new Error(`Insufficient stock for variant ${v.id}`);

        impactedVariantIds.push(v.id);

        await tx.inventoryLog.create({
          data: {
            productId: v.productId,
            productVariantId: v.id,
            userId: body.cashierUserId ?? v.product.tenant.userId,
            changeType: "SALE",
            previousValue: String(v.stock),
            newValue: String(v.stock - it.quantity),
          },
        });
      }

      const createdSale = await tx.sale.create({
        data: {
          idempotencyKey: body.idempotencyKey,
          tenantId: body.tenantId,
          cashierUserId: body.cashierUserId ?? null,
          currency: body.currency,
          subtotalCents: subtotal,
          discountCents: discount,
          taxCents: tax,
          totalCents: total,
          status: "COMPLETED",
          items: {
            create: body.items.map((it) => {
              const v: any = vmap.get(it.variantId)!;
              return {
                productId: v.productId,
                variantId: v.id,
                quantity: it.quantity,
                unitPriceCents: it.unitPriceCents,
                discountCents: it.discountCents ?? 0,
                taxCents: it.taxCents ?? 0,
                lineTotalCents:
                  (it.unitPriceCents -
                    (it.discountCents ?? 0) +
                    (it.taxCents ?? 0)) *
                  it.quantity,
                barcode: v.barcode ?? null,
                productName: v.product.name,
                variantName: `${v.color}${v.color && v.size ? " - " : ""}${
                  v.size
                }`,
              };
            }),
          },
        },
        include: { items: true },
      });

      for (const p of body.payments) {
        await tx.salePayment.create({
          data: {
            saleId: createdSale.id,
            method: p.method,
            status: "CAPTURED",
            amountCents: p.amountCents,
            provider: p.provider ?? null,
            providerIntent: p.providerIntent ?? null,
          },
        });
      }

      return createdSale;
    });

    // Fire-and-forget alerts AFTER COMMIT
    (async () => {
      const unique = Array.from(new Set(impactedVariantIds));
      for (const variantId of unique) {
        try {
          await stockUpdateService.triggerAlertIfNeeded(variantId);
        } catch (e) {
          console.error("post-checkout alert error:", e);
        }
      }
    })();

    res.status(201).json(sale);
    return;
  } catch (e: any) {
    const msg = e?.message ?? "Checkout failed";
    const code = /Insufficient stock/i.test(msg) ? 409 : 500;
    res.status(code).json({ error: msg });
    return;
  }
});

router.get(
  "/sales/:id",
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: { items: true, payments: true, tenant: true, cashier: true },
    });
    if (!sale) {
      res.status(404).json({ error: "Sale not found" });
      return;
    }
    res.json(sale);
  }
);

export default router;
