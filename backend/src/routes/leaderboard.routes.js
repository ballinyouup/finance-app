import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.middleware.js";
import { GameSession } from "../models/GameSession.js";
import { sendSuccess } from "../utils/response.js";

export const leaderboardRouter = Router();

const leaderboardSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
});

leaderboardRouter.get("/", validate(leaderboardSchema), async (req, res, next) => {
  try {
    const sessions = await GameSession.find({ status: "dead" })
      .sort({ finalScore: -1, completedAt: 1 })
      .limit(req.validated.query.limit)
      .populate("userId", "name");

    const entries = sessions.map((session) => ({
      userId: session.userId._id.toString(),
      name: session.userId.name,
      finalScore: session.finalScore,
      completedAt: session.completedAt
    }));

    sendSuccess(res, { entries });
  } catch (error) {
    next(error);
  }
});
