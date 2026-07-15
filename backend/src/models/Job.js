import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, unique: true, trim: true },
    monthlySalary: { type: Number, required: true, min: 0 },
    tier: { type: Number, required: true, min: 1, max: 5 },
    requiresDegree: { type: Boolean, default: false },
    careerTrack: { type: String, default: "General" },
    requiredSkill: { type: String, enum: ["technical", "business", "communication"], default: "communication" },
    requiredSkillLevel: { type: Number, default: 0, min: 0, max: 10 }
  },
  { timestamps: true }
);

export const Job = mongoose.model("Job", jobSchema);
