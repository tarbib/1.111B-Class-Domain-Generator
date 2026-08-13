import {
  generateSequential,
  generatePalindrome,
  generateTriples,
  generateRepeaterPattern,
  generatePrime,
  generateLucky,
  generateRound,
  generateYear,
  generateBinary,
  generateRandomNumber,
  enumerateSolidDomains,
  enumerateAngelDomains,
} from "./generators.js";
import { huntForAvailable, huntExhaustive } from "./hunt.js";

// --- HUNTERS PER TYPE ---
// Each entry is a (usedDomains, onAttempt) => Promise<{domainObj, status}> function,
// so calling code doesn't need to know whether a type is randomly generated or
// drawn from a fixed enumerated pool.
const SOLID_POOL = enumerateSolidDomains();
const ANGEL_POOL = enumerateAngelDomains();

export const hunterMap = {
  Sequential: (used, onAttempt) => huntForAvailable(generateSequential, used, onAttempt),
  Palindrome: (used, onAttempt) => huntForAvailable(generatePalindrome, used, onAttempt),
  Solid: (used, onAttempt) => huntExhaustive(SOLID_POOL, used, onAttempt),
  Triples: (used, onAttempt) => huntForAvailable(generateTriples, used, onAttempt),
  Repeater: (used, onAttempt) => huntForAvailable(generateRepeaterPattern, used, onAttempt),
  Prime: (used, onAttempt) => huntForAvailable(generatePrime, used, onAttempt),
  Lucky: (used, onAttempt) => huntForAvailable(generateLucky, used, onAttempt),
  Round: (used, onAttempt) => huntForAvailable(generateRound, used, onAttempt),
  Year: (used, onAttempt) => huntForAvailable(generateYear, used, onAttempt),
  Angel: (used, onAttempt) => huntExhaustive(ANGEL_POOL, used, onAttempt),
  Binary: (used, onAttempt) => huntForAvailable(generateBinary, used, onAttempt),
  Random: (used, onAttempt) => huntForAvailable(generateRandomNumber, used, onAttempt),
};
