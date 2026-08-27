import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

/** E2E contra producción (sin levantar servidor local). */
export default defineConfig({
  ...base,
  testMatch: ["**/live.spec.ts", "**/smoke.spec.ts"],
  use: {
    ...base.use,
    baseURL: "https://suertu2s.cl",
  },
  webServer: undefined,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
