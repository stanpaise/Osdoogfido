// Build a client-ready AI visibility report (HTML + PDF) for one roofer.
//   node scripts/report.js --name "MHM Roofing" --city Edmond --state OK --website mhmroof.com
//   node scripts/report.js --from results/2026-11-25/mhm-roofing.json   # reuse an existing scan
//   node scripts/report.js --from manual.json   # mode "manual": answers gathered by hand in free ChatGPT ($0)
// Live scans need AIV_ANTHROPIC_KEY. PDF output needs Chrome/Chromium (set CHROME_PATH if not found).
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { runScan, scanMode, validateInput } from "../src/scan.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function renderReport(r) {
  const { businessName, city, state, website } = r.input;
  const place = state ? `${city}, ${state}` : city;
  const date = new Date(r.scannedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const asked = r.questionsAnswered;
  const headline = r.mentionedIn === 0
    ? `AI assistants didn't recommend ${businessName} in any of ${asked} homeowner questions.`
    : `AI assistants recommended ${businessName} in ${r.mentionedIn} of ${asked} homeowner questions.`;

  const questionRows = r.questions.map((q) => {
    const status = q.error ? `<span class="muted">Not answered</span>`
      : q.mentioned ? `<span class="yes">Yes${q.rank ? `, #${q.rank}` : ""}</span>` : `<span class="no">No</span>`;
    const who = q.error ? "" : q.recommended.length ? q.recommended.map(esc).join(", ") : `<span class="muted">No businesses named</span>`;
    return `<tr><td>${esc(q.question)}</td><td class="c">${status}</td><td>${who}</td></tr>`;
  }).join("");

  const competitorRows = r.competitors.slice(0, 5).map((c) =>
    `<tr><td>${esc(c.name)}</td><td class="c">${c.count} of ${asked}</td></tr>`).join("");

  const siteRows = r.siteReadable === false
    ? `<p class="muted">Your website blocked our automated check, so it isn't included in the score.</p>`
    : `<table><tbody>${r.site.checks.map((c) =>
        `<tr><td class="c">${c.passed ? '<span class="yes">✓</span>' : '<span class="no">✗</span>'}</td><td>${esc(c.label)}</td></tr>`).join("")}</tbody></table>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(businessName)}: AI Visibility Report</title>
<style>
  @page { size: Letter; margin: 0.6in; }
  body { font: 11pt/1.45 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #1b1d21; margin: 0; }
  header { border-bottom: 3px solid #c2410c; padding-bottom: 10px; margin-bottom: 18px; }
  h1 { font-size: 20pt; margin: 0; } h2 { font-size: 13pt; margin: 22px 0 8px; color: #c2410c; }
  .meta { color: #5d636e; font-size: 10pt; }
  .score { display: flex; gap: 24px; align-items: center; background: #f7f7f5; border-radius: 8px; padding: 14px 18px; }
  .big { font-size: 34pt; font-weight: 700; line-height: 1; }
  .headline { font-size: 12.5pt; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  td, th { border-bottom: 1px solid #e3e4e8; padding: 6px 8px; vertical-align: top; text-align: left; }
  th { background: #f7f7f5; } .c { text-align: center; white-space: nowrap; }
  .yes { color: #15803d; font-weight: 700; } .no { color: #b91c1c; font-weight: 700; } .muted { color: #5d636e; }
  ol li { margin: 5px 0; } .note { font-size: 9pt; color: #5d636e; margin-top: 24px; border-top: 1px solid #e3e4e8; padding-top: 8px; }
  tr { page-break-inside: avoid; }
</style></head><body>
<header><h1>AI Visibility Report: ${esc(businessName)}</h1>
<div class="meta">${esc(place)} · ${esc(website)} · Tested ${esc(date)}</div></header>

<div class="score"><div class="big">${r.score}<span style="font-size:14pt">/100</span></div>
<div><div class="headline">${esc(headline)}</div>
<div class="meta">More homeowners now ask AI assistants which roofer to hire before they search Google. This report shows who those assistants recommend in ${esc(city)}.</div></div></div>

<h2>What homeowners asked, and who the AI recommended</h2>
<table><thead><tr><th>Question</th><th class="c">You named?</th><th>Roofers the AI recommended</th></tr></thead><tbody>${questionRows}</tbody></table>

${competitorRows ? `<h2>Competitors AI recommends most in ${esc(city)}</h2>
<table><thead><tr><th>Roofer</th><th class="c">Named in</th></tr></thead><tbody>${competitorRows}</tbody></table>` : ""}

<h2>What to fix first</h2>
<ol>${r.fixes.map((f) => `<li>${esc(f)}</li>`).join("")}</ol>

<h2>Website check</h2>
${siteRows}

<h2>Questions?</h2>
<p>Happy to walk you through any of this. Just reply to the email this report came with.</p>

<div class="note">How this was tested: each question was put to ${esc(r.assistant || "an AI assistant with live web search")} on the date above, from the perspective of a homeowner in ${esc(place)}. AI answers vary from day to day and between assistants, so treat this as a snapshot.</div>
</body></html>`;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith("--")) out[argv[i].slice(2)] = argv[i + 1]?.startsWith("--") ? true : argv[++i];
  return out;
}

async function findChrome() {
  const candidates = [process.env.CHROME_PATH, "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome"].filter(Boolean);
  for (const c of candidates) if (await fs.access(c).then(() => true, () => false)) return c;
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let r;
  if (args.from) {
    r = JSON.parse(await fs.readFile(args.from, "utf8"));
  } else {
    if (scanMode() !== "live") {
      console.error("Reports need real AI answers: set AIV_ANTHROPIC_KEY (or pass --from <scan.json>).");
      process.exit(1);
    }
    r = await runScan(validateInput({ businessName: args.name, city: args.city, state: args.state, website: args.website }));
  }
  // "manual" = questions asked by hand in a free assistant (e.g. ChatGPT) and entered as JSON; no API cost.
  if (!["live", "manual"].includes(r.mode) || r.questionsAnswered === 0) {
    console.error("This scan has no real AI answers; not building a client report from it.");
    process.exit(1);
  }
  const dir = path.join("results", "reports");
  await fs.mkdir(dir, { recursive: true });
  const base = path.join(dir, `${slug(r.input.businessName)}-${r.scannedAt.slice(0, 10)}`);
  await fs.writeFile(`${base}.json`, JSON.stringify(r, null, 2));
  await fs.writeFile(`${base}.html`, renderReport(r));
  const chrome = await findChrome();
  if (chrome) {
    await promisify(execFile)(chrome, ["--headless", "--no-sandbox", "--disable-gpu", `--print-to-pdf=${path.resolve(base)}.pdf`,
      "--no-pdf-header-footer", `file://${path.resolve(base)}.html`], { timeout: 60_000 });
    console.log(`Wrote ${base}.pdf (and .html, .json). Score ${r.score}, named in ${r.mentionedIn}/${r.questionsAnswered}.`);
  } else {
    console.log(`Wrote ${base}.html (no Chrome found for PDF; open it in a browser and Print > Save as PDF).`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
