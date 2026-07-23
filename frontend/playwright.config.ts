import { defineConfig, devices } from "@playwright/test";

const apiOrigin = process.env.E2E_API_ORIGIN ?? "http://127.0.0.1:5055";
const appOrigin = process.env.E2E_APP_ORIGIN ?? "http://127.0.0.1:5174";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  reporter: "list",
  use: {
    baseURL: appOrigin,
    trace: "on-first-retry"
  },
  webServer: [
    {
      command: "npm --prefix ../backend run test:e2e:server",
      url: `${apiOrigin}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        HOST: "127.0.0.1",
        PORT: "5055",
        FRONTEND_URL: appOrigin,
        CORS_ORIGIN: appOrigin
      }
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5174",
      url: appOrigin,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        VITE_API_URL: `${apiOrigin}/api`
      }
    }
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
