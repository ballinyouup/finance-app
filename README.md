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
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173,https://moneysim.app,https://www.moneysim.app
HOST=127.0.0.1
PORT=5050
```

Use `MoneySim <no-reply@moneysim.app>` for transactional verification emails after `moneysim.app` is verified in Resend. If `RESEND_API_KEY` is empty, verification links are printed to the backend console for local development.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend defaults to `http://127.0.0.1:5050/api` when opened from localhost, to `http://<current-host>:5050/api` when opened from a non-local host in dev mode, and to `/api` in production builds. To override it:

```bash
VITE_API_URL=http://127.0.0.1:5050/api npm run dev
```

For deployment, do not build the frontend with `VITE_API_URL=http://127.0.0.1:5050/api`. Browser requests to `127.0.0.1` go to the visitor's computer, not the server.

If the backend is reverse-proxied at the same origin, use:

```bash
VITE_API_URL=/api npm run build
```

If the backend is directly reachable on port `5050`, use the domain:

```bash
VITE_API_URL=https://api.moneysim.app/api npm run build
```

Backend production values should match the deployed frontend:

```bash
FRONTEND_URL=https://moneysim.app
CORS_ORIGIN=https://moneysim.app,https://www.moneysim.app
HOST=127.0.0.1
PORT=5050
```

## Nginx Reverse Proxy

For production, prefer serving the frontend and API from the same origin:

```bash
cd frontend
VITE_API_URL=/api npm run build
sudo mkdir -p /var/www/moneysim.app
sudo cp -R dist/* /var/www/moneysim.app/
```

Then copy one of the sample nginx configs from `deploy/` into `/etc/nginx/sites-available/moneysim.app`, enable it, and reload nginx:

```bash
sudo ln -s /etc/nginx/sites-available/moneysim.app /etc/nginx/sites-enabled/moneysim.app
sudo nginx -t
sudo systemctl reload nginx
```

## Verification

```bash
cd backend
npm test

cd ../frontend
npm run build
npm run lint
```
