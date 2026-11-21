import { defineConfig } from "@playwright/test";
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000", trace: "retain-on-failure" },
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : { command: "npm run dev", url: "http://localhost:3000/sign-in", reuseExistingServer: !process.env.CI, timeout: 120000 },
});
