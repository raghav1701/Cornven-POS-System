// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { json, urlencoded } from "body-parser";

import authRouter from "./routes/auth";
import adminTenantsRouter from "./routes/adminTenants";
import adminProductsRouter from "./routes/adminProducts";
import tenantRouter from "./routes/tenant";
import adminBillingRouter from "./routes/adminBilling";
import variantsRouter from "./routes/variants";
// Email/stock services disabled to avoid build/runtime issues on Vercel
// import { stockMonitorService } from "./services/stockMonitorService";
// import { emailService } from "./services/emailService";
import posRouter from "./routes/pos";

const app = express();

// ─── Security & Parsers ───────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: [
      "https://cornven.vercel.app",
      "http://localhost:3000",
      "https://cornven-pos-system.vercel.app",
    ],
    credentials: true,
  })
);
app.use(json());
app.use(urlencoded({ extended: true }));

// ─── Request Logger ───────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────────
app.use("/auth", authRouter);
app.use("/admin", adminTenantsRouter);
app.use("/admin", adminProductsRouter);
app.use("/tenant", tenantRouter);
app.use("/admin", adminBillingRouter);
app.use("/variants", variantsRouter);
app.use("/pos", posRouter);

// ─── Email/Stock services intentionally NOT started here ──────────────────────────
// (keep these commented to avoid Vercel build/runtime issues)
//
// try { await emailService.initialize(); } catch (e) { console.error(e); }
// try { await stockMonitorService.start(); } catch (e) { console.error(e); }

export default app;
