import { defineConfig } from "@playwright/test";
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
const external = process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  // A fresh Next.js development route compiles on its first CI visit.
  expect: { timeout: 30000 },
  use: {
    baseURL: external || "http://localhost:3001",
    trace: "retain-on-failure",
  },
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: external
    ? undefined
    : {
        command: "npm run dev -- --port 3001",
        url: "http://localhost:3001/sign-in",
        reuseExistingServer: false,
        timeout: 120000,
        env: {
          STASH_TEST_SERVER: "true",
          TURSO_DATABASE_URL: `file:.data/e2e-${Date.now()}.db`,
          TURSO_AUTH_TOKEN: "",
          GEMINI_API_KEY: "",
          GEMINI_FREE_TIER_CONFIRMED: "false",
        },
      },
});
