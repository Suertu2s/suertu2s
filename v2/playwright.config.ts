import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT || 3456);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["**/live.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          PORT: String(PORT),
          ADMIN_EMAILS: process.env.ADMIN_EMAILS || "admin@suertu2s.cl",
          ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "suertu2s-admin-dev",
          ADMIN_SESSION_SECRET:
            process.env.ADMIN_SESSION_SECRET || "dev-session-secret-suertu2s",
          PAYMENTS_MOCK: process.env.PAYMENTS_MOCK || "true",
        },
      },
});
