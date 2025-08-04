// src/app.ts

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { json, urlencoded } from "body-parser";

<<<<<<< Updated upstream
const PORT = 3001;
=======
import authRouter from "../routes/auth";
import adminRouter from "../routes/admin";
import tenantRouter from "../routes/tenant";

dotenv.config();

const PORT = process.env.PORT || 3001;
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
    app.listen(PORT);
  } catch {
=======
    app.use((req, _res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });

    app.use("/auth", authRouter);
    app.use("/tenant", tenantRouter);
    app.use("/admin", adminRouter);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Error starting server:", err);
>>>>>>> Stashed changes
    process.exit(1);
  }
}

bootstrap();
