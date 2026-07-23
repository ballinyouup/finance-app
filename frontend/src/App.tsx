import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom"
import {
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  ChartNoAxesColumnIncreasing,
  CircleDollarSign,
  LogOut,
  Medal,
  Play,
  RefreshCw,
  Trophy,
  WalletCards,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ApiRequestError,
  api,
  clearToken,
  getStoredToken,
  storeToken,
  type ExpenseCategory,
  type ExpenseOption,
  type ExpenseSelections,
  type GameSession,
  type Job,
  type LeaderboardEntry,
  type LifePath,
  type Major,
  type MonthlyChoices,
  type MonthlyExpenseCategory,
  type User,
} from "@/lib/api"
import "./App.css"

const monthlyCategories: MonthlyExpenseCategory[] = ["Housing", "Transportation"]
const startingMonthlyChoices: MonthlyChoices = {
  foodDays: 20,
  entertainmentDays: 4,
  datingDays: 2,
  activity: "rest",
  internship: false,
  debtPayment: 0,
}

const homeOptions = [
  { id: "starter-condo", label: "Starter Condo", price: 30000, monthlyUpkeep: 180 },
  { id: "townhome", label: "Townhome", price: 65000, monthlyUpkeep: 320 },
  { id: "single-family", label: "Single-Family Home", price: 120000, monthlyUpkeep: 520 },
  { id: "duplex", label: "Duplex", price: 180000, monthlyUpkeep: 760 },
]

const assetOptions = [
  { id: "savings-bond", label: "Savings Bond", category: "Conservative", price: 1000 },
  { id: "collectibles", label: "Collectibles", category: "Speculative", price: 2500 },
  { id: "classic-car", label: "Classic Car", category: "Collectible", price: 8000 },
  { id: "crypto", label: "Crypto Basket", category: "Speculative", price: 5000 },
  { id: "small-business", label: "Small Business Stake", category: "Business", price: 15000 },
]

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

function money(value: number) {
  return currencyFormatter.format(value)
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    return error.message
  }

  return "Something went wrong. Please try again."
}

function App() {
  const [token, setToken] = useState<string | null>(() => getStoredToken())
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(Boolean(token))

  useEffect(() => {
    let isMounted = true

    async function loadUser() {
      if (!token) {
        setUser(null)
        setAuthLoading(false)
        return
      }

      try {
        const data = await api.me(token)

        if (isMounted) {
          setUser(data.user)
        }
      } catch {
        clearToken()

        if (isMounted) {
          setToken(null)
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false)
        }
      }
    }

    loadUser()

    return () => {
      isMounted = false
    }
  }, [token])

  function handleLogin(nextToken: string, nextUser: User) {
    storeToken(nextToken)
    setToken(nextToken)
    setUser(nextUser)
  }

  function handleLogout() {
    clearToken()
    setToken(null)
    setUser(null)
  }

  return (
    <BrowserRouter>
      <div className="min-h-svh bg-[radial-gradient(circle_at_top_left,var(--brand-soft),transparent_30rem),linear-gradient(180deg,var(--background),var(--surface))] text-foreground">
        <Shell user={user} onLogout={handleLogout} />
        <main className="app-main mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {authLoading ? (
            <PageSkeleton />
          ) : (
            <Routes>
              <Route path="/" element={<HomePage user={user} />} />
              <Route
                path="/login"
                element={
                  user ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <LoginPage onLogin={handleLogin} />
                  )
                }
              />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route
                path="/dashboard"
                element={
                  token && user ? (
                    <DashboardPage token={token} />
                  ) : (
                    <RequireLoginRedirect />
                  )
                }
              />
              <Route path="/leaderboard" element={<LeaderboardPage user={user} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </BrowserRouter>
  )
}

function Shell({
  user,
  onLogout,
}: {
  user: User | null
  onLogout: () => void
}) {
  return (
    <header className="app-header border-b bg-background/85 backdrop-blur">
      <nav className="mx-auto flex min-h-14 w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-2 font-semibold" to="/">
          <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <CircleDollarSign className="size-5" aria-hidden="true" />
          </span>
          MoneySim
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link className={buttonVariants({ variant: "ghost" })} to="/">
            Home
          </Link>
          <Link className={buttonVariants({ variant: "ghost" })} to="/leaderboard">
            Leaderboard
          </Link>
          {user ? (
            <>
              <Link className={buttonVariants({ variant: "ghost" })} to="/dashboard">
                Dashboard
              </Link>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {user.name}
              </Badge>
              <Button variant="outline" onClick={onLogout}>
                <LogOut className="size-4" aria-hidden="true" />
                Logout
              </Button>
            </>
          ) : (
            <Link className={buttonVariants()} to="/login">
              Login
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}

function HomePage({ user }: { user: User | null }) {
  return (
    <div className="grid gap-6">
      <section className="grid gap-6 py-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div className="grid gap-5">
          <Badge className="w-fit bg-emerald-700 text-white hover:bg-emerald-700">
            Lifetime finance simulation
          </Badge>
          <div className="grid gap-3">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl">
              Start with a job. Survive 12 months. See how much you can save.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              Start at 18, choose work or college, manage monthly life, and climb
              the public leaderboard with the strongest money-and-wellbeing score.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className={buttonVariants({ size: "lg" })}
              to={user ? "/dashboard" : "/login"}
            >
              Play Now
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              className={buttonVariants({ size: "lg", variant: "outline" })}
              to="/leaderboard"
            >
              View Leaderboard
            </Link>
          </div>
        </div>
        <Card className="border-emerald-900/10 bg-white/85 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WalletCards className="size-5 text-emerald-700" aria-hidden="true" />
              Life Decision Board
            </CardTitle>
            <CardDescription>
              Balance income against needs, relationships, random events, and fun.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {[
              ["Income", "$4,000", "Marketing Coordinator"],
              ["Expenses", "$1,640", "Low housing, mixed food"],
              ["Monthly Plan", "$760", "Food, fun, and dating"],
            ].map(([label, value, note]) => (
              <div
                className="flex items-center justify-between rounded-lg border bg-background p-3"
                key={label}
              >
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{note}</p>
                </div>
                <p className="text-xl font-semibold">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <FeatureCard
          icon={<BriefcaseBusiness className="size-5" aria-hidden="true" />}
          title="Pick Your Job"
          text="Start from the seeded job catalog and switch roles before any month."
        />
        <FeatureCard
          icon={<Banknote className="size-5" aria-hidden="true" />}
          title="Manage Your Expenses"
          text="Choose low, mid, or high tiers, but cheap choices can drain needs."
        />
        <FeatureCard
          icon={<Trophy className="size-5" aria-hidden="true" />}
          title="Climb the Leaderboard"
          text="Completed runs are ranked by final score, not cash alone."
        />
      </section>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: ReactNode
  title: string
  text: string
}) {
  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-cyan-700 text-white">
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{text}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function LoginPage({
  onLogin,
}: {
  onLogin: (token: string, user: User) => void
}) {
  const navigate = useNavigate()
  const [notice, setNotice] = useState<string | null>(null)

  return (
    <div className="mx-auto max-w-md">
      <Tabs defaultValue="signin" className="gap-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <AuthCard title="Welcome back" description="Log in to continue your run.">
            <LoginForm
              onLogin={(token, user) => {
                onLogin(token, user)
                navigate("/dashboard")
              }}
              setNotice={setNotice}
            />
          </AuthCard>
        </TabsContent>
        <TabsContent value="signup">
          <AuthCard
            title="Create account"
            description="You will verify your email before signing in."
          >
            <SignupForm setNotice={setNotice} />
          </AuthCard>
        </TabsContent>
      </Tabs>
      {notice ? (
        <Alert className="mt-4">
          <AlertTitle>Account status</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}

function AuthCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function LoginForm({
  onLogin,
  setNotice,
}: {
  onLogin: (token: string, user: User) => void
  setNotice: (notice: string | null) => void
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setNotice(null)

    try {
      const data = await api.login({ email, password })
      onLogin(data.token, data.user)
    } catch (submitError) {
      if (submitError instanceof ApiRequestError && submitError.code === "EMAIL_NOT_VERIFIED") {
        setNotice("Verify your email, then sign in. You can resend the link below.")
      }

      setError(getErrorMessage(submitError))
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    if (!email) {
      setError("Enter your email first.")
      return
    }

    try {
      await api.resendVerification(email)
      setNotice("Verification email sent.")
    } catch (resendError) {
      setError(getErrorMessage(resendError))
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <Field id="signin-email" label="Email">
        <Input
          id="signin-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </Field>
      <Field id="signin-password" label="Password">
        <Input
          id="signin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </Field>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button disabled={loading} type="submit">
        {loading ? "Signing in..." : "Sign In"}
      </Button>
      <Button type="button" variant="ghost" onClick={resend}>
        Resend verification
      </Button>
      <Button render={<Link to="/forgot-password" />} type="button" variant="link">
        Forgot password?
      </Button>
    </form>
  )
}

function SignupForm({ setNotice }: { setNotice: (notice: string | null) => void }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setNotice(null)

    try {
      await api.signup({ name, email, password })
      setCreated(true)
      setNotice("Check your inbox for a verification link before signing in.")
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    } finally {
      setLoading(false)
    }
  }

  if (created) {
    return (
      <Alert>
        <AlertTitle>Check your inbox</AlertTitle>
        <AlertDescription>
          Your account was created. Verify your email, then return to sign in.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <Field id="signup-name" label="Name">
        <Input
          id="signup-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </Field>
      <Field id="signup-email" label="Email">
        <Input
          id="signup-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </Field>
      <Field id="signup-password" label="Password">
        <Input
          id="signup-password"
          type="password"
          value={password}
          minLength={10}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Use at least 10 characters with uppercase, lowercase, a number, and a symbol.
        </p>
      </Field>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button disabled={loading} type="submit">
        {loading ? "Creating..." : "Create Account"}
      </Button>
    </form>
  )
}

function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    try {
      const data = await api.forgotPassword(email)
      setMessage(data.message)
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>
          Enter your email and MoneySim will send a password reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Field id="forgot-email" label="Email">
            <Input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button disabled={loading} type="submit">
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
          <Button render={<Link to="/login" />} type="button" variant="ghost">
            Back to Login
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [token, setToken] = useState(searchParams.get("token") ?? "")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    try {
      const data = await api.resetPassword({ token, password })
      setMessage(data.message)
      window.setTimeout(() => navigate("/login"), 1200)
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>
          Choose a new password with uppercase, lowercase, a number, and a symbol.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Field id="reset-token" label="Reset token">
            <Input
              id="reset-token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
            />
          </Field>
          <Field id="reset-password" label="New password">
            <Input
              id="reset-password"
              type="password"
              value={password}
              minLength={10}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button disabled={loading} type="submit">
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Verifying your email.")

  useEffect(() => {
    let isMounted = true

    async function verify() {
      const email = searchParams.get("email")
      const token = searchParams.get("token")

      if (!email || !token) {
        setStatus("error")
        setMessage("The verification link is missing required information.")
        return
      }

      try {
        await api.verifyEmail({ email, token })

        if (isMounted) {
          setStatus("success")
          setMessage("Email verified. You can now sign in.")
        }
      } catch (error) {
        if (isMounted) {
          setStatus("error")
          setMessage(getErrorMessage(error))
        }
      }
    }

    verify()

    return () => {
      isMounted = false
    }
  }, [searchParams])

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Email verification</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        {status === "loading" ? <Skeleton className="h-8 w-full" /> : null}
        {status !== "loading" ? (
          <Link className={buttonVariants()} to="/login">
            Go to Login
          </Link>
        ) : null}
      </CardContent>
    </Card>
  )
}

function DashboardPage({ token }: { token: string }) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [options, setOptions] = useState<ExpenseOption[]>([])
  const [session, setSession] = useState<GameSession | null>(null)
  const [deadSession, setDeadSession] = useState<GameSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const optionsByCategory = useMemo(() => groupOptions(options), [options])

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      setLoading(true)
      setError(null)

      try {
        const [jobsData, optionsData, currentData] = await Promise.all([
          api.jobs(token),
          api.expenseOptions(token),
          api.currentSession(token),
        ])

        if (isMounted) {
          setJobs(jobsData.jobs)
          setOptions(optionsData.options)
          setSession(currentData.session)
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError))
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isMounted = false
    }
  }, [token])

  const startRun = useCallback(async function startRun(
    lifePath: LifePath,
    jobId: string,
    expenseSelections: ExpenseSelections,
    major?: Major,
  ) {
    setBusy(true)
    setError(null)

    try {
      const data = await api.startSession(token, { lifePath, major, jobId, expenseSelections })
      setSession(data.session)
      setDeadSession(null)
    } catch (startError) {
      if (startError instanceof ApiRequestError && startError.code === "ACTIVE_SESSION_EXISTS") {
        const current = await api.currentSession(token)
        setSession(current.session)
        setError("You already have an active run. Resume it below.")
      } else {
        setError(getErrorMessage(startError))
      }
    } finally {
      setBusy(false)
    }
  }, [token])

  const applyForJob = useCallback(async function applyForJob(jobId: string) {
    setBusy(true)
    setError(null)

    try {
      const data = await api.applyForJob(token, jobId)
      setSession(data.session)
      if (!data.application.accepted) {
        setError(data.application.message)
      }
    } catch (applicationError) {
      setError(getErrorMessage(applicationError))
    } finally {
      setBusy(false)
    }
  }, [token])

  const updateExpense = useCallback(async function updateExpense(category: MonthlyExpenseCategory, optionId: string) {
    setBusy(true)
    setError(null)

    try {
      const data = await api.changeExpense(token, { category, optionId })
      setSession(data.session)
    } catch (updateError) {
      setError(getErrorMessage(updateError))
    } finally {
      setBusy(false)
    }
  }, [token])

  const advanceMonths = useCallback(async function advanceMonths(months: number, choices: MonthlyChoices) {
    setBusy(true)
    setError(null)

    try {
      const data = await api.advanceMonths(token, months, choices)

      if (data.session.status === "dead") {
        setDeadSession(data.session)
        setSession(null)
      } else {
        setSession(data.session)
      }
    } catch (advanceError) {
      setError(getErrorMessage(advanceError))
    } finally {
      setBusy(false)
    }
  }, [token])

  const endRun = useCallback(async function endRun() {
    setBusy(true)
    setError(null)

    try {
      const data = await api.endRun(token)
      setDeadSession(data.session)
      setSession(null)
    } catch (endError) {
      setError(getErrorMessage(endError))
    } finally {
      setBusy(false)
    }
  }, [token])

  const payOffDebt = useCallback(async function payOffDebt() {
    setBusy(true)
    setError(null)
    try {
      const data = await api.payOffDebt(token)
      setSession(data.session)
    } catch (payError) {
      setError(getErrorMessage(payError))
    } finally {
      setBusy(false)
    }
  }, [token])

  const investStocks = useCallback(async function investStocks(amount: number) {
    setBusy(true)
    setError(null)
    try {
      const data = await api.investStocks(token, amount)
      setSession(data.session)
    } catch (investError) {
      setError(getErrorMessage(investError))
    } finally {
      setBusy(false)
    }
  }, [token])

  const sellStocks = useCallback(async function sellStocks() {
    setBusy(true)
    setError(null)
    try {
      const data = await api.sellStocks(token)
      setSession(data.session)
    } catch (sellError) {
      setError(getErrorMessage(sellError))
    } finally {
      setBusy(false)
    }
  }, [token])

  const buyHomeType = useCallback(async function buyHomeType(homeId: string) {
    setBusy(true)
    setError(null)
    try {
      const data = await api.buyHomeType(token, homeId)
      setSession(data.session)
    } catch (homeError) {
      setError(getErrorMessage(homeError))
    } finally {
      setBusy(false)
    }
  }, [token])

  const sellHome = useCallback(async function sellHome() {
    setBusy(true)
    setError(null)
    try {
      const data = await api.sellHome(token)
      setSession(data.session)
    } catch (homeError) {
      setError(getErrorMessage(homeError))
    } finally {
      setBusy(false)
    }
  }, [token])

  const buyAsset = useCallback(async function buyAsset(assetId: string) {
    setBusy(true)
    setError(null)
    try {
      const data = await api.buyAsset(token, assetId)
      setSession(data.session)
    } catch (assetError) {
      setError(getErrorMessage(assetError))
    } finally {
      setBusy(false)
    }
  }, [token])

  const sellAsset = useCallback(async function sellAsset(holdingId: string) {
    setBusy(true)
    setError(null)
    try {
      const data = await api.sellAsset(token, holdingId)
      setSession(data.session)
    } catch (assetError) {
      setError(getErrorMessage(assetError))
    } finally {
      setBusy(false)
    }
  }, [token])

  const sellCar = useCallback(async function sellCar() {
    setBusy(true)
    setError(null)
    try {
      const data = await api.sellCar(token)
      setSession(data.session)
    } catch (carError) {
      setError(getErrorMessage(carError))
    } finally {
      setBusy(false)
    }
  }, [token])

  const enrollCollege = useCallback(async function enrollCollege(major: Major) {
    setBusy(true)
    setError(null)
    try {
      const data = await api.enrollCollege(token, major)
      setSession(data.session)
    } catch (enrollError) {
      setError(getErrorMessage(enrollError))
    } finally {
      setBusy(false)
    }
  }, [token])

  if (loading) {
    return <PageSkeleton />
  }

  const missingCatalog = jobs.length === 0 || !hasCatalogOptions(optionsByCategory)

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Dashboard</h1>
          <p className="text-muted-foreground">
            Adjust your job and monthly costs before advancing each month.
          </p>
        </div>
        <Badge variant={session ? "default" : "secondary"}>
          {session ? "Alive" : deadSession ? "Life Ended" : "Ready"}
        </Badge>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Action needed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {missingCatalog ? (
        <Alert variant="destructive">
          <AlertTitle>Catalog data missing</AlertTitle>
          <AlertDescription>
            Jobs, housing, or transportation options are empty. Restart the backend or run{" "}
            <code>npm run seed</code> in the backend folder.
          </AlertDescription>
        </Alert>
      ) : null}

      {deadSession ? (
        <ResultsScreen
          jobs={jobs}
          optionsByCategory={optionsByCategory}
          session={deadSession}
          busy={busy}
          onPlayAgain={startRun}
        />
      ) : session ? (
        <ActiveSession
          busy={busy}
          jobs={jobs}
          optionsByCategory={optionsByCategory}
          session={session}
          onAdvance={advanceMonths}
          onEndRun={endRun}
          onPayOffDebt={payOffDebt}
          onInvestStocks={investStocks}
          onSellStocks={sellStocks}
          onBuyHomeType={buyHomeType}
          onSellHome={sellHome}
          onBuyAsset={buyAsset}
          onSellAsset={sellAsset}
          onSellCar={sellCar}
          onEnrollCollege={enrollCollege}
          onChangeExpense={updateExpense}
          onApplyForJob={applyForJob}
        />
      ) : (
        <StartRunPanel
          busy={busy}
          jobs={jobs}
          disabled={missingCatalog}
          optionsByCategory={optionsByCategory}
          onStart={startRun}
        />
      )}
    </div>
  )
}

function StartRunPanel({
  jobs,
  optionsByCategory,
  disabled,
  busy,
  onStart,
}: {
  jobs: Job[]
  optionsByCategory: Record<ExpenseCategory, ExpenseOption[]>
  disabled: boolean
  busy: boolean
  onStart: (
    lifePath: LifePath,
    jobId: string,
    expenseSelections: ExpenseSelections,
    major?: Major,
  ) => void
}) {
  const [lifePath, setLifePath] = useState<LifePath>("work")
  const [major, setMajor] = useState<Major>("business")
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [jobId, setJobId] = useState(() => jobs[0]?._id ?? "")
  const [selections, setSelections] = useState<ExpenseSelections>(() =>
    defaultSelections(optionsByCategory),
  )
  const pathLabelId = useId()
  const majorLabelId = useId()
  const jobLabelId = useId()
  const availableJobs = useMemo(
    () => jobs.filter((job) => lifePath !== "college" || !job.requiresDegree),
    [jobs, lifePath],
  )

  useEffect(() => {
    if (!availableJobs.some((job) => job._id === jobId) && availableJobs[0]) {
      setJobId(availableJobs[0]._id)
    }
  }, [availableJobs, jobId])

  useEffect(() => {
    setSelections((current) => ({ ...defaultSelections(optionsByCategory), ...current }))
  }, [optionsByCategory])

  function beginRun() {
    onStart(lifePath, jobId, selections, lifePath === "college" ? major : undefined)
    setTutorialOpen(false)
    setTutorialStep(0)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>Start New Run</CardTitle>
        <CardDescription>
          Start freshly 18. Choose work now or college with loans.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2">
          <Label id={pathLabelId}>Path</Label>
          <Select
            items={[
              { label: "Work full-time", value: "work" },
              { label: "College with student loans", value: "college" },
            ]}
            value={lifePath}
            onValueChange={(value) => {
              if (value) {
                setLifePath(value as LifePath)
              }
            }}
          >
            <SelectTrigger aria-labelledby={pathLabelId} className="w-full">
              <SelectValue placeholder="Choose a life path" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="work">Work full-time</SelectItem>
                <SelectItem value="college">College with student loans</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        {lifePath === "college" ? (
          <div className="grid gap-2">
            <Label id={majorLabelId}>College major</Label>
            <Select
              items={[
                { label: "Computer Science", value: "computer-science" },
                { label: "Business", value: "business" },
                { label: "Communications", value: "communications" },
              ]}
              value={major}
              onValueChange={(value) => value && setMajor(value as Major)}
            >
              <SelectTrigger aria-labelledby={majorLabelId} className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup>
                <SelectItem value="computer-science">Computer Science</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="communications">Communications</SelectItem>
              </SelectGroup></SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">Studying and internships build the skill tied to your major.</p>
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label id={jobLabelId}>{lifePath === "college" ? "Part-time job while enrolled" : "Starting job"}</Label>
          <JobSelect
            jobs={availableJobs}
            labelId={jobLabelId}
            value={jobId}
            onValueChange={setJobId}
          />
          {lifePath === "college" ? (
            <p className="text-sm text-muted-foreground">
              Degree-required careers unlock after you graduate in 48 months.
            </p>
          ) : null}
        </div>
        <ExpensePickerGrid
          optionsByCategory={optionsByCategory}
          selections={selections}
          disabled={disabled}
          onChange={(category, optionId) =>
            setSelections((current) => ({ ...current, [category]: optionId }))
          }
        />
        <Button
          className="w-fit"
          disabled={disabled || busy || !jobId || !hasAllSelections(selections)}
          onClick={() => setTutorialOpen(true)}
        >
          <Play className="size-4" aria-hidden="true" />
          {busy ? "Starting..." : "Start Simulation"}
        </Button>
        <Dialog open={tutorialOpen} onOpenChange={setTutorialOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Welcome to your new life</DialogTitle>
              <DialogDescription>
                {tutorialStep === 0
                  ? "Each turn is one month. Earn income, cover your costs, and keep your needs healthy."
                  : tutorialStep === 1
                    ? "Choose a focus activity each month. Study grows skills, while exercise, recreation, and rest protect your wellbeing and energy."
                    : tutorialStep === 2
                      ? "College adds tuition and debt, but majors, internships, graduation, and skills unlock stronger career paths."
                      : "Set goals as you go: save money, pay off debt, build a career, and buy a home. Events and your choices shape the outcome."}
              </DialogDescription>
            </DialogHeader>
            <div
              aria-label="Tutorial progress"
              aria-valuemax={4}
              aria-valuemin={1}
              aria-valuenow={tutorialStep + 1}
              aria-valuetext={`Step ${tutorialStep + 1} of 4`}
              className="flex gap-1"
              role="progressbar"
            >
              {[0, 1, 2, 3].map((step) => (
                <span
                  aria-hidden="true"
                  key={step}
                  className={`h-1 flex-1 rounded-full ${step <= tutorialStep ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={beginRun}>Skip tutorial & start</Button>
              {tutorialStep > 0 ? (
                <Button variant="outline" onClick={() => setTutorialStep((step) => step - 1)}>Previous</Button>
              ) : null}
              {tutorialStep < 3 ? (
                <Button onClick={() => setTutorialStep((step) => step + 1)}>Next</Button>
              ) : (
                <Button onClick={beginRun}>Start your run</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

const ActiveSession = memo(function ActiveSession({
  session,
  jobs,
  optionsByCategory,
  busy,
  onAdvance,
  onEndRun,
  onApplyForJob,
  onChangeExpense,
  onPayOffDebt,
  onInvestStocks,
  onSellStocks,
  onBuyHomeType,
  onSellHome,
  onBuyAsset,
  onSellAsset,
  onSellCar,
  onEnrollCollege,
}: {
  session: GameSession
  jobs: Job[]
  optionsByCategory: Record<ExpenseCategory, ExpenseOption[]>
  busy: boolean
  onAdvance: (months: number, choices: MonthlyChoices) => void
  onEndRun: () => void
  onApplyForJob: (jobId: string) => void
  onChangeExpense: (category: MonthlyExpenseCategory, optionId: string) => void
  onPayOffDebt: () => void
  onInvestStocks: (amount: number) => void
  onSellStocks: () => void
  onBuyHomeType: (homeId: string) => void
  onSellHome: () => void
  onBuyAsset: (assetId: string) => void
  onSellAsset: (holdingId: string) => void
  onSellCar: () => void
  onEnrollCollege: (major: Major) => void
}) {
  const expenseTotal = useMemo(() => sumSelectedExpenses(session), [session])
  const selectedExpenseIds = useMemo(() => selectedIds(session), [session])
  const lastHistory = session.history.at(-1)

  return (
    <div aria-busy={busy} className="grid gap-4">
      <LifeStatusPanel session={session} fixedExpenses={expenseTotal} />
      <div className="flex justify-end">
        <EndRunDialog busy={busy} onEndRun={onEndRun} />
      </div>

      {lastHistory?.eventTitle ? (
        <Alert>
          <AlertTitle>Last month’s event</AlertTitle>
          <AlertDescription>
            {lastHistory.eventTitle}
            {lastHistory.eventAmount
              ? ` (${lastHistory.eventAmount > 0 ? "+" : ""}${money(lastHistory.eventAmount)})`
              : ""}
          </AlertDescription>
        </Alert>
      ) : null}

      <MonthlyPlanPanel
        busy={busy}
        fixedExpenses={expenseTotal}
        session={session}
        onAdvance={onAdvance}
      />

      <NeedsPanel session={session} />
      <NextStepsPanel session={session} jobs={jobs} />

      <Accordion multiple defaultValue={[]}>
        <AccordionSection
          title="Career and Commitments"
          value="career"
          summary={`Primary: ${session.currentJobId.title} · ${money(expenseTotal)} fixed`}
        >
          <div className="grid gap-4">
            <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="grid gap-2">
                <p className="font-semibold">Primary job</p>
                <p className="text-muted-foreground">
                  {session.lifePath === "college" && session.educationMonths < 48
                    ? `${session.currentJobId.title} is your part-time job while enrolled.`
                    : `${session.currentJobId.title} is your current job.`}
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <CompactMetric label="Career" value={`${session.currentJobId.careerTrack} · L${session.careerLevel ?? 0}`} />
                  <CompactMetric label="Performance" value={session.unemployedMonths ? "Between jobs" : `${session.careerPerformance ?? 0}/100`} />
                  <CompactMetric label="Home" value={session.homeOwned ? "Owned" : "Renting"} />
                </div>
              </div>
              <div className="grid gap-2">
                <p className="font-semibold">Monthly commitments</p>
                <p className="text-sm text-muted-foreground">
                  Higher tiers cost more but improve monthly needs.
                </p>
                <ExpensePickerGrid
                  optionsByCategory={optionsByCategory}
                  selections={selectedExpenseIds}
                  session={session}
                  onChange={onChangeExpense}
                  disabled={busy}
                />
              </div>
            </div>
            <JobMarket
              busy={busy}
              session={session}
              onApplyForJob={onApplyForJob}
            />
          </div>
        </AccordionSection>

        <AccordionSection
          title="Assets and Debt"
          value="assets"
          summary={`Net assets: ${money(getAssetValue(session))} · Debt: ${money(session.studentDebt)}`}
        >
          <AssetsAndDebtPanel
            busy={busy}
            session={session}
            onBuyAsset={onBuyAsset}
            onBuyHomeType={onBuyHomeType}
            onInvestStocks={onInvestStocks}
            onPayOffDebt={onPayOffDebt}
            onSellAsset={onSellAsset}
            onSellCar={onSellCar}
            onSellHome={onSellHome}
            onSellStocks={onSellStocks}
          />
        </AccordionSection>

        <AccordionSection
          title="Education and Goals"
          value="education"
          summary={session.lifePath === "college" ? `${session.educationMonths}/48 college months` : "Not enrolled"}
        >
          <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
            <div className="grid gap-2">
              <p className="font-semibold">Education</p>
              <p className="text-muted-foreground">
                {session.lifePath === "college"
                  ? `${session.major?.replace("-", " ") ?? "College"} · ${session.educationMonths}/48 months completed`
                  : "Enroll at any time to build new skills and unlock degree-required careers."}
              </p>
              {session.lifePath === "college" ? (
                <Badge className="w-fit" variant={session.educationMonths >= 48 ? "default" : "secondary"}>
                  {session.educationMonths >= 48 ? "Graduated" : `${48 - session.educationMonths} months to graduation`}
                </Badge>
              ) : (
                <EnrollCollegeDialog busy={busy} onEnroll={onEnrollCollege} />
              )}
            </div>
            <div className="grid content-start gap-2">
              <p className="font-semibold">Goals</p>
              <div className="flex flex-wrap gap-2">
                {["Save $10,000", "Graduate debt-free", "Reach age 40", "Buy a home"].map((goal) => (
                  <Badge key={goal} variant={session.completedGoals?.includes(goal) ? "default" : "secondary"}>
                    {session.completedGoals?.includes(goal) ? "Done: " : ""}{goal}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection
          title="History"
          value="history"
          summary={`${session.history.length} months recorded`}
        >
          <HistoryTable session={session} />
        </AccordionSection>
      </Accordion>
    </div>
  )
})

function AccordionSection({
  title,
  value,
  summary,
  children,
}: {
  title: string
  value: string
  summary: string
  children: ReactNode
}) {
  return (
    <AccordionItem value={value}>
      <AccordionHeader>
        <AccordionTrigger>
          <span className="grid min-w-0 gap-0.5">
            <span>{title}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {summary}
            </span>
          </span>
        </AccordionTrigger>
      </AccordionHeader>
      <AccordionContent>{children}</AccordionContent>
    </AccordionItem>
  )
}

const LifeStatusPanel = memo(function LifeStatusPanel({
  session,
  fixedExpenses,
}: {
  session: GameSession
  fixedExpenses: number
}) {
  const ageYears = Math.floor(session.ageMonths / 12)
  const ageRemainderMonths = session.ageMonths % 12

  return (
    <Card className="border-primary/20 bg-background">
      <CardContent className="grid gap-3 p-4 sm:grid-cols-[1.4fr_repeat(3,0.75fr)] sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-lg font-semibold text-white">
            {ageYears}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Month {session.currentMonth}
            </p>
            <p className="truncate text-xl font-semibold">
              Age {ageYears}y {ageRemainderMonths}m
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {session.currentJobId.title}
            </p>
          </div>
        </div>
        <CompactMetric label="Balance" value={money(session.balance)} />
        <CompactMetric label="Debt" value={money(session.studentDebt)} />
        <CompactMetric label="Fixed Costs" value={money(fixedExpenses)} />
      </CardContent>
    </Card>
  )
})

const MonthlyPlanPanel = memo(function MonthlyPlanPanel({
  session,
  fixedExpenses,
  busy,
  onAdvance,
}: {
  session: GameSession
  fixedExpenses: number
  busy: boolean
  onAdvance: (months: number, choices: MonthlyChoices) => void
}) {
  const [choices, setChoices] = useState<MonthlyChoices>(
    { ...startingMonthlyChoices, ...session.monthlyChoices },
  )
  const foodCost = choices.foodDays * 13
  const entertainmentCost = choices.entertainmentDays * 18
  const datingCost = choices.datingDays * 38
  const variableExpenses = foodCost + entertainmentCost + datingCost
  const enrolled = session.lifePath === "college" && session.educationMonths < 48
  const graduated = session.lifePath === "college" && session.educationMonths >= 48
  const income = session.unemployedMonths
    ? 0
    : session.currentJobId.monthlySalary * (1 + (session.careerLevel ?? 0) * 0.12) * (enrolled ? 0.35 : graduated ? 1.55 : 1)
  const expenses = fixedExpenses + variableExpenses + choices.debtPayment
  const projectedChange = income - expenses
  const focusLabelId = useId()

  return (
    <Card className="border-primary/40 bg-gradient-to-br from-card to-emerald-50/70 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" role="heading" aria-level={2}>
          <RefreshCw className="size-5" aria-hidden="true" />
          Monthly Plan
        </CardTitle>
        <CardDescription>
          Set this month’s choices, then advance when ready.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-4">
          <ForecastItem label="Income" value={money(income)} tone="text-emerald-700" />
          <ForecastItem label="Spending" value={money(expenses)} tone="text-amber-700" />
          <ForecastItem label="Change" value={`${projectedChange >= 0 ? "+" : ""}${money(projectedChange)}`} tone={projectedChange >= 0 ? "text-emerald-700" : "text-red-700"} />
          <ForecastItem label="After" value={money(session.balance + projectedChange)} tone="text-foreground" />
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_1.1fr]">
          <div className="grid gap-2">
            <Label id={focusLabelId}>Focus</Label>
            <div
              aria-labelledby={focusLabelId}
              className="grid grid-cols-2 gap-2"
              role="group"
            >
              {([
                ["study", "Study"],
                ["exercise", "Exercise"],
                ["recreation", "Recreation"],
                ["rest", "Rest"],
              ] as const).map(([activity, label]) => (
                <Button
                  key={activity}
                  type="button"
                  variant={choices.activity === activity ? "default" : "outline"}
                  aria-pressed={choices.activity === activity}
                  disabled={busy}
                  onClick={() => setChoices((current) => ({ ...current, activity }))}
                >
                  {label}
                </Button>
              ))}
            </div>
            {session.lifePath === "college" && session.educationMonths < 48 ? (
              <Button
                type="button"
                variant={choices.internship ? "default" : "outline"}
                aria-pressed={choices.internship}
                disabled={busy}
                onClick={() => setChoices((current) => ({ ...current, internship: !current.internship }))}
              >
                {choices.internship ? "Internship selected" : "Take internship"}
              </Button>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MonthlyChoiceInput
              label="Food days"
              value={choices.foodDays}
              cost={foodCost}
              onChange={(foodDays) => setChoices((current) => ({ ...current, foodDays }))}
            />
            <MonthlyChoiceInput
              label="Fun days"
              value={choices.entertainmentDays}
              cost={entertainmentCost}
              onChange={(entertainmentDays) =>
                setChoices((current) => ({ ...current, entertainmentDays }))
              }
            />
            <MonthlyChoiceInput
              label="Dating days"
              value={choices.datingDays}
              cost={datingCost}
              onChange={(datingDays) => setChoices((current) => ({ ...current, datingDays }))}
            />
          </div>
        </div>
        {session.studentDebt > 0 ? (
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="debt-payment">Loan payment</Label>
            <Input
              id="debt-payment"
              type="number"
              min={0}
              max={2000}
              value={choices.debtPayment}
              onChange={(event) => setChoices((current) => ({ ...current, debtPayment: Math.max(0, Math.min(2000, Number(event.target.value) || 0)) }))}
            />
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <Button size="lg" disabled={busy} onClick={() => onAdvance(1, choices)}>
            <RefreshCw className="size-4" aria-hidden="true" />
            {busy ? "Advancing..." : "Advance Month"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            disabled={busy}
            onClick={() => onAdvance(12, choices)}
          >
            Advance Year
          </Button>
        </div>
      </CardContent>
    </Card>
  )
})

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-semibold">{value}</p>
    </div>
  )
}

function NeedMeter({ label, value }: { label: string; value: number }) {
  const rounded = Math.round(value)
  const barColor = rounded < 25 ? "bg-red-500" : rounded < 50 ? "bg-amber-500" : "bg-emerald-600"
  const labelId = useId()
  const valueId = useId()

  return (
    <div className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 rounded-lg border bg-background px-3 py-2">
      <p className="font-medium" id={labelId}>{label}</p>
      <div
        aria-labelledby={labelId}
        aria-describedby={valueId}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={rounded}
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
      >
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${Math.max(0, Math.min(100, rounded))}%` }}
        />
      </div>
      <p className="text-right font-semibold" id={valueId}>{rounded}</p>
    </div>
  )
}

const NeedsPanel = memo(function NeedsPanel({ session }: { session: GameSession }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>Needs</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        <NeedMeter label="Happiness" value={session.needs.happiness} />
        <NeedMeter label="Hunger" value={session.needs.hunger} />
        <NeedMeter label="Entertainment" value={session.needs.entertainment} />
        <NeedMeter label="Love" value={session.needs.love} />
        <NeedMeter label="Energy" value={session.needs.energy ?? 70} />
      </CardContent>
    </Card>
  )
})

const NextStepsPanel = memo(function NextStepsPanel({
  session,
  jobs,
}: {
  session: GameSession
  jobs: Job[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>Next Steps</CardTitle>
      </CardHeader>
      <CardContent>
        <NextSteps session={session} jobs={jobs} />
      </CardContent>
    </Card>
  )
})

function ForecastItem({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className="rounded-lg border bg-background px-3 py-2"><p className="text-xs text-muted-foreground">{label}</p><p className={`font-semibold ${tone}`}>{value}</p></div>
}

const NextSteps = memo(function NextSteps({ session, jobs }: { session: GameSession; jobs: Job[] }) {
  const tips = useMemo(() => getGameTips(session, jobs), [jobs, session])

  return (
    <ul className="grid gap-2">
      {tips.map((tip) => <li key={tip} className="rounded-md bg-muted px-3 py-2">{tip}</li>)}
    </ul>
  )
})

const AssetsAndDebtPanel = memo(function AssetsAndDebtPanel({
  busy,
  session,
  onBuyAsset,
  onBuyHomeType,
  onInvestStocks,
  onPayOffDebt,
  onSellAsset,
  onSellCar,
  onSellHome,
  onSellStocks,
}: {
  busy: boolean
  session: GameSession
  onBuyAsset: (assetId: string) => void
  onBuyHomeType: (homeId: string) => void
  onInvestStocks: (amount: number) => void
  onPayOffDebt: () => void
  onSellAsset: (holdingId: string) => void
  onSellCar: () => void
  onSellHome: () => void
  onSellStocks: () => void
}) {
  const [stockAmount, setStockAmount] = useState(500)
  const [homeId, setHomeId] = useState(homeOptions[0].id)
  const [assetId, setAssetId] = useState(assetOptions[0].id)
  const stockAmountId = useId()
  const homeSelectLabelId = useId()
  const assetSelectLabelId = useId()
  const selectedHome = homeOptions.find((home) => home.id === homeId) ?? homeOptions[0]
  const selectedAsset = assetOptions.find((asset) => asset.id === assetId) ?? assetOptions[0]
  const stockValue = session.stockPortfolio?.value ?? 0
  const stockInvested = session.stockPortfolio?.invested ?? 0
  const canSellCar = session.vehicleStatus?.type === "used-car"

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 md:grid-cols-3">
        <CompactMetric label="Cash" value={money(session.balance)} />
        <CompactMetric label="Asset Value" value={money(getAssetValue(session))} />
        <CompactMetric label="Student Debt" value={money(session.studentDebt)} />
      </div>

      <div className="grid gap-3 rounded-lg border bg-background p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold">Student debt</p>
            <p className="text-sm text-muted-foreground">Pay the full balance from cash.</p>
          </div>
          <Button disabled={busy || session.studentDebt <= 0 || session.balance < session.studentDebt} onClick={onPayOffDebt}>
            Pay Off All
          </Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border bg-background p-3">
        <div>
          <p className="font-semibold">Stock market</p>
          <p className="text-sm text-muted-foreground">
            Invested {money(stockInvested)} · Current value {money(stockValue)}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <Label className="sr-only" htmlFor={stockAmountId}>Stock investment amount</Label>
          <Input
            id={stockAmountId}
            min={1}
            type="number"
            value={stockAmount}
            onChange={(event) => setStockAmount(Math.max(1, Number(event.target.value) || 1))}
          />
          <Button disabled={busy || stockAmount > session.balance} onClick={() => onInvestStocks(stockAmount)}>
            Invest
          </Button>
          <Button disabled={busy || stockValue <= 0} variant="outline" onClick={onSellStocks}>
            Sell Stocks
          </Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border bg-background p-3">
        <div>
          <p className="font-semibold">Home</p>
          <p className="text-sm text-muted-foreground">
            {session.ownedHome
              ? `${session.ownedHome.label} · value ${money(session.ownedHome.estimatedValue)} · upkeep ${money(session.ownedHome.monthlyUpkeep)}/mo`
              : "Buy a home outright. Values can rise or fall each month."}
          </p>
        </div>
        {session.ownedHome ? (
          <Button className="w-fit" disabled={busy} variant="outline" onClick={onSellHome}>
            Sell Home
          </Button>
        ) : (
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Label className="sr-only" id={homeSelectLabelId}>Home to buy</Label>
            <Select
              items={homeOptions.map((home) => ({
                label: `${home.label} · ${money(home.price)}`,
                value: home.id,
              }))}
              value={homeId}
              onValueChange={(value) => value && setHomeId(value)}
            >
              <SelectTrigger aria-labelledby={homeSelectLabelId} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {homeOptions.map((home) => (
                    <SelectItem key={home.id} value={home.id}>
                      {home.label} · {money(home.price)} · upkeep {money(home.monthlyUpkeep)}/mo
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button disabled={busy || selectedHome.price > session.balance} onClick={() => onBuyHomeType(homeId)}>
              Buy Home
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-3 rounded-lg border bg-background p-3">
        <div>
          <p className="font-semibold">Car</p>
          <p className="text-sm text-muted-foreground">
            {session.vehicleStatus?.type === "used-car"
              ? `Used car · condition ${Math.round(session.vehicleStatus.condition)}% · ${Math.round(session.vehicleStatus.mileage).toLocaleString()} miles`
              : session.vehicleStatus?.type === "new-car"
                ? "New car lease. Leased cars cannot be sold."
                : "No car owned."}
          </p>
        </div>
        <Button className="w-fit" disabled={busy || !canSellCar} variant="outline" onClick={onSellCar}>
          Sell Used Car
        </Button>
      </div>

      <div className="grid gap-3 rounded-lg border bg-background p-3">
        <div>
          <p className="font-semibold">Other assets</p>
          <p className="text-sm text-muted-foreground">
            Assets can appreciate or depreciate each month.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Label className="sr-only" id={assetSelectLabelId}>Asset to buy</Label>
          <Select
            items={assetOptions.map((asset) => ({
              label: `${asset.label} · ${money(asset.price)}`,
              value: asset.id,
            }))}
            value={assetId}
            onValueChange={(value) => value && setAssetId(value)}
          >
            <SelectTrigger aria-labelledby={assetSelectLabelId} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {assetOptions.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.label} · {asset.category} · {money(asset.price)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button disabled={busy || selectedAsset.price > session.balance} onClick={() => onBuyAsset(assetId)}>
            Buy Asset
          </Button>
        </div>
        {session.assetHoldings?.length ? (
          <div className="grid gap-2">
            {session.assetHoldings.map((asset) => (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted px-3 py-2" key={asset._id}>
                <p className="text-sm">
                  <span className="font-medium">{asset.label}</span>{" "}
                  <span className="text-muted-foreground">
                    value {money(asset.estimatedValue)} · bought {money(asset.purchasePrice)}
                  </span>
                </p>
                <Button
                  aria-label={`Sell ${asset.label}`}
                  size="sm"
                  disabled={busy}
                  variant="outline"
                  onClick={() => onSellAsset(asset._id)}
                >
                  Sell
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
})

function ResultsScreen({
  session,
  jobs,
  optionsByCategory,
  busy,
  onPlayAgain,
}: {
  session: GameSession
  jobs: Job[]
  optionsByCategory: Record<ExpenseCategory, ExpenseOption[]>
  busy: boolean
  onPlayAgain: (
    lifePath: LifePath,
    jobId: string,
    expenseSelections: ExpenseSelections,
  ) => void
}) {
  const ageYears = Math.floor(session.ageMonths / 12)
  const ageRemainderMonths = session.ageMonths % 12
  const recap = session.deathRecap
  const lastRound = session.history.at(-1)
  const chance = recap?.chance ?? lastRound?.deathChance ?? 0
  const roll = recap?.roll
  const endedByPlayer = recap?.eventTitle === "Run ended by player"
  const assetValue = recap?.assetValue ?? getAssetValue(session)
  const netWorth = session.balance + assetValue - session.studentDebt

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" role="heading" aria-level={2}>
          <Medal className="size-5 text-destructive" aria-hidden="true" />
          {endedByPlayer ? "Run Recap" : "Death Recap"}
        </CardTitle>
        <CardDescription>
          Age {ageYears}y {ageRemainderMonths}m · {recap?.reason ?? session.deathReason ?? "Your run ended."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <CompactMetric label="Final Score" value={money(session.finalScore ?? session.balance)} />
          <CompactMetric label="Net Worth" value={money(netWorth)} />
          <CompactMetric label="Cash" value={money(session.balance)} />
          <CompactMetric label="Assets" value={money(assetValue)} />
          <CompactMetric label="Student Debt" value={money(session.studentDebt)} />
          <CompactMetric label="Job" value={recap?.jobTitle ?? session.currentJobId.title} />
          <CompactMetric label="Death Chance" value={endedByPlayer ? "Manual end" : `${(chance * 100).toFixed(3)}%`} />
          <CompactMetric label="Roll" value={endedByPlayer ? "N/A" : roll == null ? "Unknown" : `${(roll * 100).toFixed(3)}%`} />
        </div>

        {lastRound ? (
          <div className="grid gap-2 rounded-lg border bg-background p-3">
            <p className="font-semibold">Last month</p>
            <p className="text-sm text-muted-foreground">
              Income {money(lastRound.income)} · Expenses {money(lastRound.expenses)} · Balance after {money(lastRound.balanceAfter)}
            </p>
            {lastRound.eventTitle ? (
              <p className="text-sm text-muted-foreground">Event: {lastRound.eventTitle}</p>
            ) : null}
          </div>
        ) : null}

        {recap?.needs ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <NeedMeter label="Happiness" value={recap.needs.happiness} />
            <NeedMeter label="Hunger" value={recap.needs.hunger} />
            <NeedMeter label="Entertainment" value={recap.needs.entertainment} />
            <NeedMeter label="Love" value={recap.needs.love} />
            <NeedMeter label="Energy" value={recap.needs.energy ?? 70} />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Link className={buttonVariants()} to="/leaderboard">
            View Leaderboard
          </Link>
          <Button
            variant="outline"
            disabled={busy || !jobs[0]}
            onClick={() =>
              onPlayAgain("work", jobs[0]._id, defaultSelections(optionsByCategory))
            }
          >
            Play Again
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function EnrollCollegeDialog({ busy, onEnroll }: { busy: boolean; onEnroll: (major: Major) => void }) {
  const [open, setOpen] = useState(false)
  const [major, setMajor] = useState<Major>("business")
  const majorLabelId = useId()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Enroll in college</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start college</DialogTitle>
          <DialogDescription>
            College takes 48 months. Tuition adds student debt, but studying and internships build career skills.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label id={majorLabelId}>Major</Label>
          <Select
            items={[
              { label: "Computer Science", value: "computer-science" },
              { label: "Business", value: "business" },
              { label: "Communications", value: "communications" },
            ]}
            value={major}
            onValueChange={(value) => value && setMajor(value as Major)}
          >
            <SelectTrigger aria-labelledby={majorLabelId} className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="computer-science">Computer Science</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="communications">Communications</SelectItem>
            </SelectGroup></SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            disabled={busy}
            onClick={() => {
              onEnroll(major)
              setOpen(false)
            }}
          >
            Enroll now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EndRunDialog({ busy, onEndRun }: { busy: boolean; onEndRun: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>End Run</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>End this run?</DialogTitle>
          <DialogDescription>
            This will finalize your score, save a recap, and let you start over.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Keep Playing
          </Button>
          <Button
            disabled={busy}
            variant="destructive"
            onClick={() => {
              onEndRun()
              setOpen(false)
            }}
          >
            {busy ? "Ending..." : "End Run"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const JobMarket = memo(function JobMarket({
  session,
  busy,
  onApplyForJob,
}: {
  session: GameSession
  busy: boolean
  onApplyForJob: (jobId: string) => void
}) {
  const marketJobs = session.jobMarketIds ?? []
  const hasAppliedThisMonth = (session.appliedJobIds ?? []).length > 0

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">This month’s openings</p>
        {hasAppliedThisMonth ? (
          <Badge variant="secondary">Application used</Badge>
        ) : (
          <Badge variant="outline">One application available</Badge>
        )}
      </div>
      {session.lastJobApplication ? (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          {session.lastJobApplication.message}
        </p>
      ) : null}
      {marketJobs.length ? (
        <div className="grid gap-2">
          {marketJobs.map((job) => {
            const lockMessage = getJobLockMessage(job, session)
            const lockTooltip = lockMessage ? getJobLockTooltip(job, session) : null
            const disabled = busy || hasAppliedThisMonth || Boolean(lockMessage)
            const button = (
              <Button
                aria-label={`${lockMessage ? "Locked" : hasAppliedThisMonth ? "Applied to" : "Apply to"} ${job.title}`}
                disabled={disabled}
                onClick={() => onApplyForJob(job._id)}
                variant={lockMessage ? "outline" : "default"}
              >
                {lockMessage ? "Locked" : hasAppliedThisMonth ? "Applied" : "Apply"}
              </Button>
            )

            return (
              <div
                className="grid gap-2 rounded-lg border bg-background px-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
                key={job._id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{job.title}</p>
                    <Badge variant={job.requiresDegree ? "secondary" : "outline"}>
                      Tier {job.tier}
                    </Badge>
                    {job.requiresDegree ? <Badge variant="secondary">Degree</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {money(job.monthlySalary)}/mo · {job.careerTrack} · {job.requiredSkill} {job.requiredSkillLevel}
                  </p>
                  {lockMessage ? (
                    <p className="text-sm text-muted-foreground">{lockMessage}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Estimated offer chance: {Math.round(getEstimatedApplicationChance(job, session) * 100)}%
                    </p>
                  )}
                </div>
                {lockTooltip ? (
                  <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex w-fit" />}>
                      {button}
                    </TooltipTrigger>
                    <TooltipContent>{lockTooltip}</TooltipContent>
                  </Tooltip>
                ) : button}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No openings are posted this month. Advance to refresh the market.
        </p>
      )}
    </div>
  )
})

const JobSelect = memo(function JobSelect({
  jobs,
  labelId,
  value,
  onValueChange,
}: {
  jobs: Job[]
  labelId?: string
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <Select
      items={jobs.map((job) => ({
        label: `${job.title} · ${money(job.monthlySalary)}`,
        value: job._id,
      }))}
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onValueChange(nextValue)
        }
      }}
    >
      <SelectTrigger aria-labelledby={labelId} className="w-full">
        <SelectValue placeholder="Select a job" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {jobs.map((job) => (
            <SelectItem key={job._id} value={job._id}>
              {job.title} · {money(job.monthlySalary)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
})

const ExpensePickerGrid = memo(function ExpensePickerGrid({
  optionsByCategory,
  selections,
  session,
  disabled = false,
  onChange,
}: {
  optionsByCategory: Record<ExpenseCategory, ExpenseOption[]>
  selections: ExpenseSelections
  session?: GameSession
  disabled?: boolean
  onChange: (category: MonthlyExpenseCategory, optionId: string) => void
}) {
  const fieldPrefix = useId()

  return (
    <div className="grid gap-3">
      {monthlyCategories.map((category) => {
        const fieldId = `${fieldPrefix}-${category.toLowerCase()}`
        const statusId = `${fieldId}-status`
        const selectedOption = optionsByCategory[category].find(
          (option) => option._id === selections[category],
        )
        const lockMessage = session ? getExpenseLockMessage(category, session) : null
        const statusMessage = selectedOption
          ? getExpenseStatusMessage(category, selectedOption, session)
          : null

        return (
        <div className="grid min-w-0 gap-2" key={category}>
          <Label id={fieldId}>{category}</Label>
          <Select
            items={optionsByCategory[category].map((option) => ({
              label: `${option.tier}: ${option.label} · ${money(option.monthlyCost)}`,
              value: option._id,
            }))}
            value={selections[category] ?? ""}
            onValueChange={(optionId) => {
              if (optionId) {
                onChange(category, optionId)
              }
            }}
            disabled={disabled || Boolean(lockMessage)}
          >
            <SelectTrigger
              aria-describedby={lockMessage || statusMessage ? statusId : undefined}
              aria-labelledby={fieldId}
              className="w-full min-w-0"
            >
              <SelectValue placeholder={`Select ${category}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {optionsByCategory[category].map((option) => (
                  <SelectItem key={option._id} value={option._id}>
                    {option.tier}: {option.label} · {money(option.monthlyCost)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {lockMessage ? (
            <p className="text-xs text-muted-foreground" id={statusId}>{lockMessage}</p>
          ) : statusMessage ? (
            <p className="text-xs text-muted-foreground" id={statusId}>
              {statusMessage}
            </p>
          ) : null}
        </div>
        )
      })}
    </div>
  )
})

const HistoryTable = memo(function HistoryTable({ session }: { session: GameSession }) {
  const recentHistory = useMemo(() => session.history.slice(-14).reverse(), [session.history])
  const recentEvents = useMemo(
    () => session.history.filter((round) => round.eventTitle).slice(-6),
    [session.history],
  )

  return (
    <>
      {session.history.length ? (
        <div className="grid gap-3">
          <div className="mb-4 flex flex-wrap gap-2">
            {recentEvents.map((round) => (
              <Badge key={`${round.month}-${round.eventTitle}`} variant="secondary">Month {round.month}: {round.eventTitle}</Badge>
            ))}
          </div>
          <div className="overflow-x-auto"><Table>
            <TableCaption className="sr-only">
              Recent monthly history for the current run
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Event</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Debt</TableHead>
                <TableHead className="text-right">Death Risk</TableHead>
                <TableHead className="text-right">Balance After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentHistory.map((round) => (
                <TableRow key={round.month}>
                  <TableCell>{round.month}</TableCell>
                  <TableCell>{round.jobTitle}</TableCell>
                  <TableCell>{round.eventTitle ?? "None"}</TableCell>
                  <TableCell className="text-right">{money(round.income)}</TableCell>
                  <TableCell className="text-right">{money(round.expenses)}</TableCell>
                  <TableCell className="text-right">{money(round.studentDebtAfter)}</TableCell>
                  <TableCell className="text-right">
                    {(round.deathChance * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">{money(round.balanceAfter)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No months advanced yet.
        </p>
      )}
    </>
  )
})

function LeaderboardPage({ user }: { user: User | null }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadLeaderboard() {
      try {
        const data = await api.leaderboard(50)

        if (isMounted) {
          setEntries(data.entries)
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError))
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadLeaderboard()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Leaderboard</h1>
          <p className="text-muted-foreground">
            Public rankings from lives that ended.
          </p>
        </div>
        {!user ? (
          <Link className={buttonVariants()} to="/login">
            Sign up to start playing
          </Link>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Leaderboard unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <PageSkeleton />
          ) : entries.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Final Score</TableHead>
                  <TableHead className="text-right">Date Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, index) => (
                  <TableRow
                    className={entry.userId === user?.id ? "bg-emerald-50" : ""}
                    key={`${entry.userId}-${entry.completedAt}`}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{entry.name}</TableCell>
                    <TableCell className="text-right">
                      {money(entry.finalScore)}
                    </TableCell>
                    <TableCell className="text-right">
                      {dateFormatter.format(new Date(entry.completedAt))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="grid place-items-center gap-3 py-12 text-center">
              <ChartNoAxesColumnIncreasing
                className="size-10 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="font-medium">No finished lives yet — be the first!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Field({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

function getGameTips(session: GameSession, jobs: Job[]) {
  const tips: string[] = []
  const needs = [
    ["Hunger", session.needs.hunger, "Increase your days eating before your hunger becomes dangerous."],
    ["Energy", session.needs.energy ?? 70, "Choose Rest this month to rebuild energy and reduce risk."],
    ["Happiness", session.needs.happiness, "Make room for recreation or connection to lift happiness."],
    ["Entertainment", session.needs.entertainment, "Plan a little recreation to keep entertainment from falling further."],
    ["Love", session.needs.love, "Spend time dating or connecting to strengthen your relationships."],
  ] as const

  for (const [label, value, tip] of needs) {
    if (value < 25) tips.push(`Critical ${label.toLowerCase()}: ${tip}`)
  }

  if (session.unemployedMonths) {
    tips.push("You are between jobs this month. Keep costs low and choose a new role when you meet its requirements.")
  }

  if ((session.careerPerformance ?? 0) >= 75 && (session.careerLevel ?? 0) < 3) {
    tips.push(`Career milestone: only ${100 - (session.careerPerformance ?? 0)} performance remains until your next promotion.`)
  }

  const nextJob = jobs
    .filter((job) => job.tier > session.currentJobId.tier)
    .find((job) => (session.skills?.[job.requiredSkill] ?? 0) < job.requiredSkillLevel)
  if (nextJob) {
    const currentSkill = session.skills?.[nextJob.requiredSkill] ?? 0
    tips.push(`Skill milestone: ${nextJob.title} needs ${nextJob.requiredSkillLevel} ${nextJob.requiredSkill} skill; you need ${Math.ceil(nextJob.requiredSkillLevel - currentSkill)} more.`)
  }

  if (!session.completedGoals?.includes("Save $10,000") && session.balance >= 7000) {
    tips.push(`Savings milestone: you are ${money(10000 - session.balance)} away from saving $10,000.`)
  }
  if (!session.homeOwned && session.balance >= 20000) {
    tips.push(`Home milestone: you are ${money(30000 - session.balance)} away from buying a home.`)
  }
  if (session.studentDebt > 0 && session.studentDebt <= 5000) {
    tips.push(`Debt milestone: only ${money(session.studentDebt)} remains. A focused loan payment can get you debt-free.`)
  }
  if (session.lifePath === "college" && session.educationMonths < 48) {
    tips.push(`Education milestone: ${48 - session.educationMonths} college months remain. Studying and internships build your ${session.major?.replace("-", " ") ?? "major"} skills.`)
  }

  return tips.length ? tips.slice(0, 4) : ["You are in a stable spot. Keep building skills, saving cash, and protecting your wellbeing."]
}

function getJobLockMessage(job: Job, session: GameSession) {
  const hasGraduated = session.lifePath === "college" && session.educationMonths >= 48

  if (job.requiresDegree && !hasGraduated) {
    return "Locked until you finish your degree."
  }

  const skillLevel = session.skills?.[job.requiredSkill] ?? 0
  if (skillLevel < job.requiredSkillLevel) {
    return `Needs ${job.requiredSkillLevel} ${job.requiredSkill} skill.`
  }

  return null
}

function getJobLockTooltip(job: Job, session: GameSession) {
  const hasGraduated = session.lifePath === "college" && session.educationMonths >= 48

  if (job.requiresDegree && !hasGraduated) {
    return "Finish your degree to unlock this career path."
  }

  return `Set monthly focus to Study to build ${job.requiredSkill} skill and access this job.`
}

function getEstimatedApplicationChance(job: Job, session: GameSession) {
  const skillLevel = session.skills?.[job.requiredSkill] ?? 0
  const skillGap = skillLevel - job.requiredSkillLevel
  const tierGap = job.tier - session.currentJobId.tier
  const careerMatchBonus = job.careerTrack === session.currentJobId.careerTrack ? 0.08 : 0
  const chance = 0.48 + skillGap * 0.06 - Math.max(0, tierGap) * 0.06 + careerMatchBonus

  return Math.max(0.12, Math.min(0.9, Math.round(chance * 100) / 100))
}

function getAssetValue(session: GameSession) {
  return (
    (session.stockPortfolio?.value ?? 0) +
    (session.ownedHome?.estimatedValue ?? 0) +
    (session.assetHoldings ?? []).reduce(
      (total, asset) => total + asset.estimatedValue,
      0,
    )
  )
}

function getExpenseLockMessage(category: MonthlyExpenseCategory, session: GameSession) {
  if (category === "Housing" && (session.housingLeaseMonthsRemaining ?? 0) > 0) {
    return `Lease locked for ${session.housingLeaseMonthsRemaining} more month${session.housingLeaseMonthsRemaining === 1 ? "" : "s"}.`
  }

  if (
    category === "Transportation" &&
    (session.transportationTermMonthsRemaining ?? 0) > 0 &&
    !session.vehicleStatus?.broken
  ) {
    return `Transportation locked for ${session.transportationTermMonthsRemaining} more month${session.transportationTermMonthsRemaining === 1 ? "" : "s"}.`
  }

  return null
}

function getExpenseStatusMessage(
  category: MonthlyExpenseCategory,
  option: ExpenseOption,
  session?: GameSession,
) {
  if (category === "Transportation" && session?.vehicleStatus?.broken) {
    return "Your car is broken. Choose public transit, a used car, or a new lease now."
  }

  if (category === "Transportation" && session?.vehicleStatus && session.vehicleStatus.type !== "none") {
    const condition = Math.round(session.vehicleStatus.condition)
    const mileage = Math.round(session.vehicleStatus.mileage).toLocaleString()
    const repair = session.vehicleStatus.lastRepairCost
      ? ` Last repair: ${money(session.vehicleStatus.lastRepairCost)}.`
      : ""

    return `${getExpenseBenefit(option)} Condition ${condition}%, ${mileage} miles.${repair}`
  }

  return getExpenseBenefit(option)
}

function getExpenseBenefit(option: ExpenseOption) {
  if (option.category === "Housing") {
    if (option.tier === "Low") return "Cheapest housing, but lowers energy and happiness each month."
    if (option.tier === "Mid") return "Moderate cost with better rest and a small happiness lift."
    return "Highest cost, with the strongest happiness, energy, and love benefits."
  }

  if (option.category === "Transportation") {
    if (option.tier === "Low") return "Cheapest commute, but drains energy each month."
    if (option.tier === "Mid") return "Moderate cost that saves a little energy."
    return "Highest cost, with the best monthly energy benefit."
  }

  return "lifestyle"
}

const MonthlyChoiceInput = memo(function MonthlyChoiceInput({
  label,
  value,
  cost,
  onChange,
}: {
  label: string
  value: number
  cost: number
  onChange: (value: number) => void
}) {
  const inputId = useId()

  return (
    <div className="grid gap-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        type="number"
        min={0}
        max={30}
        value={value}
        onChange={(event) =>
          onChange(Math.max(0, Math.min(30, Number(event.target.value))))
        }
      />
      <p className="text-sm text-muted-foreground">{money(cost)} planned</p>
    </div>
  )
})

function PageSkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-36 w-full" />
    </div>
  )
}

function RequireLoginRedirect() {
  const location = useLocation()
  return <Navigate to="/login" replace state={{ from: location.pathname }} />
}

function groupOptions(options: ExpenseOption[]) {
  const grouped: Record<ExpenseCategory, ExpenseOption[]> = {
    Housing: [],
    Food: [],
    Transportation: [],
    Entertainment: [],
  }

  for (const option of options) {
    grouped[option.category].push(option)
  }

  for (const category of monthlyCategories) {
    grouped[category].sort((a, b) => a.monthlyCost - b.monthlyCost)
  }

  return grouped
}

function defaultSelections(
  optionsByCategory: Record<ExpenseCategory, ExpenseOption[]>,
) {
  return Object.fromEntries(
    monthlyCategories.map((category) => [
      category,
      optionsByCategory[category].find((option) => option.tier === "Low")
        ?._id ?? optionsByCategory[category][0]?._id ?? "",
    ]),
  ) as ExpenseSelections
}

function hasAllSelections(selections: ExpenseSelections) {
  return monthlyCategories.every((category) => selections[category])
}

function hasCatalogOptions(
  optionsByCategory: Record<ExpenseCategory, ExpenseOption[]>,
) {
  return monthlyCategories.every((category) => optionsByCategory[category].length > 0)
}

function selectedIds(session: GameSession) {
  return Object.fromEntries(
    monthlyCategories.map((category) => [
      category,
      session.currentExpenseSelections[category]._id,
    ]),
  ) as ExpenseSelections
}

function sumSelectedExpenses(session: GameSession) {
  return monthlyCategories.reduce(
    (total, category) =>
      total + session.currentExpenseSelections[category].monthlyCost,
    0,
  )
}

export default App
