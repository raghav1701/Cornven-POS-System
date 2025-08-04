import express from "express";
import cors from "cors";
import helmet from "helmet";
import { json, urlencoded } from "body-parser";
import dotenv from "dotenv";

// assuming this file is src/app.ts and routes are in src/routes/auth.ts:
import authRouter from "../routes/auth";

dotenv.config();

const PORT = process.env.PORT || 3001;

async function bootstrap() {
  try {
    const app = express();

    app.use(helmet());
    app.use(
      cors({
        origin: ["http://localhost:3000"],
        credentials: true,
      })
    );
    app.use(json());
    app.use(urlencoded({ extended: true }));

    app.use((req, _res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });

    app.use("/auth", authRouter);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
}

bootstrap();
