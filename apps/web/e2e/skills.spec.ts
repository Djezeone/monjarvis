import { test, expect } from "@playwright/test";

/**
 * P5 brick 5 — skill learning behind approval: a request the user really
 * repeats becomes a proposed skill with provenance; it cannot run before
 * explicit approval (FR-009); once approved it runs as a real Core run;
 * a rejected procedure is never proposed again.
 *
 * Per-project prompts keep the two passes (desktop, mobile) independent.
 */
test.describe.configure({ mode: "serial" });

function promptFor(projectName: string): string {
  return `prépare le brief du matin (${projectName})`;
}

async function repeatRequest(
  request: import("@playwright/test").APIRequestContext,
  input: string,
  sessions: string[]
) {
  for (const sessionKey of sessions) {
    const run = await request.post("/api/jarvis/run", {
      data: { input, device: "skill-spec-device", sessionKey },
    });
    expect(run.ok()).toBeTruthy();
  }
}

test("une demande répétée devient un skill proposé — non invocable sans approbation", async ({
  request,
}, testInfo) => {
  const prompt = promptFor(testInfo.project.name);
  await repeatRequest(request, prompt, [
    `skill-a-${testInfo.project.name}`,
    `skill-b-${testInfo.project.name}`,
    `skill-a-${testInfo.project.name}`,
  ]);

  // The server's 60 s ticker may have swept between the runs and this call:
  // the proposals list is the source of truth, not this sweep's counters.
  expect((await request.post("/api/jarvis/skills/sweep")).ok()).toBeTruthy();

  const { skills } = await (await request.get("/api/jarvis/skills")).json();
  const skill = skills.find(
    (s: { prompt: string; status: string }) => s.prompt === prompt && s.status === "proposed"
  );
  expect(skill).toBeTruthy();
  expect(skill.provenance[0]).toMatch(/3 occurrences dans 2 sessions/);

  // FR-009: not approved yet → running it is refused.
  const refused = await request.post(`/api/jarvis/skills/${skill.id}/run`, {});
  expect(refused.status()).toBe(409);
  expect((await refused.json()).error).toContain("FR-009");
});

test("après approbation explicite, le skill lance un vrai run Core", async ({
  request,
}, testInfo) => {
  const prompt = promptFor(testInfo.project.name);
  const { skills } = await (await request.get("/api/jarvis/skills")).json();
  const skill = skills.find(
    (s: { prompt: string; status: string }) => s.prompt === prompt && s.status === "proposed"
  );

  const approved = await request.post(`/api/jarvis/skills/${skill.id}/approve`, {});
  expect((await approved.json()).status).toBe("approved");

  const run = await request.post(`/api/jarvis/skills/${skill.id}/run`, {});
  expect(run.ok()).toBeTruthy();
  const outcome = await run.json();
  expect(outcome.runId).toBeTruthy();
  expect(outcome.status).toBe("completed");
  expect(outcome.output).toContain(prompt);

  // The honest outcome is recorded on the skill.
  const after = await (await request.get("/api/jarvis/skills")).json();
  const fresh = after.skills.find((s: { id: string }) => s.id === skill.id);
  expect(fresh.lastRunAt).toBeTruthy();
  expect(fresh.lastOutcome).toContain("completed");
});

test("une procédure rejetée n'est jamais re-proposée", async ({ request }, testInfo) => {
  const prompt = `range les fenêtres du bureau (${testInfo.project.name})`;
  await repeatRequest(request, prompt, [
    `skill-c-${testInfo.project.name}`,
    `skill-d-${testInfo.project.name}`,
    `skill-c-${testInfo.project.name}`,
  ]);

  expect((await request.post("/api/jarvis/skills/sweep")).ok()).toBeTruthy();

  const { skills } = await (await request.get("/api/jarvis/skills")).json();
  const skill = skills.find(
    (s: { prompt: string; status: string }) => s.prompt === prompt && s.status === "proposed"
  );
  const rejected = await request.post(`/api/jarvis/skills/${skill.id}/reject`, {});
  expect((await rejected.json()).status).toBe("rejected");

  // A rejected procedure must never come back, however many sweeps run.
  expect((await request.post("/api/jarvis/skills/sweep")).ok()).toBeTruthy();
  const after = await (await request.get("/api/jarvis/skills")).json();
  expect(
    after.skills.filter(
      (s: { prompt: string; status: string }) => s.prompt === prompt && s.status === "proposed"
    )
  ).toHaveLength(0);
});
