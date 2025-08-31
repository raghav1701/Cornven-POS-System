// src/routes/adminTenants.ts

import { Router } from "express";
import { Role, CubeStatus, RentalStatus } from "@prisma/client";
import { requireAuth } from "../middleware/auth";
import prisma from "../prisma/prisma";
import bcrypt from "bcrypt";

const router = Router();

// all endpoints here require ADMIN
router.use(...requireAuth(Role.ADMIN));

/**
 * GET /admin/tenants-allocations
 * Returns all tenants, each with their user info and rentals (with cube details)
 */
router.get("/tenants-allocations", async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        rentals: { include: { cube: true } },
      },
    });
    
    res.json(tenants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch tenants and allocations" });
  }
});

/**
 * POST /admin/add-tenant
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
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Unable to create tenant" });
  }
});

/**
 * POST /admin/tenant-cube-allocation
 * Allocate (rent) an AVAILABLE cube to a tenant
 */
router.post("/tenant-cube-allocation", async (req, res) => {
  const { tenantId, cubeId, startDate, endDate } = req.body;

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ error: "Invalid startDate or endDate" });
      return;
    }
    if (end <= start) {
      res.status(400).json({ error: "endDate must be after startDate" });
      return;
    }

    const cube = await prisma.cube.findUnique({ where: { id: cubeId } });
    if (!cube || cube.status !== CubeStatus.AVAILABLE) {
      res.status(400).json({ error: "Cube not available" });
      return;
    }

    const rental = await prisma.rental.create({
      data: {
        tenantId,
        cubeId,
        startDate: start,
        endDate: end,
        status: RentalStatus.UPCOMING, // Default status, will be calculated on frontend
        dailyRent: cube.pricePerDay,
        allocatedById: req.user!.userId,
      },
    });

    await prisma.cube.update({
      where: { id: cubeId },
      data: { status: CubeStatus.RENTED },
    });

    res.status(201).json(rental);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Unable to allocate cube" });
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch available cubes" });
  }
});

export default router;
