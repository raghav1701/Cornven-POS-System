// routes/variants.ts
import { Router, Request, Response } from "express";
import { Role } from "@prisma/client";
import prisma from "../prisma/prisma";
import { requireAuth } from "../middleware/auth";
import bwipjs from "bwip-js";
import { randomUUID } from "node:crypto";
import { presignPutUrl, s3 } from "../utils/s3"; // <- make sure utils/s3 exports `s3`
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const router = Router();
const BUCKET = process.env.S3_BUCKET!;

// helper: build the S3 object key in a tidy path
function buildObjectKey(ext: string) {
  return `product-variants/${randomUUID()}.${ext}`;
}

// ───────────────────────────────────────────────────────────────────────────────
// GET /variants/lookup?barcode=XXXX
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

// ───────────────────────────────────────────────────────────────────────────────
// GET /variants/:id/barcode.png  (server-rendered barcode image)
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
        bcid,
        text: v.barcode,
        scale: 3,
        height: 12,
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

// ───────────────────────────────────────────────────────────────────────────────
// STEP 1: Presigned PUT URL for uploading an image directly to S3 (private bucket)
// POST /variants/:id/image/upload-url { contentType, ext }
router.post(
  "/:id/image/upload-url",
  ...requireAuth(Role.TENANT, Role.ADMIN, Role.STAFF),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { contentType, ext } = req.body as {
        contentType?: string;
        ext?: string;
      };

      if (!contentType || !ext) {
        res.status(400).json({ error: "contentType and ext are required" });
        return;
      }
      // only allow images
      if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$/i.test(contentType)) {
        res.status(400).json({ error: "Invalid content type" });
        return;
      }

      // Load variant + ownership (tenant)
      const variant = await prisma.productVariant.findUnique({
        where: { id },
        select: {
          id: true,
          productId: true,
          product: { select: { tenantId: true } },
        },
      });
      if (!variant) {
        res.status(404).json({ error: "Variant not found" });
        return;
      }

      // Find the tenant's userId for ownership check
      const tenant = await prisma.tenant.findUnique({
        where: { id: variant.product.tenantId },
        select: { userId: true },
      });
      if (!tenant) {
        res.status(400).json({ error: "Tenant missing" });
        return;
      }
      // Only the owning tenant (or admins/staff) can upload
      if (req.user!.role === "TENANT" && tenant.userId !== req.user!.userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const key = buildObjectKey(ext.toLowerCase());
      const uploadUrl = await presignPutUrl({
        bucket: BUCKET,
        key,
        contentType,
        expiresIn: 60, // seconds
      });

      // Private bucket: return only upload URL + key (no public URL)
      res.json({ uploadUrl, key, expiresIn: 60 });
      return;
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create upload URL" });
      return;
    }
  }
);

// ───────────────────────────────────────────────────────────────────────────────
// STEP 2 (client does PUT to S3 with uploadUrl)

// ───────────────────────────────────────────────────────────────────────────────
// STEP 3: Commit uploaded image -> save imageKey in DB
// POST /variants/:id/image/commit { key }
router.post(
  "/:id/image/commit",
  ...requireAuth(Role.TENANT, Role.ADMIN, Role.STAFF),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { key } = req.body as { key?: string };

      if (!key) {
        res.status(400).json({ error: "key is required" });
        return;
      }

      // Load variant + ownership
      const variant = await prisma.productVariant.findUnique({
        where: { id },
        select: {
          id: true,
          imageKey: true,
          productId: true,
          product: { select: { tenantId: true } },
        },
      });
      if (!variant) {
        res.status(404).json({ error: "Variant not found" });
        return;
      }
      const tenant = await prisma.tenant.findUnique({
        where: { id: variant.product.tenantId },
        select: { userId: true },
      });
      if (!tenant) {
        res.status(400).json({ error: "Tenant missing" });
        return;
      }
      if (req.user!.role === "TENANT" && tenant.userId !== req.user!.userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      // TODO: if variant.imageKey exists and differs from `key`, optionally delete old S3 object.

      const updated = await prisma.productVariant.update({
        where: { id },
        data: { imageKey: key },
        select: {
          id: true,
          color: true,
          size: true,
          price: true,
          stock: true,
          imageKey: true,
        },
      });

      res.json(updated);
      return;
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Failed to commit image" });
      return;
    }
  }
);

// ───────────────────────────────────────────────────────────────────────────────
// NEW: Signed GET for private image
// GET /variants/:id/image-url  -> { url }
router.get(
  "/:id/image-url",
  ...requireAuth(Role.TENANT, Role.ADMIN, Role.STAFF),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const v = await prisma.productVariant.findUnique({
        where: { id },
        select: {
          imageKey: true,
          product: { select: { tenantId: true } },
        },
      });
      if (!v || !v.imageKey) {
        res.status(404).json({ error: "Image not found" });
        return;
      }

      // Ownership enforcement
      const tenant = await prisma.tenant.findUnique({
        where: { id: v.product.tenantId },
        select: { userId: true },
      });
      if (req.user!.role === "TENANT" && tenant?.userId !== req.user!.userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: v.imageKey });
      const url = await getSignedUrl(s3, cmd, { expiresIn: 60 }); // 60s signed GET
      res.json({ url });
      return;
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to sign image URL" });
      return;
    }
  }
);

export default router;
