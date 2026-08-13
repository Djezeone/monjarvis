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
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: true,
    timeout: 60_000,
    env: {
      // Exercise the P4 fabric contract for real in devices-api.spec.ts.
      JARVIS_DEVICE_SHARED_SECRET: "e2e-fabric-secret",
      JARVIS_DATA_DIR: "./test-results/e2e-data",
    },
  },
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
