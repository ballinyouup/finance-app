import mongoose from "mongoose";
import { REQUIRED_EXPENSE_CATEGORIES, STARTING_BALANCE } from "../data/catalog.js";

const historySchema = new mongoose.Schema(
  {
    round: { type: Number, required: true },
    jobTitle: { type: String, required: true },
    salary: { type: Number, required: true },
    expenses: { type: Number, required: true },
    balanceAfter: { type: Number, required: true }
  },
  { _id: false }
);

const expenseSelectionsSchema = Object.fromEntries(
  REQUIRED_EXPENSE_CATEGORIES.map((category) => [
    category,
    { type: mongoose.Schema.Types.ObjectId, ref: "ExpenseOption", required: true }
  ])
);

const gameSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["active", "completed"], default: "active", index: true },
    currentRound: { type: Number, default: 1, min: 1, max: 12 },
    balance: { type: Number, default: STARTING_BALANCE },
    currentJobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    currentExpenseSelections: expenseSelectionsSchema,
    history: { type: [historySchema], default: [] },
    finalScore: { type: Number },
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
