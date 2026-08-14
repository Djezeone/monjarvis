#!/usr/bin/env node
/**
 * Unit cases for the façade session tokens. Usage: npm run test:auth
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const out = execFileSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "-e", `
    import {
      createSessionToken,
      verifySessionToken,
      constantTimeEqual,
    } from ${JSON.stringify(join(here, "../src/server/facade-auth.ts"))};

    const now = 1_800_000_000_000;
    let failed = 0;
    const check = (label, got, expect) => {
      if (JSON.stringify(got) !== JSON.stringify(expect)) {
        failed++;
        console.error("FAIL", label, "→", JSON.stringify(got), "(attendu", JSON.stringify(expect) + ")");
      }
    };

    const token = await createSessionToken("mon-secret", now, 60_000);
    check("aller-retour valide", await verifySessionToken("mon-secret", token, now + 1), true);
    check("expiré rejeté", await verifySessionToken("mon-secret", token, now + 60_001), false);
    check("mauvais secret rejeté", await verifySessionToken("autre-secret", token, now + 1), false);
    check("signature altérée rejetée",
      await verifySessionToken("mon-secret", token.slice(0, -2) + "00", now + 1), false);
    const [exp, sig] = token.split(".");
    check("expiration falsifiée rejetée",
      await verifySessionToken("mon-secret", (Number(exp) + 999999) + "." + sig, now + 1), false);
    check("jeton malformé rejeté", await verifySessionToken("mon-secret", "n'importe-quoi", now), false);
    check("comparaison constante : égal", await constantTimeEqual("abc", "abc"), true);
    check("comparaison constante : différent", await constantTimeEqual("abc", "abd"), false);

    console.log((8 - failed) + "/8 cas de jetons passent");
    process.exit(failed ? 1 : 0);
  `],
  { encoding: "utf8" }
);
process.stdout.write(out);
