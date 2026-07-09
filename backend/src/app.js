import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth.routes.js";
import { expenseRouter } from "./routes/expense.routes.js";
import { gameRouter } from "./routes/game.routes.js";
import { jobRouter } from "./routes/job.routes.js";
import { leaderboardRouter } from "./routes/leaderboard.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { env } from "./config/env.js";
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

      callback(new Error(`CORS origin not allowed: ${origin}`));
    }
  })
);
app.use(express.json());

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
