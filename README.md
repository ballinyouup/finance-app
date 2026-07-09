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
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173,https://moneysim.app
PORT=5000
```

Use `MoneySim <no-reply@moneysim.app>` for transactional verification emails after `moneysim.app` is verified in Resend. If `RESEND_API_KEY` is empty, verification links are printed to the backend console for local development.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend defaults to `http://127.0.0.1:5000/api` when opened from localhost, to `http://<current-host>:5000/api` when opened from a non-local host in dev mode, and to `/api` in production builds. To override it:

```bash
VITE_API_URL=http://127.0.0.1:5000/api npm run dev
```

For deployment, do not build the frontend with `VITE_API_URL=http://127.0.0.1:5000/api`. Browser requests to `127.0.0.1` go to the visitor's computer, not the server.

If the backend is reverse-proxied at the same origin, use:

```bash
VITE_API_URL=/api npm run build
```

If the backend is directly reachable on port `5000`, use the server host:

```bash
VITE_API_URL=http://207.148.15.2:5000/api npm run build
```

For the production domain later:

```bash
VITE_API_URL=https://api.moneysim.app/api npm run build
```

Backend production values should match the deployed frontend:

```bash
FRONTEND_URL=http://207.148.15.2
CORS_ORIGIN=http://207.148.15.2
```

## Verification

```bash
cd backend
npm test

cd ../frontend
npm run build
npm run lint
```
