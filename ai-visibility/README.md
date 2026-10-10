# Roofer AI Visibility Scan

Homeowners increasingly ask AI assistants "who's the best roofer in Dallas?" This tool shows a roofing company whether the AI recommends them, who it recommends instead, and what to fix.

**What a scan does**
1. Asks an AI assistant (Claude with live web search) 5 real homeowner questions for the company's city.
2. Extracts which roofing businesses each answer recommends, and where the company ranks.
3. Audits the company's homepage for what AI assistants rely on (business schema, city, services, reviews, trust signals, FAQ).
4. Returns a 0–100 score (60 pts AI mentions, 40 pts website readiness), the competitors named instead, and a prioritized fix list.

## Run it

```bash
cd ai-visibility
npm install
npm start            # http://localhost:3000
npm test
```

Without an API key it runs in **demo mode**: AI answers are sample data, but the website audit is real. For real scans:

```bash
export ANTHROPIC_API_KEY=sk-ant-...   # from console.anthropic.com
npm start
```

| Setting | Default | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | none | Enables live scans |
| `AIV_MODE` | `live` if key set, else `demo` | Force `demo` or `live` |
| `AIV_MODEL` | `claude-opus-5-5` | Model used for answers and extraction |
| `AIV_SCANS_PER_HOUR` | `5` | Scans allowed per visitor per hour (each live scan costs money) |
| `AIV_TRUST_PROXY` | off | Set to `1` behind Render/Fly/etc. so the limit is per visitor |
| `PORT` | `3000` | Server port |

## Cost per scan
Each scan makes 10 model calls at low effort (5 answers + 5 extractions) and up to 15 web searches. Expect roughly **$0.10–$0.40 per scan**. Measure the real number on your first live scans before you set pricing. Keep the rate limit on any public deployment.

## Known limits (be honest with customers about these)
- It measures **Claude's** answers with web search. ChatGPT, Gemini and Perplexity will differ. Adding them is the obvious next step and the strongest upsell ("all 4 assistants").
- AI answers vary run to run. A single scan is a snapshot; monthly tracking is the paid product.
- The website audit reads the homepage only.
- Rate limiting is in memory; it resets on restart and doesn't share across multiple servers.

## Code map
- `src/prompts.js`: the homeowner questions
- `src/ai-check.js`: live AI answers and business extraction, plus demo data
- `src/site-audit.js`: safe homepage fetch (blocks private/internal addresses) and roofing checks
- `src/match.js`: business-name matching
- `src/score.js`: score, competitors, fix list
- `src/server.js`: HTTP server and rate limit; `public/index.html` is the whole UI

See [VALIDATION.md](VALIDATION.md) for how to prove people will pay before building more.
