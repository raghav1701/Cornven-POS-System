// src/app.ts

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { json, urlencoded } from "body-parser";
import dotenv from "dotenv";

import authRouter from "./routes/auth";
import adminTenantsRouter from "./routes/adminTenants";
import adminProductsRouter from "./routes/adminProducts";
import tenantRouter from "./routes/tenant";
import adminBillingRouter from "./routes/adminBilling";
import variantsRouter from "./routes/variants";
import { stockMonitorService } from "./services/stockMonitorService";
import { emailService } from "./services/emailService";

dotenv.config();
const PORT = Number(process.env.PORT) || 3001;

async function bootstrap() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: [
        "https://cornven.vercel.app/",
        "http://localhost:3000",
        "cornven-pos-system.vercel.app/",
      ],
      credentials: true,
    })
  );
  app.use(json());
  app.use(urlencoded({ extended: true }));

  // ─── Request Logger ─────────────────────────────────────────────────────────────
  app.use((req, res, next) => {
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
    );
    next();
  });

  // ─── Route Mounts ────────────────────────────────────────────────────────────────
  app.use("/auth", authRouter);
  app.use("/admin", adminTenantsRouter);
  app.use("/admin", adminProductsRouter);
  app.use("/tenant", tenantRouter);
  app.use("/admin", adminBillingRouter);
  app.use("/variants", variantsRouter);

  // ─── Initialize Email Service ────────────────────────────────────────────────────
  try {
    await emailService.initialize();
  } catch (error) {
    console.error('❌ Failed to initialize email service:', error);
  }

  // ─── Start Automatic Stock Monitoring ───────────────────────────────────────────
  try {
    await stockMonitorService.start();
  } catch (error) {
    console.error('❌ Failed to start stock monitoring service:', error);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
