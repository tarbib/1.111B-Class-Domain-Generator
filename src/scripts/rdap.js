// --- REAL RDAP CHECK LOGIC ---
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// All registry lookups funnel through this single chain so concurrent
// hunts (multiple rows refreshing at once) can never burst-request the
// registry in parallel — one request in flight at a time, spaced out.
const RDAP_MIN_INTERVAL_MS = 350;
const RDAP_TIMEOUT_MS = 8000;
let rdapChain = Promise.resolve();

export function checkDomainStatus(domain) {
  const run = rdapChain.then(() => performRdapLookup(domain));
  rdapChain = run.then(() => sleep(RDAP_MIN_INTERVAL_MS));
  return run;
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
