import { defineConfig, devices } from "@playwright/test";

/**
 * Step-16 acceptance suite: mobile, keyboard, reduced-motion, no-WebGL.
 * Runs against the production build (`next start`).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  // The suite exercises shared server-side state (registries, preferences):
  // one worker keeps spec files from racing each other.
  workers: 1,
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
      // n8n test double so the workflow connector is exercised against the
      // real HTTP contract (e2e/fixtures/mock-n8n.mjs).
      command: "node e2e/fixtures/mock-n8n.mjs",
      url: "http://127.0.0.1:3198/healthz",
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
        // Test-only VAPID pair (push.spec.ts) — never used outside e2e.
        JARVIS_VAPID_PUBLIC_KEY:
          "BGNDXenJKINPw0oDAGrM6GYJd6GCXpnmATzdVYZ_no9OUZN88kiPveD-eiIQ_r49f2lhx5hVY3Q7Fg_pWiZZKcA",
        JARVIS_VAPID_PRIVATE_KEY: "CATt4GYzMYacPP_eaKMyhDVCdmZtiPBlcC63dDYWydE",
        JARVIS_VAPID_SUBJECT: "mailto:e2e@test.local",
        // Trust the test push service's self-signed cert (push.spec.ts).
        NODE_EXTRA_CA_CERTS: "./e2e/fixtures/push-cert.pem",
        // n8n connector wired to the double (n8n.spec.ts).
        N8N_BASE_URL: "http://127.0.0.1:3198",
        N8N_WEBHOOK_BASE_URL: "http://127.0.0.1:3198/webhook",
        N8N_JARVIS_SECRET: "e2e-n8n-secret",
      },
    },
    {
      // Same build, second instance WITH façade auth enabled (auth.spec.ts):
      // the main suite keeps its open local-first server untouched.
      command: "npm run start -- --port 3101",
      url: "http://127.0.0.1:3101/login",
      reuseExistingServer: true,
      timeout: 60_000,
      env: {
        JARVIS_DATA_DIR: "./test-results/e2e-auth-data",
        HERMES_API_URL: "http://127.0.0.1:3199",
        HERMES_API_KEY: "e2e-mock-key",
        JARVIS_AUTH_SECRET: "secret-de-test-e2e",
      },
    },
    {
      // Third instance: FAÇADE role (P6-2) — auth on, no state, no ticker,
      // every /api/jarvis/* proxied to the open Core on :3100.
      command: "npm run start -- --port 3102",
      url: "http://127.0.0.1:3102/login",
      reuseExistingServer: true,
      timeout: 60_000,
      env: {
        JARVIS_ROLE: "facade",
        JARVIS_CORE_URL: "http://127.0.0.1:3100",
        JARVIS_AUTH_SECRET: "secret-de-test-e2e",
        // Deliberately its own (empty) data dir: if a route ever ran
        // locally instead of being proxied, the state comparison with the
        // Core in facade.spec.ts would catch it.
        JARVIS_DATA_DIR: "./test-results/e2e-facade-data",
      },
    },
    {
      // Fourth instance: façade whose brain is DELIBERATELY dead (:3979
      // answers nothing) — the honest-degradation spec (offline-facade).
      command: "npm run start -- --port 3103",
      url: "http://127.0.0.1:3103/login",
      reuseExistingServer: true,
      timeout: 60_000,
      env: {
        JARVIS_ROLE: "facade",
        JARVIS_CORE_URL: "http://127.0.0.1:3979",
        JARVIS_AUTH_SECRET: "secret-de-test-e2e",
        JARVIS_DATA_DIR: "./test-results/e2e-offline-data",
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
