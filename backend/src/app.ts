// src/app.ts

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { json, urlencoded } from "body-parser";

const PORT = 3001;

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

    app.listen(PORT);
  } catch {
    process.exit(1);
  }
}

bootstrap();
