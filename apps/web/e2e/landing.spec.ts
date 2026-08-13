import { test, expect, type Page } from "@playwright/test";

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

test("la landing cinématique rend sans erreur d'exécution", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto("/");
  await expect(page.locator("main")).toBeVisible();
  await page.waitForTimeout(2500);
  expect(errors, `Erreurs page: ${errors.join(" | ")}`).toHaveLength(0);
});

test("reduced motion : la landing reste lisible sans animation", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = collectPageErrors(page);
  await page.goto("http://127.0.0.1:3100/");
  await expect(page.locator("main")).toBeVisible();
  const text = await page.locator("body").innerText();
  expect(text.trim().length).toBeGreaterThan(0);
  expect(errors, `Erreurs page: ${errors.join(" | ")}`).toHaveLength(0);
  await context.close();
});

test("sans WebGL : la landing dégrade sans crash (FR-012)", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    // @ts-expect-error monkey-patching for the fallback test
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (typeof type === "string" && (type.includes("webgl") || type === "webgpu")) return null;
      return original.call(this, type, ...args);
    };
  });
  await page.goto("/");
  await expect(page.locator("main")).toBeVisible();
  await page.waitForTimeout(2500);
  const fatal = errors.filter((e) => !/webgl|context/i.test(e));
  expect(fatal, `Erreurs fatales: ${fatal.join(" | ")}`).toHaveLength(0);
  const text = await page.locator("body").innerText();
  expect(text.trim().length).toBeGreaterThan(0);
});
