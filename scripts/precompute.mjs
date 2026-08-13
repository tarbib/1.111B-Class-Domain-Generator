#!/usr/bin/env node
// Cron entry point (run via .github/workflows/precompute.yml): hunts one
// fresh set of domains for each small-pool pattern type and writes them to
// public/data/precomputed.json, which Astro copies verbatim into dist/ on
// the next `npm run build`. Reuses the exact same hunterMap logic
// src/scripts/main.js uses in the browser -- no reimplementation, so
// behavior can't drift between the two runtimes.
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hunterMap, PRECOMPUTED_TYPES, RESULTS_PER_SECTION } from "../src/scripts/hunters.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "..", "public", "data", "precomputed.json");

// If this large a fraction of RDAP checks come back "unknown" (network/5xx/
// timeout, see rdap.js's performRdapLookup), treat it as "the registry is
// unreachable" rather than "these domains genuinely errored" and abort
// without writing -- an overwrite full of "unknown" rows would be strictly
// worse than leaving the last published data in place.
const UNKNOWN_RATIO_ABORT_THRESHOLD = 0.5;

async function main() {
  // Scoped to precomputed types only -- this Set never needs to know live
  // types exist. Mirrors the same per-run dedup pattern main.js already uses
  // across a page load, just scoped to a cron run instead.
  const usedDomains = new Set();
  const sections = {};
  let totalChecks = 0;
  let unknownChecks = 0;

  for (const type of PRECOMPUTED_TYPES) {
    const hunt = hunterMap[type];
    if (!hunt) {
      throw new Error(`hunterMap has no entry for "${type}" -- PRECOMPUTED_TYPES and hunterMap are out of sync.`);
    }
    const rows = [];
    for (let i = 0; i < RESULTS_PER_SECTION; i++) {
      const { domainObj, status } = await hunt(usedDomains, (obj, attempts) => {
        process.stdout.write(`  [${type}] attempt ${attempts}: ${obj.domain}.xyz\n`);
      });
      totalChecks++;
      if (status === "unknown") unknownChecks++;
      rows.push({ ...domainObj, status });
    }
    sections[type.toLowerCase()] = rows;
    console.log(`[${type}] ${rows.map((r) => `${r.domain}(${r.status})`).join(", ")}`);
  }

  const unknownRatio = totalChecks ? unknownChecks / totalChecks : 0;
  if (unknownRatio > UNKNOWN_RATIO_ABORT_THRESHOLD) {
    console.error(
      `Aborting: ${unknownChecks}/${totalChecks} RDAP checks were "unknown" ` +
        `(>${UNKNOWN_RATIO_ABORT_THRESHOLD * 100}%) -- registry looks unreachable. ` +
        `Leaving ${OUTPUT_PATH} untouched.`,
    );
    process.exit(1);
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  const payload = JSON.stringify({ generatedAt: new Date().toISOString(), sections }, null, 2);
  // Write-then-rename so a crash mid-write can never leave a truncated/corrupt
  // precomputed.json behind for the subsequent `npm run build` to pick up.
  const tmpPath = `${OUTPUT_PATH}.tmp`;
  await writeFile(tmpPath, payload);
  await rename(tmpPath, OUTPUT_PATH);
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("precompute.mjs failed:", err);
  process.exit(1);
});
