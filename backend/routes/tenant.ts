// src/routes/tenant.ts

import { Router } from "express";
import { Role, RentalStatus } from "@prisma/client";
import { requireAuth } from "../middleware/auth";
import prisma from "../prisma/prisma";

const router = Router();

// apply tenant-only guard to *all* tenant routes
router.use(...requireAuth(Role.TENANT));

router.get("/my-cube", async (req, res) => {
  try {
    // 1. Look up the Tenant record
    const tenant = await prisma.tenant.findFirst({
      where: { userId: req.user!.userId },
    });
    if (!tenant) {
      res.status(404).json({ error: "Tenant profile not found" });
      return;
    }

    // 2. Find their ACTIVE rental
    const rental = await prisma.rental.findFirst({
      where: {
        tenantId: tenant.id,
        status: RentalStatus.ACTIVE,
      },
      include: { cube: true },
    });
    if (!rental) {
      res.status(404).json({ error: "No active cube rental" });
      return;
    }

    // 3. Send it back
    res.json(rental);
    // (no return here)
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch your cube" });
    // (no return needed in catch either)
  }
});

export default router;
