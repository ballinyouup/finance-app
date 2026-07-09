import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDb(uri = env.MONGO_URI) {
  return mongoose.connect(uri);
}
