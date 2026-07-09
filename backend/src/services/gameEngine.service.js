import { TOTAL_ROUNDS } from "../data/catalog.js";

export function calculateMonthlyExpenses(expenseOptions) {
  return expenseOptions.reduce((total, option) => total + option.monthlyCost, 0);
}

export function calculateMonthlyNet(job, expenseOptions) {
  return job.monthlySalary - calculateMonthlyExpenses(expenseOptions);
}

export function applyMonthlyResult(session, job, expenseOptions) {
  const expenses = calculateMonthlyExpenses(expenseOptions);
  const balanceAfter = session.balance + job.monthlySalary - expenses;
  const historyEntry = {
    round: session.currentRound,
    jobTitle: job.title,
    salary: job.monthlySalary,
    expenses,
    balanceAfter
  };

  session.balance = balanceAfter;
  session.history.push(historyEntry);

  if (session.currentRound >= TOTAL_ROUNDS) {
    session.status = "completed";
    session.finalScore = balanceAfter;
    session.completedAt = new Date();
  } else {
    session.currentRound += 1;
  }

  return session;
}
