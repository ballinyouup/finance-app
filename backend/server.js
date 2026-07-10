import dotenv from "dotenv";
import { app } from "./src/app.js";
import { connectDb } from "./src/config/db.js";
import { env } from "./src/config/env.js";
import { seedCatalog } from "./src/seed/seedCatalog.js";

dotenv.config();

async function startServer() {
  try {
    await connectDb();
    await seedCatalog();

    console.log("Connected to MongoDB and seeded catalog data");

    app.listen(env.PORT, env.HOST, () => {
      console.log(`Server running on http://${env.HOST}:${env.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
