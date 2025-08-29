// routes/variants.ts
import { Router, Request, Response } from "express";
import { Role } from "@prisma/client";
import prisma from "../prisma/prisma";
import { requireAuth } from "../middleware/auth";
import bwipjs from "bwip-js";

const router = Router();

router.get(
  "/lookup",
  ...requireAuth(Role.ADMIN, Role.STAFF, Role.TENANT),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const barcode = (req.query.barcode as string | undefined)?.trim() ?? "";
      if (!barcode) {
        res.status(400).json({ error: "barcode is required" });
        return;
      }

      const variant = await prisma.productVariant.findUnique({
        where: { barcode },
        include: {
          product: {
            select: { id: true, name: true, category: true, tenantId: true },
          },
        },
      });

      if (!variant) {
        res.status(404).json({ error: "Variant not found" });
        return;
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: variant.product.tenantId },
        select: { id: true, businessName: true },
      });

      res.json({
        id: variant.id,
        productId: variant.productId,
        productName: variant.product.name,
        category: variant.product.category,
        color: variant.color,
        size: variant.size,
        price: variant.price,
        stock: variant.stock,
        sku: variant.sku,
        barcode: variant.barcode,
        barcodeType: variant.barcodeType,
        tenant,
      });
      return;
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Lookup failed" });
      return;
    }
  }
);

router.get(
  "/:id/barcode.png",
  ...requireAuth(Role.ADMIN, Role.STAFF, Role.TENANT),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const v = await prisma.productVariant.findUnique({
        where: { id },
        select: { barcode: true, barcodeType: true },
      });
      if (!v) {
        res.status(404).json({ error: "Variant not found" });
        return;
      }

      const bcid = v.barcodeType === "EAN13" ? "ean13" : "code128";
      const png = await bwipjs.toBuffer({
        bcid, // Barcode type
        text: v.barcode, // Barcode text
        scale: 3, // 3x scaling
        height: 12, // bar height (mm-ish)
        includetext: true,
        textxalign: "center",
        textsize: 12,
      });

      res.setHeader("Content-Type", "image/png");
      res.send(png);
      return;
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to render barcode" });
      return;
    }
  }
);

export default router;
