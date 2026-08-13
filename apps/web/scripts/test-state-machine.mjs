#!/usr/bin/env node
/**
 * Runs the P2 pack's state-machine test cases against reduceJarvisState.
 * Usage: npm run test:state
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(
  readFileSync(join(here, "../src/jarvis/tests/state-machine-cases.json"), "utf8")
);

// Strip types so Node can execute the reducer directly.
const out = execFileSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "-e", `
    import { reduceJarvisState } from ${JSON.stringify(
      join(here, "../src/jarvis/runtime/JarvisStateMachine.ts")
    )};
    const cases = ${JSON.stringify(cases)};
    let failed = 0;
    for (const c of cases) {
      const event = c.eventPayload ?? { type: c.event, ...(c.payload ?? {}) };
      const got = reduceJarvisState(c.from, event);
      if (got !== c.expect) {
        failed++;
        console.error("FAIL", c.from, "+", c.event, "=>", got, "(expected", c.expect + ")");
      }
    }
    console.log(cases.length - failed + "/" + cases.length + " state-machine cases pass");
    process.exit(failed ? 1 : 0);
  `],
  { encoding: "utf8" }
);
process.stdout.write(out);
