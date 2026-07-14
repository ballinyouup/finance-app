import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../app.js";
import { MONTHLY_EXPENSE_CATEGORIES, STARTING_AGE_MONTHS } from "../data/catalog.js";
import { ExpenseOption } from "../models/ExpenseOption.js";
import { GameSession } from "../models/GameSession.js";
import { Job } from "../models/Job.js";
import { User } from "../models/User.js";
import { seedCatalog } from "../seed/seedCatalog.js";
import { hashToken, signAccessToken } from "../services/token.service.js";

vi.mock("../services/email.service.js", () => ({
  sendVerificationEmail: vi.fn()
}));

let mongoServer;

beforeAll(async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  mongoServer = await MongoMemoryServer.create({ instance: { ip: "127.0.0.1" } });
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  vi.spyOn(Math, "random").mockReturnValue(1);
  await mongoose.connection.db.dropDatabase();
  await seedCatalog();
});

afterAll(async () => {
  vi.restoreAllMocks();
  await mongoose.disconnect();
  await mongoServer?.stop();
});

async function createUser(overrides = {}) {
  return User.create({
    name: "Test Player",
    email: "player@example.com",
    passwordHash: await bcrypt.hash("password123", 12),
    isVerified: true,
    ...overrides
  });
}

async function authHeader(user) {
  return `Bearer ${signAccessToken(user)}`;
}

async function lowExpenseSelections() {
  const options = await ExpenseOption.find({ tier: "Low" });
  return Object.fromEntries(
    MONTHLY_EXPENSE_CATEGORIES.map((category) => [
      category,
      options.find((option) => option.category === category)._id.toString()
    ])
  );
}

describe("auth routes", () => {
  it("allows the production domain through CORS", async () => {
    const response = await request(app)
      .options("/api/auth/login")
      .set("Origin", "https://moneysim.app")
      .set("Access-Control-Request-Method", "POST");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("https://moneysim.app");
  });

  it("creates an unverified account and blocks login until verification", async () => {
    const signup = await request(app).post("/api/auth/signup").send({
      name: "New Player",
      email: "new@example.com",
      password: "password123"
    });

    expect(signup.status).toBe(201);
    expect(signup.body.success).toBe(true);
    expect(signup.body.data.user.isVerified).toBe(false);

    const login = await request(app).post("/api/auth/login").send({
      email: "new@example.com",
      password: "password123"
    });

    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("verifies an email token and returns a JWT on login", async () => {
    const user = await createUser({
      isVerified: false,
      verificationToken: hashToken("raw-token"),
      verificationTokenExpires: new Date(Date.now() + 60_000)
    });

    const verify = await request(app).post("/api/auth/verify-email").send({
      email: user.email,
      token: "raw-token"
    });

    expect(verify.status).toBe(200);

    const login = await request(app).post("/api/auth/login").send({
      email: user.email,
      password: "password123"
    });

    expect(login.status).toBe(200);
    expect(login.body.data.token).toEqual(expect.any(String));
    expect(login.body.data.user.isVerified).toBe(true);
  });

  it("treats repeated email verification as already verified", async () => {
    const user = await createUser({
      isVerified: false,
      verificationToken: hashToken("raw-token"),
      verificationTokenExpires: new Date(Date.now() + 60_000)
    });

    const firstVerify = await request(app).post("/api/auth/verify-email").send({
      email: user.email,
      token: "raw-token"
    });

    const secondVerify = await request(app).post("/api/auth/verify-email").send({
      email: user.email,
      token: "raw-token"
    });

    expect(firstVerify.status).toBe(200);
    expect(secondVerify.status).toBe(200);
    expect(secondVerify.body.data.message).toBe("Email already verified.");
  });
});

describe("catalog and game routes", () => {
  it("serves seeded catalogs to authenticated users", async () => {
    const user = await createUser();
    const authorization = await authHeader(user);

    const jobs = await request(app).get("/api/jobs").set("Authorization", authorization);
    const expenses = await request(app)
      .get("/api/expense-options")
      .set("Authorization", authorization);

    expect(jobs.status).toBe(200);
    expect(jobs.body.data.jobs).toHaveLength(5);
    expect(expenses.status).toBe(200);
    expect(expenses.body.data.options).toHaveLength(12);
  });

  it("starts one active session and rejects a second active run", async () => {
    const user = await createUser();
    const authorization = await authHeader(user);
    const job = await Job.findOne({ title: "Barista" });
    const expenseSelections = await lowExpenseSelections();

    const started = await request(app)
      .post("/api/game/start")
      .set("Authorization", authorization)
      .send({ jobId: job._id.toString(), expenseSelections });

    expect(started.status).toBe(201);
    expect(started.body.data.session.balance).toBe(500);

    const duplicate = await request(app)
      .post("/api/game/start")
      .set("Authorization", authorization)
      .send({ jobId: job._id.toString(), expenseSelections });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("ACTIVE_SESSION_EXISTS");
  });

  it("advances one month or one year and keeps the run active when death is not rolled", async () => {
    const user = await createUser();
    const authorization = await authHeader(user);
    const job = await Job.findOne({ title: "Barista" });
    const expenseSelections = await lowExpenseSelections();

    await request(app)
      .post("/api/game/start")
      .set("Authorization", authorization)
      .send({ lifePath: "work", jobId: job._id.toString(), expenseSelections });

    const advanced = await request(app)
      .post("/api/game/advance")
      .set("Authorization", authorization)
      .send({
        months: 12,
        choices: { foodDays: 20, entertainmentDays: 4, datingDays: 2 }
      });

    const session = advanced.body.data.session;
    expect(advanced.status).toBe(200);
    expect(session.status).toBe("active");
    expect(session.history).toHaveLength(12);
    expect(session.ageMonths).toBe(STARTING_AGE_MONTHS + 12);

    const current = await request(app)
      .get("/api/game/current")
      .set("Authorization", authorization);

    expect(current.body.data.session.status).toBe("active");
  });

  it("ends the run when statistical death is rolled", async () => {
    Math.random.mockReturnValue(0);
    const user = await createUser();
    const authorization = await authHeader(user);
    const job = await Job.findOne({ title: "Barista" });
    const expenseSelections = await lowExpenseSelections();

    await request(app)
      .post("/api/game/start")
      .set("Authorization", authorization)
      .send({ lifePath: "work", jobId: job._id.toString(), expenseSelections });

    const advanced = await request(app)
      .post("/api/game/advance")
      .set("Authorization", authorization)
      .send({
        months: 1,
        choices: { foodDays: 0, entertainmentDays: 0, datingDays: 0 }
      });

    const session = advanced.body.data.session;
    expect(advanced.status).toBe(200);
    expect(session.status).toBe("dead");
    expect(session.finalScore).toEqual(expect.any(Number));
  });
});

describe("leaderboard routes", () => {
  it("is public and returns dead runs sorted by score", async () => {
    const lowUser = await createUser({
      email: "low@example.com",
      name: "Low Score"
    });
    const highUser = await createUser({
      email: "high@example.com",
      name: "High Score"
    });

    await GameSession.create([
      {
        userId: lowUser._id,
        status: "dead",
        currentMonth: 12,
        ageMonths: STARTING_AGE_MONTHS + 12,
        balance: 100,
        currentJobId: (await Job.findOne())._id,
        currentExpenseSelections: await lowExpenseSelections(),
        finalScore: 100,
        completedAt: new Date("2026-01-02T00:00:00.000Z")
      },
      {
        userId: highUser._id,
        status: "dead",
        currentMonth: 12,
        ageMonths: STARTING_AGE_MONTHS + 12,
        balance: 900,
        currentJobId: (await Job.findOne())._id,
        currentExpenseSelections: await lowExpenseSelections(),
        finalScore: 900,
        completedAt: new Date("2026-01-01T00:00:00.000Z")
      }
    ]);

    const response = await request(app).get("/api/leaderboard?limit=2");

    expect(response.status).toBe(200);
    expect(response.body.data.entries.map((entry) => entry.name)).toEqual([
      "High Score",
      "Low Score"
    ]);
  });
});
