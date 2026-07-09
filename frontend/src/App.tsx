import {
  useEffect,
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
  Table,
  TableBody,
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
  type User,
} from "@/lib/api"
import "./App.css"

const categories: ExpenseCategory[] = [
  "Housing",
  "Food",
  "Transportation",
  "Entertainment",
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
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
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
    <header className="border-b bg-background/85 backdrop-blur">
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
            12-month finance simulation
          </Badge>
          <div className="grid gap-3">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl">
              Start with a job. Survive 12 months. See how much you can save.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              Pick an income, tune your monthly lifestyle, and climb the public
              leaderboard with the highest final bank balance.
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
              Monthly Decision Board
            </CardTitle>
            <CardDescription>
              Balance income against rent, food, transportation, and fun.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {[
              ["Income", "$4,000", "Marketing Coordinator"],
              ["Expenses", "$1,640", "Low housing, mixed food"],
              ["Monthly Net", "$2,360", "Added to balance"],
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
          text="Choose low, mid, or high tiers for the four required categories."
        />
        <FeatureCard
          icon={<Trophy className="size-5" aria-hidden="true" />}
          title="Climb the Leaderboard"
          text="Completed runs are ranked publicly by final score."
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
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </Field>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button disabled={loading} type="submit">
        {loading ? "Creating..." : "Create Account"}
      </Button>
    </form>
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
  const [completedSession, setCompletedSession] = useState<GameSession | null>(null)
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

  async function startRun(jobId: string, expenseSelections: ExpenseSelections) {
    setBusy(true)
    setError(null)

    try {
      const data = await api.startSession(token, { jobId, expenseSelections })
      setSession(data.session)
      setCompletedSession(null)
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
  }

  async function updateJob(jobId: string) {
    setBusy(true)
    setError(null)

    try {
      const data = await api.changeJob(token, jobId)
      setSession(data.session)
    } catch (updateError) {
      setError(getErrorMessage(updateError))
    } finally {
      setBusy(false)
    }
  }

  async function updateExpense(category: ExpenseCategory, optionId: string) {
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
  }

  async function advanceMonth() {
    setBusy(true)
    setError(null)

    try {
      const data = await api.advanceMonth(token)

      if (data.session.status === "completed") {
        setCompletedSession(data.session)
        setSession(null)
      } else {
        setSession(data.session)
      }
    } catch (advanceError) {
      setError(getErrorMessage(advanceError))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <PageSkeleton />
  }

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
          {session ? "Active Run" : completedSession ? "Run Complete" : "Ready"}
        </Badge>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Action needed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {completedSession ? (
        <ResultsScreen
          jobs={jobs}
          optionsByCategory={optionsByCategory}
          session={completedSession}
          busy={busy}
          onPlayAgain={startRun}
        />
      ) : session ? (
        <ActiveSession
          busy={busy}
          jobs={jobs}
          optionsByCategory={optionsByCategory}
          session={session}
          onAdvance={advanceMonth}
          onChangeExpense={updateExpense}
          onChangeJob={updateJob}
        />
      ) : (
        <StartRunPanel
          busy={busy}
          jobs={jobs}
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
  busy,
  onStart,
}: {
  jobs: Job[]
  optionsByCategory: Record<ExpenseCategory, ExpenseOption[]>
  busy: boolean
  onStart: (jobId: string, expenseSelections: ExpenseSelections) => void
}) {
  const [jobId, setJobId] = useState(() => jobs[0]?._id ?? "")
  const [selections, setSelections] = useState<ExpenseSelections>(() =>
    defaultSelections(optionsByCategory),
  )

  useEffect(() => {
    if (!jobId && jobs[0]) {
      setJobId(jobs[0]._id)
    }
  }, [jobId, jobs])

  useEffect(() => {
    setSelections((current) => ({ ...defaultSelections(optionsByCategory), ...current }))
  }, [optionsByCategory])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start New Run</CardTitle>
        <CardDescription>
          Choose a starting job and a tier for each expense category.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2">
          <Label>Starting job</Label>
          <JobSelect jobs={jobs} value={jobId} onValueChange={setJobId} />
        </div>
        <ExpensePickerGrid
          optionsByCategory={optionsByCategory}
          selections={selections}
          onChange={(category, optionId) =>
            setSelections((current) => ({ ...current, [category]: optionId }))
          }
        />
        <Button
          className="w-fit"
          disabled={busy || !jobId || !hasAllSelections(selections)}
          onClick={() => onStart(jobId, selections)}
        >
          <Play className="size-4" aria-hidden="true" />
          {busy ? "Starting..." : "Start Simulation"}
        </Button>
      </CardContent>
    </Card>
  )
}

function ActiveSession({
  session,
  jobs,
  optionsByCategory,
  busy,
  onAdvance,
  onChangeJob,
  onChangeExpense,
}: {
  session: GameSession
  jobs: Job[]
  optionsByCategory: Record<ExpenseCategory, ExpenseOption[]>
  busy: boolean
  onAdvance: () => void
  onChangeJob: (jobId: string) => void
  onChangeExpense: (category: ExpenseCategory, optionId: string) => void
}) {
  const expenseTotal = sumSelectedExpenses(session)
  const monthlyNet = session.currentJobId.monthlySalary - expenseTotal

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Current Round" value={`Month ${session.currentRound} / 12`} />
        <StatCard label="Current Balance" value={money(session.balance)} />
        <StatCard
          label="Monthly Net"
          value={money(monthlyNet)}
          note={monthlyNet >= 0 ? "Surplus this month" : "Deficit this month"}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Job</CardTitle>
            <CardDescription>
              {session.currentJobId.title} earns {money(session.currentJobId.monthlySalary)}
              /month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangeJobDialog
              busy={busy}
              jobs={jobs}
              value={session.currentJobId._id}
              onChangeJob={onChangeJob}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
            <CardDescription>Total monthly cost: {money(expenseTotal)}</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpensePickerGrid
              optionsByCategory={optionsByCategory}
              selections={selectedIds(session)}
              onChange={onChangeExpense}
              disabled={busy}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button size="lg" disabled={busy} onClick={onAdvance}>
          <RefreshCw className="size-4" aria-hidden="true" />
          {busy ? "Advancing..." : "Advance Month"}
        </Button>
      </div>

      <HistoryTable session={session} />
    </div>
  )
}

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
  onPlayAgain: (jobId: string, expenseSelections: ExpenseSelections) => void
}) {
  return (
    <Card className="border-emerald-700/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Medal className="size-5 text-emerald-700" aria-hidden="true" />
          Run Complete
        </CardTitle>
        <CardDescription>
          Final score: {money(session.finalScore ?? session.balance)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Link className={buttonVariants()} to="/leaderboard">
          View Leaderboard
        </Link>
        <Button
          variant="outline"
          disabled={busy || !jobs[0]}
          onClick={() =>
            onPlayAgain(jobs[0]._id, defaultSelections(optionsByCategory))
          }
        >
          Play Again
        </Button>
      </CardContent>
    </Card>
  )
}

function ChangeJobDialog({
  jobs,
  value,
  busy,
  onChangeJob,
}: {
  jobs: Job[]
  value: string
  busy: boolean
  onChangeJob: (jobId: string) => void
}) {
  const [draft, setDraft] = useState(value)
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Change Job</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change job</DialogTitle>
          <DialogDescription>
            Pick any role in the catalog before advancing the month.
          </DialogDescription>
        </DialogHeader>
        <JobSelect jobs={jobs} value={draft} onValueChange={setDraft} />
        <DialogFooter>
          <Button
            disabled={busy}
            onClick={() => {
              onChangeJob(draft)
              setOpen(false)
            }}
          >
            Confirm Job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function JobSelect({
  jobs,
  value,
  onValueChange,
}: {
  jobs: Job[]
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
      <SelectTrigger className="w-full">
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
}

function ExpensePickerGrid({
  optionsByCategory,
  selections,
  disabled = false,
  onChange,
}: {
  optionsByCategory: Record<ExpenseCategory, ExpenseOption[]>
  selections: ExpenseSelections
  disabled?: boolean
  onChange: (category: ExpenseCategory, optionId: string) => void
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {categories.map((category) => (
        <div className="grid gap-2" key={category}>
          <Label>{category}</Label>
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
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
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
        </div>
      ))}
    </div>
  )
}

function HistoryTable({ session }: { session: GameSession }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>Past months in this run.</CardDescription>
      </CardHeader>
      <CardContent>
        {session.history.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Round</TableHead>
                <TableHead>Job</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Balance After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {session.history.map((round) => (
                <TableRow key={round.round}>
                  <TableCell>{round.round}</TableCell>
                  <TableCell>{round.jobTitle}</TableCell>
                  <TableCell className="text-right">{money(round.expenses)}</TableCell>
                  <TableCell className="text-right">{money(round.balanceAfter)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">
            No months advanced yet.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

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
            Public rankings from completed 12-month runs.
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
              <p className="font-medium">No runs completed yet — be the first!</p>
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

function StatCard({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
        {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
      </CardHeader>
    </Card>
  )
}

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

  for (const category of categories) {
    grouped[category].sort((a, b) => a.monthlyCost - b.monthlyCost)
  }

  return grouped
}

function defaultSelections(
  optionsByCategory: Record<ExpenseCategory, ExpenseOption[]>,
) {
  return Object.fromEntries(
    categories.map((category) => [
      category,
      optionsByCategory[category].find((option) => option.tier === "Low")
        ?._id ?? optionsByCategory[category][0]?._id ?? "",
    ]),
  ) as ExpenseSelections
}

function hasAllSelections(selections: ExpenseSelections) {
  return categories.every((category) => selections[category])
}

function selectedIds(session: GameSession) {
  return Object.fromEntries(
    categories.map((category) => [
      category,
      session.currentExpenseSelections[category]._id,
    ]),
  ) as ExpenseSelections
}

function sumSelectedExpenses(session: GameSession) {
  return categories.reduce(
    (total, category) =>
      total + session.currentExpenseSelections[category].monthlyCost,
    0,
  )
}

export default App
