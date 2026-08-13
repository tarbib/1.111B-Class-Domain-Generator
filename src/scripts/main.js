import { hunterMap } from "./hunters.js";
import { checkDomainStatus } from "./rdap.js";
import { shuffle } from "./hunt.js";
import {
  rowState,
  createFinalDomainHTML,
  placeholderRowHTML,
  checkingButtonHTML,
  huntingDomainLabel,
} from "./render.js";

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
    updatedRow.outerHTML = createFinalDomainHTML(state.domainObj, state.sectionClass, status, id);
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
    updatedRow.outerHTML = createFinalDomainHTML(domainObj, state.sectionClass, status, id);
  }
}

// --- MAIN GENERATOR LOOP ---
async function generateAndCheck() {
  const btn = document.getElementById("generate-btn");
  const memorableList = document.getElementById("memorable-list");
  const premiumList = document.getElementById("premium-list");
  const randomList = document.getElementById("random-list");

  btn.disabled = true;
  btn.innerText = "🔎 Hunting for available domains...";
  memorableList.innerHTML = "";
  premiumList.innerHTML = "";
  randomList.innerHTML = "";
  rowState.clear();

  const memorableTypes = shuffle(["Sequential", "Palindrome", "Solid", "Triples", "Repeater"]).slice(0, 4);
  const premiumTypes = shuffle(["Lucky", "Prime", "Round", "Year", "Angel", "Binary"]).slice(0, 4);

  const items = [
    ...memorableTypes.map((type, i) => ({ type, sectionClass: "memorable", container: memorableList, id: `mem-${i}` })),
    ...premiumTypes.map((type, i) => ({ type, sectionClass: "premium", container: premiumList, id: `prem-${i}` })),
    ...Array.from({ length: 4 }, (_, i) => ({ type: "Random", sectionClass: "", container: randomList, id: `rand-${i}` })),
  ];

  // Render placeholders for every row up front so the layout appears immediately.
  items.forEach((item) => {
    item.container.innerHTML += placeholderRowHTML(item.id, item.sectionClass);
  });

  // Hunt sequentially per row; checkDomainStatus already serializes actual
  // network calls, so this keeps UI updates predictable without adding extra delay.
  const usedDomains = new Set();
  for (const item of items) {
    const rowElement = document.getElementById(item.id);
    const domainNameSpan = rowElement.querySelector(".domain-name");
    const { domainObj, status } = await hunterMap[item.type](usedDomains, (obj, attempts) => {
      domainNameSpan.innerHTML = huntingDomainLabel(obj.domain, attempts);
    });
    const freshRow = document.getElementById(item.id);
    if (freshRow) freshRow.outerHTML = createFinalDomainHTML(domainObj, item.sectionClass, status, item.id);
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
