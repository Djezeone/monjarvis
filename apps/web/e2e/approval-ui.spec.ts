import { test, expect } from "@playwright/test";

/**
 * FR-009 through the real UI: dispatching a CRITICAL capability from the
 * cockpit opens the ActionApproval gate (target, reversibility, affected
 * data) and nothing is queued until the operator approves once.
 */
const DEVICE = {
  id: "ui-approval-device",
  name: "UI Approval Device",
  kind: "phone",
  capabilities: ["camera.capture", "notify"],
};

test("dispatch CRITICAL → porte d'approbation → approbation → mise en file", async ({
  page,
  request,
}) => {
  // Enroll a satellite for real via the API (claim sets it online).
  const enroll = await request.post("/api/jarvis/devices/enroll");
  const { code } = await enroll.json();
  const claim = await request.post("/api/jarvis/devices/enroll/claim", {
    data: { code, ...DEVICE },
  });
  expect(claim.ok()).toBeTruthy();

  await page.goto("/app");
  const row = page.locator("tr", { hasText: DEVICE.name });
  await expect(row).toBeVisible();
  await expect(row.getByText("en ligne")).toBeVisible();

  // camera.capture is CRITICAL: the approval dialog must open, not queue.
  await row.getByLabel(`Capability pour ${DEVICE.name}`).selectOption("camera.capture");
  await row.getByRole("button", { name: "Envoyer" }).click();

  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("CRITICAL ACTION")).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: `Exécuter camera.capture sur « ${DEVICE.name} »` })
  ).toBeVisible();

  // Deny first: nothing must be queued.
  await dialog.getByRole("button", { name: "Deny" }).click();
  await expect(page.getByText("Refusé :", { exact: false })).toBeVisible();

  // Approve path.
  await row.getByRole("button", { name: "Envoyer" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Approve once" }).click();
  await expect(page.getByText("Approuvé :", { exact: false })).toBeVisible();

  // The queued command must carry the operator approval, denials must not queue.
  const token = (await claim.json()).token;
  const poll = await request.get(`/api/jarvis/devices/${DEVICE.id}/commands`, {
    headers: { "X-Jarvis-Device-Token": token },
  });
  const { commands } = await poll.json();
  const critical = commands.filter(
    (c: { capability: string }) => c.capability === "camera.capture"
  );
  expect(critical).toHaveLength(1);
  expect(critical[0].policy.tier).toBe("CRITICAL");
  expect(critical[0].policy.approvedBy).toBe("operator-cockpit");
});
