import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth.routes.js";
import { expenseRouter } from "./routes/expense.routes.js";
import { gameRouter } from "./routes/game.routes.js";
import { jobRouter } from "./routes/job.routes.js";
import { leaderboardRouter } from "./routes/leaderboard.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { sendSuccess } from "./utils/response.js";

export const app = express();

const allowedOrigins = new Set(
  env.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      logger.warn("CORS origin rejected", { origin });
      callback(new Error(`CORS origin not allowed: ${origin}`));
    }
  })
);
app.use(express.json());

app.use((req, res, next) => {
  const startedAt = Date.now();

  if (req.path.startsWith("/api")) {
    logger.info("API request started", {
      method: req.method,
      path: req.originalUrl,
      origin: req.get("origin") || null
    });
  }

  res.on("finish", () => {
    if (!req.path.startsWith("/api")) {
      return;
    }

    logger.info("API request finished", {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - startedAt
    });
  });

  next();
});

app.get("/", (req, res) => {
  sendSuccess(res, { message: "MoneySim API is running", status: "ok" });
});

app.get("/api/health", (req, res) => {
  sendSuccess(res, { status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/jobs", jobRouter);
app.use("/api/expense-options", expenseRouter);
app.use("/api/game", gameRouter);
app.use("/api/leaderboard", leaderboardRouter);

app.use(errorMiddleware);
