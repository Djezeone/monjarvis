import { test, expect } from "@playwright/test";

/**
 * P7 brick 4 — the entrance goes THROUGH the Core into the real system,
 * and the cockpit answers "Que faisons-nous ?" with a real run.
 */
test("la fin de la landing traverse le Core et débouche sur le cockpit", async ({
  page,
}) => {
  await page.goto("/");
  const enter = page.getByTestId("enter-the-system");
  await enter.scrollIntoViewIfNeeded();
  await expect(enter).toBeVisible();

  await enter.click();
  // The traversal plays…
  await expect(page.getByTestId("core-traversal")).toBeVisible();
  // …and lands in the OS itself, not on a product page.
  await page.waitForURL(/\/app$/, { timeout: 15_000 });
  await expect(page.getByTestId("talk-panel")).toBeVisible();
});

test("sans animation (reduced motion), la porte reste un lien qui entre directement", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  const enter = page.getByTestId("enter-the-system");
  await enter.scrollIntoViewIfNeeded();
  await expect(enter).toHaveAttribute("href", "/app");
  await enter.click();
  await page.waitForURL(/\/app$/, { timeout: 15_000 });
  await expect(page.getByTestId("core-traversal")).toHaveCount(0);
  await context.close();
});

test("le cockpit répond « Que faisons-nous ? » par un vrai run", async ({ page }) => {
  await page.goto("/app");
  const talk = page.getByTestId("talk-panel");
  await expect(talk.getByRole("heading", { name: "Que faisons-nous ?" })).toBeVisible();

  await talk.getByLabel("Parler à JARVIS").fill("bonjour, que fait-on maintenant ?");
  await talk.getByRole("button", { name: "Envoyer" }).click();

  // The mock Hermes echoes the input: proof the run really reached the Core.
  await expect(page.getByTestId("talk-answer")).toContainText(
    "bonjour, que fait-on maintenant ?",
    { timeout: 20_000 }
  );
  // The session is now resumable from any device.
  await expect(talk).toContainText("La conversation continue");
});
