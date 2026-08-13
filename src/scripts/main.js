import { hunterMap } from "./hunters.js";
import { checkDomainStatus } from "./rdap.js";
import {
  rowState,
  createFinalDomainHTML,
  placeholderRowHTML,
  checkingButtonHTML,
  huntingDomainLabel,
} from "./render.js";

// One section per pattern type, 5 rows each. Solid is last because its pool is
// tiny (~36 possible domains total) and mostly registered, so it's the slowest
// and least likely to surface anything — no reason to make the rest of the
// page wait behind it.
export const SECTION_TYPES = [
  "Sequential",
  "Palindrome",
  "Triples",
  "Repeater",
  "Prime",
  "Lucky",
  "Round",
  "Year",
  "Angel",
  "Binary",
  "Random",
  "Solid",
];
const RESULTS_PER_SECTION = 5;

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
      items.push({ type, container, id: `${type.toLowerCase()}-${i}` });
    }
  }

  // Render placeholders for every row up front so the layout appears immediately.
  items.forEach((item) => {
    item.container.innerHTML += placeholderRowHTML(item.id);
  });

  // Hunt sequentially per row (Solid's items land last, see SECTION_TYPES);
  // checkDomainStatus already serializes actual network calls, so this keeps
  // UI updates predictable without adding extra delay.
  const usedDomains = new Set();
  for (const item of items) {
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
