import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, draftEmail } from "../scripts/batch.js";

test("parseCsv handles comments, quotes and blank cells", () => {
  const rows = parseCsv('# note\nbusinessName,city,website\n"Smith, Jones Roofing",Dallas,\nA Roof,Tulsa,a.com\n');
  assert.deepEqual(rows, [
    { businessName: "Smith, Jones Roofing", city: "Dallas", website: "" },
    { businessName: "A Roof", city: "Tulsa", website: "a.com" },
  ]);
});

test("outreach email leads with the competitor and lists top fixes", () => {
  const email = draftEmail({
    input: { businessName: "Smith Roofing", city: "Dallas" },
    competitors: [{ name: "Summit Peak Roofing", count: 4 }],
    questionsAnswered: 5, mentionedIn: 0, score: 22,
    fixes: ["fix one", "fix two", "fix three", "fix four"],
  });
  assert.match(email, /Summit Peak Roofing in 4 of 5 answers/);
  assert.match(email, /wasn't mentioned in any/);
  assert.match(email, /3\. fix three/);
  assert.doesNotMatch(email, /fix four/);
});

test("leader email says so, and counts fixes correctly", () => {
  const email = draftEmail({
    input: { businessName: "New View Roofing", city: "Dallas" },
    competitors: [{ name: "Dwell Roofing & Exteriors", count: 3 }],
    questionsAnswered: 5, mentionedIn: 4, score: 84,
    fixes: ["fix one", "fix two"],
  });
  assert.match(email, /Good news: New View Roofing came up in 4 of 5/);
  assert.match(email, /right behind you at 3 of 5/);
  assert.match(email, /The two fixes/);
  assert.doesNotMatch(email, /three fixes/);
});

test("tie is called a tie", () => {
  const email = draftEmail({
    input: { businessName: "Statewide Roofing", city: "Oklahoma City" },
    competitors: [{ name: "All American Roofing", count: 4 }],
    questionsAnswered: 5, mentionedIn: 4, score: 63, fixes: [],
  });
  assert.match(email, /tied with you at 4 of 5/);
  assert.doesNotMatch(email, /right behind/);
});
