import { test, expect, type Page } from "@playwright/test";

/**
 * P6 brick 3 — honest "Core offline" degradation.
 *
 * :3103 is a façade whose brain is deliberately dead (JARVIS_CORE_URL
 * points at a closed port): the cockpit must say so and keep instructions
 * locally. :3102 is the healthy façade in front of the real Core on
 * :3100: a queued instruction seeded there must be REPLAYED as a real run
 * at load, recorded by the Core's own registry.
 */
const DEAD_FACADE = "http://127.0.0.1:3103";
const LIVE_FACADE = "http://127.0.0.1:3102";
const CORE = "http://127.0.0.1:3100";
const SECRET = "e2e-Ph4se-Jarvis-X2-Secret-2026";

test.describe.configure({ mode: "serial" });

async function loginThroughUi(page: Page, base: string) {
  await page.goto(`${base}/login`);
  await page.getByLabel("Secret JARVIS").fill(SECRET);
  await page.getByRole("button", { name: "Entrer" }).click();
  await page.waitForURL(/\/app/);
}

test("cerveau mort : la façade le dit et garde les instructions localement", async ({
  page,
  request,
}) => {
  const status = await (
    await request.get(`${DEAD_FACADE}/api/jarvis/auth/status`)
  ).json();
  expect(status.enabled).toBe(true);

  await loginThroughUi(page, DEAD_FACADE);

  const banner = page.getByTestId("core-status");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("JARVIS Core hors ligne");

  await page.getByLabel("Instruction en attente").fill("prépare le rapport du soir");
  await page.getByRole("button", { name: "Garder pour le retour" }).click();
  await expect(page.getByTestId("pending-list")).toContainText("prépare le rapport du soir");

  // The queue belongs to the device: it survives a full reload.
  await page.reload();
  await expect(page.getByTestId("pending-list")).toContainText("prépare le rapport du soir");
});

test("au retour du Core, la file est rejouée en vrais runs", async ({ page, request }) => {
  const marker = `run rejoué après retour du Core ${Date.now()}`;

  await loginThroughUi(page, LIVE_FACADE);
  // Seed a queued instruction as if it had been left during an outage,
  // then reload: the component must see the healthy brain and replay.
  await page.evaluate(
    ([input]) => {
      window.localStorage.setItem(
        "jarvis-pending-runs",
        JSON.stringify([{ id: "seed-1", input, queuedAt: new Date().toISOString() }])
      );
    },
    [marker]
  );
  await page.reload();

  await expect(page.getByTestId("replayed-list")).toContainText("rejouée", {
    timeout: 20_000,
  });
  const left = await page.evaluate(() =>
    window.localStorage.getItem("jarvis-pending-runs")
  );
  expect(JSON.parse(left || "[]")).toHaveLength(0);

  // The run really reached the brain: the CORE's session registry has it.
  const { sessions } = await (await request.get(`${CORE}/api/jarvis/sessions`)).json();
  expect(
    sessions.some((s: { title: string }) => s.title.includes(marker))
  ).toBeTruthy();
});
