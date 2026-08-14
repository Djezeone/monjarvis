import { test, expect } from "@playwright/test";

/**
 * P5 brick 4 — learned preferences: real runs from a dominant device produce
 * a proposal with checkable provenance; nothing is applied without an
 * explicit human decision; a rejected proposal never comes back.
 *
 * The suite runs once per project (desktop, mobile) against the same server
 * state: the observed device is per-project, and all runs share one session
 * (activity capped at 20) so the current pass always dominates the history.
 */
const SESSION_KEY = "learned-spec-session";

function deviceFor(projectName: string): string {
  return `learn-desk-${projectName}`;
}

test.describe.configure({ mode: "serial" });

test("les runs réels d'un appareil dominant produisent une proposition — sans rien appliquer", async ({
  request,
}, testInfo) => {
  const device = deviceFor(testInfo.project.name);
  await request.put("/api/jarvis/preferences", { data: { preferredDevice: "" } });

  for (let i = 0; i < 15; i++) {
    const run = await request.post("/api/jarvis/run", {
      data: { input: `apprentissage ${i}`, device, sessionKey: SESSION_KEY },
    });
    expect(run.ok()).toBeTruthy();
  }

  const sweep = await (await request.post("/api/jarvis/learned/sweep")).json();
  expect(sweep.generated).toBeGreaterThanOrEqual(1);

  const { candidates } = await (await request.get("/api/jarvis/learned")).json();
  const proposal = candidates.find(
    (c: { kind: string; status: string; proposal: { preferredDevice?: string } }) =>
      c.kind === "preferred-device" &&
      c.status === "proposed" &&
      c.proposal.preferredDevice === device
  );
  expect(proposal).toBeTruthy();
  expect(proposal.message).toContain(device);
  expect(proposal.provenance.length).toBeGreaterThan(0);
  expect(proposal.provenance[0]).toMatch(/\d+ runs sur \d+/);

  // The sweep proposed — it must NOT have applied anything.
  const prefs = await (await request.get("/api/jarvis/preferences")).json();
  expect(prefs.preferredDevice).toBe("");
});

test("la promotion explicite applique la préférence — et elle seule", async ({
  request,
}, testInfo) => {
  const device = deviceFor(testInfo.project.name);
  const { candidates } = await (await request.get("/api/jarvis/learned")).json();
  const proposal = candidates.find(
    (c: { status: string; proposal: { preferredDevice?: string } }) =>
      c.status === "proposed" && c.proposal.preferredDevice === device
  );
  const r = await request.post(`/api/jarvis/learned/${proposal.id}/promote`, {});
  expect(r.ok()).toBeTruthy();
  expect((await r.json()).status).toBe("promoted");

  const prefs = await (await request.get("/api/jarvis/preferences")).json();
  expect(prefs.preferredDevice).toBe(device);

  // Preference now matches the observation: nothing new to propose.
  const sweep = await (await request.post("/api/jarvis/learned/sweep")).json();
  expect(sweep.generated).toBe(0);
});

test("une proposition rejetée n'est jamais re-proposée", async ({ request }, testInfo) => {
  const device = deviceFor(testInfo.project.name);

  // The user reverts the preference by hand: the rule fires again…
  await request.put("/api/jarvis/preferences", { data: { preferredDevice: "" } });
  const sweep1 = await (await request.post("/api/jarvis/learned/sweep")).json();
  expect(sweep1.generated).toBe(1);

  const { candidates } = await (await request.get("/api/jarvis/learned")).json();
  const proposal = candidates.find(
    (c: { status: string; proposal: { preferredDevice?: string } }) =>
      c.status === "proposed" && c.proposal.preferredDevice === device
  );
  const r = await request.post(`/api/jarvis/learned/${proposal.id}/reject`, {});
  expect((await r.json()).status).toBe("rejected");

  // …but once rejected, the exact same proposal is buried for good.
  const sweep2 = await (await request.post("/api/jarvis/learned/sweep")).json();
  expect(sweep2.generated).toBe(0);
  const after = await (await request.get("/api/jarvis/learned")).json();
  expect(
    after.candidates.filter(
      (c: { status: string; proposal: { preferredDevice?: string } }) =>
        c.status === "proposed" && c.proposal.preferredDevice === device
    )
  ).toHaveLength(0);
});
