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
import { enumerateMonthDomains } from "../src/scripts/generators.js";
import { checkDomainStatus } from "../src/scripts/rdap.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "..", "public", "data", "precomputed.json");

// If this large a fraction of RDAP checks come back "unknown" (network/5xx/
// timeout, see rdap.js's performRdapLookup), treat it as "the registry is
// unreachable" rather than "these domains genuinely errored" and abort
// without writing -- an overwrite full of "unknown" rows would be strictly
// worse than leaving the last published data in place.
const UNKNOWN_RATIO_ABORT_THRESHOLD = 0.5;

// Per type, keep calling hunt() until RESULTS_PER_SECTION available domains
// are found or this many hunt() calls have been made -- whichever comes
// first. Only "available" results are ever written (see main loop below):
// the goal is to surface domains worth registering, not to pad a section out
// to 5 with ones that are already taken, so a type can end up with fewer than
// RESULTS_PER_SECTION rows -- or none -- if its pattern is mostly/fully
// registered (this is expected for the smallest pools, Solid/Pairs/Repeater
// at ~26-36 candidates total; main.js already treats a missing row as "hunt
// this one live" with zero extra code needed). The 3x multiplier gives
// randomly-sampled pools a real shot at finding available domains a single
// capped huntForAvailable call might statistically miss; for exhaustive pools
// each hunt() call finds at most one *new* available domain (or proves there
// are none left), so this is what lets a pool with several free domains
// surface more than just the first one found.
const HUNT_CALLS_PER_TYPE = RESULTS_PER_SECTION * 3;

// Every whole calendar month touched by "one year before today through one
// year after today" -- e.g. today Aug 14 2026 -> Aug 2025 .. Aug 2027, 25
// months. Whole months (not just the remaining/elapsed days of the boundary
// ones) so each is a complete, independently-navigable grid for the calendar
// view's month nav in both directions.
function monthsForYearWindow() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 365);
  const end = new Date(now);
  end.setDate(end.getDate() + 365);

  const months = [];
  let year = start.getFullYear();
  let month = start.getMonth() + 1;
  const endYear = end.getFullYear();
  const endMonth = end.getMonth() + 1;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

// Checks every day of every month in that range once each, for the Date
// section's calendar view -- lets a visitor page a year forward or back
// without the client ever needing to fall back to a live per-day check. A
// given day's domain is fixed and there's nothing to search for, so this is
// a plain full sweep rather than a "hunt".
async function buildCalendar() {
  let checks = 0;
  let unknown = 0;
  const months = [];
  for (const { year, month } of monthsForYearWindow()) {
    const days = [];
    for (const { day, domain } of enumerateMonthDomains(year, month)) {
      const status = await checkDomainStatus(domain);
      checks++;
      if (status === "unknown") unknown++;
      days.push({ day, domain, status });
    }
    const availableCount = days.filter((d) => d.status === "available").length;
    console.log(`  [Calendar] ${year}-${String(month).padStart(2, "0")}: ${availableCount}/${days.length} available`);
    months.push({ year, month, days });
  }
  return { months, checks, unknown };
}

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
    let huntCalls = 0;
    while (rows.length < RESULTS_PER_SECTION && huntCalls < HUNT_CALLS_PER_TYPE) {
      huntCalls++;
      const { domainObj, status } = await hunt(usedDomains, (obj, attempts) => {
        process.stdout.write(`  [${type}] attempt ${attempts}: ${obj.domain}.xyz\n`);
      });
      totalChecks++;
      if (status === "unknown") unknownChecks++;
      else if (status === "available" && domainObj) rows.push({ ...domainObj, status });
      else if (!domainObj) break; // pool fully claimed -- no new candidate left, more calls won't help
      // status === "taken": not written, but domainObj is now marked used
      // (see hunt.js) so the next hunt() call moves on to a fresh candidate
      // instead of re-finding the same taken one.
    }
    sections[type.toLowerCase()] = rows;
    console.log(
      `[${type}] ${rows.length}/${RESULTS_PER_SECTION} available after ${huntCalls} hunt(s): ` +
        rows.map((r) => r.domain).join(", "),
    );
  }

  const calendar = await buildCalendar();
  totalChecks += calendar.checks;
  unknownChecks += calendar.unknown;

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
  const payload = JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sections,
      calendar: { months: calendar.months },
    },
    null,
    2,
  );
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
