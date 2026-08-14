import { test, expect } from "@playwright/test";

/**
 * P6 brick 4 — PWA: manifest complete and served, service worker really
 * active, and a REAL offline navigation answered by the cached fallback.
 */
test.describe.configure({ mode: "serial" });

test("le manifest est servi, complet, et ses icônes existent", async ({ request }) => {
  const r = await request.get("/manifest.webmanifest");
  expect(r.ok()).toBeTruthy();
  const manifest = await r.json();
  expect(manifest.name).toBe("JARVIS X2");
  expect(manifest.start_url).toBe("/app");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons).toHaveLength(3);

  for (const icon of manifest.icons) {
    const img = await request.get(icon.src);
    expect(img.ok()).toBeTruthy();
    expect(img.headers()["content-type"]).toContain("image/png");
  }

  const page = await request.get("/");
  const html = await page.text();
  expect(html).toContain('rel="manifest"');
});

test("le service worker s'active et répond hors ligne avec la page de repli", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const active = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return Boolean(registration.active);
  });
  expect(active).toBeTruthy();

  // Cut the network for real: the SW must serve the cached fallback.
  await context.setOffline(true);
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Hors ligne" })).toBeVisible();
  await context.setOffline(false);

  // Back online: the real cockpit navigates normally again.
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Hors ligne" })).toHaveCount(0);
});
