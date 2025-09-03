// src/routes/tenant.ts
import { Router } from "express";
import { Role, InventoryChangeType, BarcodeType } from "@prisma/client";
import { summarizeRental } from "../utils/billing";
import { requireAuth } from "../middleware/auth";
import prisma from "../prisma/prisma";
import { generateBarcode } from "../utils/barcode";
import { stockUpdateService } from "../services/stockUpdateService";

const router = Router();

// apply tenant-only guard to *all* tenant routes
router.use(...requireAuth(Role.TENANT));

/**
 * GET /tenant/my-details
 * Returns logged-in tenant details
 */
router.get("/my-details", async (req, res) => {
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { userId: req.user!.userId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        rentals: {
          include: { cube: true },
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
 * GET /tenant/products
 * List all of your products with variants & logs
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
 * POST /tenant/products
 * Submit a new product with variants (server generates barcodes for variants)
 */
router.post("/products", async (req, res) => {
  const { name, description, category, variants } = req.body as {
    name: string;
    description?: string;
    category?: string;
    variants: Array<{
      color: string;
      size: string;
      price: number;
      stock: number;
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

    const product = await prisma.product.create({
      data: {
        tenant: { connect: { userId: req.user!.userId } },
        name,
        description,
        category,
        variants: {
          create: variants.map((v) => ({
            color: v.color,
            size: v.size,
            price: v.price,
            stock: v.stock,
            barcode: generateBarcode("CODE128"),
            barcodeType: "CODE128",
            // VariantStatus has default in schema; no need to set here unless you want to
          })),
        },
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
      // Unique violation: likely duplicate (productId,color,size) or barcode
      res.status(409).json({
        error: "Duplicate constraint (color+size per product or barcode)",
      });
    } else if (err.code === "P2003") {
      res.status(400).json({ error: "Tenant profile not found" });
    } else {
      res.status(500).json({ error: "Failed to submit product" });
    }
  }
});

/**
 * POST /tenant/products/:productId/variants
 * Create a new variant (barcode generated server-side)
 */
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

    // generate a unique barcode (retry on rare collision)
    let code = generateBarcode("CODE128");
    let variant = null as null | { id: string; barcode: string };
    for (let tries = 0; tries < 5; tries++) {
      try {
        variant = await prisma.productVariant.create({
          data: {
            productId,
            color,
            size,
            price,
            stock,
            barcode: code,
            barcodeType: "CODE128",
          },
          select: { id: true, barcode: true },
        });
        break;
      } catch (e: any) {
        if (
          e.code === "P2002" &&
          String(e.meta?.target || "").includes("barcode")
        ) {
          code = generateBarcode("CODE128"); // new attempt
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

    // single log entry only
    await prisma.inventoryLog.create({
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
    });

    // return the created variant
    const full = await prisma.productVariant.findUnique({
      where: { id: variant.id },
    });
    res.status(201).json(full);
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

    // Product-level aggregates no longer exist; just update variant + logs
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.productVariant.update({
        where: { id: variantId },
        data: updates,
      });
      if (logs.length) await tx.inventoryLog.createMany({ data: logs });
      return u;
    });

    // Check for low stock and send email notification if stock was updated
    if (stock != null && stock !== variant.stock) {
      try {
        await stockUpdateService.updateStock({
          variantId,
          newStock: stock,
          reason: 'manual_update'
        });
      } catch (emailError) {
        console.error('Failed to send stock alert email:', emailError);
        // Don't fail the request if email fails
      }
    }

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
// DELETE /tenant/products/:productId/variants/:variantId
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
      // load the variant we’re deleting (to capture current status)
      const v = await tx.productVariant.findUnique({
        where: { id: variantId },
        select: { id: true, status: true },
      });
      if (!v) {
        throw new Error("Variant not found");
      }

      // write a deletion log (reusing VARIANT_STATUS_UPDATE)
      await tx.inventoryLog.create({
        data: {
          productId,
          productVariantId: variantId,
          userId: req.user!.userId,
          changeType: InventoryChangeType.VARIANT_STATUS_UPDATE,
          previousValue: v.status, // e.g. "PENDING" | "APPROVED" | "REJECTED"
          newValue: "DELETED", // marker string; no enum/migration needed
        },
      });

      // delete the variant
      await tx.productVariant.delete({ where: { id: variantId } });
    });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to delete variant" });
  }
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
;

export default router;
