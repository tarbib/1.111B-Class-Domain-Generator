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
  const start = Math.floor(Math.random() * 9) + 1;
  let num = "";
  const isAscending = Math.random() > 0.5;
  for (let i = 0; i < length; i++) {
    let digit = isAscending ? (start + i) % 10 : (start - i) % 10;
    if (digit < 0) digit += 10;
    num += digit;
  }
  return { domain: num, type: "Sequential" };
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

export function generateRepeaterPattern() {
  // Repeat a short block to fill `length` (rather than a fixed 6 chars) so
  // hunting has a large enough space to actually find something available.
  const length = getLength();
  const sequences = ["12", "98", "69", "24", "75", "123", "456", "789", "987", "654", "321", "135", "246"];
  const seq = sequences[Math.floor(Math.random() * sequences.length)];
  const domain = seq.repeat(Math.ceil(length / seq.length)).slice(0, length);
  return { domain, type: "Repeater" };
}

export function generatePairs() {
  // Same ascending/descending walk as Sequential, but each digit is doubled
  // (11-22-33-...) — the "AABB ladder" shape common in vanity phone numbers.
  const length = getLength();
  const pairCount = Math.ceil(length / 2);
  const start = Math.floor(Math.random() * 9) + 1;
  const isAscending = Math.random() > 0.5;
  let domain = "";
  for (let i = 0; i < pairCount; i++) {
    let digit = isAscending ? (start + i) % 10 : (start - i) % 10;
    if (digit < 0) digit += 10;
    domain += digit.toString().repeat(2);
  }
  return { domain: domain.slice(0, length), type: "Pairs" };
}

// --- PREMIUM GENERATORS (categories that carry real cultural/numerical value) ---
export function isPrime(num) {
  for (let i = 2, s = Math.sqrt(num); i <= s; i++) if (num % i === 0) return false;
  return num > 1;
}

export function generatePrime() {
  const length = getLength();
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  let candidate = Math.floor(Math.random() * (max - min + 1)) + min;
  if (candidate % 2 === 0) candidate++;
  while (!isPrime(candidate)) {
    candidate += 2;
    // Stay within the intended digit length instead of overflowing into length+1.
    if (candidate > max) candidate = min + 1;
  }
  const domain = candidate.toString();
  return {
    domain,
    type: "Prime",
    reason: `${domain} is prime — no factors besides 1 and itself, a mathematically unique identity prized by tech, crypto and math-driven brands.`,
  };
}

export function generatePerfectSquare() {
  const length = getLength();
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const rootMin = Math.ceil(Math.sqrt(min));
  const rootMax = Math.floor(Math.sqrt(max));
  const root = Math.floor(Math.random() * (rootMax - rootMin + 1)) + rootMin;
  const domain = (root * root).toString();
  return {
    domain,
    type: "Square",
    reason: `${domain} = ${root}² — a perfect square, a clean mathematical identity valued by tech, math and puzzle-driven brands.`,
  };
}

export function generateLucky() {
  const length = getLength();
  const luckyDigits = ["6", "8", "9"];
  let num = "";
  for (let i = 0; i < length; i++) num += luckyDigits[Math.floor(Math.random() * luckyDigits.length)];

  const meanings = [];
  if (num.includes("8")) meanings.push("8 (prosperity, 发 fā)");
  if (num.includes("6")) meanings.push("6 (smooth progress, 溜 liù)");
  if (num.includes("9")) meanings.push("9 (longevity, 久 jiǔ)");
  const reason = `Built from ${meanings.join(", ")} — auspicious digits in Chinese numerology, and skips the unlucky 4. Highly sought after for phone numbers and plates.`;
  return { domain: num, type: "Lucky", reason };
}

const MIRROR_MAP = { 0: "0", 1: "1", 6: "9", 8: "8", 9: "6" };
const MIRROR_DIGITS = Object.keys(MIRROR_MAP);
const MIRROR_STABLE_DIGITS = ["0", "1", "8"]; // map to themselves, so valid as an odd-length middle digit

export function generateMirror() {
  // Strobogrammatic: rotate the digit string 180° (reverse it, then flip each
  // digit — 6<->9, 0/1/8 unchanged) and it reads back exactly the same.
  const length = getLength();
  const halfLen = Math.floor(length / 2);
  let half = "";
  for (let i = 0; i < halfLen; i++) half += MIRROR_DIGITS[Math.floor(Math.random() * MIRROR_DIGITS.length)];
  const mirroredHalf = half
    .split("")
    .reverse()
    .map((d) => MIRROR_MAP[d])
    .join("");

  let domain;
  if (length % 2 === 0) {
    domain = half + mirroredHalf;
  } else {
    const mid = MIRROR_STABLE_DIGITS[Math.floor(Math.random() * MIRROR_STABLE_DIGITS.length)];
    domain = half + mid + mirroredHalf;
  }
  return {
    domain,
    type: "Mirror",
    reason: `Rotate ${domain}.xyz 180° and it reads back exactly the same — a novelty prized in vanity plates and lucky numbers.`,
  };
}

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

export function generateYear() {
  const length = getLength();
  const year = Math.floor(Math.random() * (2099 - 1950 + 1)) + 1950;
  const yearStr = year.toString();
  // Pad on only one side (never split around both), so the year always reads
  // as a clean, unbroken 4-digit block at one edge of the domain instead of
  // getting buried in the middle behind random filler digits.
  let padding = "";
  for (let i = 0; i < length - yearStr.length; i++) padding += randDigit();
  const domain = Math.random() > 0.5 ? yearStr + padding : padding + yearStr;
  return {
    domain,
    type: "Year",
    reason: `Embeds ${year} — reads like a real year, great for founding-year branding, anniversaries or throwback campaigns.`,
  };
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
  // Same one-sided-padding anchor as Year, but for short globally-recognized
  // numbers instead of calendar years.
  const length = getLength();
  const icon = ICONIC_NUMBERS[Math.floor(Math.random() * ICONIC_NUMBERS.length)];
  let padding = "";
  for (let i = 0; i < length - icon.value.length; i++) padding += randDigit();
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
  const blockCount = Math.ceil(length / 3);
  const triplets = [];
  for (let i = 0; i < blockCount; i++) {
    let triplet;
    do {
      triplet = ANGEL_TRIPLETS[Math.floor(Math.random() * ANGEL_TRIPLETS.length)];
    } while (triplet === triplets[i - 1]);
    triplets.push(triplet);
  }
  const domain = triplets.join("").slice(0, length);
  const meanings = [...new Set(triplets)].map((t) => `${t} (${ANGEL_MEANINGS[t]})`).join(" + ");
  return {
    domain,
    type: "Angel",
    reason: `Built from angel numbers ${meanings} — recognized numerology sequences. Popular in spiritual/wellness branding.`,
  };
}

export function generateBinary() {
  const length = getLength();
  let num = "";
  for (let i = 0; i < length; i++) num += Math.floor(Math.random() * 2);
  if (/^0+$/.test(num)) num = "1" + num.slice(1);
  return {
    domain: num,
    type: "Binary",
    reason: `Made up of only 0s and 1s — reads like binary code, a natural fit for tech, software and AI brands.`,
  };
}

export function generateEvenOdd() {
  const length = getLength();
  const isEven = Math.random() > 0.5;
  const digits = isEven ? ["0", "2", "4", "6", "8"] : ["1", "3", "5", "7", "9"];
  let domain = "";
  for (let i = 0; i < length; i++) domain += digits[Math.floor(Math.random() * digits.length)];
  // type stays fixed ("EvenOdd") regardless of which parity got picked, so
  // hunterMap/refresh lookups (keyed by type) keep working either way.
  return {
    domain,
    type: "EvenOdd",
    reason: `Every digit is ${isEven ? "even" : "odd"} — a clean, consistent digit pattern that's easy to say and remember.`,
  };
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

// Fibonacci is even smaller than Solid — only ~19 total values across all
// four lengths — so it gets the same exhaustive-enumeration treatment.
export function enumerateFibonacciDomains() {
  const domains = [];
  let a = 1;
  let b = 1;
  while (b <= 999999999) {
    const domain = b.toString();
    if (domain.length >= 6 && domain.length <= 9) {
      domains.push({
        domain,
        type: "Fibonacci",
        reason: `${domain} is a Fibonacci number — part of nature's own growth sequence, a favorite among math and design-minded brands.`,
      });
    }
    [a, b] = [b, a + b];
  }
  return domains;
}
