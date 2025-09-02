// src/routes/adminProducts.ts

import { Router } from "express";
import { Role, VariantStatus } from "@prisma/client";
import { requireAuth } from "../middleware/auth";
import prisma from "../prisma/prisma";

const router = Router();

// all endpoints here require ADMIN
router.use(...requireAuth(Role.ADMIN));

/**
 * GET /admin/products
 * Filter Products by tenantId via query
 */
router.get("/products", async (req, res) => {
  const { tenantId } = req.query as { tenantId?: string };
  const where: any = {};
  if (tenantId) where.tenantId = tenantId;

  try {
    const products = await prisma.product.findMany({
      where,
      include: {
        tenant: { select: { id: true, businessName: true } },
        variants: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            color: true,
            size: true,
            price: true,
            stock: true,
            status: true, // moved to variant
            barcode: true,
            barcodeType: true,
            imageKey: true, // Option B (presigned GET)
            createdAt: true,
            updatedAt: true,
          },
        },
        logs: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

/**
 * GET /admin/products/:id/logs
 * Inventory change log for a single product
 * (unchanged; logs stay product-scoped with optional productVariantId)
 */
router.get("/products/:id/logs", async (req, res) => {
  const { id } = req.params;
  try {
    const logs = await prisma.inventoryLog.findMany({
      where: { productId: id },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true } } },
    });
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

/**
 * PUT /admin/variants/:id/approve
 * Replace the old product-approval with variant-approval.
 * Body: { approve: boolean }
 * Log uses the same "APPROVAL" changeType you were using before,
 * but now tied to the variant (via productVariantId).
 */
router.put("/variants/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { approve } = req.body as { approve?: boolean };

  if (approve == null) {
    res.status(400).json({ error: "approve is required (true|false)" });
    return;
  }

  const newStatus = approve ? VariantStatus.APPROVED : VariantStatus.REJECTED;

  try {
    // Get current status & productId for logging
    const existing = await prisma.productVariant.findUnique({
      where: { id },
      select: { status: true, productId: true },
    });
    if (!existing) {
      res.status(404).json({ error: "Variant not found" });
      return;
    }

    const updated = await prisma.productVariant.update({
      where: { id },
      data: { status: newStatus },
      select: {
        id: true,
        productId: true,
        color: true,
        size: true,
        status: true,
        updatedAt: true,
      },
    });

    // Keep the same log "shape"/semantics as before: changeType "APPROVAL"
    await prisma.inventoryLog.create({
      data: {
        productId: existing.productId,
        productVariantId: id,
        userId: req.user!.userId,
        changeType: "APPROVAL", // same label you used for product approval
        // you previously only wrote newValue; keeping that behavior
        newValue: newStatus,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Unable to update variant status" });
  }
});

export default router;
