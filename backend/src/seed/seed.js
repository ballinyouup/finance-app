import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { seedCatalog } from "./seedCatalog.js";

dotenv.config();

try {
  await connectDb();
  await seedCatalog();
  console.log("Seeded jobs and expense options.");
  await mongoose.disconnect();
} catch (error) {
  console.error("Seed failed:", error);
  await mongoose.disconnect();
  process.exit(1);
}
