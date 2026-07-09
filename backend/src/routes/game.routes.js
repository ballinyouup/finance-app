import mongoose from "mongoose";
import { Router } from "express";
import { z } from "zod";
import { REQUIRED_EXPENSE_CATEGORIES, STARTING_BALANCE } from "../data/catalog.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { ExpenseOption } from "../models/ExpenseOption.js";
import { GameSession } from "../models/GameSession.js";
import { Job } from "../models/Job.js";
import { applyMonthlyResult } from "../services/gameEngine.service.js";
import { ApiError } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";

export const gameRouter = Router();

const objectId = z.string().refine((value) => mongoose.Types.ObjectId.isValid(value), {
  message: "Invalid ID."
});
const expenseSelectionsSchema = z.object(
  Object.fromEntries(REQUIRED_EXPENSE_CATEGORIES.map((category) => [category, objectId]))
);
const startSchema = z.object({
  body: z.object({
    jobId: objectId,
    expenseSelections: expenseSelectionsSchema
  })
});
const jobSchema = z.object({
  body: z.object({ jobId: objectId })
});
const expenseSchema = z.object({
  body: z.object({
    category: z.enum(REQUIRED_EXPENSE_CATEGORIES),
    optionId: objectId
  })
});

async function populateSession(query) {
  return query
    .populate("currentJobId")
    .populate(Object.keys(REQUIRED_EXPENSE_CATEGORIES).length
      ? REQUIRED_EXPENSE_CATEGORIES.map((category) => ({
          path: `currentExpenseSelections.${category}`
        }))
      : []);
}

async function findActiveSession(userId) {
  return populateSession(GameSession.findOne({ userId, status: "active" }));
}

async function getActiveSessionOrThrow(userId) {
  const session = await GameSession.findOne({ userId, status: "active" });

  if (!session) {
    throw new ApiError(404, "SESSION_NOT_FOUND", "No active session was found.");
  }

  return session;
}

async function assertJobExists(jobId) {
  const job = await Job.findById(jobId);

  if (!job) {
    throw new ApiError(400, "INVALID_JOB", "Selected job does not exist.");
  }

  return job;
}

async function getExpenseOptionsBySelection(expenseSelections) {
  const ids = REQUIRED_EXPENSE_CATEGORIES.map((category) => expenseSelections[category]);
  const options = await ExpenseOption.find({ _id: { $in: ids } });
  const byId = new Map(options.map((option) => [option._id.toString(), option]));

  for (const category of REQUIRED_EXPENSE_CATEGORIES) {
    const option = byId.get(expenseSelections[category].toString());

    if (!option || option.category !== category) {
      throw new ApiError(
        400,
        "INVALID_EXPENSE_SELECTIONS",
        `Selected expense option for ${category} is invalid.`
      );
    }
  }

  return REQUIRED_EXPENSE_CATEGORIES.map((category) =>
    byId.get(expenseSelections[category].toString())
  );
}

gameRouter.use(requireAuth);

gameRouter.post("/start", validate(startSchema), async (req, res, next) => {
  try {
    const activeSession = await GameSession.findOne({
      userId: req.user._id,
      status: "active"
    });

    if (activeSession) {
      throw new ApiError(409, "ACTIVE_SESSION_EXISTS", "You already have an active session.");
    }

    await assertJobExists(req.body.jobId);
    await getExpenseOptionsBySelection(req.body.expenseSelections);

    const session = await GameSession.create({
      userId: req.user._id,
      currentRound: 1,
      balance: STARTING_BALANCE,
      currentJobId: req.body.jobId,
      currentExpenseSelections: req.body.expenseSelections
    });

    const populated = await populateSession(GameSession.findById(session._id));
    sendSuccess(res, { session: populated }, 201);
  } catch (error) {
    next(error);
  }
});

gameRouter.get("/current", async (req, res, next) => {
  try {
    const session = await findActiveSession(req.user._id);
    sendSuccess(res, { session });
  } catch (error) {
    next(error);
  }
});

gameRouter.put("/job", validate(jobSchema), async (req, res, next) => {
  try {
    const session = await getActiveSessionOrThrow(req.user._id);
    await assertJobExists(req.body.jobId);

    session.currentJobId = req.body.jobId;
    await session.save();

    const populated = await populateSession(GameSession.findById(session._id));
    sendSuccess(res, { session: populated });
  } catch (error) {
    next(error);
  }
});

gameRouter.put("/expenses", validate(expenseSchema), async (req, res, next) => {
  try {
    const session = await getActiveSessionOrThrow(req.user._id);
    const option = await ExpenseOption.findById(req.body.optionId);

    if (!option || option.category !== req.body.category) {
      throw new ApiError(400, "INVALID_EXPENSE_OPTION", "Selected expense option is invalid.");
    }

    session.currentExpenseSelections[req.body.category] = option._id;
    await session.save();

    const populated = await populateSession(GameSession.findById(session._id));
    sendSuccess(res, { session: populated });
  } catch (error) {
    next(error);
  }
});

gameRouter.post("/advance", async (req, res, next) => {
  try {
    const session = await getActiveSessionOrThrow(req.user._id);
    const job = await Job.findById(session.currentJobId);
    const expenseOptions = await getExpenseOptionsBySelection(session.currentExpenseSelections);

    applyMonthlyResult(session, job, expenseOptions);
    await session.save();

    const populated = await populateSession(GameSession.findById(session._id));
    sendSuccess(res, { session: populated });
  } catch (error) {
    next(error);
  }
});

gameRouter.get("/history", async (req, res, next) => {
  try {
    const sessions = await populateSession(
      GameSession.find({ userId: req.user._id, status: "completed" }).sort({ completedAt: -1 })
    );
    sendSuccess(res, { sessions });
  } catch (error) {
    next(error);
  }
});
