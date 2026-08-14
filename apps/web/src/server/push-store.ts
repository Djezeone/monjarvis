import "server-only";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import webpush from "web-push";

/**
 * P6 brick 5 — web push, Core-side. Browser subscriptions live in the data
 * dir (→ Identity Pack) and every Presence-Bus notification is ALSO pushed
 * to them, so the user's phone hears JARVIS even with the app closed. When
 * no capable satellite is online, push becomes the routing fallback.
 *
 * Requires VAPID keys (JARVIS_VAPID_PUBLIC_KEY / JARVIS_VAPID_PRIVATE_KEY,
 * generated once with scripts/generate-vapid.mjs). Unset → push disabled,
 * stated honestly by /api/jarvis/push/key.
 */

export interface PushSubscriptionRecord {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: string;
}

interface PushFile {
  subscriptions: PushSubscriptionRecord[];
}

export function vapidPublicKey(): string {
  return process.env.JARVIS_VAPID_PUBLIC_KEY?.trim() || "";
}

function vapidConfigured(): boolean {
  return Boolean(vapidPublicKey() && process.env.JARVIS_VAPID_PRIVATE_KEY?.trim());
}

function dataFile(): string {
  const dir = process.env.JARVIS_DATA_DIR || join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  return join(dir, "push-subscriptions.json");
}

function load(): PushFile {
  const f = dataFile();
  if (!existsSync(f)) return { subscriptions: [] };
  try {
    return JSON.parse(readFileSync(f, "utf8")) as PushFile;
  } catch {
    return { subscriptions: [] };
  }
}

function save(state: PushFile): void {
  writeFileSync(dataFile(), JSON.stringify(state, null, 2));
}

export function listSubscriptions(): PushSubscriptionRecord[] {
  return load().subscriptions;
}

/** Idempotent by endpoint. */
export function addSubscription(input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): PushSubscriptionRecord {
  const state = load();
  const existing = state.subscriptions.find((s) => s.endpoint === input.endpoint);
  if (existing) return existing;
  const record: PushSubscriptionRecord = {
    endpoint: input.endpoint,
    keys: { p256dh: input.keys.p256dh, auth: input.keys.auth },
    createdAt: new Date().toISOString(),
  };
  state.subscriptions.push(record);
  save(state);
  return record;
}

export function removeSubscription(endpoint: string): boolean {
  const state = load();
  const before = state.subscriptions.length;
  state.subscriptions = state.subscriptions.filter((s) => s.endpoint !== endpoint);
  save(state);
  return state.subscriptions.length < before;
}

/**
 * Send a real VAPID web push to every subscription. Dead subscriptions
 * (404/410 from the push service) are pruned. Returns honest counts.
 */
export async function broadcastPush(payload: {
  title: string;
  body: string;
}): Promise<{ configured: boolean; sent: number; pruned: number }> {
  if (!vapidConfigured()) return { configured: false, sent: 0, pruned: 0 };
  const subject = process.env.JARVIS_VAPID_SUBJECT?.trim() || "mailto:jarvis@localhost";
  webpush.setVapidDetails(subject, vapidPublicKey(), process.env.JARVIS_VAPID_PRIVATE_KEY!.trim());

  let sent = 0;
  let pruned = 0;
  for (const sub of listSubscriptions()) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify(payload),
        { TTL: 3600 }
      );
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        removeSubscription(sub.endpoint);
        pruned++;
      }
      // Other failures: keep the subscription, report nothing sent for it.
    }
  }
  return { configured: true, sent, pruned };
}
