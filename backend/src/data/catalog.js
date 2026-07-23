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
  love: 50,
  energy: 70
};

export const LIFE_PATHS = ["work", "college"];
export const MAJORS = ["computer-science", "business", "communications"];

export const MONTHLY_CHOICE_LIMITS = {
  foodDays: { min: 0, max: DAYS_PER_MONTH },
  entertainmentDays: { min: 0, max: DAYS_PER_MONTH },
  datingDays: { min: 0, max: DAYS_PER_MONTH }
};
export const ACTIVITIES = ["study", "exercise", "recreation", "rest"];

export const jobsSeed = [
  { title: "Barista", monthlySalary: 1800, tier: 1, careerTrack: "Service", requiredSkill: "communication", requiredSkillLevel: 0 },
  { title: "Retail Associate", monthlySalary: 2200, tier: 1, careerTrack: "Service", requiredSkill: "communication", requiredSkillLevel: 1 },
  { title: "Delivery Driver", monthlySalary: 2400, tier: 1, careerTrack: "Logistics", requiredSkill: "communication", requiredSkillLevel: 1 },
  { title: "Warehouse Picker", monthlySalary: 2600, tier: 1, careerTrack: "Logistics", requiredSkill: "business", requiredSkillLevel: 0 },
  { title: "Call Center Rep", monthlySalary: 2800, tier: 1, careerTrack: "Service", requiredSkill: "communication", requiredSkillLevel: 2 },
  { title: "Office Admin", monthlySalary: 3000, tier: 2, careerTrack: "Business", requiredSkill: "business", requiredSkillLevel: 2 },
  { title: "Bookkeeping Assistant", monthlySalary: 3400, tier: 2, careerTrack: "Business", requiredSkill: "business", requiredSkillLevel: 3 },
  { title: "IT Support Tech", monthlySalary: 3600, tier: 2, careerTrack: "Technology", requiredSkill: "technical", requiredSkillLevel: 3 },
  { title: "Sales Associate", monthlySalary: 3800, tier: 2, careerTrack: "Sales", requiredSkill: "communication", requiredSkillLevel: 3 },
  { title: "Marketing Coordinator", monthlySalary: 4000, tier: 3, careerTrack: "Business", requiredSkill: "communication", requiredSkillLevel: 4 },
  { title: "Operations Analyst", monthlySalary: 4700, tier: 3, careerTrack: "Business", requiredSkill: "business", requiredSkillLevel: 4 },
  { title: "Junior Web Developer", monthlySalary: 5200, tier: 3, careerTrack: "Technology", requiredSkill: "technical", requiredSkillLevel: 5 },
  { title: "Account Manager", monthlySalary: 5400, tier: 3, careerTrack: "Sales", requiredSkill: "communication", requiredSkillLevel: 5 },
  { title: "Financial Analyst", monthlySalary: 6200, tier: 4, requiresDegree: true, careerTrack: "Business", requiredSkill: "business", requiredSkillLevel: 6 },
  { title: "Software Developer", monthlySalary: 6500, tier: 4, requiresDegree: true, careerTrack: "Technology", requiredSkill: "technical", requiredSkillLevel: 6 },
  { title: "Product Manager", monthlySalary: 7600, tier: 4, requiresDegree: true, careerTrack: "Technology", requiredSkill: "business", requiredSkillLevel: 7 },
  { title: "Senior Engineer", monthlySalary: 9200, tier: 5, requiresDegree: true, careerTrack: "Technology", requiredSkill: "technical", requiredSkillLevel: 8 },
  { title: "Finance Director", monthlySalary: 9800, tier: 5, requiresDegree: true, careerTrack: "Business", requiredSkill: "business", requiredSkillLevel: 8 },
  { title: "Communications Director", monthlySalary: 9000, tier: 5, requiresDegree: true, careerTrack: "Business", requiredSkill: "communication", requiredSkillLevel: 8 }
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
  { category: "Transportation", tier: "High", label: "New Car Lease", monthlyCost: 600 },
  { category: "Entertainment", tier: "Low", label: "Minimal", monthlyCost: 50 },
  { category: "Entertainment", tier: "Mid", label: "Occasional", monthlyCost: 150 },
  { category: "Entertainment", tier: "High", label: "Frequent", monthlyCost: 400 }
];

export const homeOptions = [
  { id: "starter-condo", label: "Starter Condo", price: 30000, monthlyUpkeep: 180, drift: 0.002, volatility: 0.012 },
  { id: "townhome", label: "Townhome", price: 65000, monthlyUpkeep: 320, drift: 0.0025, volatility: 0.014 },
  { id: "single-family", label: "Single-Family Home", price: 120000, monthlyUpkeep: 520, drift: 0.003, volatility: 0.016 },
  { id: "duplex", label: "Duplex", price: 180000, monthlyUpkeep: 760, drift: 0.0035, volatility: 0.02 }
];

export const assetOptions = [
  { id: "savings-bond", label: "Savings Bond", category: "Conservative", price: 1000, drift: 0.0025, volatility: 0.004 },
  { id: "collectibles", label: "Collectibles", category: "Speculative", price: 2500, drift: 0.003, volatility: 0.045 },
  { id: "classic-car", label: "Classic Car", category: "Collectible", price: 8000, drift: 0.002, volatility: 0.035 },
  { id: "crypto", label: "Crypto Basket", category: "Speculative", price: 5000, drift: 0.004, volatility: 0.12 },
  { id: "small-business", label: "Small Business Stake", category: "Business", price: 15000, drift: 0.006, volatility: 0.075 }
];
