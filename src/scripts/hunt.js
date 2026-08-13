import { checkDomainStatus } from "./rdap.js";

// Kill switch so a hunt can't spin forever. Some curated patterns (e.g. Solid,
// Angel) only have a few dozen possible values total, so this needs to be high
// enough to get close to exhaustive coverage of those small spaces.
const MAX_HUNT_ATTEMPTS = 40;

// Uniform Fisher-Yates shuffle (Array.sort with a random comparator is biased).
export function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Keeps generating candidates from generatorFn and checking them (through the
// shared rate-limited queue) until one comes back available, or MAX_HUNT_ATTEMPTS
// is hit. `usedDomains`, if given, is used to skip candidates already claimed by
// another row in the same batch without spending an RDAP request on them. Also
// skips exact repeats within this hunt, so smaller pattern spaces (e.g. Repeater's
// ~50 possible values) get closer to full coverage instead of re-querying the
// same candidate multiple times inside the attempt budget.
export async function huntForAvailable(generatorFn, usedDomains, onAttempt) {
  let status = "taken";
  let attempts = 0;
  let domainObj;
  const attempted = new Set();
  while (status !== "available" && attempts < MAX_HUNT_ATTEMPTS) {
    attempts++;
    domainObj = generatorFn();
    if (attempted.has(domainObj.domain) || (usedDomains && usedDomains.has(domainObj.domain))) continue;
    attempted.add(domainObj.domain);
    if (onAttempt) onAttempt(domainObj, attempts);
    status = await checkDomainStatus(domainObj.domain);
  }
  if (usedDomains && status === "available") usedDomains.add(domainObj.domain);
  return { domainObj, status };
}

// Tries every candidate from a small, fully-enumerated pool exactly once (in
// random order) instead of random sampling — see enumerateSolidDomains/
// enumerateAngelDomains for why this matters for those two categories.
export async function huntExhaustive(candidates, usedDomains, onAttempt) {
  const pool = shuffle(candidates);
  let status = "taken";
  let domainObj = pool[0];
  let attempts = 0;
  for (const candidate of pool) {
    if (usedDomains && usedDomains.has(candidate.domain)) continue;
    attempts++;
    domainObj = candidate;
    if (onAttempt) onAttempt(domainObj, attempts);
    status = await checkDomainStatus(candidate.domain);
    if (status === "available") break;
  }
  if (usedDomains && status === "available") usedDomains.add(domainObj.domain);
  return { domainObj, status };
}
