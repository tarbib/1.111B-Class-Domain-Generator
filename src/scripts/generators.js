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
  const remaining = length - yearStr.length;
  const prefixLen = Math.floor(Math.random() * (remaining + 1));
  const suffixLen = remaining - prefixLen;
  let prefix = "";
  for (let i = 0; i < prefixLen; i++) prefix += randDigit();
  let suffix = "";
  for (let i = 0; i < suffixLen; i++) suffix += randDigit();
  const domain = prefix + yearStr + suffix;
  return {
    domain,
    type: "Year",
    reason: `Embeds ${year} — reads like a real year, great for founding-year branding, anniversaries or throwback campaigns.`,
  };
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

// --- RANDOM ---
export function generateRandomNumber() {
  const length = getLength();
  let num = "";
  for (let j = 0; j < length; j++) num += randDigit();
  return { domain: num, type: "Random" };
}

// --- FULLY-ENUMERATED CATEGORIES ---
// Solid and Angel each have only ~36 possible values across all lengths (9 digits
// or 9 angel triplets, times 4 lengths). That's small enough to check every single
// one instead of random-sampling — random sampling with a bounded attempt budget
// can't guarantee full coverage of a tiny space (coupon-collector problem), and
// these iconic patterns are exactly the ones most likely to be mostly registered.
export function enumerateSolidDomains() {
  const domains = [];
  for (let len = 6; len <= 9; len++) {
    for (let d = 1; d <= 9; d++) {
      domains.push({ domain: d.toString().repeat(len), type: "Solid" });
    }
  }
  return domains;
}

export function enumerateAngelDomains() {
  const domains = [];
  for (let len = 6; len <= 9; len++) {
    for (const triplet of Object.keys(ANGEL_MEANINGS)) {
      const domain = triplet.repeat(Math.ceil(len / 3)).slice(0, len);
      domains.push({
        domain,
        type: "Angel",
        reason: `Built from ${triplet} — a recognized "angel number" said to symbolize ${ANGEL_MEANINGS[triplet]}. Popular in numerology and spiritual/wellness branding.`,
      });
    }
  }
  return domains;
}
