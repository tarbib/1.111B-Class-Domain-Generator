// --- SHARED HELPERS ---
export function getLength() {
  return Math.floor(Math.random() * 4) + 6;
}

export function randDigit() {
  return Math.floor(Math.random() * 10);
}

// --- HIGHLY MEMORABLE GENERATORS (structural patterns that are easy to recall) ---
export function generateSequential() {
  const length = getLength();
  const isAscending = Math.random() > 0.5;
  // Start from any two-digit number, then chain the actual consecutive count
  // from there (e.g. 33,34,35,36,37 -> "3334353637") instead of wrapping
  // single digits mod 10. Starting at 10+ guarantees the descending walk
  // can't go negative before `length` digits are filled. Numbers are only
  // ever added whole — never chopped mid-number (e.g. 88 followed by just
  // "8" instead of 89) — so a start near a digit-count boundary (e.g.
  // 98,99,100) can fall short of 6 digits; retry until it doesn't.
  let domain;
  do {
    let current = Math.floor(Math.random() * 90) + 10;
    domain = "";
    while (true) {
      const next = current.toString();
      if (domain.length + next.length > length) break;
      domain += next;
      current += isAscending ? 1 : -1;
    }
  } while (domain.length < 6);
  return { domain, type: "Sequential" };
}

export function generatePalindrome() {
  const length = getLength();
  const halfLen = Math.floor(length / 2);
  let half = "";
  for (let i = 0; i < halfLen; i++) half += randDigit();

  if (length % 2 === 0) {
    return { domain: half + half.split("").reverse().join(""), type: "Palindrome" };
  } else {
    const mid = randDigit();
    return { domain: half + mid + half.split("").reverse().join(""), type: "Palindrome" };
  }
}

export function generateTriples() {
  // Split the domain into two runs of a repeated digit, sized to `length`
  // instead of a fixed 6 chars, so the search space scales with length too.
  const length = getLength();
  const firstRunLen = Math.ceil(length / 2);
  const d1 = Math.floor(Math.random() * 9) + 1;
  let d2 = Math.floor(Math.random() * 9) + 1;
  while (d2 === d1) d2 = Math.floor(Math.random() * 9) + 1;
  return { domain: d1.toString().repeat(firstRunLen) + d2.toString().repeat(length - firstRunLen), type: "Triples" };
}

const REPEATER_SEQUENCES = ["12", "98", "69", "24", "75", "123", "456", "789", "987", "654", "321", "135", "246"];

// Repeater has only ~26 possible values total (13 sequences x their valid
// repeat counts), same class of problem as Solid below -- small enough to
// check every single one instead of random-sampling, which is what let the
// same domain (e.g. "789789") get hunted -- and shown -- twice: random
// sampling has no memory of what it already produced across separate hunt()
// calls, an enumerated pool can't repeat a candidate that's already spoken for.
export function enumerateRepeaterDomains() {
  const domains = [];
  for (const seq of REPEATER_SEQUENCES) {
    const minRepeats = Math.ceil(6 / seq.length);
    const maxRepeats = Math.floor(9 / seq.length);
    for (let repeats = minRepeats; repeats <= maxRepeats; repeats++) {
      domains.push({ domain: seq.repeat(repeats), type: "Repeater" });
    }
  }
  return domains;
}

// Pairs has only ~36 possible values (9 starting digits x 2 directions x 2
// lengths) -- same reasoning as Repeater/Solid, enumerate instead of sample.
export function enumeratePairsDomains() {
  const domains = [];
  for (const pairCount of [3, 4]) {
    for (let start = 1; start <= 9; start++) {
      for (const isAscending of [true, false]) {
        let domain = "";
        for (let i = 0; i < pairCount; i++) {
          let digit = isAscending ? (start + i) % 10 : (start - i) % 10;
          if (digit < 0) digit += 10;
          domain += digit.toString().repeat(2);
        }
        domains.push({ domain, type: "Pairs" });
      }
    }
  }
  return domains;
}

// --- PREMIUM GENERATORS (categories that carry real cultural/numerical value) ---
export function generateRound() {
  const length = getLength();
  // Always leaves at least 1 lead digit and at least 3 trailing zeros.
  const zeroCount = Math.floor(Math.random() * (length - 3)) + 3;
  const leadLength = length - zeroCount;
  let lead = (Math.floor(Math.random() * 9) + 1).toString();
  for (let i = 1; i < leadLength; i++) lead += randDigit();
  const domain = lead + "0".repeat(zeroCount);
  return {
    domain,
    type: "Round",
    reason: `Ends in ${zeroCount} zeros — reads like a clean, round milestone number. Easy to say, easy to remember, "big number" branding.`,
  };
}

// Fixed DDMMYYYY shape (8 digits) instead of the variable 6-9 length used
// elsewhere — a date only reads cleanly in its natural calendar format.
// Shared by generateDate, getTodayDateDomain and enumerateMonthDomains so
// all three always agree on exactly what string a given day maps to.
function formatDateDomain(day, month, year) {
  const dd = day.toString().padStart(2, "0");
  const mm = month.toString().padStart(2, "0");
  return { dd, mm, domain: `${dd}${mm}${year}` };
}

export function generateDate() {
  const year = Math.floor(Math.random() * (2099 - 1950 + 1)) + 1950;
  const month = Math.floor(Math.random() * 12) + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = Math.floor(Math.random() * daysInMonth) + 1;
  const { dd, mm, domain } = formatDateDomain(day, month, year);
  return {
    domain,
    type: "Date",
    reason: `Reads as ${dd}/${mm}/${year} — a real calendar date, great for birthdays, anniversaries or founding-date branding.`,
  };
}

// Today's exact date -- shown as the Date section's first result (see
// main.js) instead of leaving it to random chance whether "today" ever comes
// up among generateDate's ~54,787 possible dates.
export function getTodayDateDomain() {
  const now = new Date();
  const { dd, mm, domain } = formatDateDomain(now.getDate(), now.getMonth() + 1, now.getFullYear());
  return {
    domain,
    type: "Date",
    reason: `Reads as ${dd}/${mm}/${now.getFullYear()} — today's date. A live, always-current pick for a launch-day or "founded on" domain.`,
  };
}

// Every day in a given month (1-indexed month, 1-12) -- powers the calendar
// view under the Date section. Reuses formatDateDomain so a calendar cell's
// domain always matches exactly what generateDate/getTodayDateDomain would
// produce for that same day.
export function enumerateMonthDomains(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const domains = [];
  for (let day = 1; day <= daysInMonth; day++) {
    domains.push({ day, domain: formatDateDomain(day, month, year).domain, type: "Date" });
  }
  return domains;
}

const ICONIC_NUMBERS = [
  { value: "420", reason: "420 — internet shorthand tied to cannabis culture, one of the most recognized numbers online." },
  { value: "007", reason: "007 — James Bond's number, instantly recognizable pop-culture branding." },
  { value: "911", reason: "911 — the US emergency number, impossible not to read as urgent." },
  { value: "42", reason: `42 — "the answer to life, the universe, and everything" from The Hitchhiker's Guide to the Galaxy.` },
  { value: "69", reason: "69 — a widely recognized meme/joke number." },
  { value: "100", reason: `100 — reads as "perfect score" or 100%, universally understood as maxed-out.` },
  { value: "360", reason: "360 — a full circle in degrees, shorthand for a full turnaround or complete view." },
  { value: "404", reason: `404 — the HTTP "Not Found" error code, instant recognition among developers.` },
];

export function generateIconic() {
  // Pads on only one side (never split around both), so the icon always
  // reads as a clean, unbroken block at one edge of the domain instead of
  // getting buried in the middle. Padding is all zeros rather than random
  // noise -- random filler digits drowned out the icon itself (e.g. "420"
  // buried inside "42078234" isn't memorable anymore), while zeros stay
  // silent and let the icon read cleanly regardless of position.
  const length = getLength();
  const icon = ICONIC_NUMBERS[Math.floor(Math.random() * ICONIC_NUMBERS.length)];
  const padding = "0".repeat(length - icon.value.length);
  const domain = Math.random() > 0.5 ? icon.value + padding : padding + icon.value;
  return { domain, type: "Iconic", reason: icon.reason };
}

export const ANGEL_MEANINGS = {
  111: "new beginnings",
  222: "balance & harmony",
  333: "growth & expansion",
  444: "protection & stability",
  555: "change on the way",
  666: "realignment & focus",
  777: "luck & spiritual awakening",
  888: "abundance & prosperity",
  999: "completion & closure",
};
const ANGEL_TRIPLETS = Object.keys(ANGEL_MEANINGS);

// Builds a domain out of 2-3 angel-number triplets (111, 222, ...). Each block
// is forced to differ from the one before it — otherwise repeating the same
// triplet just degenerates into a plain repeated digit (e.g. "111"+"111" =
// "111111"), which is indistinguishable from what Solid already generates.
export function generateAngel() {
  const length = getLength();
  // Only ever join *whole* triplets (floor, not ceil) -- ceil + slice used to
  // cut the last block in half (e.g. length 8 -> 777+666+999 sliced to
  // "77766699", which visibly drops the trailing "9" while the reason text
  // still credited the domain with a full "999"). Flooring means the domain
  // is always blockCount*3 <= length, so every triplet named in the reason
  // is fully present in the domain.
  const blockCount = Math.floor(length / 3);
  const triplets = [];
  for (let i = 0; i < blockCount; i++) {
    let triplet;
    do {
      triplet = ANGEL_TRIPLETS[Math.floor(Math.random() * ANGEL_TRIPLETS.length)];
    } while (triplet === triplets[i - 1]);
    triplets.push(triplet);
  }
  const domain = triplets.join("");
  const meanings = [...new Set(triplets)].map((t) => `${t} (${ANGEL_MEANINGS[t]})`).join(" + ");
  return {
    domain,
    type: "Angel",
    reason: `Built from angel numbers ${meanings} — recognized numerology sequences. Popular in spiritual/wellness branding.`,
  };
}

// Reason is identical for every Binary result (there's nothing per-domain to
// say), so it's shown once in the section header (see index.astro) instead
// of repeated under every row.
export function generateBinary() {
  const length = getLength();
  let num = "";
  for (let i = 0; i < length; i++) num += Math.floor(Math.random() * 2);
  if (/^0+$/.test(num)) num = "1" + num.slice(1);
  return { domain: num, type: "Binary" };
}

// --- RANDOM ---
export function generateRandomNumber() {
  const length = getLength();
  let num = "";
  for (let j = 0; j < length; j++) num += randDigit();
  return { domain: num, type: "Random" };
}

// --- FULLY-ENUMERATED CATEGORIES ---
// Solid has only ~36 possible values across all lengths (9 digits times 4
// lengths). That's small enough to check every single one instead of
// random-sampling — random sampling with a bounded attempt budget can't
// guarantee full coverage of a tiny space (coupon-collector problem), and
// this iconic pattern is exactly the one most likely to be mostly registered.
export function enumerateSolidDomains() {
  const domains = [];
  for (let len = 6; len <= 9; len++) {
    for (let d = 1; d <= 9; d++) {
      domains.push({ domain: d.toString().repeat(len), type: "Solid" });
    }
  }
  return domains;
}
