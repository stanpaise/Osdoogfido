// Name matching between the business being scanned and the names an AI answer recommends.

const SUFFIXES = /\b(llc|l\.l\.c\.|inc|incorporated|co|company|corp|corporation|ltd|pllc|group|the)\b/g;

export function normalizeName(name) {
  return String(name)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(SUFFIXES, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function namesMatch(a, b) {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  // "Smith Roofing" vs "Smith Roofing & Exteriors": the shorter must be a whole-word prefix/substring
  // of the longer, and long enough not to match generic words like "roofing".
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 6 && short.includes(" ") && ` ${long} `.includes(` ${short} `);
}

export function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Where (1-based) the target appears in the list of recommended businesses, or null.
// A citation of the business's own website also counts as a mention.
export function findTarget({ businessName, website, recommended, sources = [] }) {
  const idx = recommended.findIndex((n) => namesMatch(n, businessName));
  const targetHost = hostOf(website);
  const cited = Boolean(targetHost) && sources.some((s) => {
    const h = hostOf(s);
    return h === targetHost || h.endsWith(`.${targetHost}`);
  });
  return { mentioned: idx >= 0 || cited, rank: idx >= 0 ? idx + 1 : null, cited };
}
