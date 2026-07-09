# Product Requirements Document: Finance Budget Simulation Game (MVP)

**Doc status:** Draft v3.0 — MVP-only scope, written to be pasted directly into a coding agent (Claude Code / Codex).
**Purpose:** Fully specify the MVP so an agent can implement it end-to-end without ambiguity.

---

## 1. Concept

A browser game where a player is given a starting job and a set of monthly expense choices. Over a fixed number of simulated months, the player can **upgrade or downgrade their job** and **upgrade or downgrade their expenses** (housing, food, transportation, entertainment) to try to maximize their final bank balance. When the simulation ends, the player's score (final balance) is submitted to a **global leaderboard**, which anyone — logged in or not — can view.

### 1.1 Goals (MVP)
- User can create an account and verify it by email.
- User can log in/out securely.
- User can start a new simulation run with a starting job + default expenses.
- User can, each round, choose to change their job and/or their expense tier per category, then advance to the next round.
- Each round applies income minus expenses to the player's running balance.
- After the final round, the run is marked complete and the score is posted to the leaderboard.
- Anyone (authenticated or not) can view the global leaderboard.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), React Router, shadcn/ui, Tailwind CSS |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT (access token), bcrypt for password hashing |
| Email | Resend (transactional email API) |
| Testing (BE + FE unit) | Vitest (Node environment for server, jsdom for client) |
| Component testing (FE) | Vitest + React Testing Library |
| E2E Testing | Playwright |
| Validation | Zod (frontend + backend shared schema shapes) |

---

## 3. Architecture Summary

```
/client                 React app (Vite)
  /src
    /components          shadcn-based UI components
    /pages                Login, Home, Dashboard (game screen), Leaderboard
    /lib                  api client, jwt helpers, zod schemas
    /hooks
    /tests                vitest + RTL tests
/server
  /src
    /models               User, Job, ExpenseOption, GameSession
    /routes                auth.routes.js, job.routes.js, expense.routes.js, game.routes.js, leaderboard.routes.js
    /controllers
    /middleware            auth.middleware.js, error.middleware.js, validate.middleware.js
    /services              email.service.js (Resend), token.service.js, gameEngine.service.js
    /config                db.js, env.js
    /seed                  seed.js (jobs + expense options catalog)
    /tests                 vitest + supertest
  server.js
```

Response envelope (consistent across all endpoints):
```json
{ "success": true, "data": { }, "error": null }
```
```json
{ "success": false, "data": null, "error": { "code": "INVALID_CREDENTIALS", "message": "Email or password is incorrect." } }
```

---

## 4. Game Design (MVP Rules)

- **Simulation length:** 12 rounds, each round represents one simulated month.
- **Starting balance:** $500.
- **Starting job:** player picks from the job catalog at game start.
- **Expense categories (4, fixed for MVP):** Housing, Food, Transportation, Entertainment. Each has 3 tiers: Low / Mid / High cost. Player picks one tier per category at game start (defaults to Low) and can change tiers before any round.
- **Round flow:**
  1. Player is shown current round number, current job salary, current expense selections and their total monthly cost, and current balance.
  2. Player may change job (any job in the catalog, no cost/cooldown for MVP) and/or change any expense tier.
  3. Player clicks **Advance Month** → backend computes `balance += job.salary - sum(selected expense tier costs)`, logs the round in the session's history, increments round counter.
  4. If round counter reaches 12, session status becomes `completed` and the final balance is written as the score.
- **Score:** final balance after round 12. Can go negative — that's a valid (bad) outcome, not blocked.
- **One active session per user at a time.** If a user tries to start a new run while one is active, the backend returns `409 ACTIVE_SESSION_EXISTS` and the Dashboard shows a "Resume" state instead of a "Start New Run" panel.

---

## 5. Data Models

### 5.1 User
```js
{
  _id: ObjectId,
  name: String,                // required
  email: String,                // required, unique, lowercase
  passwordHash: String,         // required
  isVerified: Boolean,          // default false
  verificationToken: String,    // hashed
  verificationTokenExpires: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### 5.2 Job (seeded catalog, not user-editable in MVP)
```js
{
  _id: ObjectId,
  title: String,          // e.g. "Barista"
  monthlySalary: Number,  // e.g. 1800
  tier: Number             // 1 (entry) - 5 (senior), just for sorting/display
}
```
Seed data:
| Title | Monthly Salary | Tier |
|---|---|---|
| Barista | 1,800 | 1 |
| Retail Associate | 2,200 | 1 |
| Office Admin | 3,000 | 2 |
| Marketing Coordinator | 4,000 | 3 |
| Software Developer | 6,500 | 4 |

### 5.3 ExpenseOption (seeded catalog)
```js
{
  _id: ObjectId,
  category: String,   // "Housing" | "Food" | "Transportation" | "Entertainment"
  tier: String,         // "Low" | "Mid" | "High"
  label: String,        // e.g. "Shared Apartment"
  monthlyCost: Number
}
```
Seed data:
| Category | Tier | Label | Cost |
|---|---|---|---|
| Housing | Low | Shared Apartment | 700 |
| Housing | Mid | Studio | 1,200 |
| Housing | High | One-Bedroom Downtown | 2,000 |
| Food | Low | Cook at Home | 300 |
| Food | Mid | Mixed | 500 |
| Food | High | Eat Out Often | 900 |
| Transportation | Low | Public Transit | 90 |
| Transportation | Mid | Used Car | 300 |
| Transportation | High | New Car | 600 |
| Entertainment | Low | Minimal | 50 |
| Entertainment | Mid | Occasional | 150 |
| Entertainment | High | Frequent | 400 |

### 5.4 GameSession
```js
{
  _id: ObjectId,
  userId: ObjectId,             // ref User, required
  status: String,                 // "active" | "completed", default "active"
  currentRound: Number,          // 1-12, starts at 1
  balance: Number,                // running balance, starts at 500
  currentJobId: ObjectId,        // ref Job
  currentExpenseSelections: {     // categoryName -> ExpenseOption _id
    Housing: ObjectId,
    Food: ObjectId,
    Transportation: ObjectId,
    Entertainment: ObjectId
  },
  history: [                      // one entry appended per round advanced
    {
      round: Number,
      jobTitle: String,
      salary: Number,
      expenses: Number,           // total that round
      balanceAfter: Number
    }
  ],
  finalScore: Number,             // set only when status = "completed"
  startedAt: Date,
  completedAt: Date
}
```

---

## 6. Authentication & Email Verification Flow

1. `POST /api/auth/signup` → creates User with `isVerified: false`, generates a verification token (hashed in DB, raw token emailed via Resend) with a link: `FRONTEND_URL/verify-email?token=<raw_token>&email=<email>`.
2. `POST /api/auth/verify-email` confirms the token (24h expiry) and sets `isVerified: true`.
3. `POST /api/auth/login` rejects with `403 EMAIL_NOT_VERIFIED` if not verified.
4. Successful login returns a JWT (1h expiry, `JWT_SECRET`). Stored client-side (localStorage) for MVP.
5. Protected routes validated via `Authorization: Bearer <token>` middleware.

### Environment variables required
```
MONGO_URI=
JWT_SECRET=
JWT_EXPIRES_IN=1h
RESEND_API_KEY=
RESEND_FROM_EMAIL=MoneySim <no-reply@moneysim.app>
FRONTEND_URL=http://localhost:5173
PORT=5000
```

---

## 7. API Endpoints

All prefixed `/api`, all JSON. Protected routes require `Authorization: Bearer <token>`; public routes are marked "none".

### 7.1 Auth — `/api/auth`

| Method | Path | Auth | Body | Success | Errors |
|---|---|---|---|---|---|
| POST | `/signup` | none | `{ name, email, password }` | `201 { user }` | `400`, `409 EMAIL_EXISTS` |
| POST | `/verify-email` | none | `{ email, token }` | `200 { message }` | `400 INVALID_TOKEN`, `410 TOKEN_EXPIRED` |
| POST | `/resend-verification` | none | `{ email }` | `200 { message }` | `404`, `409 ALREADY_VERIFIED` |
| POST | `/login` | none | `{ email, password }` | `200 { token, user }` | `401 INVALID_CREDENTIALS`, `403 EMAIL_NOT_VERIFIED` |
| GET | `/me` | JWT | — | `200 { user }` | `401` |
| POST | `/logout` | JWT | — | `200 { message }` | `401` |

### 7.2 Catalog — `/api/jobs`, `/api/expense-options`

| Method | Path | Auth | Success |
|---|---|---|---|
| GET | `/api/jobs` | JWT | `200 { jobs: [...] }` (sorted by tier) |
| GET | `/api/expense-options` | JWT | `200 { options: [...] }` (flat list; client groups by `category`) |

Read-only, seeded catalogs — no create/edit/delete endpoints in MVP.

### 7.3 Game — `/api/game`

| Method | Path | Auth | Body | Success | Errors |
|---|---|---|---|---|---|
| POST | `/start` | JWT | `{ jobId, expenseSelections: { Housing, Food, Transportation, Entertainment } }` | `201 { session }` | `400`, `401`, `409 ACTIVE_SESSION_EXISTS` |
| GET | `/current` | JWT | — | `200 { session }` or `200 { session: null }` if none active | `401` |
| PUT | `/job` | JWT | `{ jobId }` | `200 { session }` | `400`, `401`, `404 SESSION_NOT_FOUND`, `409 SESSION_COMPLETED` |
| PUT | `/expenses` | JWT | `{ category, optionId }` | `200 { session }` | `400`, `401`, `404`, `409` |
| POST | `/advance` | JWT | — | `200 { session }` (status flips to `completed` + `finalScore` set on round 12) | `401`, `404`, `409 SESSION_COMPLETED` |
| GET | `/history` | JWT | — | `200 { sessions: [...] }` (past completed runs for this user) | `401` |

### 7.4 Leaderboard — `/api/leaderboard`

| Method | Path | Auth | Query | Success |
|---|---|---|---|---|
| GET | `/` | **none (public)** | `?limit=50` (default 20, max 100) | `200 { entries: [{ userId, name, finalScore, completedAt }] }` — sorted by `finalScore` desc, pulled from completed `GameSession`s |

### 7.5 Health check
| Method | Path | Auth |
|---|---|---|
| GET | `/api/health` | none — returns `200 { status: "ok" }` |

---

## 8. Frontend Pages

Shared shell: top nav (logo, Home / Leaderboard links always visible; Dashboard link + user menu/logout only when authenticated; Login link when not).

### 8.1 Login Page (`/login`)
- Tabbed Sign In / Sign Up (shadcn `Tabs`). Signup → "check your inbox" state (no auto-login pre-verification). `/verify-email` route reads `token`/`email` from URL query params, confirms on mount, shows success/failure state.
- Sign-in blocked with a "resend verification" option if `403 EMAIL_NOT_VERIFIED` is returned.
- Redirects to `/dashboard` if already authenticated.

### 8.2 Home Page (`/`)
- Public landing page explaining the game: "Start with a job. Survive 12 months. See how much you can save."
- 3 feature cards: Pick Your Job, Manage Your Expenses, Climb the Leaderboard.
- CTA: "Play Now" → `/login` (or straight to `/dashboard` if already authenticated).

### 8.3 Dashboard Page (`/dashboard`) — the game screen, protected route
- Redirects to `/login` if not authenticated.
- **No active session:** "Start New Run" panel — job picker (shadcn `Select` or radio cards) + 4 expense-tier pickers (one per category, shadcn `RadioGroup` or `Select`), "Start Simulation" button → `POST /game/start`.
- **Active session:**
  - Header stats (shadcn `Card`s): Current Round (e.g. "Month 4 / 12"), Current Balance, Monthly Net (income − expenses this round).
  - **Job panel:** current job + salary, "Change Job" opens a shadcn `Dialog`/`Select` listing all jobs with salaries, confirms via `PUT /game/job`.
  - **Expenses panel:** 4 categories each showing current tier + cost, each changeable via a small selector, confirms via `PUT /game/expenses`.
  - **Advance Month** button (primary CTA) → `POST /game/advance`, then re-renders updated state; disabled while request is in flight.
  - **History strip:** shadcn `Table` of past rounds this session (round #, job, expenses, balance after).
  - **On completion (round 12 reached):** results screen — final balance, "View Leaderboard" and "Play Again" (`POST /game/start` again) buttons.

### 8.4 Leaderboard Page (`/leaderboard`)
- **Public route — no login required.**
- shadcn `Table`: Rank, Name, Final Score, Date Completed.
- If the viewer is logged in, highlight their own entries (subtle row background).
- Empty state: "No runs completed yet — be the first!"
- If logged out, show a small CTA banner: "Sign up to start playing" → `/login`.

---

## 9. Component Inventory (shadcn/ui)

`Button`, `Input`, `Label`, `Form`, `Tabs`, `Card`, `Table`, `Dialog`, `Select`, `RadioGroup`, `Badge`, `Toast`, `Skeleton`, `Alert`.

---

## 10. Testing Plan (Vitest everywhere)

### 10.1 Backend (Vitest + Supertest + `mongodb-memory-server`)
- **Unit tests:** password hashing, JWT helpers, token expiry, email service (Resend client mocked — never call the real API in tests), game engine logic (`gameEngine.service.js`: given a job + expense selections, compute net; given a session at round 12, correctly flips to `completed` and sets `finalScore`).
- **Integration tests:**
  - Auth: signup/verify/login/protected-route checks (valid, missing, expired, invalid tokens).
  - Catalog: `GET /jobs` and `GET /expense-options` return seeded data.
  - Game: start session (rejects a second concurrent active session), change job/expenses on an active session, advance through all 12 rounds and confirm completion + finalScore, reject actions on a completed session (`409`), ownership check (user A cannot see/modify user B's session).
  - Leaderboard: publicly accessible without a token, returns entries sorted by `finalScore` descending, respects `limit`.
- `vitest.config.ts` uses Node environment for the server package (separate from the client's jsdom config).

### 10.2 Frontend (Vitest + React Testing Library)
- Login/Signup forms: validation, correct API payloads, loading states.
- Route guard: unauthenticated → redirected from `/dashboard` only (Leaderboard stays accessible).
- Dashboard: "no active session" start-panel renders and submits (mocked API); active-session view renders stats; Advance Month button disables while pending and updates UI on response; completion state renders results screen.
- Leaderboard: renders rows from mocked data for both logged-in and logged-out states, empty state when no entries.
- Mock the API layer with MSW rather than a real backend.

### 10.3 End-to-End (Playwright)
Single critical-path flow: sign up → verify (test harness reads token directly from test DB) → log in → start a run → change job once → change one expense tier → advance through all 12 rounds → see completion screen → visit Leaderboard and confirm the run appears → log out → confirm Leaderboard is still viewable and `/dashboard` redirects to `/login`.

### 10.4 CI
Run backend unit+integration (Vitest), frontend unit (Vitest), and lint on every push. E2E (Playwright) as a separate/manual job.

---

## 11. Accessibility (a11y) Requirements

Target WCAG 2.1 AA where feasible.

- Semantic HTML (`<nav>`, `<main>`, `<button>`, `<label>`); shadcn/Radix primitives handle most ARIA roles by default.
- Every form input has an associated `<Label>`; validation errors linked via `aria-describedby`.
- Full keyboard operability: job/expense selectors, Advance Month button, dialogs (focus-trapped, `Escape` closes, focus returns to trigger on close).
- Color contrast ≥ 4.5:1; any status coloring (e.g. positive/negative net this round) must be paired with text/icon, not color alone.
- `aria-live="polite"` region for toast notifications (e.g. "Month advanced", "Job changed").
- Visible focus indicators (Tailwind `focus-visible:ring`) — never removed without replacement.
- Usable at 200% browser zoom and on mobile viewport widths.
- Automated checks (`vitest-axe` or `@axe-core/react`) run against Login, Home, Dashboard (empty and active-session states), and Leaderboard (logged-in and logged-out states).

---

## 12. Definition of Done (MVP)

- [ ] User can sign up, receive a real Resend email, verify, and log in with a working JWT.
- [ ] Job and expense-option catalogs are seeded and served via GET endpoints.
- [ ] User can start a run, change job/expenses mid-run, and advance through 12 rounds with correct balance math at every step (unit-tested).
- [ ] Completed runs write a `finalScore` and appear on the leaderboard, sorted correctly.
- [ ] Leaderboard is viewable without logging in.
- [ ] Dashboard correctly handles all three states: no session / active session / completed session.
- [ ] All endpoints in Section 7 covered by at least one Vitest happy-path + one failure-path test.
- [ ] Login, Home, Dashboard (all states), and Leaderboard (both auth states) pass an automated axe scan with no critical violations.
- [ ] `.env.example` and `README.md` with setup/run/seed instructions exist.
