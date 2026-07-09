import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { seedCatalog } from "./seedCatalog.js";

dotenv.config();

try {
  await connectDb();
  const databaseName = mongoose.connection.name;

  await mongoose.connection.dropDatabase();
  console.log(`Dropped database: ${databaseName}`);

  await seedCatalog();
  console.log("Seeded jobs and expense options.");

  await mongoose.disconnect();
} catch (error) {
  console.error("Database reset failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
}
