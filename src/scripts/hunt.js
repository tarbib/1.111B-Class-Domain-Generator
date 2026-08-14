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
// another row in the same batch without spending an RDAP request on them, and
// every candidate this call actually checks gets added to it too -- regardless
// of status -- so a *different* row's exhausted search can't land on and
// re-display the same already-taken domain this row just showed (small pools
// like Repeater's ~26 values collide on this easily by chance otherwise). Also
// skips exact repeats within this hunt for the same reason, one level down.
// Returns `domainObj: null` if every candidate this call could try was already
// used up by an earlier row -- there's nothing new left to show.
export async function huntForAvailable(generatorFn, usedDomains, onAttempt) {
  let status = "taken";
  let attempts = 0;
  let domainObj = null;
  const attempted = new Set();
  while (status !== "available" && attempts < MAX_HUNT_ATTEMPTS) {
    attempts++;
    const candidate = generatorFn();
    if (attempted.has(candidate.domain) || (usedDomains && usedDomains.has(candidate.domain))) continue;
    attempted.add(candidate.domain);
    if (onAttempt) onAttempt(candidate, attempts);
    status = await checkDomainStatus(candidate.domain);
    domainObj = candidate;
    if (usedDomains) usedDomains.add(candidate.domain);
  }
  return { domainObj, status };
}

// Tries every candidate from a small, fully-enumerated pool exactly once (in
// random order) instead of random sampling — see enumerateSolidDomains/
// enumerateRepeaterDomains/enumeratePairsDomains for why this matters for
// those categories. Same usedDomains contract as huntForAvailable above.
export async function huntExhaustive(candidates, usedDomains, onAttempt) {
  const pool = shuffle(candidates);
  let status = "taken";
  let domainObj = null;
  let attempts = 0;
  for (const candidate of pool) {
    if (usedDomains && usedDomains.has(candidate.domain)) continue;
    attempts++;
    domainObj = candidate;
    if (onAttempt) onAttempt(domainObj, attempts);
    status = await checkDomainStatus(candidate.domain);
    if (usedDomains) usedDomains.add(candidate.domain);
    if (status === "available") break;
  }
  return { domainObj, status };
}
