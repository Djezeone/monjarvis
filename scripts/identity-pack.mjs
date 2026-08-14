#!/usr/bin/env node
/**
 * JARVIS X2 — Identity Pack (P4 brick 7): the Core's identity as one
 * encrypted, migratable file. The hardware changes; JARVIS stays JARVIS.
 *
 *   node scripts/identity-pack.mjs export [--out pack.jpack] [--include path]...
 *   node scripts/identity-pack.mjs list   <pack.jpack>
 *   node scripts/identity-pack.mjs import <pack.jpack> [--force]
 *
 * What goes in by default (when present):
 *   - apps/web/data/            device registry + session registry (Core state)
 *   - apps/web/.env.local       organ endpoints and server-only secrets
 * Add anything else (skills, policies, hermes config…) with --include.
 *
 * Passphrase: JARVIS_PACK_PASSPHRASE env var, or --passphrase-file <path>.
 *
 * Crypto: scrypt (N=2^15, r=8, p=1) key derivation + AES-256-GCM. The GCM
 * tag makes tampering detectable: a modified pack refuses to open. Losing
 * the passphrase means losing the pack — there is no recovery path, by
 * design (local-first: nobody but you can open your identity).
 *
 * Import safety: only repo-relative paths are written (path traversal is
 * rejected); existing files are refused without --force, and --force keeps
 * a timestamped .bak of anything it overwrites.
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  createHash,
} from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const MAGIC = Buffer.from("JX2IDPACK1");
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_TARGETS = ["apps/web/data", "apps/web/.env.local"];

function fail(message) {
  console.error(`ERREUR: ${message}`);
  process.exit(1);
}

function passphrase(args) {
  const idx = args.indexOf("--passphrase-file");
  if (idx !== -1 && args[idx + 1]) {
    return readFileSync(args[idx + 1], "utf8").trim();
  }
  const fromEnv = (process.env.JARVIS_PACK_PASSPHRASE || "").trim();
  if (fromEnv) return fromEnv;
  fail("aucune passphrase: définir JARVIS_PACK_PASSPHRASE ou --passphrase-file <fichier>");
}

function collectFiles(target, out) {
  const abs = resolve(REPO, target);
  if (!existsSync(abs)) return;
  const st = statSync(abs);
  if (st.isDirectory()) {
    for (const entry of readdirSync(abs)) collectFiles(join(target, entry), out);
    return;
  }
  const rel = relative(REPO, abs);
  out.push({
    path: rel.split(sep).join("/"),
    mode: st.mode & 0o777,
    contentBase64: readFileSync(abs).toString("base64"),
  });
}

function deriveKey(pass, salt) {
  return scryptSync(pass, salt, 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}

function encrypt(pass, plaintext) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(pass, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), ciphertext]);
}

function decrypt(pass, blob) {
  if (!blob.subarray(0, MAGIC.length).equals(MAGIC)) {
    fail("ce fichier n'est pas un Identity Pack JARVIS X2");
  }
  let offset = MAGIC.length;
  const salt = blob.subarray(offset, (offset += 16));
  const iv = blob.subarray(offset, (offset += 12));
  const tag = blob.subarray(offset, (offset += 16));
  const ciphertext = blob.subarray(offset);
  const key = deriveKey(pass, salt);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    fail("déchiffrement refusé: passphrase incorrecte ou pack altéré (intégrité GCM)");
  }
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

const [command, ...args] = process.argv.slice(2);

if (command === "export") {
  const pass = passphrase(args);
  const targets = [...DEFAULT_TARGETS];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--include" && args[i + 1]) targets.push(args[++i]);
  }
  const files = [];
  for (const target of targets) collectFiles(target, files);
  if (files.length === 0) fail("rien à exporter (aucune cible existante)");

  const manifest = {
    format: "jarvis-x2-identity",
    version: 1,
    exportedAt: new Date().toISOString(),
    files,
  };
  const payload = Buffer.from(JSON.stringify(manifest));
  const outIdx = args.indexOf("--out");
  const outPath =
    outIdx !== -1 && args[outIdx + 1]
      ? args[outIdx + 1]
      : `jarvis-identity-${new Date().toISOString().slice(0, 10)}.jpack`;
  writeFileSync(outPath, encrypt(pass, payload));
  console.log(`Identity Pack écrit: ${outPath}`);
  console.log(`  ${files.length} fichier(s), sha256 du contenu clair: ${sha256(payload).slice(0, 16)}…`);
  for (const f of files) console.log(`  - ${f.path}`);
} else if (command === "list" || command === "import") {
  const passIdx = args.indexOf("--passphrase-file");
  const packPath = args.find(
    (a, i) => !a.startsWith("--") && (passIdx === -1 || i !== passIdx + 1)
  );
  if (!packPath) fail(`usage: identity-pack.mjs ${command} <pack.jpack>`);
  const pass = passphrase(args);
  const manifest = JSON.parse(decrypt(pass, readFileSync(packPath)).toString("utf8"));
  if (manifest.format !== "jarvis-x2-identity") fail("manifest inattendu");
  console.log(`Pack du ${manifest.exportedAt} — ${manifest.files.length} fichier(s):`);
  for (const f of manifest.files) console.log(`  - ${f.path}`);

  if (command === "import") {
    const force = args.includes("--force");
    for (const f of manifest.files) {
      const dest = resolve(REPO, f.path);
      if (!dest.startsWith(REPO + sep)) fail(`chemin refusé (traversée): ${f.path}`);
      if (existsSync(dest) && !force) {
        fail(`${f.path} existe déjà — relancer avec --force (les fichiers écrasés sont sauvegardés en .bak)`);
      }
    }
    for (const f of manifest.files) {
      const dest = resolve(REPO, f.path);
      mkdirSync(dirname(dest), { recursive: true });
      if (existsSync(dest)) {
        copyFileSync(dest, `${dest}.bak-${Date.now()}`);
      }
      writeFileSync(dest, Buffer.from(f.contentBase64, "base64"), { mode: f.mode });
      console.log(`  écrit: ${f.path}`);
    }
    console.log("Import terminé — redémarrer le Core pour reprendre l'identité.");
  }
} else {
  console.log("usage: node scripts/identity-pack.mjs export|list|import …  (voir l'en-tête du fichier)");
  process.exit(command ? 1 : 0);
}
