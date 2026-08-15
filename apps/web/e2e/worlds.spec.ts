import { test, expect } from "@playwright/test";

/**
 * P7 brick 2 — the cockpit as worlds: quiet at rest, one world mounted at
 * a time, deep-linkable, and honest about the sub-worlds JARVIS does not
 * have yet.
 */
test("au repos, le cockpit est calme : seul le monde Core est monté", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByTestId("world-content")).toHaveAttribute("data-world", "core");
  await expect(page.getByRole("heading", { name: "Runtime vocal local" })).toBeVisible();

  // The other worlds' panels are not merely hidden: they are not rendered.
  await expect(page.getByRole("heading", { name: "Organes" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Impact" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Skills appris" })).toHaveCount(0);

  // Today's readout is real data, not decoration.
  await expect(page.getByTestId("today-strip")).toContainText("runs aujourd'hui");
});

test("chaque monde ouvre ses propres panneaux", async ({ page }) => {
  await page.goto("/app");
  const cases = [
    { world: "Action", heading: "Routines" },
    { world: "Monde", heading: "Présence — satellites" },
    { world: "Agents", heading: "Skills appris" },
    { world: "Mémoire", heading: "Sessions — reprendre où vous étiez" },
    { world: "Système", heading: "Organes" },
  ];
  for (const c of cases) {
    await page.getByRole("button", { name: c.world, exact: true }).click();
    await expect(page.getByRole("heading", { name: c.heading, exact: true })).toBeVisible();
  }
});

test("le monde est adressable par ancre et retenu d'une visite à l'autre", async ({
  page,
}) => {
  await page.goto("/app#monde");
  await expect(page.getByTestId("world-content")).toHaveAttribute("data-world", "monde");
  await expect(page.getByRole("heading", { name: "Présence — satellites" })).toBeVisible();

  // Entering a world stores it: a plain /app returns where you left off.
  await page.getByRole("button", { name: "Agents", exact: true }).click();
  await page.goto("/app");
  await expect(page.getByTestId("world-content")).toHaveAttribute("data-world", "agents");

  // An unknown anchor falls back to the stored world rather than breaking.
  await page.goto("/app#inconnu");
  await expect(page.getByTestId("world-content")).toHaveAttribute("data-world", "agents");
});

test("les sous-mondes absents sont nommés, pas simulés", async ({ page }) => {
  await page.goto("/app#memoire");
  const missing = page.getByTestId("world-missing");
  await expect(missing).toContainText("Graphiti");
  await page.getByRole("button", { name: "Agents", exact: true }).click();
  await expect(page.getByTestId("world-missing")).toContainText("Hermes");
});
