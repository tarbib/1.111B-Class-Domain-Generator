import {
  generateSequential,
  generatePalindrome,
  generateTriples,
  generateRepeaterPattern,
  generatePairs,
  generatePrime,
  generateRound,
  generateDate,
  generateIconic,
  generateAngel,
  generateBinary,
  generateEvenOdd,
  generateRandomNumber,
  enumerateSolidDomains,
} from "./generators.js";
import { huntForAvailable, huntExhaustive } from "./hunt.js";

// --- HUNTERS PER TYPE ---
// Each entry is a (usedDomains, onAttempt) => Promise<{domainObj, status}> function,
// so calling code doesn't need to know whether a type is randomly generated or
// drawn from a fixed enumerated pool.
const SOLID_POOL = enumerateSolidDomains();

export const hunterMap = {
  Sequential: (used, onAttempt) => huntForAvailable(generateSequential, used, onAttempt),
  Palindrome: (used, onAttempt) => huntForAvailable(generatePalindrome, used, onAttempt),
  Solid: (used, onAttempt) => huntExhaustive(SOLID_POOL, used, onAttempt),
  Triples: (used, onAttempt) => huntForAvailable(generateTriples, used, onAttempt),
  Repeater: (used, onAttempt) => huntForAvailable(generateRepeaterPattern, used, onAttempt),
  Pairs: (used, onAttempt) => huntForAvailable(generatePairs, used, onAttempt),
  Prime: (used, onAttempt) => huntForAvailable(generatePrime, used, onAttempt),
  Round: (used, onAttempt) => huntForAvailable(generateRound, used, onAttempt),
  Date: (used, onAttempt) => huntForAvailable(generateDate, used, onAttempt),
  Iconic: (used, onAttempt) => huntForAvailable(generateIconic, used, onAttempt),
  Angel: (used, onAttempt) => huntForAvailable(generateAngel, used, onAttempt),
  Binary: (used, onAttempt) => huntForAvailable(generateBinary, used, onAttempt),
  EvenOdd: (used, onAttempt) => huntForAvailable(generateEvenOdd, used, onAttempt),
  Random: (used, onAttempt) => huntForAvailable(generateRandomNumber, used, onAttempt),
};

// --- PRECOMPUTED VS LIVE ---
// Shared by main.js in the browser and scripts/precompute.mjs (the cron job
// that hunts these ahead of time and publishes public/data/precomputed.json)
// -- single source of truth for which types get cron-precomputed, so the two
// runtimes can never drift apart. Small-pool types (mostly already taken, so
// every visitor would otherwise re-run a near-exhaustive hunt on every page
// load) are precomputed; large-pool types find an available domain within a
// couple of live attempts, so there's no benefit to precomputing them.
export const PRECOMPUTED_TYPES = ["Angel", "Binary", "Sequential", "Triples", "Pairs", "Solid", "Repeater"];

export const RESULTS_PER_SECTION = 5;
