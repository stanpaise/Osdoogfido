# PayoffWins — Orchestrator Build Package

**Idea:** Mobile-first web app. Users manually track debts and get a shareable, celebratory "win card" when they hit a milestone. No bank connections, no money movement — pure manual tracker.

---

## 1. Rapid Prototyper

**MVP:**
- Manual debt entry: name, type (credit card / loan / student loan / medical / other), current balance, original balance (optional, drives % progress), interest rate (optional), minimum payment (optional).
- Manual balance updates: user logs a payment (reduces balance) or directly edits current balance.
- Dashboard: total debt remaining, total paid off since start, per-debt progress bars.
- Milestones: auto-detected — 25/50/75/100% paid off per debt, "first $500 paid off," "debt-free" on any single debt.
- Win Card: auto-generated on milestone trigger. Viewable in-app, downloadable as PNG, shareable via native mobile share sheet.
- Auth: email/password or magic link (required — this is personal financial data, per-user).
- Single currency, single user. No household/shared accounts.

**Explicitly OUT of scope for v1:**
- Bank connections (Plaid, etc.) — never, per the idea's core constraint.
- Multi-currency support.
- Budgeting / spending tracking beyond debt.
- Snowball/avalanche payoff plan calculator or recommendations.
- Social feed, following other users, public leaderboards.
- Native iOS/Android apps.
- Push notifications / reminders.
- Household/shared debt tracking.
- CSV import/export.

**"Working" means:** a user signs up, adds 1-5 debts, logs a payment, sees a milestone fire correctly, and gets a win card they can download/share — in under 3 minutes on a phone browser.

**Build plan:**
- Week 1: auth + data model + debt CRUD + dashboard.
- Week 2: payment logging + progress calc + milestone detection.
- Week 3: win card generation (design + render) + download/share.
- Week 4: mobile polish, empty states, QA, soft launch.

**Dependencies flagged:** needs Backend Architect's data model, Content Creator's card copy/visual language, and an AI Engineer decision on whether card copy is templated or generated.

---

## 2. Backend Architect

**Data model:**
- `User`: id, email, password_hash, created_at.
- `Debt`: id, user_id, name, type (enum), original_balance, current_balance, interest_rate (nullable), minimum_payment (nullable), created_at, archived_at (nullable).
- `Payment`: id, debt_id, amount, previous_balance, new_balance, note (nullable), created_at — append-only ledger. Drives progress-over-time and milestone detection.
- `Milestone`: id, user_id, debt_id (nullable), type (enum: pct_25, pct_50, pct_75, paid_off, custom), value, achieved_at, win_card_id (nullable).
- `WinCard`: id, milestone_id, image_url, template_version, created_at.

**APIs:**
- `POST /auth/signup`, `/auth/login`, `/auth/magic-link`
- `GET/POST /debts`, `PATCH/DELETE /debts/:id`
- `POST /debts/:id/payments` — writes ledger row, updates balance, triggers milestone check synchronously
- `GET /debts/:id/payments` — history for progress chart
- `GET /milestones` — list with win card refs
- `GET /milestones/:id/card` — rendered image or signed URL
- `GET /dashboard` — aggregate totals + next milestone per debt

**Infra:** one Postgres DB, one backend service. No microservices, no queues — volume doesn't justify it. Milestone check runs inline on payment write (cheap comparison against thresholds). Win card image rendered server-side on trigger, cached to object storage, URL stored on `WinCard`.

**Recommendation:** Supabase (Postgres + Auth + Storage bundled) to minimize infra build time against the 4-week MVP window. This is a judgment call, override if the team has a different default stack.

---

## 3. AI Engineer

**Where AI could earn its place:** the win card's celebratory copy line (e.g., "You just crushed 50% of your Chase card!"). That's it — everything else (balances, %s, milestone detection) must stay deterministic; financial correctness can't be probabilistic.

**If used:** small LLM call (e.g., Claude Haiku) at milestone-trigger time — inputs: milestone type, debt name, %/amount; output: 1-2 lines of copy, cached permanently on the `WinCard` row (never regenerated). Cost is trivial — sub-cent per call, and milestones fire at most a few times a month per user.

**Recommendation for v1: no AI.** Ship 10-15 hand-written copy variants per milestone type, randomly selected. Zero cost, zero latency, zero failure mode, and the win card must render even if an LLM call fails — don't put a network-dependent AI call in the critical path of the app's one core delight moment. Revisit AI-generated copy in v1.1+ only if users report the cards feel repetitive.

---

## 4. Content Creator

**Name:** keep PayoffWins — descriptive, already the brief's given name.

**Positioning:** "The debt tracker that celebrates you, not just your balance."

**Landing page:**
- **Headline:** "Watch your debt disappear — and celebrate every step."
- **Subhead:** "PayoffWins is a private, manual debt tracker that turns every payment into a shareable win. No bank logins. No fees. Just progress."
- **Benefit 1 — "100% manual, 100% private":** you type in your balances, nothing connects to your bank, no one sees your numbers but you.
- **Benefit 2 — "Every milestone gets a win card":** hit 25%, 50%, debt-free — get a card worth posting.
- **Benefit 3 — "See the whole picture":** all your debts, one dashboard, real progress over time.
- **CTA:** "Start tracking free" *(pricing model flagged as unresolved — see Reality Checker)*.

**First-week launch content plan:**
- Day 1: landing page/signup live.
- Day 2-3: founder "I built this" post in debt-payoff communities (r/personalfinance, r/debtfree style) — genuine, not promotional.
- Day 4: short demo clip of the win-card moment on X/TikTok.
- Day 5-7: 2-3 short posts showing mocked win cards to seed the sharing mechanic before real user cards exist.

---

## 5. Growth Hacker

**Funnel:** community post → landing page → signup → add first debt → log first payment → milestone fires → win card → **user shares it**. That last step is the product's only real distribution mechanic — it depends entirely on the card being good enough that someone wants to post it.

**Highest-leverage channel for first 100 users:** organic posts in existing debt-payoff communities (r/personalfinance, r/debtfree, relevant Facebook groups, TikTok #debtfreejourney). These communities already manually build spreadsheets/graphics to celebrate payoff milestones — PayoffWins is a direct upgrade to a behavior that already exists. Paid acquisition isn't worth it pre-product-market-fit for a free tracker.

**Week-one experiment:** post the founder story in 2-3 relevant subreddits with a real win-card screenshot. Measure two things: signup rate from that traffic, and — the one that matters — whether any real user shares a card externally within 7 days unprompted. If nobody shares, the core viral mechanic doesn't work, and that's the signal to fix before spending on any channel.

**Dependency flagged:** pricing is undecided (see Reality Checker) — funnel math and CTA can't fully lock until that's resolved. Defaulting to fully free for v1 since monetization isn't in this brief.

---

## 6. Whimsy Injector

Debt payoff is inherently emotional — stress on the way in, real pride on a milestone. Whimsy earns its place at that one moment; the rest of the app should stay calm.

- Win card trigger: one-time confetti animation + haptic/sound on mobile — not looping, not overdone.
- Milestone copy should read like a person: *"You just paid off $500. That's real money, gone for good."* — not *"Milestone achieved: 25%."*
- New-debt empty state: *"Every debt starts somewhere. Log your first payment when you're ready."* instead of a blank bar.
- The "debt-free" (100%) card should feel visually distinct from 25/50/75% cards — not the same template with a bigger number.
- Everywhere else — the daily dashboard — stays plain and clear. This is someone's financial stress; don't gamify the numbers view. Whimsy belongs at the milestone moment only.

---

## 7. Reality Checker — **NEEDS WORK**

1. **Milestone edit/correction rule is missing.** If a user corrects a mistaken balance entry, does a previously-fired (and possibly already shared) milestone get retracted? Must be an explicit written rule before build: **milestones, once fired, are permanent and never retracted**, even if a later correction changes the underlying numbers.
2. **The "total debt under $X" milestone type has no threshold logic** — either cut it from v1 (recommended) or fully spec it. As written it's a name with no mechanism.
3. **Win card rendering path is undecided**, not just unbuilt. "node-canvas or an HTML-to-image service" are two different technical and cost paths — pick one before Week 3 starts, not during it.
4. **The privacy claim in the landing copy is a technical commitment, not just marketing.** "No one sees your numbers but you" requires encryption at rest on balance/amount fields and no analytics tooling logging raw dollar values. Not yet verified as an engineering task — currently just a sentence on a landing page.
5. **The core growth loop is unproven, not merely untested.** The entire acquisition plan depends on people voluntarily sharing a win card — this hasn't been checked even informally. This is the single biggest risk in the whole project.
6. **Pricing is undecided** and was defaulted around rather than resolved by the Growth Hacker. Needs an explicit decision — even "free for v1, monetize later" is fine, but it must be stated, not assumed silently.
7. **Milestone copy variants (10-15 per type) have no owner.** Content Creator needs to actually write these; it's not currently a task in the build plan.

**What must be true before any of this gets built:**
- Milestone permanence rule is written and agreed.
- Win card render path is chosen (library vs. service).
- 5-10 real conversations with people in debt-payoff communities (or a mockup shown to them) confirm they'd plausibly share a card like this — cheapest possible validation, do it before Week 3 engineering starts.
- Pricing model is stated explicitly (recommend: free v1, no monetization, revisit post-launch).
- Encryption-at-rest / no-raw-dollar-logging is a scheduled Week 1 engineering task, not an assumption.

Once these five are addressed → **READY TO BUILD**. Until then: **NEEDS WORK.**

---

## BUILD PACKAGE (Synthesis)

**What we're building:** A mobile-first web app where users manually add and update their debts, see a simple dashboard of total progress, and get an automatically generated, shareable "win card" every time they hit a payoff milestone (25/50/75/100% per debt, or a fixed dollar milestone). No bank integration, no money movement, ever — this is a personal tracker whose only mechanic beyond bookkeeping is celebration.

**Structure:** Postgres-backed service (Supabase recommended) with four core tables — `Debt`, `Payment` (append-only ledger), `Milestone`, `WinCard` — plus standard auth. Milestone checks run synchronously on each payment write; win card images render server-side and are cached to object storage. No microservices, no queues, no premature scaling — the MVP doesn't need it.

**AI:** None needed for v1. Milestone detection and all financial math stay fully deterministic. The one plausible AI use — LLM-generated win card copy — is deferred in favor of 10-15 hand-written templated variants, because a network-dependent AI call has no place in the critical path of the app's single delight moment. Revisit only if users report repetitive cards.

**Market:** Name stays **PayoffWins**. Positioning: "The debt tracker that celebrates you, not just your balance." Landing page: headline "Watch your debt disappear — and celebrate every step," three benefit blocks (private/manual, win cards, whole-picture dashboard), CTA "Start tracking free."

**Acquisition:** Organic posts in existing debt-payoff communities (r/personalfinance, r/debtfree, TikTok #debtfreejourney) — these communities already do this manually with spreadsheets, so PayoffWins is a direct upgrade to an existing behavior. Week-one experiment: post the founder story with a real win-card screenshot in 2-3 subreddits and track whether any real user shares a card unprompted within 7 days — that's the true test of whether the growth loop exists at all.

**Personality:** Not minimal — this product runs on an emotional moment (debt relief/pride), so whimsy is functional, not decorative. Concentrate it at the milestone/win-card trigger (confetti, human-voiced copy, a visually distinct debt-free card); keep the daily dashboard calm and plain.

**Reality Checker verdict: NEEDS WORK.** Blocking items before build starts:
1. Write the milestone-permanence rule (fired milestones never retract).
2. Decide the win card render path (canvas library vs. rendering service).
3. Validate the share loop with 5-10 real people in debt-payoff communities before investing in card-rendering engineering.
4. State the pricing model explicitly (recommended: free v1, no monetization yet).
5. Schedule encryption-at-rest / no-raw-dollar-logging as an actual Week 1 engineering task.

---

## Build Order — first 3 things, in sequence

1. **Validate the share loop.** Talk to 5-10 people in debt-payoff communities, show them a mocked win card, ask if they'd post it. Cheapest possible check on the project's single biggest risk — do this before writing product code.
2. **Stand up the backend skeleton.** `User`/`Debt`/`Payment`/`Milestone` tables on Supabase, encryption at rest on balance fields, and the milestone-permanence rule encoded directly into the trigger logic. Can run in parallel with #1.
3. **Pick and build the win card render path**, and ship the 25/50/75/100% templates with templated (non-AI) copy. This unblocks the one mechanic every other part of the plan — content, growth, personality — depends on.
