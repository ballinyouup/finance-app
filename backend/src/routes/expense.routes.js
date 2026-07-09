import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { ExpenseOption } from "../models/ExpenseOption.js";
import { sendSuccess } from "../utils/response.js";

export const expenseRouter = Router();

expenseRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const options = await ExpenseOption.find().sort({ category: 1, monthlyCost: 1 });
    sendSuccess(res, { options });
  } catch (error) {
    next(error);
  }
});
