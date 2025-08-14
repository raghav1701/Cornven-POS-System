// src/routes/adminProducts.ts

import { Router } from "express";
import { Role, ProductStatus } from "@prisma/client";
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
  const { tenantId } = req.query;
  const where: any = {};
  if (tenantId) where.tenantId = tenantId as string;
  try {
    const products = await prisma.product.findMany({
      where,
      include: {
        tenant: { select: { id: true, businessName: true } },
        variants: { orderBy: { createdAt: "asc" } }, // ← add this
        logs: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

/**
 * PUT /admin/products/:id/approve
 * Approve or reject a pending product
 */
router.put("/products/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { approve } = req.body as { approve: boolean };
  const status = approve ? ProductStatus.APPROVED : ProductStatus.REJECTED;

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        status,
        logs: {
          create: {
            userId: req.user!.userId,
            changeType: "APPROVAL",
            newValue: status,
          },
        },
      },
    });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Unable to update product status" });
  }
});

/**
 * GET /admin/products/:id/logs
 * Inventory change log for a single product
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

export default router;
