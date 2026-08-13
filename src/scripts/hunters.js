import {
  generateSequential,
  generatePalindrome,
  generateTriples,
  generateRepeaterPattern,
  generatePairs,
  generatePrime,
  generatePerfectSquare,
  generateLucky,
  generateMirror,
  generateRound,
  generateYear,
  generateIconic,
  generateAngel,
  generateBinary,
  generateEvenOdd,
  generateRandomNumber,
  enumerateSolidDomains,
  enumerateFibonacciDomains,
} from "./generators.js";
import { huntForAvailable, huntExhaustive } from "./hunt.js";

// --- HUNTERS PER TYPE ---
// Each entry is a (usedDomains, onAttempt) => Promise<{domainObj, status}> function,
// so calling code doesn't need to know whether a type is randomly generated or
// drawn from a fixed enumerated pool.
const SOLID_POOL = enumerateSolidDomains();
const FIBONACCI_POOL = enumerateFibonacciDomains();

export const hunterMap = {
  Sequential: (used, onAttempt) => huntForAvailable(generateSequential, used, onAttempt),
  Palindrome: (used, onAttempt) => huntForAvailable(generatePalindrome, used, onAttempt),
  Solid: (used, onAttempt) => huntExhaustive(SOLID_POOL, used, onAttempt),
  Triples: (used, onAttempt) => huntForAvailable(generateTriples, used, onAttempt),
  Repeater: (used, onAttempt) => huntForAvailable(generateRepeaterPattern, used, onAttempt),
  Pairs: (used, onAttempt) => huntForAvailable(generatePairs, used, onAttempt),
  Prime: (used, onAttempt) => huntForAvailable(generatePrime, used, onAttempt),
  Square: (used, onAttempt) => huntForAvailable(generatePerfectSquare, used, onAttempt),
  Lucky: (used, onAttempt) => huntForAvailable(generateLucky, used, onAttempt),
  Mirror: (used, onAttempt) => huntForAvailable(generateMirror, used, onAttempt),
  Round: (used, onAttempt) => huntForAvailable(generateRound, used, onAttempt),
  Year: (used, onAttempt) => huntForAvailable(generateYear, used, onAttempt),
  Iconic: (used, onAttempt) => huntForAvailable(generateIconic, used, onAttempt),
  Angel: (used, onAttempt) => huntForAvailable(generateAngel, used, onAttempt),
  Binary: (used, onAttempt) => huntForAvailable(generateBinary, used, onAttempt),
  EvenOdd: (used, onAttempt) => huntForAvailable(generateEvenOdd, used, onAttempt),
  Random: (used, onAttempt) => huntForAvailable(generateRandomNumber, used, onAttempt),
  Fibonacci: (used, onAttempt) => huntExhaustive(FIBONACCI_POOL, used, onAttempt),
};
