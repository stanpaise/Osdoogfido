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
