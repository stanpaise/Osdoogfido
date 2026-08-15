# Faceless YouTube Channel — Complete Build Plan

This expands the "6-step" article into something you can actually execute, with the parts a growth-hack article always skips filled in, plus a day-by-day plan to have a video live within 7 days.

**One honest caveat first:** the $41k/mo and $9,400 figures in the source article are one person's self-reported, unverified numbers. RPMs, watch time, and payout timing vary hugely by niche, season, and channel age. Treat the framework as sound and the dollar figures as marketing, not a forecast.

---

## 1. What the article leaves out

| Gap | Why it matters | Fix (below) |
|---|---|---|
| **AdSense isn't instant** | You cannot earn AdSense revenue on video 1. YouTube Partner Program requires **1,000 subscribers + 4,000 public watch hours in the trailing 12 months**, OR **10M valid Shorts views in 90 days**, plus an AdSense account in good standing. | Step 8 below |
| **No channel setup step** | The article jumps straight to niche research with no channel, branding, or account setup | Step 0 below |
| **Thumbnails are mentioned, never built** | Canva is in the cost list but never used in the steps | Step 5 below |
| **Footage licensing** | Pexels/Pixabay are free for commercial use, but you still can't use clips with recognizable logos, trademarks, or identifiable people in ways that imply endorsement (a real risk in finance content) | Step 4 below |
| **AI-content disclosure** | YouTube requires creators to self-disclose "altered or synthetic" content that could be mistaken for real people/events (a toggle in the upload flow since 2024). A synthetic *voice* narrating your own written script over stock footage generally doesn't trigger this, but know the toggle exists and check it honestly per video | Step 6 below |
| **No posting cadence math** | "Post 20-30 before judging" is right, but the article never says how often | 7-Day Plan + Weeks 2-12 below |
| **No feedback loop** | Nothing on reading YouTube Studio analytics to fix underperforming videos | Step 9 below |
| **No affiliate/legal specifics** | "Monetization beyond AdSense" is listed as a Claude output field but never filled in | Step 8 below |
| **No tax/business note** | Once money moves, you owe taxes on it | Step 10 below |

---

## 2. The complete system

### Step 0 — Channel setup (Day 1, ~30 min)
1. Create a dedicated Google account (don't run this off your personal one) → make it a **Brand Account** in YouTube settings, so you can add collaborators/transfer ownership later without handing over your personal login.
2. Pick a channel name: short, typeable, matches an available handle (@handle) on YouTube — check it's not trademarked in your niche.
3. Set the channel to the right category and add a keyword-rich channel description (what you cover, upload schedule, one CTA).

### Step 1 — Niche by RPM (Day 1)
Use the article's prompt as-is. Output you're looking for: an RPM estimate, competition level, a repeatability score, and **52 titles that don't repeat**. If Claude can't fill 52 titles without stretching, the niche is too narrow — pick a different one before you write a single script.

### Step 2 — Script (Day 3)
Use the article's prompt as-is. The one addition: after Claude drafts it, read it out loud once yourself before sending it to voice. If *you* stumble on a sentence, the AI voice will sound worse on it — fix those lines by hand.

### Step 3 — Voice (Day 4)
ElevenLabs, one voice locked in permanently. Speed 0.9x for authority niches (finance/health), closer to 1.0x for faster-paced niches (tech/entertainment). Insert `[pause]` markers at section breaks. Budget 15-20 min per video for generation + a listen-through.

### Step 4 — Assembly (Days 4-5)
CapCut, cut every 3-5 seconds. B-roll from Pexels/Pixabay.
- **Licensing note:** both are free for commercial use with no attribution required on their standard licenses, but avoid clips showing recognizable brand logos, trademarks, or people in a context that implies they endorse your content — that's a copyright/publicity-rights risk even under a "free" license.
- Turn on CapCut auto-captions (the article's number holds up: captions reliably lift watch time since a large share of mobile viewers watch muted).

### Step 5 — Thumbnails (Day 6) — the missing step
1. Take the 5 thumbnail concepts Claude generated back in Step 2's prompt output.
2. Build in Canva: 3-5 words max, one focal number or face-free graphic, high contrast, legible at phone size (test by shrinking it to 120px wide).
3. Make two versions of your top concept — YouTube's native **thumbnail A/B testing** (in Studio, under Content → Details) will show both to real traffic and pick a winner automatically after enough impressions. Turn this on for every video once you're monetization-eligible.

### Step 6 — Metadata (Day 6)
Use the article's SEO prompt as-is. Before publishing, check the **"Altered or synthetic content" disclosure toggle** in the upload flow honestly — for a script-written, AI-voiced, stock-footage video this is usually "no" unless you're depicting a real, identifiable person or fabricated real event, but don't skip reading it.

### Step 7 — Publish & cadence (Day 7 onward)
Same day, same time, every week — the article is right about this. See the Weeks 2-12 section for the actual cadence math.

### Step 8 — Monetization path (missing from the article)
1. **AdSense eligibility:** 1,000 subscribers + 4,000 watch hours in 12 months (long-form), or 10M Shorts views in 90 days. Apply via YouTube Studio → Monetization once eligible; approval review typically takes ~1 month.
2. **While you wait for AdSense**, monetize other ways from day one:
   - Affiliate links in the description (budgeting apps, comparison sites, course platforms relevant to your niche) — add the FTC-required disclosure ("contains affiliate links") in the description and verbally if you push a specific offer.
   - Your own low-cost digital product (template, spreadsheet, mini-course) once you have an audience worth pitching to.
3. **Don't buy subscribers/views** — it violates YouTube's terms and can block monetization approval outright.

### Step 9 — The feedback loop (ongoing, missing from the article)
After each video has ~48 hours of data, open YouTube Studio → Analytics → Audience Retention graph. Paste the shape of the curve back into Claude:
```
Here's my retention data for "[title]": [describe drop-off points, e.g.
"lost 20% in first 15 seconds, another cliff at 3:40"].
Here's the script section that corresponds to each drop point: [paste].
Diagnose why viewers are leaving at each point and rewrite that section
to fix it. Also tell me which of my last 5 titles/thumbnails most likely
caused the biggest retention or CTR problem.
```
This closes the loop the article never mentions: script quality isn't guessed once, it's corrected video over video.

### Step 10 — Money housekeeping (missing from the article)
Once AdSense or affiliate income starts landing: keep a simple log of income and subscription costs (Claude, ElevenLabs, Canva Pro if you upgrade), set aside roughly 25-30% for taxes if you're in the US, and talk to a real accountant before you're doing meaningful volume — this plan isn't tax advice.

---

## 3. Tools & accounts checklist

| Tool | Cost | Used for |
|---|---|---|
| Claude (Pro) | $20/mo | Niche research, scripts, metadata, retention diagnosis |
| ElevenLabs | $22/mo | Voiceover |
| CapCut | Free | Editing, auto-captions |
| Canva | Free (Pro optional) | Thumbnails, channel art |
| Pexels / Pixabay | Free | B-roll |
| Google / YouTube Brand Account | Free | Channel |
| **Total** | **~$42-57/mo** | |

---

## 4. The 7-day launch plan

| Day | Task |
|---|---|
| **1** | Create Brand Account + channel name/handle. Run the niche-research prompt, pick your niche, get your 52-title list. |
| **2** | Channel branding: banner + avatar in Canva, channel description, links. Pick your first 4 titles from the calendar to script this week. |
| **3** | Write scripts for videos 1 and 2 with the scripting prompt. Read both aloud, fix awkward lines. |
| **4** | Generate voiceovers for videos 1 and 2 in ElevenLabs (lock your permanent voice + speed today). Pull B-roll clips for both from Pexels/Pixabay. |
| **5** | Assemble video 1 in CapCut (3-5s cuts, auto-captions on). Start assembling video 2. |
| **6** | Finish video 2 edit. Build thumbnails for both (2 variants each) in Canva. Run the SEO/metadata prompt for both videos. |
| **7** | Publish video 1. Schedule video 2 for your fixed weekly slot next week. Block your recurring posting day/time on a calendar for the next 8 weeks. |

You'll have **1 video live and 1 scheduled** by end of day 7 — that's the realistic version of "producing within 7 days." A finance/education channel with zero prior videos won't get meaningful AdSense revenue in week one regardless of execution quality; the 7-day win is a working, repeatable pipeline, not a paycheck.

---

## 5. Weeks 2-12: getting to the 20-30 video mark

At 2 videos/week (roughly 4-6 hours of your time per video once the pipeline is warm), you hit 24 videos in **week 12**. That matches the "didn't start climbing until video 24" line in the source article. If 2/week is too aggressive alongside a day job, 1/week gets you there in **six months** — still fine, just budget for it going in rather than being surprised at video 8 when nothing has moved yet.

Each week: publish on schedule → run the Step 9 retention-diagnosis prompt on last week's video → apply one concrete fix to the next script. Don't judge the niche or the channel before video 20; do judge and fix individual scripts every single week.
