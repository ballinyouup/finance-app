const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? "/api" : "http://127.0.0.1:5000/api")
const TOKEN_KEY = "finance_access_token"
const DEBUG_API = import.meta.env.DEV

export type ApiErrorBody = {
  code: string
  message: string
}

export type User = {
  id: string
  name: string
  email: string
  isVerified: boolean
}

export type Job = {
  _id: string
  title: string
  monthlySalary: number
  tier: number
}

export type ExpenseCategory =
  | "Housing"
  | "Food"
  | "Transportation"
  | "Entertainment"
export type MonthlyExpenseCategory = "Housing" | "Transportation"

export type ExpenseOption = {
  _id: string
  category: ExpenseCategory
  tier: "Low" | "Mid" | "High"
  label: string
  monthlyCost: number
}

export type ExpenseSelections = Record<MonthlyExpenseCategory, string>
export type PopulatedExpenseSelections = Record<MonthlyExpenseCategory, ExpenseOption>
export type NeedScores = {
  happiness: number
  hunger: number
  entertainment: number
  love: number
}
export type LifePath = "work" | "college"
export type MonthlyChoices = {
  foodDays: number
  entertainmentDays: number
  datingDays: number
}

export type RoundHistory = {
  month: number
  ageMonths: number
  path: LifePath
  jobTitle: string
  income: number
  expenses: number
  eventTitle?: string
  eventAmount?: number
  deathChance: number
  died: boolean
  needsAfter: NeedScores
  balanceAfter: number
  studentDebtAfter: number
}

export type GameSession = {
  _id: string
  status: "active" | "dead"
  lifePath: LifePath
  currentMonth: number
  ageMonths: number
  balance: number
  studentDebt: number
  educationMonths: number
  needs: NeedScores
  monthlyChoices: MonthlyChoices
  currentJobId: Job
  currentExpenseSelections: PopulatedExpenseSelections
  history: RoundHistory[]
  finalScore?: number
  completedAt?: string
}

export type LeaderboardEntry = {
  userId: string
  name: string
  finalScore: number
  completedAt: string
}

type ApiEnvelope<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: ApiErrorBody }

export class ApiRequestError extends Error {
  code: string
  status: number

  constructor(status: number, error: ApiErrorBody) {
    super(error.message)
    this.code = error.code
    this.status = status
  }
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
) {
  const method = options.method ?? "GET"
  const url = `${API_BASE_URL}${path}`
  const headers = new Headers(options.headers)
  headers.set("Content-Type", "application/json")

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`)
  }

  if (DEBUG_API) {
    console.info("[MoneySim API] request", { method, path, url })
  }

  const response = await fetch(url, { ...options, headers })
  const envelope = (await response.json()) as ApiEnvelope<T>

  if (DEBUG_API) {
    console.info("[MoneySim API] response", {
      method,
      path,
      status: response.status,
      success: envelope.success,
      errorCode: envelope.success ? null : envelope.error.code,
    })
  }

  if (!response.ok || !envelope.success) {
    const apiError = envelope.success
      ? { code: "REQUEST_FAILED", message: "Request failed." }
      : envelope.error

    throw new ApiRequestError(response.status, apiError)
  }

  return envelope.data
}

export const api = {
  signup: (payload: { name: string; email: string; password: string }) =>
    apiRequest<{ user: User }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  verifyEmail: (payload: { email: string; token: string }) =>
    apiRequest<{ message: string }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  resendVerification: (email: string) =>
    apiRequest<{ message: string }>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  login: (payload: { email: string; password: string }) =>
    apiRequest<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: (token: string) => apiRequest<{ user: User }>("/auth/me", { token }),
  jobs: (token: string) => apiRequest<{ jobs: Job[] }>("/jobs", { token }),
  expenseOptions: (token: string) =>
    apiRequest<{ options: ExpenseOption[] }>("/expense-options", { token }),
  currentSession: (token: string) =>
    apiRequest<{ session: GameSession | null }>("/game/current", { token }),
  startSession: (
    token: string,
    payload: { lifePath: LifePath; jobId: string; expenseSelections: ExpenseSelections },
  ) =>
    apiRequest<{ session: GameSession }>("/game/start", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  changeJob: (token: string, jobId: string) =>
    apiRequest<{ session: GameSession }>("/game/job", {
      method: "PUT",
      token,
      body: JSON.stringify({ jobId }),
    }),
  changeExpense: (
    token: string,
    payload: { category: ExpenseCategory; optionId: string },
  ) =>
    apiRequest<{ session: GameSession }>("/game/expenses", {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    }),
  advanceMonths: (token: string, months: number, choices: Partial<MonthlyChoices>) =>
    apiRequest<{ session: GameSession }>("/game/advance", {
      method: "POST",
      token,
      body: JSON.stringify({ months, choices }),
    }),
  leaderboard: (limit = 20) =>
    apiRequest<{ entries: LeaderboardEntry[] }>(`/leaderboard?limit=${limit}`),
}
