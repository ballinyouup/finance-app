import { DAYS_PER_MONTH } from "../data/catalog.js";

const DAILY_COSTS = {
  food: 13,
  entertainment: 18,
  dating: 38
};

const COLLEGE = {
  tuitionPerMonth: 1250,
  loanLivingSupport: 700,
  monthsToGraduate: 48,
  partTimeIncomeRate: 0.35,
  graduateIncomeBoost: 1.55
};

const RANDOM_EVENTS = [
  {
    title: "Medical bill",
    chance: 0.025,
    amount: -650,
    needs: { happiness: -8 }
  },
  {
    title: "Car or transit emergency",
    chance: 0.035,
    amount: -280,
    needs: { happiness: -5 }
  },
  {
    title: "Unexpected tax refund",
    chance: 0.025,
    amount: 450,
    needs: { happiness: 4 }
  },
  {
    title: "New relationship spark",
    chance: 0.03,
    amount: -80,
    needs: { love: 12, happiness: 5 }
  },
  {
    title: "Breakup",
    chance: 0.018,
    amount: -120,
    needs: { love: -22, happiness: -14 }
  },
  {
    title: "Promotion or raise",
    chance: 0.018,
    amount: 700,
    needs: { happiness: 8 }
  },
  {
    title: "Scholarship grant",
    chance: 0.02,
    amount: 900,
    needs: { happiness: 6 },
    path: "college"
  },
  {
    title: "Layoff month",
    chance: 0.012,
    amount: -1100,
    needs: { happiness: -12 }
  }
];

export function calculateMonthlyFixedExpenses(expenseOptions) {
  return expenseOptions.reduce((total, option) => total + option.monthlyCost, 0);
}

export function normalizeMonthlyChoices(choices = {}) {
  return {
    foodDays: clampInteger(choices.foodDays ?? 20, 0, DAYS_PER_MONTH),
    entertainmentDays: clampInteger(choices.entertainmentDays ?? 4, 0, DAYS_PER_MONTH),
    datingDays: clampInteger(choices.datingDays ?? 2, 0, DAYS_PER_MONTH)
  };
}

export function applyMonthResult(session, job, expenseOptions, choices = {}) {
  const monthlyChoices = normalizeMonthlyChoices(choices);
  session.monthlyChoices = monthlyChoices;

  const event = pickRandomEvent(session.lifePath);
  const income = calculateIncome(session, job);
  const fixedExpenses = calculateMonthlyFixedExpenses(expenseOptions);
  const variableExpenses = calculateVariableExpenses(monthlyChoices);
  const loanChange = calculateLoanChange(session);
  const eventAmount = event?.amount ?? 0;
  const totalExpenses = roundMoney(fixedExpenses + variableExpenses + Math.max(-eventAmount, 0));
  const totalIncome = roundMoney(income + Math.max(eventAmount, 0) + loanChange);
  const balanceAfter = roundMoney(session.balance + totalIncome - totalExpenses);
  const needsAfter = applyNeedsChanges(session.needs, [
    getMonthlyNeedEffects(monthlyChoices),
    getFinancialStressEffects(balanceAfter, session.studentDebt + loanChange),
    event?.needs ?? {}
  ]);
  const nextAgeMonths = session.ageMonths + 1;
  const nextMonth = session.currentMonth + 1;
  const nextEducationMonths =
    session.lifePath === "college" && session.educationMonths < COLLEGE.monthsToGraduate
      ? session.educationMonths + 1
      : session.educationMonths;
  const nextStudentDebt = Math.max(0, roundMoney(session.studentDebt + loanChange));
  const deathChance = calculateDeathChance(nextAgeMonths, needsAfter, balanceAfter, nextStudentDebt);
  const died = Math.random() < deathChance;

  session.balance = balanceAfter;
  session.needs = needsAfter;
  session.ageMonths = nextAgeMonths;
  session.currentMonth = nextMonth;
  session.educationMonths = nextEducationMonths;
  session.studentDebt = nextStudentDebt;

  const historyEntry = {
    month: session.currentMonth - 1,
    ageMonths: nextAgeMonths,
    path: session.lifePath,
    jobTitle: job.title,
    income: totalIncome,
    expenses: totalExpenses,
    loanChange,
    eventTitle: event?.title,
    eventAmount,
    deathChance,
    died,
    needsAfter,
    balanceAfter,
    studentDebtAfter: nextStudentDebt
  };

  session.history.push(historyEntry);

  if (died) {
    session.status = "dead";
    session.finalScore = calculateFinalScore(session);
    session.deathReason = getDeathReason(nextAgeMonths, needsAfter, balanceAfter);
    session.completedAt = new Date();
  }

  return session;
}

export function applyMonths(session, job, expenseOptions, choices, months) {
  const count = clampInteger(months, 1, 12);

  for (let i = 0; i < count && session.status === "active"; i += 1) {
    applyMonthResult(session, job, expenseOptions, choices);
  }

  return session;
}

export function calculateFinalScore(session) {
  const yearsLived = session.ageMonths / 12 - 18;
  const averageNeeds =
    (session.needs.happiness +
      session.needs.hunger +
      session.needs.entertainment +
      session.needs.love) /
    4;

  return Math.round(
    session.balance -
      session.studentDebt +
      yearsLived * 250 +
      (averageNeeds - 50) * 30
  );
}

function calculateIncome(session, job) {
  const graduated = session.educationMonths >= COLLEGE.monthsToGraduate;
  const baseIncome = graduated
    ? job.monthlySalary * COLLEGE.graduateIncomeBoost
    : job.monthlySalary;

  if (session.lifePath === "college" && !graduated) {
    return roundMoney(baseIncome * COLLEGE.partTimeIncomeRate);
  }

  return roundMoney(baseIncome);
}

function calculateVariableExpenses(choices) {
  return roundMoney(
    choices.foodDays * DAILY_COSTS.food +
      choices.entertainmentDays * DAILY_COSTS.entertainment +
      choices.datingDays * DAILY_COSTS.dating
  );
}

function calculateLoanChange(session) {
  if (session.lifePath !== "college" || session.educationMonths >= COLLEGE.monthsToGraduate) {
    return 0;
  }

  return COLLEGE.tuitionPerMonth + COLLEGE.loanLivingSupport;
}

function getMonthlyNeedEffects(choices) {
  const skippedFoodDays = DAYS_PER_MONTH - choices.foodDays;
  const quietDays = DAYS_PER_MONTH - choices.entertainmentDays;
  const noDatingDays = DAYS_PER_MONTH - choices.datingDays;

  return {
    hunger: choices.foodDays * 1.1 - skippedFoodDays * 2.4,
    happiness: choices.entertainmentDays * 0.9 + choices.datingDays * 0.55 - skippedFoodDays * 0.5,
    entertainment: choices.entertainmentDays * 1.7 - quietDays * 0.75,
    love: choices.datingDays * 1.5 - noDatingDays * 0.35
  };
}

function getFinancialStressEffects(balance, studentDebt) {
  const effects = { happiness: 0, love: 0 };

  if (balance < 0) {
    effects.happiness -= 8;
    effects.love -= 2;
  }

  if (studentDebt > 30000) {
    effects.happiness -= 3;
  }

  return effects;
}

function applyNeedsChanges(currentNeeds, changes) {
  const next = {
    happiness: currentNeeds.happiness,
    hunger: currentNeeds.hunger,
    entertainment: currentNeeds.entertainment,
    love: currentNeeds.love
  };

  for (const changeSet of changes) {
    for (const [key, value] of Object.entries(changeSet)) {
      next[key] = clamp(roundMoney(next[key] + value), 0, 100);
    }
  }

  return next;
}

function calculateDeathChance(ageMonths, needs, balance, studentDebt) {
  const ageYears = ageMonths / 12;
  let chance = 0.0005;

  if (ageYears > 45) {
    chance += (ageYears - 45) * 0.0008;
  }

  if (ageYears > 70) {
    chance += (ageYears - 70) * 0.004;
  }

  if (needs.hunger < 20) {
    chance += (20 - needs.hunger) * 0.004;
  }

  if (needs.happiness < 15) {
    chance += (15 - needs.happiness) * 0.0015;
  }

  if (balance < -5000) {
    chance += 0.015;
  }

  if (studentDebt > 90000) {
    chance += 0.004;
  }

  return clamp(roundMoney(chance), 0.0005, 0.55);
}

function getDeathReason(ageMonths, needs, balance) {
  if (needs.hunger < 20) {
    return "Poor nutrition caught up with you.";
  }

  if (balance < -5000) {
    return "Financial stress became overwhelming.";
  }

  if (ageMonths / 12 > 70) {
    return "Old age caught up with you.";
  }

  return "A random life event ended the run.";
}

function pickRandomEvent(path) {
  for (const event of RANDOM_EVENTS) {
    if (event.path && event.path !== path) {
      continue;
    }

    if (Math.random() < event.chance) {
      return event;
    }
  }

  return null;
}

function clampInteger(value, min, max) {
  return Math.max(min, Math.min(max, Number.parseInt(value, 10)));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}
