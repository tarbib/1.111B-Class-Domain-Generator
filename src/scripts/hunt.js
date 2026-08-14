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
// the domain this call finally settles on -- available or not -- gets added to
// it too, so a *different* row can't land on and re-display that same domain
// (small pools like Repeater's ~26 values collide on this easily by chance
// otherwise). Only the final pick is recorded, not every candidate merely
// glanced at along the way -- marking all of them would let the first row's
// search vacuum up an entire small pool and starve every row after it, which
// is worse: instead of 5 distinct results (available and/or taken), rows 2-5
// would each find nothing new and disappear. Also skips exact repeats within
// this hunt for the same reason, one level down.
// Returns `domainObj: null` if every candidate this call could try was already
// claimed by an earlier row -- there's nothing new left in the pool to show.
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
  }
  if (usedDomains && domainObj) usedDomains.add(domainObj.domain);
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
    if (status === "available") break;
  }
  if (usedDomains && domainObj) usedDomains.add(domainObj.domain);
  return { domainObj, status };
}
