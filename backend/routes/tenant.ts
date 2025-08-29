// src/routes/tenant.ts

import { Router } from "express";
import {
  Role,
  InventoryChangeType,
  ProductStatus,
  BarcodeType,
} from "@prisma/client";
import { summarizeRental } from "../utils/billing";
import { requireAuth } from "../middleware/auth";
import prisma from "../prisma/prisma";
import { recomputeProductAggregates } from "../utils/products";
import {
  generateBarcode as genBC,
  generateBarcode,
  validateBarcode as valBC,
  validateBarcode,
} from "../utils/barcode";
import { randomBytes } from "node:crypto";

const router = Router();

// apply tenant-only guard to *all* tenant routes
router.use(...requireAuth(Role.TENANT));

function fallbackGenerateBarcode(type: BarcodeType = "CODE128") {
  // 20-char A–Z0–9, scanner-friendly, high entropy
  const bytes = randomBytes(16);
  return bytes
    .toString("base64") // base64 => A–Z a–z 0–9 + / =
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "") // keep only A–Z 0–9
    .slice(0, 20);
}

function fallbackValidateBarcode(
  value: string,
  _type: BarcodeType = "CODE128"
) {
  return /^[A-Z0-9\-_.]{6,32}$/.test(value);
}

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
  const { name, description, category, sku, variants } = req.body as {
    name: string;
    description?: string;
    category?: string;
    sku?: string;
    variants: Array<{
      color: string;
      size: string;
      price: number;
      stock: number;
      sku?: string;
    }>;
  };

  try {
    if (!name || !Array.isArray(variants) || variants.length === 0) {
      res
        .status(400)
        .json({ error: "name and at least one variant are required" });
      return;
    }
    for (const v of variants) {
      if (
        !v.color ||
        !v.size ||
        typeof v.price !== "number" ||
        typeof v.stock !== "number"
      ) {
        res
          .status(400)
          .json({ error: "Each variant needs color, size, price, stock" });
        return;
      }
    }

    const productPrice = Math.min(...variants.map((v) => v.price));
    const productStock = variants.reduce((s, v) => s + v.stock, 0);

    // Create the product with server-generated barcodes for variants
    const product = await prisma.product.create({
      data: {
        tenant: { connect: { userId: req.user!.userId } },
        name,
        description,
        category,
        sku,
        price: productPrice,
        stock: productStock,
        variants: {
          create: variants.map((v) => ({
            color: v.color,
            size: v.size,
            price: v.price,
            stock: v.stock,
            sku: v.sku,
            barcode: generateBarcode("CODE128"),
            barcodeType: "CODE128",
          })),
        },
        status: ProductStatus.PENDING,
        logs: {
          create: [
            {
              user: { connect: { id: req.user!.userId } },
              changeType: InventoryChangeType.SUBMISSION,
              previousValue: null,
              newValue: JSON.stringify({ variants }),
            },
          ],
        },
      },
      include: { variants: true },
    });

    res.status(201).json(product);
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2002") {
      res
        .status(409)
        .json({ error: "Duplicate constraint (SKU or color+size or barcode)" });
    } else if (err.code === "P2003") {
      res.status(400).json({ error: "Tenant profile not found" });
    } else {
      res.status(500).json({ error: "Failed to submit product" });
    }
  }
});

// PUT /tenant/products/:id
router.put("/products/:id", async (_req, res) => {
  res.status(410).json({
    error: "This endpoint is deprecated. Edit price/stock via variants.",
    use: "PUT /tenant/products/:productId/variants/:variantId",
  });
});

// POST /tenant/products/:productId/variants
router.post("/products/:productId/variants", async (req, res) => {
  const { productId } = req.params;
  const { color, size, price, stock, sku } = req.body as {
    color: string;
    size: string;
    price: number;
    stock: number;
    sku?: string;
  };

  try {
    const prod = await prisma.product.findUnique({
      where: { id: productId },
      select: { tenant: { select: { userId: true } } },
    });
    if (!prod || prod.tenant.userId !== req.user!.userId) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    // Always generate on server
    let code = generateBarcode("CODE128");
    let variant = null;
    let tries = 0;
    while (tries < 5) {
      try {
        variant = await prisma.productVariant.create({
          data: {
            productId,
            color,
            size,
            price,
            stock,
            sku,
            barcode: code,
            barcodeType: "CODE128",
          },
        });
        break;
      } catch (e: any) {
        if (
          e.code === "P2002" &&
          String(e.meta?.target || "").includes("barcode")
        ) {
          code = generateBarcode("CODE128");
          tries++;
          continue;
        }
        if (e.code === "P2002") {
          res.status(409).json({
            error: "Variant already exists (duplicate sku or color+size)",
          });
          return;
        }
        throw e;
      }
    }
    if (!variant) {
      res
        .status(500)
        .json({ error: "Failed to create variant (barcode collision)" });
      return;
    }

    await prisma.$transaction([
      prisma.inventoryLog.create({
        data: {
          productId,
          productVariantId: variant.id,
          userId: req.user!.userId,
          changeType: InventoryChangeType.VARIANT_CREATE,
          previousValue: null,
          newValue: JSON.stringify({
            color,
            size,
            price,
            stock,
            sku,
            barcode: variant.barcode,
          }),
        },
      }),
      prisma.inventoryLog.create({
        data: {
          productId,
          productVariantId: variant.id,
          userId: req.user!.userId,
          changeType: InventoryChangeType.VARIANT_BARCODE_SET,
          previousValue: null,
          newValue: variant.barcode,
        },
      }),
    ]);

    // If you maintain product-level aggregates:
    // await recomputeProductAggregates(productId);

    res.status(201).json(variant);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to create variant" });
  }
});

/**
 * PUT /tenant/products/:productId/variants/:variantId
 * Update a specific variant’s price/stock
 */
router.put("/products/:productId/variants/:variantId", async (req, res) => {
  const { productId, variantId } = req.params;
  const { price, stock } = req.body as { price?: number; stock?: number };

  try {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: {
        id: true,
        price: true,
        stock: true,
        product: { select: { id: true, tenant: { select: { userId: true } } } },
      },
    });
    if (
      !variant ||
      variant.product.id !== productId ||
      variant.product.tenant.userId !== req.user!.userId
    ) {
      res.status(404).json({ error: "Variant not found" });
      return;
    }

    const updates: Record<string, any> = {};
    const logs: any[] = [];

    if (price != null && price !== variant.price) {
      updates.price = price;
      logs.push({
        productId,
        productVariantId: variantId,
        userId: req.user!.userId,
        changeType: InventoryChangeType.VARIANT_PRICE_UPDATE,
        previousValue: variant.price.toString(),
        newValue: price.toString(),
      });
    }
    if (stock != null && stock !== variant.stock) {
      updates.stock = stock;
      logs.push({
        productId,
        productVariantId: variantId,
        userId: req.user!.userId,
        changeType: InventoryChangeType.VARIANT_STOCK_UPDATE,
        previousValue: variant.stock.toString(),
        newValue: stock.toString(),
      });
    }

    if (!Object.keys(updates).length) {
      res.status(400).json({ error: "No changes to apply" });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.productVariant.update({
        where: { id: variantId },
        data: updates,
      });
      if (logs.length) await tx.inventoryLog.createMany({ data: logs });
      await recomputeProductAggregates(productId);
      return u;
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to update variant" });
  }
});

/**
 * DELETE /tenant/products/:productId/variants/:variantId
 * Delete variant (forbid deleting the last one)
 */
//
router.delete("/products/:productId/variants/:variantId", async (req, res) => {
  const { productId, variantId } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { tenant: true, variants: { select: { id: true } } },
    });
    if (!product || product.tenant.userId !== req.user!.userId) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    if (product.variants.length <= 1) {
      res.status(400).json({ error: "Cannot delete the last variant" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.productVariant.delete({ where: { id: variantId } });
      await recomputeProductAggregates(productId);
    });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to delete variant" });
  }
});

/**
 * GET /tenant/products
 * List all of your products (with status)
 */
router.get("/products", async (req, res) => {
  const products = await prisma.product.findMany({
    where: { tenant: { userId: req.user!.userId } },
    include: {
      variants: { orderBy: { createdAt: "asc" } },
      logs: { orderBy: { createdAt: "asc" } },
    },
  });
  res.json(products);
});

/**
 * GET /tenant/my-billing
 * Returns the active (or upcoming) rental with computed balance and payments
 */
router.get("/my-billing", async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    if (!tenant) {
      res.status(404).json({ error: "Tenant profile not found" });
      return;
    }

    const rental = await prisma.rental.findFirst({
      where: {
        tenantId: tenant.id,
        // include both ACTIVE and UPCOMING (tenants might want to prepay)
        status: { in: ["ACTIVE", "UPCOMING"] },
      },
      include: { cube: true },
      orderBy: { startDate: "desc" },
    });
    if (!rental) {
      res.status(404).json({ error: "No current rental" });
      return;
    }

    const payments = await prisma.payment.findMany({
      where: { rentalId: rental.id },
      orderBy: { paidAt: "desc" },
    });
    const summary = summarizeRental(rental as any, payments);

    res.json({ rental, payments, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch billing" });
  }
});

/**
 * GET /tenant/my-payments
 * Quick listing of the tenant’s payment history (across all rentals)
 */
router.get("/my-payments", async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    if (!tenant) {
      res.status(404).json({ error: "Tenant profile not found" });
      return;
    }

    const rentals = await prisma.rental.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, startDate: true, endDate: true },
    });
    const rentalIds = rentals.map((r) => r.id);

    const payments = await prisma.payment.findMany({
      where: { rentalId: { in: rentalIds } },
      orderBy: { paidAt: "desc" },
    });

    res.json({ rentals, payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

export default router;
