const isLocalhost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname)

const defaultApiBaseUrl = import.meta.env.PROD
  ? "/api"
  : isLocalhost
    ? "http://127.0.0.1:5050/api"
    : `${window.location.protocol}//${window.location.hostname}:5050/api`

const API_BASE_URL = import.meta.env.VITE_API_URL || defaultApiBaseUrl
const TOKEN_KEY = "finance_access_token"
const DEBUG_API = import.meta.env.DEV || import.meta.env.VITE_DEBUG_API === "true"
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 30000)

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
  requiresDegree: boolean
  careerTrack: string
  requiredSkill: SkillName
  requiredSkillLevel: number
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
  energy: number
}
export type LifePath = "work" | "college"
export type Major = "computer-science" | "business" | "communications"
export type SkillName = "technical" | "business" | "communication"
export type Skills = Record<SkillName, number>
export type MonthlyChoices = {
  foodDays: number
  entertainmentDays: number
  datingDays: number
  activity: "study" | "exercise" | "recreation" | "rest"
  internship: boolean
  debtPayment: number
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
  major?: Major
  skills: Skills
  careerLevel: number
  careerPerformance: number
  unemployedMonths: number
  completedGoals: string[]
  homeOwned: boolean
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
  const controller = new AbortController()
  const headers = new Headers(options.headers)
  headers.set("Content-Type", "application/json")

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`)
  }

  if (DEBUG_API) {
    console.info("[MoneySim API] request", { method, path, url })
  }

  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  let response: Response

  try {
    response = await fetch(url, { ...options, headers, signal: controller.signal })
  } catch (requestError) {
    const isTimeout =
      requestError instanceof DOMException && requestError.name === "AbortError"
    const error = new ApiRequestError(0, {
      code: isTimeout ? "REQUEST_TIMEOUT" : "NETWORK_ERROR",
      message: isTimeout
        ? `Request timed out after ${Math.round(API_TIMEOUT_MS / 1000)} seconds.`
        : "Could not reach the API server.",
    })

    console.error("[MoneySim API] request failed", {
      method,
      path,
      url,
      code: error.code,
      message: error.message,
    })
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }

  let envelope: ApiEnvelope<T>

  try {
    envelope = (await response.json()) as ApiEnvelope<T>
  } catch {
    const error = new ApiRequestError(response.status, {
      code: "INVALID_RESPONSE",
      message: "The API returned a response the app could not read.",
    })

    console.error("[MoneySim API] invalid response", {
      method,
      path,
      url,
      status: response.status,
    })
    throw error
  }

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

    console.error("[MoneySim API] response error", {
      method,
      path,
      url,
      status: response.status,
      code: apiError.code,
      message: apiError.message,
    })
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
  forgotPassword: (email: string) =>
    apiRequest<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (payload: { token: string; password: string }) =>
    apiRequest<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
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
    payload: { lifePath: LifePath; major?: Major; jobId: string; expenseSelections: ExpenseSelections },
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
  enrollCollege: (token: string, major: Major) =>
    apiRequest<{ session: GameSession }>("/game/enroll-college", {
      method: "POST",
      token,
      body: JSON.stringify({ major }),
    }),
  advanceMonths: (token: string, months: number, choices: Partial<MonthlyChoices>) =>
    apiRequest<{ session: GameSession }>("/game/advance", {
      method: "POST",
      token,
      body: JSON.stringify({ months, choices }),
    }),
  buyHome: (token: string) =>
    apiRequest<{ session: GameSession }>("/game/buy-home", { method: "POST", token }),
  leaderboard: (limit = 20) =>
    apiRequest<{ entries: LeaderboardEntry[] }>(`/leaderboard?limit=${limit}`),
}
