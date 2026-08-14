import {
  generateSequential,
  generatePalindrome,
  generateTriples,
  generateRound,
  generateDate,
  generateIconic,
  generateAngel,
  generateBinary,
  generateRandomNumber,
  enumerateSolidDomains,
  enumerateRepeaterDomains,
  enumeratePairsDomains,
} from "./generators.js";
import { huntForAvailable, huntExhaustive } from "./hunt.js";

// --- HUNTERS PER TYPE ---
// Each entry is a (usedDomains, onAttempt) => Promise<{domainObj, status}> function,
// so calling code doesn't need to know whether a type is randomly generated or
// drawn from a fixed enumerated pool.
const SOLID_POOL = enumerateSolidDomains();
const REPEATER_POOL = enumerateRepeaterDomains();
const PAIRS_POOL = enumeratePairsDomains();

export const hunterMap = {
  Sequential: (used, onAttempt) => huntForAvailable(generateSequential, used, onAttempt),
  Palindrome: (used, onAttempt) => huntForAvailable(generatePalindrome, used, onAttempt),
  Solid: (used, onAttempt) => huntExhaustive(SOLID_POOL, used, onAttempt),
  Triples: (used, onAttempt) => huntForAvailable(generateTriples, used, onAttempt),
  Repeater: (used, onAttempt) => huntExhaustive(REPEATER_POOL, used, onAttempt),
  Pairs: (used, onAttempt) => huntExhaustive(PAIRS_POOL, used, onAttempt),
  Round: (used, onAttempt) => huntForAvailable(generateRound, used, onAttempt),
  Date: (used, onAttempt) => huntForAvailable(generateDate, used, onAttempt),
  Iconic: (used, onAttempt) => huntForAvailable(generateIconic, used, onAttempt),
  Angel: (used, onAttempt) => huntForAvailable(generateAngel, used, onAttempt),
  Binary: (used, onAttempt) => huntForAvailable(generateBinary, used, onAttempt),
  Random: (used, onAttempt) => huntForAvailable(generateRandomNumber, used, onAttempt),
};

// --- PRECOMPUTED VS LIVE ---
// Shared by main.js in the browser and scripts/precompute.mjs (the cron job
// that hunts these ahead of time and publishes public/data/precomputed.json)
// -- single source of truth for which types get cron-precomputed, so the two
// runtimes can never drift apart. Every type is precomputed except Random --
// by design the one section meant to feel fresh/different on every visit, so
// it's the one deliberately left to hunt live on each page load. Date is
// special-cased in main.js: row 0 is reserved for today's exact date (always
// live -- there's nothing to precompute about a date this specific), and
// rows 1-4 are filled from here, shifted down by one to account for that slot.
export const PRECOMPUTED_TYPES = [
  "Iconic",
  "Round",
  "Palindrome",
  "Date",
  "Angel",
  "Binary",
  "Sequential",
  "Triples",
  "Pairs",
  "Solid",
  "Repeater",
];

export const RESULTS_PER_SECTION = 5;
