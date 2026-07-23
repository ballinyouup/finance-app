import mongoose from "mongoose";
import {
  LIFE_PATHS,
  MONTHLY_EXPENSE_CATEGORIES,
  STARTING_AGE_MONTHS,
  STARTING_BALANCE,
  STARTING_NEEDS
} from "../data/catalog.js";

const needsSchema = {
  happiness: { type: Number, default: STARTING_NEEDS.happiness, min: 0, max: 100 },
  hunger: { type: Number, default: STARTING_NEEDS.hunger, min: 0, max: 100 },
  entertainment: { type: Number, default: STARTING_NEEDS.entertainment, min: 0, max: 100 },
  love: { type: Number, default: STARTING_NEEDS.love, min: 0, max: 100 },
  energy: { type: Number, default: STARTING_NEEDS.energy, min: 0, max: 100 }
};

const monthlyChoicesSchema = {
  foodDays: { type: Number, default: 20, min: 0, max: 30 },
  entertainmentDays: { type: Number, default: 4, min: 0, max: 30 },
  datingDays: { type: Number, default: 2, min: 0, max: 30 },
  activity: { type: String, enum: ["study", "exercise", "recreation", "rest"], default: "rest" },
  internship: { type: Boolean, default: false },
  debtPayment: { type: Number, default: 0, min: 0, max: 2000 }
};

const skillsSchema = {
  technical: { type: Number, default: 0, min: 0, max: 10 },
  business: { type: Number, default: 0, min: 0, max: 10 },
  communication: { type: Number, default: 0, min: 0, max: 10 }
};

const historySchema = new mongoose.Schema(
  {
    month: { type: Number, required: true },
    ageMonths: { type: Number, required: true },
    path: { type: String, required: true },
    jobTitle: { type: String, required: true },
    income: { type: Number, required: true },
    expenses: { type: Number, required: true },
    loanChange: { type: Number, default: 0 },
    eventTitle: { type: String },
    eventAmount: { type: Number, default: 0 },
    deathChance: { type: Number, required: true },
    died: { type: Boolean, default: false },
    needsAfter: needsSchema,
    balanceAfter: { type: Number, required: true },
    studentDebtAfter: { type: Number, required: true }
  },
  { _id: false }
);

const expenseSelectionsSchema = Object.fromEntries(
  MONTHLY_EXPENSE_CATEGORIES.map((category) => [
    category,
    { type: mongoose.Schema.Types.ObjectId, ref: "ExpenseOption", required: true }
  ])
);

const jobApplicationResultSchema = new mongoose.Schema(
  {
    month: { type: Number, required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    jobTitle: { type: String, required: true },
    accepted: { type: Boolean, required: true },
    chance: { type: Number, required: true },
    message: { type: String, required: true }
  },
  { _id: false }
);

const vehicleStatusSchema = {
  type: { type: String, enum: ["none", "used-car", "new-car"], default: "none" },
  mileage: { type: Number, default: 0, min: 0 },
  condition: { type: Number, default: 100, min: 0, max: 100 },
  broken: { type: Boolean, default: false },
  lastRepairCost: { type: Number, default: 0, min: 0 }
};

const stockPortfolioSchema = {
  invested: { type: Number, default: 0, min: 0 },
  value: { type: Number, default: 0, min: 0 }
};

const ownedHomeSchema = {
  homeId: { type: String },
  label: { type: String },
  purchasePrice: { type: Number, default: 0, min: 0 },
  estimatedValue: { type: Number, default: 0, min: 0 },
  monthlyUpkeep: { type: Number, default: 0, min: 0 },
  drift: { type: Number, default: 0 },
  volatility: { type: Number, default: 0 },
  purchasedMonth: { type: Number, default: 1, min: 1 }
};

const assetHoldingSchema = new mongoose.Schema(
  {
    assetId: { type: String, required: true },
    label: { type: String, required: true },
    category: { type: String, required: true },
    purchasePrice: { type: Number, required: true, min: 0 },
    estimatedValue: { type: Number, required: true, min: 0 },
    drift: { type: Number, default: 0 },
    volatility: { type: Number, default: 0 },
    purchasedMonth: { type: Number, default: 1, min: 1 }
  },
  { timestamps: false }
);

const deathRecapSchema = {
  reason: { type: String },
  roll: { type: Number },
  chance: { type: Number },
  ageMonths: { type: Number },
  balance: { type: Number },
  studentDebt: { type: Number },
  assetValue: { type: Number },
  finalScore: { type: Number },
  jobTitle: { type: String },
  eventTitle: { type: String },
  needs: needsSchema
};

const gameSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["active", "dead"], default: "active", index: true },
    lifePath: { type: String, enum: LIFE_PATHS, default: "work" },
    currentMonth: { type: Number, default: 1, min: 1 },
    ageMonths: { type: Number, default: STARTING_AGE_MONTHS, min: STARTING_AGE_MONTHS },
    balance: { type: Number, default: STARTING_BALANCE },
    studentDebt: { type: Number, default: 0, min: 0 },
    educationMonths: { type: Number, default: 0, min: 0 },
    major: { type: String, enum: ["computer-science", "business", "communications"] },
    skills: { type: skillsSchema, default: () => ({}) },
    careerLevel: { type: Number, default: 0, min: 0, max: 3 },
    careerPerformance: { type: Number, default: 0, min: 0 },
    unemployedMonths: { type: Number, default: 0, min: 0 },
    completedGoals: { type: [String], default: [] },
    homeOwned: { type: Boolean, default: false },
    needs: needsSchema,
    monthlyChoices: monthlyChoicesSchema,
    currentJobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    jobMarketIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }], default: [] },
    appliedJobIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }], default: [] },
    lastJobApplication: { type: jobApplicationResultSchema },
    currentExpenseSelections: expenseSelectionsSchema,
    housingLeaseMonthsRemaining: { type: Number, default: 12, min: 0 },
    transportationTermMonthsRemaining: { type: Number, default: 12, min: 0 },
    vehicleStatus: { type: vehicleStatusSchema, default: () => ({}) },
    stockPortfolio: { type: stockPortfolioSchema, default: () => ({}) },
    ownedHome: { type: ownedHomeSchema },
    assetHoldings: { type: [assetHoldingSchema], default: [] },
    history: { type: [historySchema], default: [] },
    finalScore: { type: Number },
    deathReason: { type: String },
    deathRecap: deathRecapSchema,
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

gameSessionSchema.index(
  { userId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "active" } }
);

export const GameSession = mongoose.model("GameSession", gameSessionSchema);
