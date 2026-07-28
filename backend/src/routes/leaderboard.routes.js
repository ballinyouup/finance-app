import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.middleware.js";
import { GameSession } from "../models/GameSession.js";
import { User } from "../models/User.js";
import { sendSuccess } from "../utils/response.js";

export const leaderboardRouter = Router();

const leaderboardSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(80).optional().default("")
  })
});

leaderboardRouter.get("/", validate(leaderboardSchema), async (req, res, next) => {
  try {
    const { limit, search } = req.validated.query;
    const query = { status: "dead" };

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const users = await User.find({
        name: { $regex: escapedSearch, $options: "i" }
      }).select("_id");
      query.userId = { $in: users.map((user) => user._id) };
    }

    const sessions = await GameSession.find(query)
      .sort({ finalScore: -1, completedAt: 1 })
      .limit(limit)
      .populate("userId", "name");

    const entries = sessions.map((session) => ({
      runId: session._id.toString(),
      userId: session.userId._id.toString(),
      name: session.userId.name,
      finalScore: session.finalScore,
      completedAt: session.completedAt,
      lifePath: session.lifePath,
      ageMonths: session.ageMonths,
      balance: session.balance,
      studentDebt: session.studentDebt,
      assetValue:
        (session.stockPortfolio?.value ?? 0) +
        (session.ownedHome?.estimatedValue ?? 0) +
        (session.assetHoldings ?? []).reduce((total, asset) => total + (asset.estimatedValue ?? 0), 0),
      completedGoals: session.completedGoals ?? [],
      medicalConditions: session.medicalConditions ?? [],
      deathReason: session.deathReason,
      deathRecap: session.deathRecap,
      recentHistory: (session.history ?? []).slice(-12)
    }));

    sendSuccess(res, { entries, search });
  } catch (error) {
    next(error);
  }
});
