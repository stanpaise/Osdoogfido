import Anthropic from "@anthropic-ai/sdk";
import { buildPrompts } from "./prompts.js";
import { runDemoQuestion, runLiveQuestion } from "./ai-check.js";
import { auditSite } from "./site-audit.js";
import { scoreScan } from "./score.js";

// AIV_ANTHROPIC_KEY is preferred: cloud coding sessions reserve ANTHROPIC_API_KEY for themselves.
export function apiKey() {
  return process.env.AIV_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY || "";
}

export function scanMode() {
  return process.env.AIV_MODE || (apiKey() ? "live" : "demo");
}

export function validateInput(body) {
  const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const input = {
    businessName: clean(body?.businessName, 120),
    city: clean(body?.city, 80),
    state: clean(body?.state, 40),
    website: clean(body?.website, 300),
  };
  const missing = ["businessName", "city", "website"].filter((k) => !input[k]);
  if (missing.length) throw new Error(`Missing: ${missing.join(", ")}`);
  return input;
}

let client;

export async function runScan(input, { mode = scanMode() } = {}) {
  const prompts = buildPrompts(input.city, input.state);
  const questionsPromise = mode === "live"
    ? Promise.all(prompts.map((q) => runLiveQuestion((client ??= new Anthropic({ apiKey: apiKey() })), q, input)))
    : Promise.resolve(prompts.map((q, i) => runDemoQuestion(q, i, input.businessName)));

  const [questions, site] = await Promise.all([questionsPromise, auditSite(input)]);
  return {
    mode,
    input,
    scannedAt: new Date().toISOString(),
    site: { ok: site.ok, url: site.url, error: site.error, checks: site.checks },
    ...scoreScan({ ...input, questions, siteChecks: site.checks, siteReadable: site.ok }),
  };
}
