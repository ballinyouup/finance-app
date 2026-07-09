export const REQUIRED_EXPENSE_CATEGORIES = [
  "Housing",
  "Food",
  "Transportation",
  "Entertainment"
];
export const MONTHLY_EXPENSE_CATEGORIES = [
  "Housing",
  "Transportation"
];

export const STARTING_BALANCE = 500;
export const DAYS_PER_MONTH = 30;
export const STARTING_AGE_MONTHS = 18 * 12;
export const STARTING_NEEDS = {
  happiness: 70,
  hunger: 70,
  entertainment: 70,
  love: 50
};

export const LIFE_PATHS = ["work", "college"];

export const MONTHLY_CHOICE_LIMITS = {
  foodDays: { min: 0, max: DAYS_PER_MONTH },
  entertainmentDays: { min: 0, max: DAYS_PER_MONTH },
  datingDays: { min: 0, max: DAYS_PER_MONTH }
};

export const jobsSeed = [
  { title: "Barista", monthlySalary: 1800, tier: 1 },
  { title: "Retail Associate", monthlySalary: 2200, tier: 1 },
  { title: "Office Admin", monthlySalary: 3000, tier: 2 },
  { title: "Marketing Coordinator", monthlySalary: 4000, tier: 3 },
  { title: "Software Developer", monthlySalary: 6500, tier: 4 }
];

export const expenseOptionsSeed = [
  { category: "Housing", tier: "Low", label: "Shared Apartment", monthlyCost: 700 },
  { category: "Housing", tier: "Mid", label: "Studio", monthlyCost: 1200 },
  { category: "Housing", tier: "High", label: "One-Bedroom Downtown", monthlyCost: 2000 },
  { category: "Food", tier: "Low", label: "Cook at Home", monthlyCost: 300 },
  { category: "Food", tier: "Mid", label: "Mixed", monthlyCost: 500 },
  { category: "Food", tier: "High", label: "Eat Out Often", monthlyCost: 900 },
  { category: "Transportation", tier: "Low", label: "Public Transit", monthlyCost: 90 },
  { category: "Transportation", tier: "Mid", label: "Used Car", monthlyCost: 300 },
  { category: "Transportation", tier: "High", label: "New Car", monthlyCost: 600 },
  { category: "Entertainment", tier: "Low", label: "Minimal", monthlyCost: 50 },
  { category: "Entertainment", tier: "Mid", label: "Occasional", monthlyCost: 150 },
  { category: "Entertainment", tier: "High", label: "Frequent", monthlyCost: 400 }
];
