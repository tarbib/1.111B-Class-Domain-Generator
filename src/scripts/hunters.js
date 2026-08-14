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
// runtimes can never drift apart. Small-pool types (mostly already taken, so
// every visitor would otherwise re-run a near-exhaustive hunt on every page
// load) are precomputed; large-pool types normally find an available domain
// within a couple of live attempts, so precomputing them is mostly about
// shaving that last bit of live RDAP latency off page load rather than
// coverage. Date is the one large-pool type precomputed anyway: main.js
// reserves its row 0 for today's exact date (always live -- there's nothing
// to precompute about a date this specific), and fills rows 1-4 from here,
// shifted down by one to account for that reserved slot.
export const PRECOMPUTED_TYPES = ["Angel", "Binary", "Sequential", "Triples", "Pairs", "Solid", "Repeater", "Date"];

export const RESULTS_PER_SECTION = 5;
