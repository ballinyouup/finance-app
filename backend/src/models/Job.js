import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, unique: true, trim: true },
    monthlySalary: { type: Number, required: true, min: 0 },
    tier: { type: Number, required: true, min: 1, max: 5 }
  },
  { timestamps: true }
);

export const Job = mongoose.model("Job", jobSchema);
