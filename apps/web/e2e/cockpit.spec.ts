import { test, expect, type Page } from "@playwright/test";

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

test("le cockpit /app charge même sans aucun organe configuré (NFR-004)", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Organes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Runtime vocal local" })).toBeVisible();
  // Organ health resolves to explicit "non configuré" statuses, never a crash.
  await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 15_000 });
  expect(errors, `Erreurs page: ${errors.join(" | ")}`).toHaveLength(0);
});

test("navigation clavier : liens et contrôles atteignables au Tab (NFR-005)", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Runtime vocal local" })).toBeVisible();

  const reachable = new Set<string>();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return null;
      return { tag: el.tagName, text: (el.innerText || "").slice(0, 60) };
    });
    if (info) reachable.add(`${info.tag}:${info.text}`);
  }
  const flat = [...reachable].join(" || ");
  expect(flat).toContain("Cockpit");
  expect(flat).toContain("Connecter le runtime local");
});

test("le bouton runtime se déclenche au clavier et dégrade proprement sans service", async ({ page }) => {
  await page.goto("/app");
  const btn = page.getByRole("button", { name: "Connecter le runtime local" });
  await btn.focus();
  await page.keyboard.press("Enter");
  // No local runtime in CI: the explicit failure path must keep the UI alive.
  await expect(page.getByRole("button", { name: "Connecter le runtime local" })).toBeVisible({
    timeout: 10_000,
  });
});
