import { defineConfig, devices } from "@playwright/test";

/**
 * Step-16 acceptance suite: mobile, keyboard, reduced-motion, no-WebGL.
 * Runs against the production build (`next start`).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    browserName: "chromium",
    // The remote environment pre-installs Chromium outside this package's
    // expected browser revision; point at it instead of downloading.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
  webServer: [
    {
      // Hermes test double so run/session-handoff routes are exercised for
      // real in CI (e2e/fixtures/mock-hermes.mjs).
      command: "node e2e/fixtures/mock-hermes.mjs",
      url: "http://127.0.0.1:3199/health",
      reuseExistingServer: true,
      timeout: 15_000,
    },
    {
      command: "npm run start -- --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: true,
      timeout: 60_000,
      env: {
        // Isolated registry for the fabric contract tests (devices-api.spec.ts).
        JARVIS_DATA_DIR: "./test-results/e2e-data",
        HERMES_API_URL: "http://127.0.0.1:3199",
        HERMES_API_KEY: "e2e-mock-key",
      },
    },
  ],
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      // iPhone metrics on the Chromium engine (WebKit builds are not
      // available in the test environment).
      use: { ...devices["iPhone 13"], browserName: "chromium", defaultBrowserType: "chromium" },
      testMatch: /mobile|landing|labs/,
    },
  ],
});
