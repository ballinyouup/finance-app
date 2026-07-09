import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { Job } from "../models/Job.js";
import { sendSuccess } from "../utils/response.js";

export const jobRouter = Router();

jobRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const jobs = await Job.find().sort({ tier: 1, monthlySalary: 1, title: 1 });
    sendSuccess(res, { jobs });
  } catch (error) {
    next(error);
  }
});
