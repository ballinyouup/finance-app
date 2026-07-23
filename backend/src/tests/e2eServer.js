import bcrypt from "bcryptjs";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../app.js";
import { User } from "../models/User.js";
import { seedCatalog } from "../seed/seedCatalog.js";

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 5050);

const e2eUser = {
  name: "E2E Player",
  email: "e2e@example.com",
  password: "Password123!"
};

let server;
let mongoServer;

async function resetDatabase() {
  await mongoose.connection.db.dropDatabase();
  await seedCatalog();
  await User.create({
    name: e2eUser.name,
    email: e2eUser.email,
    passwordHash: await bcrypt.hash(e2eUser.password, 12),
    isVerified: true
  });
}

async function startServer() {
  mongoServer = await MongoMemoryServer.create({ instance: { ip: "127.0.0.1" } });
  await mongoose.connect(mongoServer.getUri());
  await resetDatabase();

  const testApp = express();
  testApp.use(express.json());
  testApp.post("/__e2e__/reset", async (req, res, next) => {
    try {
      await resetDatabase();
      res.json({ user: e2eUser });
    } catch (error) {
      next(error);
    }
  });
  testApp.use(app);

  server = testApp.listen(port, host, () => {
    console.log(`E2E API server running on http://${host}:${port}`);
  });
}

async function stopServer() {
  await new Promise((resolve) => {
    if (!server) {
      resolve();
      return;
    }

    server.close(resolve);
  });
  await mongoose.disconnect();
  await mongoServer?.stop();
}

process.on("SIGTERM", () => {
  stopServer().finally(() => process.exit(0));
});
process.on("SIGINT", () => {
  stopServer().finally(() => process.exit(0));
});

startServer().catch((error) => {
  console.error("Failed to start E2E API server:", error);
  process.exit(1);
});
