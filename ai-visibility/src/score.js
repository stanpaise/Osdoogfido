// Turns raw AI answers + site checks into a 0-100 score, a competitor list and a fix list.
import { findTarget, namesMatch } from "./match.js";

const AI_POINTS = 60;
const SITE_POINTS = 40;
const RANK_CREDIT = { 1: 1, 2: 0.85, 3: 0.7 };

export function scoreScan({ businessName, website, questions, siteChecks }) {
  const perQuestion = questions.map((q) => ({
    ...q,
    ...findTarget({ businessName, website, recommended: q.recommended, sources: q.sources }),
  }));

  const answered = perQuestion.filter((q) => !q.error);
  const aiCredit = answered.reduce((sum, q) => sum + (q.mentioned ? (RANK_CREDIT[q.rank] ?? 0.5) : 0), 0);
  const aiScore = answered.length ? Math.round((aiCredit / answered.length) * AI_POINTS) : 0;

  const totalWeight = siteChecks.reduce((s, c) => s + c.weight, 0);
  const passedWeight = siteChecks.filter((c) => c.passed).reduce((s, c) => s + c.weight, 0);
  const siteScore = totalWeight ? Math.round((passedWeight / totalWeight) * SITE_POINTS) : 0;

  // Competitors: how many answers named them, merging near-duplicate spellings.
  const competitors = [];
  for (const q of answered) {
    const seen = new Set();
    for (const name of q.recommended) {
      if (namesMatch(name, businessName)) continue;
      let entry = competitors.find((c) => namesMatch(c.name, name));
      if (!entry) competitors.push((entry = { name, count: 0 }));
      if (!seen.has(entry)) { entry.count++; seen.add(entry); }
    }
  }
  competitors.sort((a, b) => b.count - a.count);

  const mentionedIn = answered.filter((q) => q.mentioned).length;
  const fixes = siteChecks.filter((c) => !c.passed).sort((a, b) => b.weight - a.weight).map((c) => c.fix);
  if (mentionedIn < answered.length) {
    fixes.push(
      "Get listed where AI assistants look: complete your Google Business Profile, and make sure your name, address and phone match exactly on Yelp, BBB, Angi and Nextdoor.",
      "Earn mentions on local sites (news, chamber of commerce, sponsorships). AI answers favor businesses other websites talk about.",
    );
  }

  return {
    score: aiScore + siteScore,
    aiScore,
    aiMax: AI_POINTS,
    siteScore,
    siteMax: SITE_POINTS,
    mentionedIn,
    questionsAnswered: answered.length,
    questions: perQuestion,
    competitors: competitors.slice(0, 8),
    fixes,
  };
}
