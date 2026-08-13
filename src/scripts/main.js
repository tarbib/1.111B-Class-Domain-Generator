import { hunterMap, PRECOMPUTED_TYPES, RESULTS_PER_SECTION } from "./hunters.js";
import { checkDomainStatus } from "./rdap.js";
import {
  rowState,
  createFinalDomainHTML,
  placeholderRowHTML,
  checkingButtonHTML,
  huntingDomainLabel,
} from "./render.js";

// One section per pattern type, 5 rows each, ordered by the size of each
// type's candidate pool (most possible domains first, fewest last). A bigger
// pool means more room for random sampling to land on something available,
// so the types least likely to still have anything free — like Solid and
// Repeater, whose entire space is a few dozen values — end up last.
export const SECTION_TYPES = [
  "Random", // ~1,111,000,000 candidates
  "Iconic", // ~57,772,000
  "Prime", // ~50,837,942
  "EvenOdd", // ~4,875,000
  "Round", // ~1,110,996
  "Palindrome", // ~121,000
  "Date", // ~54,787 (valid DDMMYYYY calendar dates, 1950-2099)
  "Angel", // ~1,800
  "Binary", // ~956
  "Sequential", // ~700
  "Triples", // ~288
  "Pairs", // ~36
  "Solid", // ~36
  "Repeater", // ~26
];

const PRECOMPUTED_DATA_URL = "/data/precomputed.json";
const PRECOMPUTED_FETCH_TIMEOUT_MS = 5000;

// Fetches the cron-generated dataset (see scripts/precompute.mjs). Never
// throws -- returns null on any failure (missing file, timeout, bad JSON) so
// callers fall back to live hunting for those sections instead of rendering
// nothing.
async function fetchPrecomputedData() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PRECOMPUTED_FETCH_TIMEOUT_MS);
  try {
    // no-store: this file is overwritten in place at a stable URL (unlike
    // Astro's content-hashed JS/CSS bundles), so it must not be served from a
    // stale browser cache across deploys.
    const response = await fetch(PRECOMPUTED_DATA_URL, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    return json.sections ?? null;
  } catch (error) {
    console.warn("Precomputed data unavailable, falling back to live hunting:", error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Re-runs the check for the exact same domain (used to recover from an 'unknown' result).
async function recheckStatus(id) {
  const state = rowState.get(id);
  const rowElement = document.getElementById(id);
  if (!state || !rowElement) return;

  const actionBtn = rowElement.querySelector(".action-btn");
  actionBtn.outerHTML = checkingButtonHTML();

  const status = await checkDomainStatus(state.domainObj.domain);
  const updatedRow = document.getElementById(id);
  if (updatedRow) {
    updatedRow.outerHTML = createFinalDomainHTML(state.domainObj, status, id);
  }
}

// --- AUTO-HUNT (REFRESH UNTIL AVAILABLE) LOGIC ---
async function refreshRow(id) {
  const state = rowState.get(id);
  const rowElement = document.getElementById(id);
  if (!state || !rowElement) return;

  const refreshBtn = rowElement.querySelector(".refresh-btn");
  const actionBtn = rowElement.querySelector(".action-btn");
  const domainNameSpan = rowElement.querySelector(".domain-name");

  refreshBtn.disabled = true;
  refreshBtn.classList.add("spinning");
  actionBtn.outerHTML = checkingButtonHTML("Hunting...");

  const hunt = hunterMap[state.domainObj.type];
  const { domainObj, status } = await hunt(null, (obj, attempts) => {
    domainNameSpan.innerHTML = huntingDomainLabel(obj.domain, attempts);
  });

  const updatedRow = document.getElementById(id);
  if (updatedRow) {
    updatedRow.outerHTML = createFinalDomainHTML(domainObj, status, id);
  }
}

// --- MAIN GENERATOR LOOP ---
async function generateAndCheck() {
  const btn = document.getElementById("generate-btn");
  btn.disabled = true;
  btn.innerText = "🔎 Hunting for available domains...";
  rowState.clear();

  const items = [];
  for (const type of SECTION_TYPES) {
    const container = document.getElementById(`${type.toLowerCase()}-list`);
    container.innerHTML = "";
    for (let i = 0; i < RESULTS_PER_SECTION; i++) {
      items.push({ type, container, id: `${type.toLowerCase()}-${i}`, indexInType: i });
    }
  }

  // Render placeholders for every row up front so the layout appears immediately.
  items.forEach((item) => {
    item.container.innerHTML += placeholderRowHTML(item.id);
  });

  // Kick the precomputed-data fetch off in parallel with everything else --
  // it's a same-origin static file with no RDAP throttle, so it resolves
  // well before the first live hunt below even completes.
  const precomputedSections = await fetchPrecomputedData();

  const liveItems = [];
  for (const item of items) {
    if (!PRECOMPUTED_TYPES.includes(item.type)) {
      liveItems.push(item);
      continue;
    }
    const row = precomputedSections?.[item.type.toLowerCase()]?.[item.indexInType];
    if (row) {
      const rowElement = document.getElementById(item.id);
      if (rowElement) rowElement.outerHTML = createFinalDomainHTML(row, row.status, item.id);
    } else {
      // Missing/incomplete precomputed data for this row -- hunt it live instead.
      liveItems.push(item);
    }
  }

  // Hunt sequentially per row; checkDomainStatus already serializes actual
  // network calls, so this keeps UI updates predictable without adding delay.
  const usedDomains = new Set();
  for (const item of liveItems) {
    const rowElement = document.getElementById(item.id);
    const domainNameSpan = rowElement.querySelector(".domain-name");
    const { domainObj, status } = await hunterMap[item.type](usedDomains, (obj, attempts) => {
      domainNameSpan.innerHTML = huntingDomainLabel(obj.domain, attempts);
    });
    const freshRow = document.getElementById(item.id);
    if (freshRow) freshRow.outerHTML = createFinalDomainHTML(domainObj, status, item.id);
  }

  btn.disabled = false;
  btn.innerText = "✨ Generate & Check Availability";
}

function handleDelegatedClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, id } = target.dataset;
  if (action === "refresh") refreshRow(id);
  else if (action === "recheck") recheckStatus(id);
}

document.addEventListener("click", handleDelegatedClick);
document.getElementById("generate-btn").addEventListener("click", generateAndCheck);
generateAndCheck();
