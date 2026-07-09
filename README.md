# MoneySim

MVP implementation for the finance budgeting simulation in `PRD-Finance-Budgeting-App.md`.

## Structure

- `backend` - Express API, MongoDB/Mongoose models, JWT auth, Resend verification email support, game routes, leaderboard, Vitest integration tests.
- `frontend` - Vite React app with React Router, Tailwind CSS, and shadcn/ui components.

## Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run dev
```

To clear local users, sessions, leaderboard entries, and verification tokens while restoring the seeded catalogs:

```bash
cd backend
npm run db:reset
```

Required `.env` values:

```bash
MONGO_URI=mongodb://127.0.0.1:27017/finance_app
JWT_SECRET=replace-me
JWT_EXPIRES_IN=1h
RESEND_API_KEY=
RESEND_FROM_EMAIL=MoneySim <no-reply@moneysim.app>
FRONTEND_URL=http://localhost:5173
PORT=5000
```

Use `MoneySim <no-reply@moneysim.app>` for transactional verification emails after `moneysim.app` is verified in Resend. If `RESEND_API_KEY` is empty, verification links are printed to the backend console for local development.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend defaults to `http://127.0.0.1:5000/api`. To override it:

```bash
VITE_API_URL=http://127.0.0.1:5000/api npm run dev
```

## Verification

```bash
cd backend
npm test

cd ../frontend
npm run build
npm run lint
```
