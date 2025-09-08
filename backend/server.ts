// server.ts
import app from "./app";
import { stockMonitorService } from "./services/stockMonitorService";
import { emailService } from "./services/emailService";

const PORT = Number(process.env.PORT) || 3001;

(async () => {
  try {
    await emailService.initialize();
    // It’s OK to run timers in a long-lived local server:
    await stockMonitorService.start();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start:", err);
    process.exit(1);
  }
})();
