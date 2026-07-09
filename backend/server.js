import dotenv from "dotenv";
import { app } from "./src/app.js";
import { connectDb } from "./src/config/db.js";
import { env } from "./src/config/env.js";

dotenv.config();

async function startServer() {
  try {
    await connectDb();

    console.log("Connected to MongoDB");

    app.listen(env.PORT, "127.0.0.1", () => {
      console.log(`Server running on http://127.0.0.1:${env.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
