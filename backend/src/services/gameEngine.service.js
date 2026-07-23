import { DAYS_PER_MONTH } from "../data/catalog.js";

const DAILY_COSTS = { food: 13, entertainment: 18, dating: 38 };
const COLLEGE = { tuitionPerMonth: 1250, loanLivingSupport: 700, monthsToGraduate: 48, partTimeIncomeRate: 0.35, graduateIncomeBoost: 1.55 };
const MAJOR_SKILLS = { "computer-science": "technical", business: "business", communications: "communication" };

const RANDOM_EVENTS = [
  { title: "Medical bill", chance: 0.025, amount: -650, needs: { happiness: -8 } },
  { title: "Car or transit emergency", chance: 0.035, amount: -280, needs: { happiness: -5 } },
  { title: "Unexpected tax refund", chance: 0.025, amount: 450, needs: { happiness: 4 } },
  { title: "New relationship spark", chance: 0.03, amount: -80, needs: { love: 12, happiness: 5 } },
  { title: "Breakup", chance: 0.018, amount: -120, needs: { love: -22, happiness: -14 } },
  { title: "Job interview opportunity", chance: 0.02, amount: 250, needs: { happiness: 5 } },
  { title: "Scholarship grant", chance: 0.02, amount: 900, needs: { happiness: 6 }, path: "college" },
  { title: "Layoff month", chance: 0.012, amount: -450, needs: { happiness: -12 } },
  { title: "Rent increase", chance: 0.02, amount: -350, needs: { happiness: -5 } },
  { title: "Birthday celebration", chance: 0.018, amount: -120, needs: { happiness: 10, love: 5 } },
  { title: "Roommate moves in", chance: 0.018, amount: 300, needs: { happiness: -2, love: 4 } },
  { title: "Unexpected opportunity", chance: 0.015, amount: 600, needs: { happiness: 7 } }
];

export function calculateMonthlyFixedExpenses(expenseOptions) {
  return expenseOptions.reduce((total, option) => total + option.monthlyCost, 0);
}

export function normalizeMonthlyChoices(choices = {}) {
  return {
    foodDays: clampInteger(choices.foodDays ?? 20, 0, DAYS_PER_MONTH),
    entertainmentDays: clampInteger(choices.entertainmentDays ?? 4, 0, DAYS_PER_MONTH),
    datingDays: clampInteger(choices.datingDays ?? 2, 0, DAYS_PER_MONTH),
    activity: ["study", "exercise", "recreation", "rest"].includes(choices.activity) ? choices.activity : "rest",
    internship: Boolean(choices.internship),
    debtPayment: clampInteger(choices.debtPayment ?? 0, 0, 2000)
  };
}

export function applyMonthResult(session, job, expenseOptions, choices = {}) {
  const monthlyChoices = normalizeMonthlyChoices(choices);
  session.monthlyChoices = monthlyChoices;
  const event = pickRandomEvent(session.lifePath);
  const loanChange = calculateLoanChange(session);
  const debtPayment = Math.min(monthlyChoices.debtPayment, session.studentDebt + loanChange);
  const internshipIncome = getInternshipIncome(session, monthlyChoices);
  const transportation = applyContractAndVehicleMonth(session, expenseOptions);
  const wealth = applyWealthMonth(session);
  const totalIncome = roundMoney(calculateIncome(session, job) + internshipIncome + Math.max(event?.amount ?? 0, 0) + loanChange);
  const totalExpenses = roundMoney(calculateMonthlyFixedExpenses(expenseOptions) + calculateVariableExpenses(monthlyChoices) + debtPayment + transportation.cost + wealth.homeUpkeep + Math.max(-(event?.amount ?? 0), 0));
  const balanceAfter = roundMoney(session.balance + totalIncome - totalExpenses);
  const needsAfter = applyNeedsChanges(session.needs, [getMonthlyNeedEffects(monthlyChoices), getActivityEffects(monthlyChoices.activity), getExpenseQualityEffects(expenseOptions, session), getFinancialStressEffects(balanceAfter, session.studentDebt + loanChange), event?.needs ?? {}]);
  const skillsAfter = applySkillProgress(session, monthlyChoices);
  const nextAgeMonths = session.ageMonths + 1;
  const nextEducationMonths = session.lifePath === "college" && session.educationMonths < COLLEGE.monthsToGraduate ? session.educationMonths + 1 : session.educationMonths;
  const nextStudentDebt = Math.max(0, roundMoney(session.studentDebt + loanChange - debtPayment));
  const graduatedThisMonth = session.lifePath === "college" && session.educationMonths < COLLEGE.monthsToGraduate && nextEducationMonths >= COLLEGE.monthsToGraduate;
  const career = updateCareer(session, needsAfter, skillsAfter, job, event);
  const deathChance = calculateDeathChance(nextAgeMonths, needsAfter, balanceAfter, nextStudentDebt);
  const deathRoll = Math.random();
  const died = deathRoll < deathChance;

  session.balance = balanceAfter;
  session.needs = needsAfter;
  session.skills = skillsAfter;
  session.ageMonths = nextAgeMonths;
  session.currentMonth += 1;
  session.educationMonths = nextEducationMonths;
  session.studentDebt = nextStudentDebt;
  session.careerLevel = career.level;
  session.careerPerformance = career.performance;
  session.unemployedMonths = career.unemployedMonths;
  session.completedGoals = updateGoals(session, nextAgeMonths, nextEducationMonths, nextStudentDebt);
  session.history.push({ month: session.currentMonth - 1, ageMonths: nextAgeMonths, path: session.lifePath, jobTitle: job.title, income: totalIncome, expenses: totalExpenses, loanChange, eventTitle: [event?.title, transportation.eventTitle, wealth.eventTitle, graduatedThisMonth ? "Graduation ceremony" : null, career.promoted ? "Promotion earned" : null].filter(Boolean).join(" · ") || undefined, eventAmount: (event?.amount ?? 0) - transportation.cost - wealth.homeUpkeep, deathChance, died, needsAfter, balanceAfter, studentDebtAfter: nextStudentDebt });

  if (died) {
    session.status = "dead";
    session.finalScore = calculateFinalScore(session);
    session.deathReason = getDeathReason(nextAgeMonths, needsAfter, balanceAfter, nextStudentDebt, event);
    session.deathRecap = {
      reason: session.deathReason,
      roll: roundMoney(deathRoll),
      chance: deathChance,
      ageMonths: nextAgeMonths,
      balance: balanceAfter,
      studentDebt: nextStudentDebt,
      assetValue: calculateInvestableAssets(session),
      finalScore: session.finalScore,
      jobTitle: job.title,
      eventTitle: event?.title,
      needs: needsAfter
    };
    session.completedAt = new Date();
  }
  return session;
}

export function applyMonths(session, job, expenseOptions, choices, months) {
  for (let i = 0; i < clampInteger(months, 1, 12) && session.status === "active"; i += 1) applyMonthResult(session, job, expenseOptions, choices);
  return session;
}

export function calculateFinalScore(session) {
  const averageNeeds = (session.needs.happiness + session.needs.hunger + session.needs.entertainment + session.needs.love + (session.needs.energy ?? 70)) / 5;
  return Math.round(session.balance + calculateInvestableAssets(session) - session.studentDebt + (session.ageMonths / 12 - 18) * 250 + (averageNeeds - 50) * 30 + (session.completedGoals?.length ?? 0) * 500);
}

export function calculateInvestableAssets(session) {
  return roundMoney(
    (session.stockPortfolio?.value ?? 0) +
    (session.ownedHome?.estimatedValue ?? 0) +
    (session.assetHoldings ?? []).reduce((total, asset) => total + (asset.estimatedValue ?? 0), 0)
  );
}

function calculateIncome(session, job) {
  if (session.unemployedMonths > 0) return 0;
  const graduated = session.educationMonths >= COLLEGE.monthsToGraduate;
  const base = (graduated ? job.monthlySalary * COLLEGE.graduateIncomeBoost : job.monthlySalary) * (1 + (session.careerLevel ?? 0) * 0.12);
  return roundMoney(session.lifePath === "college" && !graduated ? base * COLLEGE.partTimeIncomeRate : base);
}

function getInternshipIncome(session, choices) {
  return session.lifePath === "college" && session.educationMonths < COLLEGE.monthsToGraduate && choices.internship ? 550 : 0;
}

function applyWealthMonth(session) {
  let eventTitle = null;
  let homeUpkeep = 0;

  if (session.stockPortfolio?.value > 0) {
    const returnRate = 0.004 + (Math.random() - 0.5) * 0.09;
    session.stockPortfolio.value = Math.max(0, roundMoney(session.stockPortfolio.value * (1 + returnRate)));
    eventTitle = Math.abs(returnRate) >= 0.035
      ? `Stock portfolio ${returnRate > 0 ? "rallied" : "dropped"}`
      : eventTitle;
  }

  if (session.ownedHome?.estimatedValue > 0) {
    const returnRate = (session.ownedHome.drift ?? 0.002) + (Math.random() - 0.45) * (session.ownedHome.volatility ?? 0.012);
    session.ownedHome.estimatedValue = Math.max(0, roundMoney(session.ownedHome.estimatedValue * (1 + returnRate)));
    homeUpkeep = session.ownedHome.monthlyUpkeep ?? 0;
  }

  if (session.assetHoldings?.length) {
    for (const asset of session.assetHoldings) {
      const returnRate = (asset.drift ?? 0) + (Math.random() - 0.5) * (asset.volatility ?? 0);
      asset.estimatedValue = Math.max(0, roundMoney(asset.estimatedValue * (1 + returnRate)));
    }
  }

  return { homeUpkeep, eventTitle };
}

function calculateVariableExpenses(choices) { return roundMoney(choices.foodDays * DAILY_COSTS.food + choices.entertainmentDays * DAILY_COSTS.entertainment + choices.datingDays * DAILY_COSTS.dating); }
function calculateLoanChange(session) { return session.lifePath === "college" && session.educationMonths < COLLEGE.monthsToGraduate ? COLLEGE.tuitionPerMonth + COLLEGE.loanLivingSupport : 0; }

function getMonthlyNeedEffects(choices) {
  return { hunger: choices.foodDays * 1.1 - (DAYS_PER_MONTH - choices.foodDays) * 2.4, happiness: choices.entertainmentDays * 0.9 + choices.datingDays * 0.55 - (DAYS_PER_MONTH - choices.foodDays) * 0.5, entertainment: choices.entertainmentDays * 1.7 - (DAYS_PER_MONTH - choices.entertainmentDays) * 0.75, love: choices.datingDays * 1.5 - (DAYS_PER_MONTH - choices.datingDays) * 0.35, energy: -8 };
}
function getActivityEffects(activity) { return { study: { energy: -14, happiness: -2 }, exercise: { energy: -12, happiness: 5, hunger: -3 }, recreation: { energy: -9, happiness: 8, entertainment: 12 }, rest: { energy: 24, happiness: 2 } }[activity] ?? { energy: 24, happiness: 2 }; }
function getFinancialStressEffects(balance, studentDebt) { return { happiness: (balance < 0 ? -8 : 0) + (studentDebt > 30000 ? -3 : 0), love: balance < 0 ? -2 : 0 }; }

function applySkillProgress(session, choices) {
  const skills = { technical: session.skills?.technical ?? 0, business: session.skills?.business ?? 0, communication: session.skills?.communication ?? 0 };
  const majorSkill = MAJOR_SKILLS[session.major] ?? "communication";
  if (choices.activity === "study" && session.lifePath === "college") skills[majorSkill] = Math.min(10, skills[majorSkill] + 1);
  if (choices.activity === "study" && session.lifePath !== "college") {
    skills.communication = Math.min(10, skills.communication + 0.5);
    skills.business = Math.min(10, skills.business + 0.35);
    skills.technical = Math.min(10, skills.technical + 0.25);
  }
  if (choices.internship && session.lifePath === "college") skills[majorSkill] = Math.min(10, skills[majorSkill] + 1);
  if (choices.activity === "recreation") skills.communication = Math.min(10, skills.communication + 0.25);
  return skills;
}

function applyContractAndVehicleMonth(session, expenseOptions) {
  session.housingLeaseMonthsRemaining = Math.max(0, (session.housingLeaseMonthsRemaining ?? 12) - 1);
  session.transportationTermMonthsRemaining = Math.max(0, (session.transportationTermMonthsRemaining ?? 12) - 1);

  const transportationOption = expenseOptions.find((option) => option.category === "Transportation");

  if (!transportationOption || transportationOption.tier === "Low") {
    session.vehicleStatus = { type: "none", mileage: 0, condition: 100, broken: false, lastRepairCost: 0 };
    return { cost: 0, eventTitle: null };
  }

  const status = session.vehicleStatus ?? {};
  const isUsed = transportationOption.tier === "Mid";
  status.type = isUsed ? "used-car" : "new-car";
  status.mileage = Math.max(0, status.mileage ?? (isUsed ? 80000 : 5000));
  status.condition = Math.max(0, Math.min(100, status.condition ?? (isUsed ? 72 : 96)));
  status.lastRepairCost = 0;

  if (status.broken) {
    session.vehicleStatus = status;
    return { cost: 0, eventTitle: "Car is broken" };
  }

  const monthlyMiles = isUsed ? 950 : 850;
  const baseWear = isUsed ? 4.5 : 2.5;
  const roughMonthWear = Math.random() < (isUsed ? 0.16 : 0.08) ? 5 : 0;
  status.mileage += monthlyMiles;
  status.condition = Math.max(0, roundMoney(status.condition - baseWear - roughMonthWear));

  const breakChance = status.condition < 20 ? 0.28 : status.condition < 35 ? 0.12 : 0.02;
  if (status.condition <= 8 || Math.random() < breakChance) {
    status.broken = true;
    session.vehicleStatus = status;
    return { cost: 0, eventTitle: "Car broke down" };
  }

  const repairChance = status.condition < 50 ? 0.3 : status.condition < 70 ? 0.12 : 0.03;
  if (Math.random() < repairChance) {
    const repairCost = Math.round((isUsed ? 320 : 180) + (100 - status.condition) * (isUsed ? 8 : 5));
    status.condition = Math.min(100, roundMoney(status.condition + (isUsed ? 12 : 8)));
    status.lastRepairCost = repairCost;
    session.vehicleStatus = status;
    return { cost: repairCost, eventTitle: `Car repair bill (${repairCost})` };
  }

  session.vehicleStatus = status;
  return { cost: 0, eventTitle: null };
}

function getExpenseQualityEffects(expenseOptions, session) {
  const effects = { happiness: 0, hunger: 0, entertainment: 0, love: 0, energy: 0 };

  for (const option of expenseOptions) {
    if (option.category === "Housing") {
      if (option.tier === "Low") {
        effects.happiness -= 2;
        effects.energy -= 4;
        effects.love -= 1;
      }
      if (option.tier === "Mid") {
        effects.happiness += 1;
        effects.energy += 2;
      }
      if (option.tier === "High") {
        effects.happiness += 4;
        effects.energy += 5;
        effects.love += 2;
      }
    }

    if (option.category === "Transportation") {
      if (session.vehicleStatus?.broken) {
        effects.happiness -= 6;
        effects.energy -= 8;
        continue;
      }

      if (option.tier === "Low") {
        effects.happiness -= 1;
        effects.energy -= 3;
      }
      if (option.tier === "Mid") {
        effects.energy += 1;
      }
      if (option.tier === "High") {
        effects.happiness += 1;
        effects.energy += 3;
      }
    }
  }

  return effects;
}

function updateCareer(session, needs, skills, job, event) {
  let performance = (session.careerPerformance ?? 0) + (needs.energy >= 45 && needs.happiness >= 40 ? 12 : 4);
  let level = session.careerLevel ?? 0;
  let unemployedMonths = Math.max(0, (session.unemployedMonths ?? 0) - 1);
  if (event?.title === "Layoff month") { unemployedMonths = 1; performance = Math.max(0, performance - 25); }
  const promoted = performance >= 100 && level < 3 && (skills[job.requiredSkill] ?? 0) >= (job.requiredSkillLevel ?? 0);
  if (promoted) { level += 1; performance = 0; }
  return { level, performance, promoted, unemployedMonths };
}

function updateGoals(session, ageMonths, educationMonths, studentDebt) {
  const goals = new Set(session.completedGoals ?? []);
  if (session.balance >= 10000) goals.add("Save $10,000");
  if (ageMonths >= 40 * 12) goals.add("Reach age 40");
  if (session.homeOwned) goals.add("Buy a home");
  if (session.lifePath === "college" && educationMonths >= COLLEGE.monthsToGraduate && studentDebt === 0) goals.add("Graduate debt-free");
  return [...goals];
}

function applyNeedsChanges(currentNeeds, changes) {
  const next = { happiness: currentNeeds.happiness, hunger: currentNeeds.hunger, entertainment: currentNeeds.entertainment, love: currentNeeds.love, energy: currentNeeds.energy ?? 70 };
  for (const change of changes) for (const [key, value] of Object.entries(change)) next[key] = clamp(roundMoney(next[key] + value), 0, 100);
  return next;
}

function calculateDeathChance(ageMonths, needs, balance, studentDebt) {
  const ageYears = ageMonths / 12;
  let chance = ageYears >= 50 ? 0.0005 : 0.00005;
  if (ageMonths / 12 > 45) chance += (ageMonths / 12 - 45) * 0.0008;
  if (ageMonths / 12 > 70) chance += (ageMonths / 12 - 70) * 0.004;
  if (needs.hunger < 20) chance += (20 - needs.hunger) * 0.004;
  if (needs.happiness < 15) chance += (15 - needs.happiness) * 0.0015;
  if (needs.energy < 20) chance += (20 - needs.energy) * 0.002;
  if (balance < -5000) chance += 0.015;
  if (studentDebt > 90000) chance += 0.004;
  return clamp(roundMoney(chance), 0.00005, 0.55);
}
function getDeathReason(ageMonths, needs, balance, studentDebt, event) {
  if (needs.hunger < 20) return "Poor nutrition caught up with you.";
  if (needs.energy < 20) return "Exhaustion caught up with you.";
  if (needs.happiness < 15) return "Your mental health collapsed.";
  if (balance < -5000) return "Financial stress became overwhelming.";
  if (studentDebt > 90000) return "Crushing student debt took a severe toll.";
  if (ageMonths / 12 > 70) return "Old age caught up with you.";
  if (event?.title) return `A rare complication followed ${event.title.toLowerCase()}.`;
  return "A rare unexpected life event ended the run.";
}
function pickRandomEvent(path) { for (const event of RANDOM_EVENTS) if ((!event.path || event.path === path) && Math.random() < event.chance) return event; return null; }
function clampInteger(value, min, max) { return Math.max(min, Math.min(max, Number.parseInt(value, 10))); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function roundMoney(value) { return Math.round(value * 100) / 100; }
