// Scan a list of roofers and write a summary plus a ready-to-send cold email for each.
//   node scripts/batch.js prospects.csv            # demo mode: real website audit only, no emails
//   node scripts/batch.js prospects.csv --confirm  # live mode (needs ANTHROPIC_API_KEY): spends API credit
import fs from "node:fs/promises";
import path from "node:path";
import { runScan, scanMode, validateInput } from "../src/scan.js";

const COST_PER_SCAN_HIGH = 0.4;

export function parseCsv(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const cells = [];
    let cur = "", quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') quoted = false;
        else cur += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ",") { cells.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    cells.push(cur.trim());
    rows.push(cells);
  }
  const [header, ...body] = rows;
  return body.map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""])));
}

const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function draftEmail(r) {
  const { businessName, city } = r.input;
  const top = r.competitors[0];
  const asked = r.questionsAnswered;
  const opener = r.mentionedIn === 0
    ? `I asked an AI assistant ${asked} questions homeowners ask about roofers in ${city}. It recommended ${top ? `${top.name} in ${top.count} of ${asked} answers` : "other roofers"}. ${businessName} wasn't mentioned in any of them.`
    : `I asked an AI assistant ${asked} questions homeowners ask about roofers in ${city}. ${businessName} came up in ${r.mentionedIn} of ${asked}${top ? `, while ${top.name} came up in ${top.count}` : ""}.`;
  const fixes = r.fixes.slice(0, 3).map((f, i) => `${i + 1}. ${f}`).join("\n");
  return `Subject: ${businessName} vs ${top ? top.name : "competitors"} in AI search\n\n` +
    `Hi,\n\n${opener}\n\nMore homeowners now ask ChatGPT-style assistants who to hire before they ever open Google. ` +
    `Your AI visibility score is ${r.score}/100. The three fixes that would move it most:\n\n${fixes}\n\n` +
    `I can re-run this every month and alert you when a competitor overtakes you. Want the full report?\n`;
}

async function main() {
  const [file, ...flags] = process.argv.slice(2);
  if (!file) {
    console.error("Usage: node scripts/batch.js prospects.csv [--confirm]");
    process.exit(1);
  }
  const mode = scanMode();
  const rows = parseCsv(await fs.readFile(file, "utf8"));
  const ready = rows.filter((r) => r.website);
  const skipped = rows.filter((r) => !r.website);

  if (mode === "live" && !flags.includes("--confirm")) {
    console.log(`Live mode: ${ready.length} scans, up to ~$${(ready.length * COST_PER_SCAN_HIGH).toFixed(2)} in API usage.`);
    console.log("Re-run with --confirm to proceed.");
    process.exit(0);
  }

  const outDir = path.join("results", new Date().toISOString().slice(0, 10));
  await fs.mkdir(outDir, { recursive: true });
  const summary = [["business", "city", "website", "mode", "score", "ai_mentions", "site_score", "top_competitor", "site_error"]];
  const emails = [];

  for (const [i, row] of ready.entries()) {
    let input;
    try {
      input = validateInput(row);
    } catch (err) {
      console.log(`- skip ${row.businessName || "(no name)"}: ${err.message}`);
      continue;
    }
    process.stdout.write(`[${i + 1}/${ready.length}] ${input.businessName} ... `);
    const r = await runScan(input, { mode });
    await fs.writeFile(path.join(outDir, `${slug(input.businessName)}.json`), JSON.stringify(r, null, 2));
    const top = r.competitors[0];
    summary.push([input.businessName, input.city, input.website, r.mode, r.score,
      r.mode === "live" ? `${r.mentionedIn}/${r.questionsAnswered}` : "n/a (demo)",
      `${r.siteScore}/${r.siteMax}`, r.mode === "live" && top ? `${top.name} (${top.count})` : "", r.site.error ?? ""]);
    // Never send outreach built on demo answers: the competitor claims would be fake.
    if (r.mode === "live") emails.push(`## ${input.businessName} (${input.website})\n\n${draftEmail(r)}`);
    console.log(r.mode === "live" ? `score ${r.score}, mentioned ${r.mentionedIn}/${r.questionsAnswered}` : `site ${r.siteScore}/${r.siteMax}${r.site.error ? ` (${r.site.error})` : ""}`);
  }

  await fs.writeFile(path.join(outDir, "summary.csv"), summary.map((r) => r.map(csvCell).join(",")).join("\n") + "\n");
  if (emails.length) await fs.writeFile(path.join(outDir, "outreach.md"), `# Outreach drafts\n\nReview each before sending.\n\n${emails.join("\n---\n\n")}`);
  console.log(`\nWrote ${outDir}/summary.csv${emails.length ? " and outreach.md" : ""}.`);
  if (mode !== "live") console.log("Demo mode: website audits are real; AI results and emails need ANTHROPIC_API_KEY.");
  if (skipped.length) console.log(`Skipped ${skipped.length} with no website: ${skipped.map((r) => r.businessName).join(", ")}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) main();
