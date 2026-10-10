import { test } from "node:test";
import assert from "node:assert/strict";
import { namesMatch, findTarget } from "../src/match.js";
import { auditHtml, assertPublicUrl } from "../src/site-audit.js";
import { scoreScan } from "../src/score.js";
import { buildPrompts } from "../src/prompts.js";
import { runScan, validateInput } from "../src/scan.js";
import { allowScan } from "../src/server.js";

test("names match across legal suffixes and punctuation", () => {
  assert.ok(namesMatch("Smith Roofing LLC", "smith roofing"));
  assert.ok(namesMatch("Smith Roofing & Exteriors", "Smith Roofing"));
  assert.ok(namesMatch("O'Brien Roofing Co.", "OBrien Roofing"));
  assert.ok(!namesMatch("Roofing", "Smith Roofing"), "generic word must not match");
  assert.ok(!namesMatch("Summit Roofing", "Smith Roofing"));
});

test("findTarget ranks the business and counts a citation of its own site", () => {
  const r = findTarget({ businessName: "Smith Roofing", website: "smithroofing.com", recommended: ["A Roof", "Smith Roofing Inc", "B"] });
  assert.deepEqual(r, { mentioned: true, rank: 2, cited: false });
  const c = findTarget({ businessName: "Smith Roofing", website: "https://www.smithroofing.com", recommended: ["A"], sources: ["https://smithroofing.com/reviews"] });
  assert.equal(c.mentioned, true);
  assert.equal(c.rank, null);
});

const GOOD_HTML = `<html><head><title>Smith Roofing | Roofing Contractor in Dallas</title>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"RoofingContractor","name":"Smith Roofing"}</script></head>
<body><h1>Roof replacement in Dallas</h1><a href="tel:2145550100">(214) 555-0100</a>
<p>Roof repair, storm and hail damage, free inspection.</p><p>Licensed and insured. 4.9 stars from 300 reviews.</p>
<h2>Frequently asked questions</h2></body></html>`;

test("site audit passes a well-built roofing homepage", () => {
  const checks = auditHtml(GOOD_HTML, { city: "Dallas", businessName: "Smith Roofing" });
  assert.deepEqual(checks.filter((c) => !c.passed).map((c) => c.id), []);
});

test("site audit flags a bare homepage and fills in city in fixes", () => {
  const checks = auditHtml("<html><title>Home</title><body>Welcome</body></html>", { city: "Dallas", businessName: "Smith Roofing" });
  assert.ok(checks.every((c) => !c.passed));
  assert.match(checks.find((c) => c.id === "faq").fix, /Dallas/);
});

test("scanner refuses private and non-web addresses", async () => {
  await assert.rejects(assertPublicUrl("http://127.0.0.1/admin"), /public website/);
  await assert.rejects(assertPublicUrl("http://169.254.169.254/latest"), /public website/);
  await assert.rejects(assertPublicUrl("ftp://example.com"), /http and https/);
  await assert.rejects(assertPublicUrl("http://example.com:8080"), /standard web ports/);
});

test("score combines AI mentions and site readiness, and ranks competitors", () => {
  const questions = [
    { question: "q1", recommended: ["Smith Roofing", "Summit Peak Roofing"], sources: [] },
    { question: "q2", recommended: ["Summit Peak Roofing LLC", "BlueSky Roof Pros"], sources: [] },
    { question: "q3", recommended: [], sources: [], error: "busy" },
  ];
  const siteChecks = [{ weight: 5, passed: true, fix: "a" }, { weight: 5, passed: false, fix: "b" }];
  const r = scoreScan({ businessName: "Smith Roofing", website: "smithroofing.com", questions, siteChecks });
  assert.equal(r.questionsAnswered, 2);
  assert.equal(r.mentionedIn, 1);
  assert.equal(r.aiScore, 30); // rank 1 in one of two answered questions -> half of 60
  assert.equal(r.siteScore, 20);
  assert.equal(r.score, 50);
  assert.deepEqual(r.competitors[0], { name: "Summit Peak Roofing", count: 2 });
  assert.equal(r.fixes[0], "b");
});

test("prompts include city and state", () => {
  const p = buildPrompts("Tulsa", "OK");
  assert.equal(p.length, 5);
  assert.ok(p.every((q) => q.includes("Tulsa, OK")));
});

test("input validation requires name, city and website", () => {
  assert.throws(() => validateInput({ businessName: "X" }), /city, website/);
  assert.equal(validateInput({ businessName: " X ", city: "Y", website: "z.com" }).businessName, "X");
});

test("demo scan runs end to end without an API key", async () => {
  const r = await runScan({ businessName: "Smith Roofing", city: "Dallas", state: "TX", website: "http://127.0.0.1" }, { mode: "demo" });
  assert.equal(r.mode, "demo");
  assert.equal(r.mentionedIn, 2);
  assert.equal(r.site.ok, false);
  assert.ok(r.competitors.length >= 3);
  assert.ok(r.score >= 0 && r.score <= 100);
});

test("rate limit caps scans per visitor per hour", () => {
  const t = 1_000_000;
  for (let i = 0; i < 5; i++) assert.ok(allowScan("1.2.3.4", t + i));
  assert.equal(allowScan("1.2.3.4", t + 10), false);
  assert.ok(allowScan("5.6.7.8", t + 10));
  assert.ok(allowScan("1.2.3.4", t + 3_600_100));
});
