// src/routes/admin.ts

import { Router } from "express";
import { Role, CubeStatus, ProductStatus } from "@prisma/client";
import { requireAuth } from "../middleware/auth";
import prisma from "../prisma/prisma";
import bcrypt from "bcrypt";

const router = Router();

// all admin endpoints need admin role
router.use(...requireAuth(Role.ADMIN));

/**
 * GET /admin/tenants-allocations
 * Returns all tenants, each with their user info and all their rentals (with cube details)
 */
router.get("/tenants-allocations", async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        // pull back the linked user’s basic info
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        // include every rental, and for each rental include its cube
        rentals: {
          include: {
            cube: true,
          },
        },
      },
    });

    res.json(tenants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch tenants and allocations" });
    return;
  }
});

/**
 * POST /admin/tenants
 * Create a new User(role=TENANT) + Tenant profile
 */
router.post("/add-tenant", async (req, res) => {
  const { name, email, password, phone, businessName, address, notes } =
    req.body;

  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: Role.TENANT,
        phone,
        tenants: { create: { businessName, address, notes } },
      },
      include: { tenants: true },
    });

    res.status(201).json(user);
    // implicit return void
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Unable to create tenant" });
    return;
  }
});

/**
 * POST /admin/rentals
 * Allocate (rent) an AVAILABLE cube to a tenant
 */
router.post("/tenant-cube-allocation", async (req, res) => {
  const { tenantId, cubeId, startDate, endDate } = req.body;

  try {
    const cube = await prisma.cube.findUnique({ where: { id: cubeId } });
    if (!cube || cube.status !== CubeStatus.AVAILABLE) {
      res.status(400).json({ error: "Cube not available" });
      return;
    }

    const rental = await prisma.rental.create({
      data: {
        tenantId,
        cubeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        monthlyRent: cube.pricePerMonth,
        allocatedById: req.user!.userId,
      },
    });

    await prisma.cube.update({
      where: { id: cubeId },
      data: { status: CubeStatus.RENTED },
    });

    res.status(201).json(rental);
    // implicit return void
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Unable to allocate cube" });
    return;
  }
});

/**
 * GET /admin/available-cubes
 * Admin views all cubes whose status = AVAILABLE
 */
router.get("/available-cubes", async (req, res) => {
  try {
    const cubes = await prisma.cube.findMany({
      where: { status: CubeStatus.AVAILABLE },
    });
    res.json(cubes);
    // implicit return void
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch available cubes" });
    return;
  }
});

/**
 * GET /admin/products
 * Optionally filter by tenantId via query
 */
router.get("/products", async (req, res) => {
  const { tenantId } = req.query;
  const where: any = {};
  if (tenantId) where.tenantId = tenantId;
  const products = await prisma.product.findMany({
    where,
    include: {
      tenant: { select: { id: true, businessName: true } },
      logs: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  res.json(products);
});

/**
 * PUT /admin/products/:id/approve
 * Approve or reject a pending product
 */
router.put("/products/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { approve } = req.body as { approve: boolean };

  const status = approve ? ProductStatus.APPROVED : ProductStatus.REJECTED;

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
});

/**
 * GET /admin/products/:id/logs
 * Inventory change log for a single product
 */
router.get("/products/:id/logs", async (req, res) => {
  const { id } = req.params;
  const logs = await prisma.inventoryLog.findMany({
    where: { productId: id },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true } } },
  });
  res.json(logs);
});

export default router;
