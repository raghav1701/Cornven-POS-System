// src/routes/admin.ts

import { Router } from "express";
import { Role, CubeStatus } from "@prisma/client";
import { requireAuth } from "../middleware/auth";
import prisma from "../prisma/prisma";
import bcrypt from "bcrypt";

const router = Router();

// all admin endpoints need admin role
router.use(...requireAuth(Role.ADMIN));

/**
 * POST /admin/tenants
 * Create a new User(role=TENANT) + Tenant profile
 */
router.post("/tenants", async (req, res) => {
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
router.post("/rentals", async (req, res) => {
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

export default router;
