import { test, expect } from "@playwright/test";
import { createServer, type Server } from "node:https";
import { createECDH, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * P6 brick 5 — web push, proven for real: a local HTTPS endpoint plays the
 * push service (web-push speaks TLS only; the Core trusts the test cert
 * via NODE_EXTRA_CA_CERTS), a genuine P-256 subscription is registered,
 * and the Core's broadcast must reach it as an authenticated (VAPID)
 * encrypted request. No browser push-service dependency, no mock of our
 * own code.
 */
let pushService: Server;
let received: Array<{ auth: string; encoding: string; bytes: number }>;
let endpoint = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  received = [];
  const fixtures = join(__dirname, "fixtures");
  pushService = createServer(
    {
      key: readFileSync(join(fixtures, "push-cert.key")),
      cert: readFileSync(join(fixtures, "push-cert.pem")),
    },
    (req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      received.push({
        auth: String(req.headers.authorization || ""),
        encoding: String(req.headers["content-encoding"] || ""),
        bytes: Buffer.concat(chunks).length,
      });
      res.writeHead(201).end();
    });
    }
  );
  await new Promise<void>((resolve) => pushService.listen(0, "127.0.0.1", resolve));
  const address = pushService.address();
  if (typeof address === "object" && address) {
    endpoint = `https://127.0.0.1:${address.port}/push/jarvis-e2e`;
  }
});

test.afterAll(async () => {
  await new Promise((resolve) => pushService.close(resolve));
});

test("un abonnement réel reçoit un push VAPID chiffré", async ({ request }) => {
  const status = await (await request.get("/api/jarvis/push/key")).json();
  expect(status.configured).toBe(true);
  expect(status.publicKey.length).toBeGreaterThan(40);

  // A genuine P-256 browser-style subscription pointing at our service.
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  const subscribe = await request.post("/api/jarvis/push/subscribe", {
    data: {
      endpoint,
      keys: {
        p256dh: ecdh.getPublicKey().toString("base64url"),
        auth: randomBytes(16).toString("base64url"),
      },
    },
  });
  expect(subscribe.ok()).toBeTruthy();

  const outcome = await (await request.post("/api/jarvis/push/test")).json();
  expect(outcome.sent).toBeGreaterThanOrEqual(1);

  expect(received.length).toBeGreaterThanOrEqual(1);
  const hit = received[received.length - 1];
  expect(hit.auth).toMatch(/vapid/i); // signed sender identity
  expect(hit.encoding).toBe("aes128gcm"); // RFC 8291 encrypted payload
  expect(hit.bytes).toBeGreaterThan(80);
});

test("une notification du Presence Bus est aussi poussée aux navigateurs", async ({
  request,
}) => {
  const before = received.length;
  const deliver = await request.post("/api/jarvis/deliver", {
    data: { message: "Notification miroir push", modality: "notification" },
  });
  const outcome = await deliver.json();

  // Whether a satellite was online (mirror) or not (fallback routing to
  // "notifications push"), the browser subscription must have been hit.
  expect(deliver.ok()).toBeTruthy();
  expect(outcome.routing.deviceName).toBeTruthy();
  expect(received.length).toBeGreaterThan(before);

  // Clean up so later specs (suggestions) don't push to a dead endpoint.
  const remove = await request.delete("/api/jarvis/push/subscribe", {
    data: { endpoint },
  });
  expect((await remove.json()).removed).toBe(true);
});
