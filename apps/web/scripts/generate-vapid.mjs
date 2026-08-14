#!/usr/bin/env node
/**
 * One-shot VAPID key generation for web push. Usage: npm run vapid
 * Put the output in the CORE's .env.local (and Vercel project settings
 * if the façade should serve /api/jarvis/push/key itself — normally the
 * façade proxies to the Core, so the Core alone needs them).
 */
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("JARVIS_VAPID_PUBLIC_KEY=" + keys.publicKey);
console.log("JARVIS_VAPID_PRIVATE_KEY=" + keys.privateKey);
console.log("JARVIS_VAPID_SUBJECT=mailto:vous@example.com");
