// routes/debug.ts
import { Router } from "express";
import prisma from "../prisma/prisma";
import { requireAuth } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();
router.get("/_counts", ...requireAuth(Role.ADMIN), async (_req, res) => {
  const [users, tenants, cubes, rentals, products, logs] = await Promise.all([
    prisma.user.count(),
    prisma.tenant.count(),
    prisma.cube.count(),
    prisma.rental.count(),
    prisma.product.count(),
    prisma.inventoryLog.count(),
  ]);
  res.json({ users, tenants, cubes, rentals, products, logs });
});

router.get("/_recent", ...requireAuth(Role.ADMIN), async (_req, res) => {
  const [products, inv] = await Promise.all([
    prisma.product.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.inventoryLog.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  res.json({ products, inventory: inv });
});

export default router;
