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
  sendPasswordResetEmail: vi.fn(),
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
    passwordHash: await bcrypt.hash("Password123!", 12),
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
  it("rejects weak passwords during signup", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({
        name: "Weak User",
        email: "weak@example.com",
        password: "password"
      });

    expect(response.status).toBe(400);
  });

  it("allows the production domain through CORS", async () => {    const response = await request(app)
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
      password: "Password123!"
    });

    expect(signup.status).toBe(201);
    expect(signup.body.success).toBe(true);
    expect(signup.body.data.user.isVerified).toBe(false);

    const login = await request(app).post("/api/auth/login").send({
      email: "new@example.com",
      password: "Password123!"
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
      password: "Password123!"
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

  it("rejects signup passwords that do not meet complexity rules", async () => {
    const signup = await request(app).post("/api/auth/signup").send({
      name: "Weak Password",
      email: "weak@example.com",
      password: "password123"
    });

    expect(signup.status).toBe(400);
    expect(signup.body.error.message).toContain("uppercase");
  });

  it("sends a recovery email and accepts a valid reset token", async () => {
    const user = await createUser();

    const forgot = await request(app).post("/api/auth/forgot-password").send({
      email: user.email
    });

    expect(forgot.status).toBe(200);
    expect(forgot.body.data.message).toContain("password reset link");

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.resetPasswordToken).toEqual(expect.any(String));
    expect(updatedUser.resetPasswordTokenExpires).toBeInstanceOf(Date);

    const invalidReset = await request(app).post("/api/auth/reset-password").send({
      token: "not-the-real-token",
      password: "MoneySim456!"
    });

    expect(invalidReset.status).toBe(400);
    expect(invalidReset.body.error.code).toBe("INVALID_TOKEN");

    updatedUser.resetPasswordToken = hashToken("raw-reset-token");
    updatedUser.resetPasswordTokenExpires = new Date(Date.now() + 60_000);
    await updatedUser.save();

    const reset = await request(app).post("/api/auth/reset-password").send({
      token: "raw-reset-token",
      password: "MoneySim456!"
    });

    expect(reset.status).toBe(200);

    const oldLogin = await request(app).post("/api/auth/login").send({
      email: user.email,
      password: "MoneySim123!"
    });
    const newLogin = await request(app).post("/api/auth/login").send({
      email: user.email,
      password: "MoneySim456!"
    });

    expect(oldLogin.status).toBe(401);
    expect(newLogin.status).toBe(200);
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
    expect(jobs.body.data.jobs.length).toBeGreaterThan(5);
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

  it("keeps degree-required jobs locked until a college player graduates", async () => {
    const user = await createUser();
    const authorization = await authHeader(user);
    const developer = await Job.findOne({ title: "Software Developer" });
    const barista = await Job.findOne({ title: "Barista" });
    const expenseSelections = await lowExpenseSelections();

    const invalidStart = await request(app)
      .post("/api/game/start")
      .set("Authorization", authorization)
      .send({ lifePath: "college", jobId: developer._id.toString(), expenseSelections });
    expect(invalidStart.status).toBe(400);
    expect(invalidStart.body.error.code).toBe("DEGREE_REQUIRED");

    await request(app)
      .post("/api/game/start")
      .set("Authorization", authorization)
      .send({ lifePath: "college", jobId: barista._id.toString(), expenseSelections });

    await GameSession.updateOne(
      { userId: user._id, status: "active" },
      { jobMarketIds: [developer._id] }
    );

    const lockedApplication = await request(app)
      .post("/api/game/job-applications")
      .set("Authorization", authorization)
      .send({ jobId: developer._id.toString() });
    expect(lockedApplication.status).toBe(400);
    expect(lockedApplication.body.error.code).toBe("DEGREE_REQUIRED");

    await GameSession.updateOne(
      { userId: user._id, status: "active" },
      { educationMonths: 48, "skills.technical": 6 }
    );
    Math.random.mockReturnValueOnce(0);
    const unlockedApplication = await request(app)
      .post("/api/game/job-applications")
      .set("Authorization", authorization)
      .send({ jobId: developer._id.toString() });
    expect(unlockedApplication.status).toBe(200);
    expect(unlockedApplication.body.data.application.accepted).toBe(true);
    expect(unlockedApplication.body.data.session.currentJobId.title).toBe("Software Developer");
  });

  it("allows one failed job application per month and refreshes attempts after advancing", async () => {
    const user = await createUser();
    const authorization = await authHeader(user);
    const barista = await Job.findOne({ title: "Barista" });
    const warehouse = await Job.findOne({ title: "Warehouse Picker" });
    const delivery = await Job.findOne({ title: "Delivery Driver" });
    const expenseSelections = await lowExpenseSelections();

    await request(app)
      .post("/api/game/start")
      .set("Authorization", authorization)
      .send({ lifePath: "work", jobId: barista._id.toString(), expenseSelections });

    await GameSession.updateOne(
      { userId: user._id, status: "active" },
      { jobMarketIds: [warehouse._id, delivery._id], appliedJobIds: [] }
    );

    Math.random.mockReturnValueOnce(1);
    const failedApplication = await request(app)
      .post("/api/game/job-applications")
      .set("Authorization", authorization)
      .send({ jobId: warehouse._id.toString() });
    expect(failedApplication.status).toBe(200);
    expect(failedApplication.body.data.application.accepted).toBe(false);
    expect(failedApplication.body.data.session.appliedJobIds).toHaveLength(1);

    const secondApplication = await request(app)
      .post("/api/game/job-applications")
      .set("Authorization", authorization)
      .send({ jobId: delivery._id.toString() });
    expect(secondApplication.status).toBe(409);
    expect(secondApplication.body.error.code).toBe("APPLICATION_USED");

    const advanced = await request(app)
      .post("/api/game/advance")
      .set("Authorization", authorization)
      .send({ months: 1, choices: { foodDays: 20, entertainmentDays: 4, datingDays: 2 } });
    expect(advanced.status).toBe(200);
    expect(advanced.body.data.session.appliedJobIds).toHaveLength(0);
    expect(advanced.body.data.session.jobMarketIds).toHaveLength(6);
  });

  it("locks housing changes until the annual lease expires", async () => {
    const user = await createUser();
    const authorization = await authHeader(user);
    const job = await Job.findOne({ title: "Barista" });
    const expenseSelections = await lowExpenseSelections();
    const studio = await ExpenseOption.findOne({ category: "Housing", tier: "Mid" });

    await request(app)
      .post("/api/game/start")
      .set("Authorization", authorization)
      .send({ lifePath: "work", jobId: job._id.toString(), expenseSelections });

    const lockedChange = await request(app)
      .put("/api/game/expenses")
      .set("Authorization", authorization)
      .send({ category: "Housing", optionId: studio._id.toString() });
    expect(lockedChange.status).toBe(409);
    expect(lockedChange.body.error.code).toBe("LEASE_ACTIVE");

    await request(app)
      .post("/api/game/advance")
      .set("Authorization", authorization)
      .send({ months: 12, choices: { foodDays: 20, entertainmentDays: 4, datingDays: 2 } });

    const leaseChange = await request(app)
      .put("/api/game/expenses")
      .set("Authorization", authorization)
      .send({ category: "Housing", optionId: studio._id.toString() });
    expect(leaseChange.status).toBe(200);
    expect(leaseChange.body.data.session.currentExpenseSelections.Housing.label).toBe("Studio");
    expect(leaseChange.body.data.session.housingLeaseMonthsRemaining).toBe(12);
  });

  it("tracks car wear and allows transportation replacement when the car breaks", async () => {
    const user = await createUser();
    const authorization = await authHeader(user);
    const job = await Job.findOne({ title: "Barista" });
    const expenseSelections = await lowExpenseSelections();
    const usedCar = await ExpenseOption.findOne({ category: "Transportation", tier: "Mid" });
    const newCar = await ExpenseOption.findOne({ category: "Transportation", tier: "High" });

    expenseSelections.Transportation = usedCar._id.toString();
    await request(app)
      .post("/api/game/start")
      .set("Authorization", authorization)
      .send({ lifePath: "work", jobId: job._id.toString(), expenseSelections });

    const lockedChange = await request(app)
      .put("/api/game/expenses")
      .set("Authorization", authorization)
      .send({ category: "Transportation", optionId: newCar._id.toString() });
    expect(lockedChange.status).toBe(409);
    expect(lockedChange.body.error.code).toBe("TRANSPORTATION_TERM_ACTIVE");

    await GameSession.updateOne(
      { userId: user._id, status: "active" },
      { vehicleStatus: { type: "used-car", mileage: 110000, condition: 0, broken: true, lastRepairCost: 0 } }
    );

    const replacement = await request(app)
      .put("/api/game/expenses")
      .set("Authorization", authorization)
      .send({ category: "Transportation", optionId: newCar._id.toString() });
    expect(replacement.status).toBe(200);
    expect(replacement.body.data.session.currentExpenseSelections.Transportation.label).toBe("New Car Lease");
    expect(replacement.body.data.session.vehicleStatus.broken).toBe(false);
    expect(replacement.body.data.session.transportationTermMonthsRemaining).toBe(12);
  });

  it("supports debt payoff, stock investing, homes, and asset buy-sell actions", async () => {
    const user = await createUser();
    const authorization = await authHeader(user);
    const job = await Job.findOne({ title: "Barista" });
    const expenseSelections = await lowExpenseSelections();

    await request(app)
      .post("/api/game/start")
      .set("Authorization", authorization)
      .send({ lifePath: "work", jobId: job._id.toString(), expenseSelections });

    await GameSession.updateOne(
      { userId: user._id, status: "active" },
      { balance: 100000, studentDebt: 5000 }
    );

    const debtPaid = await request(app)
      .post("/api/game/pay-off-debt")
      .set("Authorization", authorization);
    expect(debtPaid.status).toBe(200);
    expect(debtPaid.body.data.session.studentDebt).toBe(0);
    expect(debtPaid.body.data.session.balance).toBe(95000);

    const invested = await request(app)
      .post("/api/game/stocks/invest")
      .set("Authorization", authorization)
      .send({ amount: 1000 });
    expect(invested.status).toBe(200);
    expect(invested.body.data.session.stockPortfolio.value).toBe(1000);

    const soldStocks = await request(app)
      .post("/api/game/stocks/sell")
      .set("Authorization", authorization);
    expect(soldStocks.status).toBe(200);
    expect(soldStocks.body.data.session.stockPortfolio.value).toBe(0);

    const boughtHome = await request(app)
      .post("/api/game/home/buy")
      .set("Authorization", authorization)
      .send({ homeId: "starter-condo" });
    expect(boughtHome.status).toBe(200);
    expect(boughtHome.body.data.session.ownedHome.label).toBe("Starter Condo");

    const soldHome = await request(app)
      .post("/api/game/home/sell")
      .set("Authorization", authorization);
    expect(soldHome.status).toBe(200);
    expect(soldHome.body.data.session.homeOwned).toBe(false);

    const boughtAsset = await request(app)
      .post("/api/game/assets/buy")
      .set("Authorization", authorization)
      .send({ assetId: "savings-bond" });
    expect(boughtAsset.status).toBe(200);
    expect(boughtAsset.body.data.session.assetHoldings).toHaveLength(1);

    const holdingId = boughtAsset.body.data.session.assetHoldings[0]._id;
    const soldAsset = await request(app)
      .post("/api/game/assets/sell")
      .set("Authorization", authorization)
      .send({ holdingId });
    expect(soldAsset.status).toBe(200);
    expect(soldAsset.body.data.session.assetHoldings).toHaveLength(0);
  });

  it("lets a player manually end an active run and receive a recap", async () => {
    const user = await createUser();
    const authorization = await authHeader(user);
    const job = await Job.findOne({ title: "Barista" });
    const expenseSelections = await lowExpenseSelections();

    await request(app)
      .post("/api/game/start")
      .set("Authorization", authorization)
      .send({ lifePath: "work", jobId: job._id.toString(), expenseSelections });

    const ended = await request(app)
      .post("/api/game/end-run")
      .set("Authorization", authorization);

    expect(ended.status).toBe(200);
    expect(ended.body.data.session.status).toBe("dead");
    expect(ended.body.data.session.deathReason).toBe("You ended this run and started over.");
    expect(ended.body.data.session.deathRecap.eventTitle).toBe("Run ended by player");

    const current = await request(app)
      .get("/api/game/current")
      .set("Authorization", authorization);
    expect(current.body.data.session).toBeNull();
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
    expect(session.deathRecap.reason).toEqual(expect.any(String));
    expect(session.deathRecap.chance).toBeGreaterThan(0);
    expect(session.deathRecap.roll).toBe(0);
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
