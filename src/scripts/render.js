// Remembers each row's current domain so refresh/recheck clicks (which only
// carry an id) can look up what they're operating on.
export const rowState = new Map();

const REFRESH_ICON = `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>`;

function refreshButtonHTML(id, extraClass = "") {
  return `<button class="btn btn-sm btn-outline-secondary refresh-btn ${extraClass}" data-action="refresh" data-id="${id}" title="Hunt for an available domain" aria-label="Hunt for an available domain">${REFRESH_ICON}</button>`;
}

function huntingRowHTML(id, domainLabel = "Searching") {
  return `
    <div class="list-group-item" id="${id}">
      <div class="d-flex justify-content-between align-items-center gap-2">
        <div class="d-flex align-items-center gap-2 flex-wrap">
          ${refreshButtonHTML(id, "disabled")}
          <span class="font-monospace fw-bold fs-5 domain-name">${domainLabel}<span class="text-secondary">.xyz</span></span>
        </div>
        <button class="btn btn-sm btn-outline-secondary action-btn" disabled>
          <span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Hunting...
        </button>
      </div>
    </div>
  `;
}

// Renders the placeholder row shown the moment a hunt for `id` starts.
export function placeholderRowHTML(id) {
  return huntingRowHTML(id);
}

// status: 'available' | 'taken' | 'unknown' (unknown = the check itself failed/timed out)
// Shared between hunted rows and the phone-number lookup below, so both get
// the same available/taken/unknown treatment (registration link, retry
// button, ...) from one place.
function actionButtonHTML(domain, status, id) {
  if (status === "available") {
    const regLink = `https://porkbun.com/checkout/search?q=${domain}.xyz`;
    return `<a href="${regLink}" target="_blank" rel="noopener" class="btn btn-sm btn-success action-btn">Available <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></a>`;
  }
  if (status === "unknown") {
    return `<button class="btn btn-sm btn-outline-warning action-btn" data-action="recheck" data-id="${id}">⚠️ Unknown · Retry</button>`;
  }
  return `<button class="btn btn-sm btn-secondary action-btn" disabled>Taken</button>`;
}

export function createFinalDomainHTML(domainObj, status, id) {
  rowState.set(id, { domainObj });

  let reasonHTML = "";
  if (domainObj.reason) {
    reasonHTML = `<div class="text-secondary fst-italic small mt-2 ps-1">${domainObj.reason}</div>`;
  }

  return `
    <div class="list-group-item" id="${id}">
      <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
        <div class="d-flex align-items-center gap-2 flex-wrap">
          ${refreshButtonHTML(id)}
          <span class="font-monospace fw-bold fs-5 domain-name">${domainObj.domain}<span class="text-secondary">.xyz</span></span>
        </div>
        ${actionButtonHTML(domainObj.domain, status, id)}
      </div>
      ${reasonHTML}
    </div>
  `;
}

// Swaps a row into its "checking..." / "hunting..." state while a recheck/refresh request is in flight.
export function checkingButtonHTML(label = "Checking...") {
  return `<button class="btn btn-sm btn-outline-secondary action-btn" disabled><span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>${label}</button>`;
}

// --- PHONE NUMBER LOOKUP ("Try your phone number?" section) ---
// No refresh button (there's nothing to "hunt" -- it's the user's own number)
// and no reason line, so this is a lighter row than createFinalDomainHTML
// rather than forcing that one to support a refresh-less mode.
export function phoneCheckingHTML(digits, id) {
  return `
    <div class="list-group-item" id="${id}">
      <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
        <span class="font-monospace fw-bold fs-5">${digits}<span class="text-secondary">.xyz</span></span>
        <button class="btn btn-sm btn-outline-secondary action-btn" disabled>
          <span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Checking...
        </button>
      </div>
    </div>
  `;
}

export function createPhoneResultHTML(digits, status, id) {
  rowState.set(id, { domainObj: { domain: digits, type: "Phone" } });
  return `
    <div class="list-group-item" id="${id}">
      <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
        <span class="font-monospace fw-bold fs-5">${digits}<span class="text-secondary">.xyz</span></span>
        ${actionButtonHTML(digits, status, id)}
      </div>
    </div>
  `;
}

export function huntingDomainLabel(domain, attempts) {
  return `${domain}<span class="text-secondary">.xyz</span> <span class="text-secondary small">(try ${attempts})</span>`;
}

// --- CALENDAR (month view under the Date section) ---
const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// status: null while still checking (precomputed data missing/stale for this day)
function calendarDayCellHTML(day, domain, status, isToday) {
  const stateClass =
    status === "available"
      ? "calendar-day-available"
      : status === "taken"
        ? "calendar-day-taken"
        : status === "unknown"
          ? "calendar-day-unknown"
          : "calendar-day-pending";
  const label =
    status === "available" ? "Available" : status === "taken" ? "Taken" : status === "unknown" ? "Unknown" : "Checking…";
  const inner =
    status === "available"
      ? `<a href="https://porkbun.com/checkout/search?q=${domain}.xyz" target="_blank" rel="noopener" class="calendar-day-inner">${day}</a>`
      : `<span class="calendar-day-inner">${day}</span>`;
  return `<div class="calendar-day ${stateClass}${isToday ? " calendar-day-today" : ""}" data-day="${day}" title="${domain}.xyz — ${label}">${inner}</div>`;
}

// `days` is [{day, domain}, ...] for every day of the month (see
// enumerateMonthDomains). `statusByDay` maps day -> status for whichever days
// precomputed data already covers; the rest render as "pending" until
// fillMissingCalendarDays (main.js) checks them live.
export function calendarGridHTML(year, month, days, statusByDay, today) {
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Monday = 0
  const emptyCells = Array.from({ length: firstWeekday }, () => `<div class="calendar-day calendar-day-empty"></div>`).join(
    "",
  );
  const dayCells = days
    .map(({ day, domain }) => calendarDayCellHTML(day, domain, statusByDay.get(day) ?? null, day === today))
    .join("");
  return `
    <div class="calendar-month-label small fw-bold text-secondary mb-2">${MONTH_NAMES[month - 1]} ${year}</div>
    <div class="calendar-weekdays">${WEEKDAY_LABELS.map((d) => `<span>${d}</span>`).join("")}</div>
    <div class="calendar-days">${emptyCells}${dayCells}</div>
  `;
}

// Swaps a single day cell (identified by data-day) into its resolved state.
export function updateCalendarDayCell(container, day, domain, status, isToday) {
  const cell = container.querySelector(`.calendar-day[data-day="${day}"]`);
  if (cell) cell.outerHTML = calendarDayCellHTML(day, domain, status, isToday);
}
