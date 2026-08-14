import { hunterMap, PRECOMPUTED_TYPES, RESULTS_PER_SECTION } from "./hunters.js";
import { checkDomainStatus } from "./rdap.js";
import { getTodayDateDomain, enumerateMonthDomains, DATE_MIN_YEAR, DATE_MAX_YEAR } from "./generators.js";
import {
  rowState,
  createFinalDomainHTML,
  placeholderRowHTML,
  checkingButtonHTML,
  huntingDomainLabel,
  phoneCheckingHTML,
  createPhoneResultHTML,
  calendarShellHTML,
  calendarDaysHTML,
  calendarMonthLabel,
  updateCalendarDayCell,
} from "./render.js";

// One section per pattern type, 5 rows each, ordered by the size of each
// type's candidate pool (most possible domains first, fewest last). A bigger
// pool means more room for random sampling to land on something available,
// so the types least likely to still have anything free — like Solid and
// Repeater, whose entire space is a few dozen values — end up last.
export const SECTION_TYPES = [
  "Random", // ~1,111,000,000 candidates
  "Iconic", // ~57,772,000
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
// throws -- returns nulls on any failure (missing file, timeout, bad JSON) so
// callers fall back to live hunting/checking for those sections instead of
// rendering nothing.
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
    return { sections: json.sections ?? null, calendar: json.calendar ?? null };
  } catch (error) {
    console.warn("Precomputed data unavailable, falling back to live hunting:", error);
    return { sections: null, calendar: null };
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
    updatedRow.outerHTML =
      state.domainObj.type === "Phone"
        ? createPhoneResultHTML(state.domainObj.domain, status, id)
        : createFinalDomainHTML(state.domainObj, status, id);
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
  if (updatedRow && domainObj) {
    updatedRow.outerHTML = createFinalDomainHTML(domainObj, status, id);
  }
}

// A precomputed "available" row could be stale by the time a visitor loads
// the page -- the cron job (scripts/precompute.mjs) may have run hours ago,
// and someone else may have registered it since. Fired right after the row
// renders, without blocking the rest of the page: silently re-checks it, and
// if it's no longer available, hunts a fresh replacement for that same slot
// instead of leaving a broken "Available" on screen.
async function verifyPrecomputedRow(item, row, usedDomains) {
  const status = await checkDomainStatus(row.domain);
  if (status === "available") return;

  const rowElement = document.getElementById(item.id);
  if (!rowElement) return;
  const domainNameSpan = rowElement.querySelector(".domain-name");
  const actionBtn = rowElement.querySelector(".action-btn");
  if (actionBtn) actionBtn.outerHTML = checkingButtonHTML("Re-hunting...");

  const hunt = hunterMap[item.type];
  const { domainObj, status: newStatus } = await hunt(usedDomains, (obj, attempts) => {
    if (domainNameSpan) domainNameSpan.innerHTML = huntingDomainLabel(obj.domain, attempts);
  });

  const freshRow = document.getElementById(item.id);
  if (!freshRow) return;
  // Nothing new left in this type's pool this session (every other row
  // already claimed it) -- drop the row rather than re-showing a duplicate.
  if (domainObj) freshRow.outerHTML = createFinalDomainHTML(domainObj, newStatus, item.id);
  else freshRow.remove();
}

// --- CALENDAR (month view under the Date section) ---
// `calendarView` tracks whichever year/month is currently on screen, both to
// drive the nav controls and as a guard: if the user navigates away while a
// month's live checks are still trickling in, those checks stop touching the
// DOM instead of writing into a grid that's no longer showing that month.
// `calendarPrecomputed` is the cron job's cached calendar (see
// scripts/precompute.mjs) -- a rolling year of months starting from whichever
// day the cron last ran, so navigating up to a year ahead never needs a live
// per-day check; anything outside that window (past months, or over a year
// out) still falls back to checking live.
let calendarView = null;
let calendarPrecomputed = null;

function shiftCalendarMonth(delta) {
  if (!calendarView) return;
  let { year, month } = calendarView;
  month += delta;
  if (month < 1) {
    month = 12;
    year -= 1;
  } else if (month > 12) {
    month = 1;
    year += 1;
  }
  if (year < DATE_MIN_YEAR || year > DATE_MAX_YEAR) return; // clamp at the picker's range
  loadCalendarMonth(year, month);
}

// Renders the static shell (nav arrows, year picker, "Today" button) once --
// only #calendar-days gets replaced on every subsequent month change, so
// these controls and their listeners don't need re-attaching each time.
function initCalendarShell(year) {
  const container = document.getElementById("date-calendar");
  if (!container) return false;
  container.innerHTML = calendarShellHTML(year, DATE_MIN_YEAR, DATE_MAX_YEAR);
  document.getElementById("calendar-prev").addEventListener("click", () => shiftCalendarMonth(-1));
  document.getElementById("calendar-next").addEventListener("click", () => shiftCalendarMonth(1));
  document.getElementById("calendar-year-select").addEventListener("change", (event) => {
    if (calendarView) loadCalendarMonth(Number(event.target.value), calendarView.month);
  });
  document.getElementById("calendar-today").addEventListener("click", () => {
    const now = new Date();
    loadCalendarMonth(now.getFullYear(), now.getMonth() + 1);
  });
  return true;
}

// Renders `year`/`month`'s grid from precomputed data where available (any
// month in the cron's rolling year-ahead window), then live-checks whatever
// isn't -- each cell pulses "pending" until its own check resolves, so it's
// visibly loading rather than looking stuck.
async function loadCalendarMonth(year, month) {
  const daysContainer = document.getElementById("calendar-days");
  if (!daysContainer) return;

  calendarView = { year, month };
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const todayDay = isCurrentMonth ? now.getDate() : -1;
  const days = enumerateMonthDomains(year, month);

  const statusByDay = new Map();
  const precomputedMonth = calendarPrecomputed?.months?.find((m) => m.year === year && m.month === month);
  if (precomputedMonth) {
    for (const d of precomputedMonth.days) statusByDay.set(d.day, d.status);
  }

  document.getElementById("calendar-month-label").textContent = calendarMonthLabel(year, month);
  document.getElementById("calendar-year-select").value = String(year);
  daysContainer.innerHTML = calendarDaysHTML(year, month, days, statusByDay, todayDay);

  for (const { day, domain } of days) {
    if (statusByDay.has(day)) continue;
    if (calendarView.year !== year || calendarView.month !== month) return; // navigated away
    const status = await checkDomainStatus(domain);
    if (calendarView.year !== year || calendarView.month !== month) return; // navigated away mid-check
    updateCalendarDayCell(daysContainer, day, domain, status, day === todayDay);
  }
}

// If a section ended up with rows but none of them are "Available" (every
// candidate this run turned up was already taken -- e.g. Repeater's whole
// ~26-value pool is sometimes fully registered), append a plain-language
// note explaining that instead of leaving a wall of grey "Taken" buttons to
// speak for itself.
// Idempotent -- safe to call again on a section that's already settled (see
// generateAndCheck: called once right after the sections that had nothing
// pending in the background-verify pass are done, and again at the very end
// for the ones that did).
function noteIfAllTaken(container) {
  if (!container || container.children.length === 0) return;
  if (container.querySelector(".btn-success")) return; // at least one available row
  if (container.querySelector(".list-group-item-warning")) return; // already noted
  container.insertAdjacentHTML(
    "beforeend",
    `<div class="list-group-item list-group-item-warning small">⚠️ Every combination checked here is already taken right now.</div>`,
  );
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
  const { sections: precomputedSections, calendar: precomputedCalendar } = await fetchPrecomputedData();
  calendarPrecomputed = precomputedCalendar;

  // Seeded with every domain already rendered from precomputed data -- without
  // this, a live hunt (or a re-hunt below) filling in a row could land on a
  // domain already shown a few rows up in the same section (this is how
  // "789789.xyz" ended up listed twice under Repeater).
  const usedDomains = new Set();
  if (precomputedSections) {
    for (const rows of Object.values(precomputedSections)) {
      for (const row of rows) usedDomains.add(row.domain);
    }
  }

  // The Date section's first row is always today's exact date rather than a
  // random pick from generateDate's ~54,787 possible ones -- checked directly
  // (there's nothing to "hunt" for, it's one specific domain) so it renders
  // before the rest of the section's random picks.
  const todayDomainObj = getTodayDateDomain();
  usedDomains.add(todayDomainObj.domain);
  const todayItem = items.find((item) => item.type === "Date" && item.indexInType === 0);
  if (todayItem) {
    const todayStatus = await checkDomainStatus(todayDomainObj.domain);
    const rowElement = document.getElementById(todayItem.id);
    if (rowElement) rowElement.outerHTML = createFinalDomainHTML(todayDomainObj, todayStatus, todayItem.id);
  }

  // Loaded now, ahead of the per-section hunts below, so the calendar gets a
  // real answer quickly instead of sitting on a "pending" pulse for however
  // long the rest of the page's ~50 other checks take.
  const now = new Date();
  if (initCalendarShell(now.getFullYear())) {
    await loadCalendarMonth(now.getFullYear(), now.getMonth() + 1);
  }

  const liveItems = [];
  const toVerify = [];
  for (const item of items) {
    if (item === todayItem) continue;
    if (!PRECOMPUTED_TYPES.includes(item.type)) {
      liveItems.push(item);
      continue;
    }
    // Date's precomputed pool has no concept of "today" (row 0, handled
    // above) -- shift down by one so it fills rows 1-4 instead.
    const precomputedIndex = item.type === "Date" ? item.indexInType - 1 : item.indexInType;
    const row = precomputedSections?.[item.type.toLowerCase()]?.[precomputedIndex];
    // The vanishingly rare case where a precomputed date happens to equal
    // today's exact date (already claimed by todayItem above) -- treat it
    // as missing and hunt this slot live instead of duplicating that row.
    if (row && row.domain !== todayDomainObj.domain) {
      const rowElement = document.getElementById(item.id);
      if (rowElement) rowElement.outerHTML = createFinalDomainHTML(row, row.status, item.id);
      if (row.status === "available") toVerify.push({ item, row });
    } else {
      // Missing/incomplete precomputed data for this row -- hunt it live instead.
      liveItems.push(item);
    }
  }

  // Hunt sequentially per row; checkDomainStatus already serializes actual
  // network calls, so this keeps UI updates predictable without adding delay.
  for (const item of liveItems) {
    const rowElement = document.getElementById(item.id);
    const domainNameSpan = rowElement.querySelector(".domain-name");
    const { domainObj, status } = await hunterMap[item.type](usedDomains, (obj, attempts) => {
      domainNameSpan.innerHTML = huntingDomainLabel(obj.domain, attempts);
    });
    const freshRow = document.getElementById(item.id);
    if (!freshRow) continue;
    // Nothing new left in this type's small pool (every candidate is already
    // shown by an earlier row or precomputed) -- drop the row instead of
    // re-showing a duplicate of one already on the page.
    if (domainObj) freshRow.outerHTML = createFinalDomainHTML(domainObj, status, item.id);
    else freshRow.remove();
  }

  btn.disabled = false;
  btn.innerText = "✨ Generate & Check Availability";

  // If every row that landed in a section turned out taken, a page full of
  // grey "Taken" buttons reads as broken rather than "nothing free right
  // now" -- add a one-line note per section instead of trying to hide it.
  // Types with nothing pending in toVerify (e.g. Repeater, if precompute
  // found zero available) are already fully settled at this point, so they
  // get checked now rather than waiting on every other section's
  // background re-verify below.
  const typesAwaitingVerify = new Set(toVerify.map(({ item }) => item.type));
  for (const type of SECTION_TYPES) {
    if (!typesAwaitingVerify.has(type)) noteIfAllTaken(document.getElementById(`${type.toLowerCase()}-list`));
  }

  // Re-verify precomputed rows only now that every still-empty slot above has
  // already been filled -- these share the same rate-limited RDAP queue (see
  // rdap.js), so starting them earlier would delay the live hunts users are
  // actively watching a spinner for, behind background checks on rows that
  // already show a reasonable answer.
  await Promise.all(toVerify.map(({ item, row }) => verifyPrecomputedRow(item, row, usedDomains)));

  // Now check the remaining (verify-pending) sections too, now that their
  // background re-verification has settled.
  for (const type of typesAwaitingVerify) {
    noteIfAllTaken(document.getElementById(`${type.toLowerCase()}-list`));
  }
}

function handleDelegatedClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, id } = target.dataset;
  if (action === "refresh") refreshRow(id);
  else if (action === "recheck") recheckStatus(id);
}

// --- "TRY YOUR PHONE NUMBER?" LOOKUP ---
const PHONE_RESULT_ID = "phone-result";

async function handlePhoneSubmit(event) {
  event.preventDefault();
  const input = document.getElementById("phone-input");
  const digits = input.value.replace(/\D/g, "");
  const list = document.getElementById("phone-list");
  if (!digits) return;

  const submitBtn = event.target.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  list.innerHTML = phoneCheckingHTML(digits, PHONE_RESULT_ID);

  const status = await checkDomainStatus(digits);
  const row = document.getElementById(PHONE_RESULT_ID);
  if (row) row.outerHTML = createPhoneResultHTML(digits, status, PHONE_RESULT_ID);
  submitBtn.disabled = false;
}

document.addEventListener("click", handleDelegatedClick);
document.getElementById("generate-btn").addEventListener("click", generateAndCheck);
document.getElementById("phone-form").addEventListener("submit", handlePhoneSubmit);
generateAndCheck();
