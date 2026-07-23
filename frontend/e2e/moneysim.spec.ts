import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const apiOrigin = process.env.E2E_API_ORIGIN ?? "http://127.0.0.1:5055";
const e2eUser = {
  name: "E2E Player",
  email: "e2e@example.com",
  password: "Password123!"
};

async function resetE2eDatabase(request: APIRequestContext) {
  const response = await request.post(`${apiOrigin}/__e2e__/reset`);
  expect(response.ok()).toBeTruthy();
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page.locator("#signin-email").fill(e2eUser.email);
  await page.locator("#signin-password").fill(e2eUser.password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.beforeEach(async ({ request }) => {
  await resetE2eDatabase(request);
});

test("redirects protected dashboard visitors to sign in", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Welcome back")).toBeVisible();
});

test("plays a complete work run and publishes the result to the leaderboard", async ({ page }) => {
  await signIn(page);

  await expect(page.getByRole("heading", { name: "Start New Run" })).toBeVisible();
  await page.getByRole("button", { name: "Start Simulation" }).click();
  await expect(page.getByRole("dialog", { name: "Welcome to your new life" })).toBeVisible();
  await page.getByRole("button", { name: "Skip tutorial & start" }).click();

  await expect(page.getByText("Month 1")).toBeVisible();
  await expect(page.getByText("Barista", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Advance Month" })).toBeVisible();

  await page.getByRole("button", { name: "Advance Month" }).click();
  await expect(page.getByText("Month 2")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Needs" })).toBeVisible();

  await page.getByRole("button", { name: "End Run" }).click();
  await expect(page.getByRole("dialog", { name: "End this run?" })).toBeVisible();
  await page
    .getByRole("dialog", { name: "End this run?" })
    .getByRole("button", { name: "End Run" })
    .click();

  await expect(page.getByRole("heading", { name: "Run Recap" })).toBeVisible();
  await expect(page.getByText("Manual end")).toBeVisible();

  await page.getByRole("link", { name: "View Leaderboard" }).click();
  await expect(page).toHaveURL(/\/leaderboard$/);
  await expect(page.getByRole("heading", { name: "Leaderboard" })).toBeVisible();
  await expect(page.getByRole("cell", { name: e2eUser.name })).toBeVisible();
});
