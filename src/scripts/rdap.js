// --- REAL RDAP CHECK LOGIC ---
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// All registry lookups funnel through this single chain so concurrent
// hunts (multiple rows refreshing at once) can never burst-request the
// registry in parallel — one request in flight at a time, spaced out.
const RDAP_MIN_INTERVAL_MS = 350;
const RDAP_TIMEOUT_MS = 8000;
let rdapChain = Promise.resolve();

// Caches settled ('available'/'taken') results for the life of the page/
// process. Hunts for small-pool types (Repeater, Solid, ...) call
// checkDomainStatus on overlapping candidates across separate hunt() calls --
// without this, each call re-queries the registry (and re-pays the
// RDAP_MIN_INTERVAL_MS spacing) for domains already known. 'unknown' is never
// cached so the "Retry" button and later hunt attempts always get a fresh
// network attempt for those.
const statusCache = new Map();

export function checkDomainStatus(domain) {
  const cached = statusCache.get(domain);
  if (cached) return Promise.resolve(cached);
  const run = rdapChain.then(() => performRdapLookup(domain));
  rdapChain = run.then(() => sleep(RDAP_MIN_INTERVAL_MS));
  return run.then((status) => {
    if (status !== "unknown") statusCache.set(domain, status);
    return status;
  });
}

// Returns 'available' | 'taken' | 'unknown'. Retries 429s with backoff and
// retries transient network errors once, instead of reporting a domain as
// "taken" just because the check itself failed.
async function performRdapLookup(domain, attempt = 1) {
  const url = `https://rdap.centralnic.com/xyz/domain/${domain}.xyz`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RDAP_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/rdap+json" },
      signal: controller.signal,
    });
    if (response.status === 404) return "available";
    if (response.status === 200) return "taken";
    if (response.status === 429 && attempt < 3) {
      console.warn(`Registry rate limit hit on ${domain}.xyz, backing off (attempt ${attempt})...`);
      await sleep(1500 * attempt);
      return performRdapLookup(domain, attempt + 1);
    }
    console.warn(`Unexpected RDAP status ${response.status} for ${domain}.xyz`);
    return "unknown";
  } catch (error) {
    if (attempt < 2) {
      await sleep(1000);
      return performRdapLookup(domain, attempt + 1);
    }
    console.error(`RDAP check failed for ${domain}.xyz:`, error);
    return "unknown";
  } finally {
    clearTimeout(timeoutId);
  }
}
