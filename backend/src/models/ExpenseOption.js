import mongoose from "mongoose";
import { REQUIRED_EXPENSE_CATEGORIES } from "../data/catalog.js";

const expenseOptionSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, enum: REQUIRED_EXPENSE_CATEGORIES },
    tier: { type: String, required: true, enum: ["Low", "Mid", "High"] },
    label: { type: String, required: true, trim: true },
    monthlyCost: { type: Number, required: true, min: 0 }
  },
  { timestamps: true }
);

expenseOptionSchema.index({ category: 1, tier: 1 }, { unique: true });

export const ExpenseOption = mongoose.model("ExpenseOption", expenseOptionSchema);
