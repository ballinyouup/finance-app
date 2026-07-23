import { describe, expect, it, vi } from "vitest";
import { STARTING_AGE_MONTHS } from "../data/catalog.js";
import {
  applyMonthResult,
  applyMonths,
  calculateFinalScore,
  calculateInvestableAssets,
  calculateMonthlyFixedExpenses,
  normalizeMonthlyChoices
} from "../services/gameEngine.service.js";

const baristaJob = {
  title: "Barista",
  monthlySalary: 1800,
  requiredSkill: "communication",
  requiredSkillLevel: 0
};

const lowExpenseOptions = [
  { category: "Housing", tier: "Low", monthlyCost: 700 },
  { category: "Transportation", tier: "Low", monthlyCost: 90 }
];

function createSession(overrides = {}) {
  return {
    status: "active",
    lifePath: "work",
    currentMonth: 1,
    ageMonths: STARTING_AGE_MONTHS,
    balance: 500,
    studentDebt: 0,
    educationMonths: 0,
    skills: { technical: 0, business: 0, communication: 0 },
    careerLevel: 0,
    careerPerformance: 0,
    unemployedMonths: 0,
    completedGoals: [],
    homeOwned: false,
    needs: {
      happiness: 70,
      hunger: 70,
      entertainment: 70,
      love: 50,
      energy: 70
    },
    history: [],
    assetHoldings: [],
    stockPortfolio: { invested: 0, value: 0 },
    ...overrides
  };
}

describe("game engine service", () => {
  it("normalizes monthly choices with safe defaults and bounded day counts", () => {
    expect(
      normalizeMonthlyChoices({
        foodDays: 99,
        entertainmentDays: -3,
        datingDays: "12",
        activity: "exercise",
        internship: 1,
        debtPayment: 5000
      })
    ).toEqual({
      foodDays: 30,
      entertainmentDays: 0,
      datingDays: 12,
      activity: "exercise",
      internship: true,
      debtPayment: 2000
    });

    expect(normalizeMonthlyChoices({ activity: "invalid" })).toMatchObject({
      foodDays: 20,
      entertainmentDays: 4,
      datingDays: 2,
      activity: "rest",
      internship: false,
      debtPayment: 0
    });
  });

  it("calculates fixed expenses and investable assets from selected holdings", () => {
    const session = createSession({
      stockPortfolio: { invested: 5000, value: 6200.45 },
      ownedHome: { estimatedValue: 30500.25 },
      assetHoldings: [
        { estimatedValue: 1200.2 },
        { estimatedValue: 850.1 }
      ]
    });

    expect(calculateMonthlyFixedExpenses(lowExpenseOptions)).toBe(790);
    expect(calculateInvestableAssets(session)).toBe(38751);
  });

  it("scores final runs from cash, assets, debt, age, needs, and goals", () => {
    const session = createSession({
      ageMonths: STARTING_AGE_MONTHS + 24,
      balance: 12000,
      studentDebt: 1500,
      completedGoals: ["Save $10,000", "Buy a home"],
      needs: {
        happiness: 80,
        hunger: 75,
        entertainment: 65,
        love: 70,
        energy: 60
      },
      stockPortfolio: { invested: 4000, value: 4500 },
      ownedHome: { estimatedValue: 30000 },
      assetHoldings: [{ estimatedValue: 1000 }]
    });

    expect(calculateFinalScore(session)).toBe(48100);
  });

  it("applies a stable work month and records income, expenses, needs, and history", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    const session = createSession();

    applyMonthResult(session, baristaJob, lowExpenseOptions, {
      foodDays: 20,
      entertainmentDays: 4,
      datingDays: 2,
      activity: "rest",
      internship: false,
      debtPayment: 0
    });

    expect(session.status).toBe("active");
    expect(session.currentMonth).toBe(2);
    expect(session.ageMonths).toBe(STARTING_AGE_MONTHS + 1);
    expect(session.balance).toBe(1102);
    expect(session.monthlyChoices.activity).toBe("rest");
    expect(session.housingLeaseMonthsRemaining).toBe(11);
    expect(session.transportationTermMonthsRemaining).toBe(11);
    expect(session.history).toHaveLength(1);
    expect(session.history[0]).toMatchObject({
      month: 1,
      income: 1800,
      expenses: 1198,
      died: false,
      balanceAfter: 1102,
      studentDebtAfter: 0
    });
    expect(session.needs.energy).toBe(79);

    vi.restoreAllMocks();
  });

  it("advances college students through tuition debt, internship income, study skills, and graduation", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    const session = createSession({
      lifePath: "college",
      major: "computer-science",
      educationMonths: 47,
      skills: { technical: 4, business: 0, communication: 0 },
      balance: 1000
    });

    applyMonthResult(session, baristaJob, lowExpenseOptions, {
      foodDays: 20,
      entertainmentDays: 4,
      datingDays: 2,
      activity: "study",
      internship: true,
      debtPayment: 0
    });

    expect(session.educationMonths).toBe(48);
    expect(session.studentDebt).toBe(1950);
    expect(session.skills.technical).toBe(6);
    expect(session.history[0].loanChange).toBe(1950);
    expect(session.history[0].eventTitle).toBe("Graduation ceremony");
    expect(session.balance).toBe(2932);

    vi.restoreAllMocks();
  });

  it("ends the run when low needs create a death chance and the death roll lands under it", () => {
    const randomValues = [...Array(11).fill(1), 0];
    vi.spyOn(Math, "random").mockImplementation(() => randomValues.shift() ?? 1);
    const session = createSession({
      needs: {
        happiness: 10,
        hunger: 5,
        entertainment: 40,
        love: 30,
        energy: 10
      },
      balance: -6000
    });

    applyMonthResult(session, baristaJob, lowExpenseOptions, {
      foodDays: 0,
      entertainmentDays: 0,
      datingDays: 0,
      activity: "study",
      internship: false,
      debtPayment: 0
    });

    expect(session.status).toBe("dead");
    expect(session.finalScore).toEqual(expect.any(Number));
    expect(session.deathReason).toBe("Poor nutrition caught up with you.");
    expect(session.deathRecap).toMatchObject({
      roll: 0,
      balance: session.balance,
      studentDebt: 0,
      jobTitle: "Barista"
    });
    expect(session.completedAt).toBeInstanceOf(Date);

    vi.restoreAllMocks();
  });

  it("caps bulk advancement at twelve months and stops when a run is no longer active", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    const session = createSession();

    applyMonths(
      session,
      baristaJob,
      lowExpenseOptions,
      { foodDays: 20, entertainmentDays: 4, datingDays: 2 },
      24
    );

    expect(session.currentMonth).toBe(13);
    expect(session.history).toHaveLength(12);

    session.status = "dead";
    applyMonths(session, baristaJob, lowExpenseOptions, {}, 5);
    expect(session.currentMonth).toBe(13);

    vi.restoreAllMocks();
  });
});
