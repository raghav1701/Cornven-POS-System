// routes/debug.ts
import { Router } from "express";
import prisma from "../prisma/prisma";
import { requireAuth } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();
router.get("/_dbinfo", ...requireAuth(Role.ADMIN), async (_req, res) => {
  const [row] = await prisma.$queryRaw<
    Array<{
      db: string;
      schema: string;
      host: string | null;
      port: number | null;
    }>
  >`SELECT current_database() AS db,
           current_schema()   AS schema,
           inet_server_addr()::text AS host,
           inet_server_port()      AS port`;
  res.json({
    env: process.env.VERCEL_ENV || process.env.NODE_ENV,
    databaseUrlHost: (() => {
      try {
        return new URL(process.env.DATABASE_URL!).host;
      } catch {
        return "unavailable";
      }
    })(),
    info: row,
  });
});

export default router;
