import { test, expect, type Page } from "@playwright/test";

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

for (const route of ["/lab/core", "/lab/cinematic", "/lab/living", "/lab/intelligence"]) {
  test(`la route lab ${route} rend sans erreur d'exécution (FR-014)`, async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(1500);
    expect(errors, `Erreurs page: ${errors.join(" | ")}`).toHaveLength(0);
  });
}

test("les diagnostics assets confirment la présence des binaires", async ({ page }) => {
  await page.goto("/lab/cinematic");
  await expect(page.getByText("Tous les binaires sont présents.")).toBeVisible();
  await expect(page.locator("text=manquant")).toHaveCount(0);
});
