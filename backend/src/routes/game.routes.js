import mongoose from "mongoose";
import { Router } from "express";
import { z } from "zod";
import {
  LIFE_PATHS,
  MAJORS,
  ACTIVITIES,
  MONTHLY_EXPENSE_CATEGORIES,
  MONTHLY_CHOICE_LIMITS,
  STARTING_BALANCE,
  assetOptions,
  homeOptions
} from "../data/catalog.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { ExpenseOption } from "../models/ExpenseOption.js";
import { GameSession } from "../models/GameSession.js";
import { Job } from "../models/Job.js";
import { applyMonths, calculateFinalScore, calculateInvestableAssets, normalizeMonthlyChoices } from "../services/gameEngine.service.js";
import { ApiError } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";

export const gameRouter = Router();

const objectId = z.string().refine((value) => mongoose.Types.ObjectId.isValid(value), {
  message: "Invalid ID."
});
const expenseSelectionsSchema = z.object(
  Object.fromEntries(MONTHLY_EXPENSE_CATEGORIES.map((category) => [category, objectId]))
);
const startSchema = z.object({
  body: z.object({
    lifePath: z.enum(LIFE_PATHS).default("work"),
    major: z.enum(MAJORS).optional(),
    jobId: objectId,
    expenseSelections: expenseSelectionsSchema
  })
});
const jobSchema = z.object({
  body: z.object({ jobId: objectId })
});
const expenseSchema = z.object({
  body: z.object({
    category: z.enum(MONTHLY_EXPENSE_CATEGORIES),
    optionId: objectId
  })
});
const amountSchema = z.object({
  body: z.object({ amount: z.number().int().min(1) })
});
const homeSchema = z.object({
  body: z.object({ homeId: z.string().min(1) })
});
const assetSchema = z.object({
  body: z.object({ assetId: z.string().min(1) })
});
const sellAssetSchema = z.object({
  body: z.object({ holdingId: z.string().min(1) })
});
const enrollSchema = z.object({
  body: z.object({ major: z.enum(MAJORS) })
});
const advanceSchema = z.object({
  body: z.object({
    months: z.number().int().min(1).max(12).default(1),
    choices: z.object({
      foodDays: z.number().int().min(MONTHLY_CHOICE_LIMITS.foodDays.min).max(MONTHLY_CHOICE_LIMITS.foodDays.max),
      entertainmentDays: z.number().int().min(MONTHLY_CHOICE_LIMITS.entertainmentDays.min).max(MONTHLY_CHOICE_LIMITS.entertainmentDays.max),
      datingDays: z.number().int().min(MONTHLY_CHOICE_LIMITS.datingDays.min).max(MONTHLY_CHOICE_LIMITS.datingDays.max),
      activity: z.enum(ACTIVITIES),
      internship: z.boolean(),
      debtPayment: z.number().int().min(0).max(2000)
    }).partial().default({})
  }).default({ months: 1, choices: {} })
});

const JOB_MARKET_SIZE = 6;

async function populateSession(query) {
  return query
    .populate("currentJobId")
    .populate("jobMarketIds")
    .populate(Object.keys(MONTHLY_EXPENSE_CATEGORIES).length
      ? MONTHLY_EXPENSE_CATEGORIES.map((category) => ({
          path: `currentExpenseSelections.${category}`
        }))
      : []);
}

async function findActiveSession(userId) {
  const session = await GameSession.findOne({ userId, status: "active" });

  if (!session) {
    return null;
  }

  if (!session.jobMarketIds?.length) {
    await refreshJobMarket(session);
    await session.save();
  }

  if (!session.vehicleStatus) {
    const transportationOption = await ExpenseOption.findById(session.currentExpenseSelections?.Transportation);
    session.vehicleStatus = createVehicleStatus(transportationOption);
    await session.save();
  }

  if (session.housingLeaseMonthsRemaining == null) {
    session.housingLeaseMonthsRemaining = 12;
    await session.save();
  }

  if (session.transportationTermMonthsRemaining == null) {
    session.transportationTermMonthsRemaining = 12;
    await session.save();
  }

  return populateSession(GameSession.findById(session._id));
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

function assertJobAvailable(job, session) {
  const lockReason = getJobLockReason(job, session);

  if (lockReason) {
    throw new ApiError(400, lockReason.code, lockReason.message);
  }
}

function getJobLockReason(job, session) {
  const hasGraduated = session.lifePath === "college" && session.educationMonths >= 48;

  if (job.requiresDegree && !hasGraduated) {
    return {
      code: "DEGREE_REQUIRED",
      message: `${job.title} requires a degree and unlocks after graduating from college.`
    };
  }

  const skillLevel = session.skills?.[job.requiredSkill] ?? 0;
  if (skillLevel < (job.requiredSkillLevel ?? 0)) {
    return {
      code: "SKILL_REQUIRED",
      message: `${job.title} requires ${job.requiredSkillLevel} ${job.requiredSkill} skill.`
    };
  }

  return null;
}

function getApplicationChance(job, session) {
  const skillLevel = session.skills?.[job.requiredSkill] ?? 0;
  const skillGap = skillLevel - (job.requiredSkillLevel ?? 0);
  const tierGap = (job.tier ?? 1) - (session.currentJobId?.tier ?? 1);
  const careerMatchBonus = job.careerTrack === session.currentJobId?.careerTrack ? 0.08 : 0;
  const chance = 0.48 + skillGap * 0.06 - Math.max(0, tierGap) * 0.06 + careerMatchBonus;

  return Math.max(0.12, Math.min(0.9, Math.round(chance * 100) / 100));
}

function scoreJobForMarket(job, session) {
  const seed = `${session._id}:${session.currentMonth}:${job._id}`;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 1000003;
  }

  return hash;
}

async function refreshJobMarket(session) {
  const currentJobId = session.currentJobId?._id ?? session.currentJobId;
  const jobs = await Job.find({ _id: { $ne: currentJobId } }).sort({ tier: 1, title: 1 });
  const sortedJobs = jobs
    .map((job) => ({ job, score: scoreJobForMarket(job, session) }))
    .sort((a, b) => a.score - b.score)
    .map(({ job }) => job);

  const market = sortedJobs.slice(0, Math.min(JOB_MARKET_SIZE, sortedJobs.length));
  session.jobMarketIds = market.map((job) => job._id);
  session.appliedJobIds = [];
  session.lastJobApplication = undefined;

  return market;
}

async function getExpenseOptionsBySelection(expenseSelections) {
  const ids = MONTHLY_EXPENSE_CATEGORIES.map((category) => expenseSelections[category]);
  const options = await ExpenseOption.find({ _id: { $in: ids } });
  const byId = new Map(options.map((option) => [option._id.toString(), option]));

  for (const category of MONTHLY_EXPENSE_CATEGORIES) {
    const option = byId.get(expenseSelections[category].toString());

    if (!option || option.category !== category) {
      throw new ApiError(
        400,
        "INVALID_EXPENSE_SELECTIONS",
        `Selected expense option for ${category} is invalid.`
      );
    }
  }

  return MONTHLY_EXPENSE_CATEGORIES.map((category) =>
    byId.get(expenseSelections[category].toString())
  );
}

function createVehicleStatus(option) {
  if (!option || option.category !== "Transportation" || option.tier === "Low") {
    return { type: "none", mileage: 0, condition: 100, broken: false, lastRepairCost: 0 };
  }

  if (option.tier === "Mid") {
    return { type: "used-car", mileage: 80000, condition: 72, broken: false, lastRepairCost: 0 };
  }

  return { type: "new-car", mileage: 5000, condition: 96, broken: false, lastRepairCost: 0 };
}

function assertExpenseChangeAllowed(session, category) {
  if (category === "Housing" && (session.housingLeaseMonthsRemaining ?? 0) > 0) {
    throw new ApiError(
      409,
      "LEASE_ACTIVE",
      `Your housing lease has ${session.housingLeaseMonthsRemaining} months remaining.`
    );
  }

  if (
    category === "Transportation" &&
    (session.transportationTermMonthsRemaining ?? 0) > 0 &&
    !session.vehicleStatus?.broken
  ) {
    throw new ApiError(
      409,
      "TRANSPORTATION_TERM_ACTIVE",
      `Your transportation term has ${session.transportationTermMonthsRemaining} months remaining.`
    );
  }
}

function applyExpenseContract(session, option) {
  if (option.category === "Housing") {
    session.housingLeaseMonthsRemaining = 12;
  }

  if (option.category === "Transportation") {
    session.transportationTermMonthsRemaining = 12;
    session.vehicleStatus = createVehicleStatus(option);
  }
}

function ensureCanAfford(session, amount, code = "INSUFFICIENT_FUNDS") {
  if (session.balance < amount) {
    throw new ApiError(400, code, `You need ${amount} in available cash.`);
  }
}

function getHomeOption(homeId) {
  const home = homeOptions.find((option) => option.id === homeId);
  if (!home) throw new ApiError(400, "INVALID_HOME", "Selected home does not exist.");
  return home;
}

function getAssetOption(assetId) {
  const asset = assetOptions.find((option) => option.id === assetId);
  if (!asset) throw new ApiError(400, "INVALID_ASSET", "Selected asset does not exist.");
  return asset;
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

    const job = await assertJobExists(req.body.jobId);
    assertJobAvailable(job, { lifePath: req.body.lifePath, educationMonths: 0, skills: {} });
    await getExpenseOptionsBySelection(req.body.expenseSelections);

    const session = await GameSession.create({
      userId: req.user._id,
      lifePath: req.body.lifePath,
      major: req.body.lifePath === "college" ? (req.body.major ?? "business") : undefined,
      currentMonth: 1,
      balance: STARTING_BALANCE,
      monthlyChoices: normalizeMonthlyChoices(),
      currentJobId: req.body.jobId,
      currentExpenseSelections: req.body.expenseSelections,
      housingLeaseMonthsRemaining: 12,
      transportationTermMonthsRemaining: 12
    });
    const transportationOption = await ExpenseOption.findById(req.body.expenseSelections.Transportation);
    session.vehicleStatus = createVehicleStatus(transportationOption);
    await refreshJobMarket(session);
    await session.save();

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

gameRouter.post("/job-applications", validate(jobSchema), async (req, res, next) => {
  try {
    const session = await populateSession(GameSession.findOne({ userId: req.user._id, status: "active" }));

    if (!session) {
      throw new ApiError(404, "SESSION_NOT_FOUND", "No active session was found.");
    }

    if (!session.jobMarketIds?.length) {
      await refreshJobMarket(session);
    }

    const job = await assertJobExists(req.body.jobId);
    const marketIds = new Set((session.jobMarketIds ?? []).map((marketJob) => marketJob._id.toString()));
    const appliedIds = new Set((session.appliedJobIds ?? []).map((jobId) => jobId.toString()));

    if (!marketIds.has(job._id.toString())) {
      throw new ApiError(400, "JOB_NOT_LISTED", "That job is not accepting applications this month.");
    }

    if (appliedIds.size > 0) {
      throw new ApiError(409, "APPLICATION_USED", "You already applied for a job this month.");
    }

    assertJobAvailable(job, session);

    const chance = getApplicationChance(job, session);
    const accepted = Math.random() < chance;
    const application = {
      month: session.currentMonth,
      jobId: job._id,
      jobTitle: job.title,
      accepted,
      chance,
      message: accepted
        ? `${job.title} hired you. It is now your primary job.`
        : `${job.title} passed on your application. Try again next month.`
    };

    session.appliedJobIds = [job._id];
    session.lastJobApplication = application;

    if (accepted) {
      session.currentJobId = job._id;
      session.careerLevel = 0;
      session.careerPerformance = 0;
      await refreshJobMarket(session);
      session.appliedJobIds = [job._id];
      session.lastJobApplication = application;
    }

    await session.save();

    const populated = await populateSession(GameSession.findById(session._id));
    sendSuccess(res, { session: populated, application });
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

    assertExpenseChangeAllowed(session, req.body.category);
    session.currentExpenseSelections[req.body.category] = option._id;
    applyExpenseContract(session, option);
    await session.save();

    const populated = await populateSession(GameSession.findById(session._id));
    sendSuccess(res, { session: populated });
  } catch (error) {
    next(error);
  }
});

gameRouter.post("/pay-off-debt", async (req, res, next) => {
  try {
    const session = await getActiveSessionOrThrow(req.user._id);
    if (session.studentDebt <= 0) throw new ApiError(400, "NO_STUDENT_DEBT", "You do not have student debt.");
    ensureCanAfford(session, session.studentDebt);

    session.balance -= session.studentDebt;
    session.studentDebt = 0;
    if (!session.completedGoals.includes("Graduate debt-free") && session.lifePath === "college" && session.educationMonths >= 48) {
      session.completedGoals.push("Graduate debt-free");
    }
    await session.save();

    const populated = await populateSession(GameSession.findById(session._id));
    sendSuccess(res, { session: populated });
  } catch (error) {
    next(error);
  }
});

gameRouter.post("/stocks/invest", validate(amountSchema), async (req, res, next) => {
  try {
    const session = await getActiveSessionOrThrow(req.user._id);
    ensureCanAfford(session, req.body.amount);

    session.balance -= req.body.amount;
    session.stockPortfolio = {
      invested: (session.stockPortfolio?.invested ?? 0) + req.body.amount,
      value: (session.stockPortfolio?.value ?? 0) + req.body.amount
    };
    await session.save();

    const populated = await populateSession(GameSession.findById(session._id));
    sendSuccess(res, { session: populated });
  } catch (error) {
    next(error);
  }
});

gameRouter.post("/stocks/sell", async (req, res, next) => {
  try {
    const session = await getActiveSessionOrThrow(req.user._id);
    const value = Math.round(session.stockPortfolio?.value ?? 0);
    if (value <= 0) throw new ApiError(400, "NO_STOCKS", "You do not own stock investments.");

    session.balance += value;
    session.stockPortfolio = { invested: 0, value: 0 };
    await session.save();

    const populated = await populateSession(GameSession.findById(session._id));
    sendSuccess(res, { session: populated });
  } catch (error) {
    next(error);
  }
});

gameRouter.post("/home/buy", validate(homeSchema), async (req, res, next) => {
  try {
    const session = await getActiveSessionOrThrow(req.user._id);
    if (session.homeOwned) throw new ApiError(409, "HOME_ALREADY_OWNED", "Sell your current home before buying another.");

    const home = getHomeOption(req.body.homeId);
    ensureCanAfford(session, home.price);

    session.balance -= home.price;
    session.homeOwned = true;
    session.ownedHome = {
      homeId: home.id,
      label: home.label,
      purchasePrice: home.price,
      estimatedValue: home.price,
      monthlyUpkeep: home.monthlyUpkeep,
      drift: home.drift,
      volatility: home.volatility,
      purchasedMonth: session.currentMonth
    };
    if (!session.completedGoals.includes("Buy a home")) session.completedGoals.push("Buy a home");
    await session.save();

    const populated = await populateSession(GameSession.findById(session._id));
    sendSuccess(res, { session: populated });
  } catch (error) {
    next(error);
  }
});

gameRouter.post("/home/sell", async (req, res, next) => {
  try {
    const session = await getActiveSessionOrThrow(req.user._id);
    if (!session.homeOwned || !session.ownedHome?.estimatedValue) {
      throw new ApiError(400, "NO_HOME_OWNED", "You do not own a home.");
    }

    session.balance += Math.round(session.ownedHome.estimatedValue);
    session.homeOwned = false;
    session.ownedHome = undefined;
    await session.save();

    const populated = await populateSession(GameSession.findById(session._id));
    sendSuccess(res, { session: populated });
  } catch (error) {
    next(error);
  }
});

gameRouter.post("/assets/buy", validate(assetSchema), async (req, res, next) => {
  try {
    const session = await getActiveSessionOrThrow(req.user._id);
    const asset = getAssetOption(req.body.assetId);
    ensureCanAfford(session, asset.price);

    session.balance -= asset.price;
    session.assetHoldings.push({
      assetId: asset.id,
      label: asset.label,
      category: asset.category,
      purchasePrice: asset.price,
      estimatedValue: asset.price,
      drift: asset.drift,
      volatility: asset.volatility,
      purchasedMonth: session.currentMonth
    });
    await session.save();

    const populated = await populateSession(GameSession.findById(session._id));
    sendSuccess(res, { session: populated });
  } catch (error) {
    next(error);
  }
});

gameRouter.post("/assets/sell", validate(sellAssetSchema), async (req, res, next) => {
  try {
    const session = await getActiveSessionOrThrow(req.user._id);
    const holding = session.assetHoldings.id(req.body.holdingId);
    if (!holding) throw new ApiError(400, "ASSET_NOT_OWNED", "You do not own that asset.");

    session.balance += Math.round(holding.estimatedValue);
    holding.deleteOne();
    await session.save();

    const populated = await populateSession(GameSession.findById(session._id));
    sendSuccess(res, { session: populated });
  } catch (error) {
    next(error);
  }
});

gameRouter.post("/transportation/sell", async (req, res, next) => {
  try {
    const session = await getActiveSessionOrThrow(req.user._id);
    const transit = await ExpenseOption.findOne({ category: "Transportation", tier: "Low" });
    if (!transit) throw new ApiError(500, "TRANSIT_OPTION_MISSING", "Public transit option is missing.");

    const status = session.vehicleStatus;
    if (!status || status.type === "none") throw new ApiError(400, "NO_CAR_OWNED", "You do not own a car.");
    if (status.type === "new-car") throw new ApiError(400, "LEASED_CAR", "You cannot sell a leased car.");

    const resaleValue = Math.max(300, Math.round(5500 * Math.max(0.05, status.condition / 100) - Math.max(0, status.mileage - 80000) * 0.015));
    session.balance += resaleValue;
    session.currentExpenseSelections.Transportation = transit._id;
    session.transportationTermMonthsRemaining = 0;
    session.vehicleStatus = createVehicleStatus(transit);
    await session.save();

    const populated = await populateSession(GameSession.findById(session._id));
    sendSuccess(res, { session: populated, resaleValue });
  } catch (error) {
    next(error);
  }
});

gameRouter.post("/enroll-college", validate(enrollSchema), async (req, res, next) => {
  try {
    const session = await getActiveSessionOrThrow(req.user._id);
    if (session.lifePath === "college") {
      throw new ApiError(409, "ALREADY_ENROLLED", "You are already enrolled in college.");
    }

    session.lifePath = "college";
    session.major = req.body.major;
    session.educationMonths = 0;
    await session.save();

    const populated = await populateSession(GameSession.findById(session._id));
    sendSuccess(res, { session: populated });
  } catch (error) {
    next(error);
  }
});

gameRouter.post("/advance", validate(advanceSchema), async (req, res, next) => {
  try {
    const session = await getActiveSessionOrThrow(req.user._id);
    const job = await Job.findById(session.currentJobId);
    const expenseOptions = await getExpenseOptionsBySelection(session.currentExpenseSelections);

    applyMonths(session, job, expenseOptions, req.body.choices, req.body.months);

    if (session.status === "active") {
      await refreshJobMarket(session);
    }

    await session.save();

    const populated = await populateSession(GameSession.findById(session._id));
    sendSuccess(res, { session: populated });
  } catch (error) {
    next(error);
  }
});

gameRouter.post("/end-run", async (req, res, next) => {
  try {
    const session = await populateSession(GameSession.findOne({ userId: req.user._id, status: "active" }));

    if (!session) {
      throw new ApiError(404, "SESSION_NOT_FOUND", "No active session was found.");
    }

    session.status = "dead";
    session.finalScore = calculateFinalScore(session);
    session.deathReason = "You ended this run and started over.";
    session.deathRecap = {
      reason: session.deathReason,
      roll: 0,
      chance: 0,
      ageMonths: session.ageMonths,
      balance: session.balance,
      studentDebt: session.studentDebt,
      assetValue: calculateInvestableAssets(session),
      finalScore: session.finalScore,
      jobTitle: session.currentJobId?.title,
      eventTitle: "Run ended by player",
      needs: session.needs
    };
    session.completedAt = new Date();
    await session.save();

    const populated = await populateSession(GameSession.findById(session._id));
    sendSuccess(res, { session: populated });
  } catch (error) {
    next(error);
  }
});

gameRouter.post("/buy-home", async (req, res, next) => {
  try {
    const session = await getActiveSessionOrThrow(req.user._id);
    if (session.homeOwned) throw new ApiError(409, "HOME_ALREADY_OWNED", "You already own a home.");
    const home = getHomeOption("starter-condo");
    if (session.balance < home.price) throw new ApiError(400, "INSUFFICIENT_SAVINGS", "You need $30,000 in savings to buy a home.");

    session.balance -= home.price;
    session.homeOwned = true;
    session.ownedHome = {
      homeId: home.id,
      label: home.label,
      purchasePrice: home.price,
      estimatedValue: home.price,
      monthlyUpkeep: home.monthlyUpkeep,
      drift: home.drift,
      volatility: home.volatility,
      purchasedMonth: session.currentMonth
    };
    if (!session.completedGoals.includes("Buy a home")) session.completedGoals.push("Buy a home");
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
      GameSession.find({ userId: req.user._id, status: "dead" }).sort({ completedAt: -1 })
    );
    sendSuccess(res, { sessions });
  } catch (error) {
    next(error);
  }
});
