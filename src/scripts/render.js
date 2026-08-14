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
