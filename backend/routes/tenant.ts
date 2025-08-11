// src/routes/tenant.ts

import { Router } from "express";
import { Role, InventoryChangeType, ProductStatus } from "@prisma/client";
import { requireAuth } from "../middleware/auth";
import prisma from "../prisma/prisma";

const router = Router();

// apply tenant-only guard to *all* tenant routes
router.use(...requireAuth(Role.TENANT));

/**
 * GET /tenant/my-details
 * Returns loggedIn tenant details
 */
router.get("/my-details", async (req, res) => {
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { userId: req.user!.userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        rentals: {
          // If you only want their *current*/active rental, uncomment the `where`:
          // where: { status: RentalStatus.ACTIVE },
          include: {
            cube: true,
          },
        },
      },
    });

    if (!tenant) {
      res.status(404).json({ error: "Tenant profile not found" });
      return;
    }

    res.json(tenant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch tenant details" });
  }
});

/**
 * POST /tenant/products
 * Submit a new product for approval
 */
router.post("/products", async (req, res) => {
  const { name, description, price, stock, category, sku } = req.body;

  try {
    // Create product and link to the Tenant via the unique userId
    const product = await prisma.product.create({
      data: {
        tenant: {
          connect: { userId: req.user!.userId },
        },
        name,
        description,
        price,
        stock,
        category,
        sku,
        status: ProductStatus.PENDING,
        logs: {
          create: {
            userId: req.user!.userId,
            changeType: InventoryChangeType.SUBMISSION,
            previousValue: null,
            newValue: JSON.stringify({ price, stock }),
          },
        },
      },
    });

    res.status(201).json(product);
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2003") {
      // FK violation
      res.status(400).json({ error: "Tenant profile not found" });
    } else if (err.code === "P2002" && err.meta?.target?.includes("sku")) {
      // unique constraint on sku
      res.status(409).json({ error: "SKU already in use" });
    } else {
      res.status(500).json({ error: "Failed to submit product" });
    }
  }
});

/**
 * PUT /tenant/products/:id
 * Update stock and/or price for an existing product
 */
// PUT /tenant/products/:id
router.put("/products/:id", async (req, res) => {
  const { id } = req.params;
  const { price, stock } = req.body;
  const who = req.user!; // { userId: string, role: Role }

  try {
    // NOTE: we select the relation `tenant` -> { userId }
    const existing = await prisma.product.findUnique({
      where: { id },
      select: {
        price: true,
        stock: true,
        tenant: { select: { userId: true } },
      },
    });

    if (!existing || existing.tenant.userId !== who.userId) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const updates: Record<string, any> = {};
    const logsData: any[] = [];

    if (price != null && price !== existing.price) {
      updates.price = price;
      logsData.push({
        userId: who.userId,
        changeType: InventoryChangeType.PRICE_UPDATE,
        previousValue: existing.price.toString(),
        newValue: price.toString(),
      });
    }
    if (stock != null && stock !== existing.stock) {
      updates.stock = stock;
      logsData.push({
        userId: who.userId,
        changeType: InventoryChangeType.STOCK_UPDATE,
        previousValue: existing.stock.toString(),
        newValue: stock.toString(),
      });
    }

    if (!Object.keys(updates).length) {
      res.status(400).json({ error: "No changes to apply" });
      return;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { ...updates, logs: { create: logsData } },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to update product" });
  }
});

/**
 * GET /tenant/products
 * List all of your products (with status)
 */
router.get("/products", async (req, res) => {
  const products = await prisma.product.findMany({
    where: { tenantId: req.user!.userId },
    include: { logs: { orderBy: { createdAt: "asc" } } },
  });
  res.json(products);
});

export default router;
