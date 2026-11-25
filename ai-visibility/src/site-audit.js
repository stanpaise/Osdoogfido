// Checks a roofing company's homepage for the signals AI assistants lean on when deciding
// who to recommend: structured business data, location, services, trust and reviews.
import dns from "node:dns/promises";
import net from "node:net";

const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

export const CHECKS = [
  {
    id: "schema",
    label: "Business schema markup (LocalBusiness / RoofingContractor)",
    weight: 8,
    fix: "Add RoofingContractor JSON-LD schema with your name, address, phone, service area, hours and review rating. AI tools read this directly.",
    test: (h) => /"@type"\s*:\s*\[?[^\]}]*?"(RoofingContractor|HomeAndConstructionBusiness|LocalBusiness|GeneralContractor)"/i.test(h),
  },
  {
    id: "city",
    label: "Your city is named on the homepage",
    weight: 6,
    fix: "Say the city (and the neighborhoods you serve) in a headline and the opening paragraph: \"Roof replacement in {city}\".",
    test: (h, t, ctx) => ctx.city && t.toLowerCase().includes(ctx.city.toLowerCase()),
  },
  {
    id: "phone",
    label: "Phone number visible",
    weight: 4,
    fix: "Put a clickable phone number (tel: link) in the header and footer.",
    test: (h, t) => /tel:/i.test(h) || /\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/.test(t),
  },
  {
    id: "services",
    label: "Core services spelled out (replacement, repair, storm damage, inspection)",
    weight: 6,
    fix: "Create one page per service: roof replacement, roof repair, storm/hail damage, inspections, gutters. AI answers name companies that clearly match the question.",
    test: (h, t) => ["replacement", "repair", "storm", "hail", "inspection", "leak"].filter((k) => t.toLowerCase().includes(k)).length >= 3,
  },
  {
    id: "reviews",
    label: "Reviews / testimonials on site",
    weight: 5,
    fix: "Show recent Google reviews with names and star ratings, and link to your Google Business Profile. Ask every finished job for a review.",
    test: (h, t) => /\b(reviews?|testimonials?|stars?|rated)\b/i.test(t),
  },
  {
    id: "trust",
    label: "Licensed, insured and warranty stated",
    weight: 4,
    fix: "State your license number, insurance, manufacturer certifications (GAF, Owens Corning, CertainTeed) and warranty terms.",
    test: (h, t) => /\b(licensed|insured|certified|warranty)\b/i.test(t),
  },
  {
    id: "faq",
    label: "FAQ section answering homeowner questions",
    weight: 4,
    fix: "Add an FAQ: cost of a roof replacement in {city}, how long it takes, insurance claims, repair vs replace. AI assistants quote FAQ answers.",
    test: (h, t) => /\b(faq|frequently asked)\b/i.test(t) || /"FAQPage"/.test(h),
  },
  {
    id: "title",
    label: "Page title mentions roofing and your city",
    weight: 3,
    fix: "Set the page title to \"{name} | Roofing Contractor in {city}\".",
    test: (h, t, ctx) => {
      const m = h.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = (m?.[1] ?? "").toLowerCase();
      return title.includes("roof") && Boolean(ctx.city) && title.includes(ctx.city.toLowerCase());
    },
  },
];

export function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

export function auditHtml(html, ctx) {
  const text = htmlToText(html);
  const fill = (s) => s.replaceAll("{city}", ctx.city || "your city").replaceAll("{name}", ctx.businessName || "Your Company");
  return CHECKS.map((c) => ({
    id: c.id,
    label: c.label,
    weight: c.weight,
    passed: Boolean(c.test(html, text, ctx)),
    fix: fill(c.fix),
  }));
}

function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateAddress(v.slice(7));
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
}

// Rejects anything that isn't a public http(s) host, so the scanner can't be pointed at internal services.
export async function assertPublicUrl(raw) {
  let url;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new Error("That website address doesn't look valid.");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http and https websites can be scanned.");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("Only standard web ports can be scanned.");
  const addrs = await dns.lookup(url.hostname, { all: true }).catch(() => []);
  if (!addrs.length) throw new Error(`Couldn't find the website ${url.hostname}.`);
  if (addrs.some((a) => isPrivateAddress(a.address))) throw new Error("That address isn't a public website.");
  return url;
}

export async function fetchHomepage(raw) {
  let url = await assertPublicUrl(raw);
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "Mozilla/5.0 (compatible; AIVisibilityScanner/0.1)" },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = await assertPublicUrl(new URL(res.headers.get("location"), url).href);
      continue;
    }
    if (!res.ok) throw new Error(`The website returned an error (HTTP ${res.status}).`);
    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    reader.cancel().catch(() => {});
    return { finalUrl: url.href, html: Buffer.concat(chunks).toString("utf8") };
  }
  throw new Error("The website redirected too many times.");
}

export async function auditSite(ctx) {
  try {
    const { finalUrl, html } = await fetchHomepage(ctx.website);
    return { ok: true, url: finalUrl, checks: auditHtml(html, ctx) };
  } catch (err) {
    return { ok: false, error: err.message, checks: auditHtml("", ctx).map((c) => ({ ...c, passed: false })) };
  }
}
