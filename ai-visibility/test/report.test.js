import { test } from "node:test";
import assert from "node:assert/strict";
import { renderReport } from "../scripts/report.js";

const base = {
  mode: "live", scannedAt: "2026-11-25T05:12:00.000Z", score: 32, questionsAnswered: 2, mentionedIn: 0, siteReadable: true,
  input: { businessName: "Franco <b>Roofing</b>", city: "Oklahoma City", state: "OK", website: "franco-roofing.com" },
  questions: [
    { question: "Who is best?", recommended: ["Yates Roofing", "<script>x</script>"], mentioned: false },
    { question: "Storm damage?", recommended: [], error: "AI service error (400): bad" },
  ],
  competitors: [{ name: "Yates Roofing", count: 2 }],
  fixes: ["Add schema"],
  site: { checks: [{ label: "Phone number visible", passed: true }] },
};

test("report escapes names and AI text, and states the headline", () => {
  const html = renderReport(base);
  assert.doesNotMatch(html, /<script>x<\/script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Franco &lt;b&gt;Roofing&lt;\/b&gt;/);
  assert.match(html, /didn&#39;t recommend .* in any of 2 homeowner questions/);
  assert.match(html, /Not answered/);
  assert.match(html, /Yates Roofing<\/td><td class="c">2 of 2/);
});

test("report explains a blocked website instead of showing failed checks", () => {
  const html = renderReport({ ...base, siteReadable: false });
  assert.match(html, /blocked our automated check/);
  assert.doesNotMatch(html, /Phone number visible/);
});
