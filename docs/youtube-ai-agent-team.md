# Free YouTube AI Agent Team — Runs Your Channel 24/7

Source project: **[darkzOGx/youtube-automation-agent](https://github.com/darkzOGx/youtube-automation-agent)** (MIT license, 1,775+ stars). Vendored into this repo at [`youtube-automation-agent/`](../youtube-automation-agent) so it can be run, extended, and deployed from here.

## What it is

An open-source Node.js app that runs a YouTube channel end to end: strategy, scripts, thumbnails, SEO, video production, publishing, and a feedback loop that learns from your analytics. You run it on your own machine, connect your YouTube channel once, and a pipeline of AI agents handles everything from picking topics to publishing videos on a daily schedule.

The feedback loop is the interesting part: an analytics agent tracks how every video performs and feeds the insights back into the strategy agent, so it improves on its own over time.

**What you get:** a seven-agent pipeline that plans, writes, produces, optimizes, publishes, and learns — with a live dashboard at `localhost:3456`.

## Honest caveats

- You need at least one AI provider key. The free path is a Gemini key (free tier) — with it the full pipeline runs, including image generation and voice narration. With no key at all, agents fall back to built-in templates and you get gradient slides with silent video.
- The YouTube connection takes a one-time Google Cloud setup (create a project, enable the YouTube Data API v3, make an OAuth desktop client). It's free, and the built-in walkthrough opens the right pages and guides you click by click — but it's still the fiddliest part.
- YouTube Data API has daily quota limits — heavy posting frequency can hit them.
- Fully automated uploads are on you to keep inside YouTube's Terms of Service and Community Guidelines. Default upload privacy is `private`, so nothing goes public until you opt in.
- Premium voices (ElevenLabs) and AI video generation (Replicate / Wan 2.7) are optional paid extras. The free Gemini path covers narration and images without them.
- MIT license — use it, modify it, build on it, no strings.

## Quick start (~10 min)

Requires Node.js 18+ and a Google account. FFmpeg is bundled automatically on `npm install`.

```bash
cd youtube-automation-agent
npm install
npm run walkthrough   # guided first-time setup: explains everything, tests your keys live
npm start
```

Dashboard runs at `http://localhost:3456`.

`npm run walkthrough` is the easy path: it explains every choice in plain English, opens the exact page where you get each key, live-tests keys the moment you paste them, and walks you click-by-click through the Google Cloud setup for the YouTube connection. Every step is skippable and progress is saved.

**The YouTube connection (required, free):**
1. Create a project in Google Cloud Console.
2. Enable **YouTube Data API v3**.
3. Create an OAuth 2.0 client (Desktop app).
4. Save the JSON as `youtube-automation-agent/config/credentials.json`.

**The free AI brain:** get a Gemini key from Google AI Studio and set `GEMINI_API_KEY` in `youtube-automation-agent/.env` (copy `.env.example` to `.env` first). That one free key covers topic research, scripts, SEO, image generation, and voice narration.

## The seven agents

Each agent owns one stage of the pipeline and hands off to the next automatically:

| Agent | What it does |
| --- | --- |
| **Content Strategy** | Analyzes YouTube trends, identifies topics, plans your content calendar |
| **Script Writer** | Generates scripts with hooks, storytelling, and CTAs |
| **Thumbnail Designer** | Creates thumbnails and runs A/B variations |
| **SEO Optimizer** | Keywords, titles, descriptions, tags |
| **Production Management** | Coordinates TTS audio, image assets, and video assembly |
| **Publishing & Scheduling** | Uploads, schedules, manages playlists |
| **Analytics & Optimization** | Tracks performance and feeds insights back into the strategy agent — the feedback loop |

## AI providers — pick any one

All OpenAI-compatible providers work out of the box; the system auto-configures the SDK base URL: Google Gemini (free tier available), OpenAI, OpenRouter (300+ models), Kimi (Moonshot AI), MiMo (Xiaomi), GLM (Zhipu AI). Also integrates Anthropic Claude, ElevenLabs (TTS), Replicate (Wan 2.7 video), and local models via Ollama.

## Daily schedule

The scheduler starts automatically with `npm start`:

- **06:00** — generate content (strategy + script + thumbnail + SEO)
- **every 15 min** — process the publishing queue
- **09:00** — collect analytics
- **22:00** — run optimizations
- **Sundays** — weekly strategy review

## Dashboard + REST API

```bash
# generate a video on demand
curl -X POST http://localhost:3456/generate \
  -H "Content-Type: application/json" \
  -d '{"topic": "Top 10 Life Hacks", "style": "list"}'

# view schedule · get analytics · health check
curl http://localhost:3456/schedule
curl http://localhost:3456/analytics
curl http://localhost:3456/health
```

Set `API_KEY` in `.env` and the mutating endpoints require a matching `x-api-key` header.

## Graceful fallbacks

Every production step has a fallback chain, so a missing paid key never kills the pipeline: ElevenLabs → OpenAI TTS for audio; Wan 2.7 → FFmpeg slideshow for video assembly. A capability check at startup shows exactly which stages will run for real (✓) and what's missing (✗) — no silent failures, and simulated runs are never uploaded.

## Going public

Uploads default to `private`. When you're happy with the output, set `DEFAULT_PRIVACY_STATUS=public` in `.env` — that's the moment the channel starts running itself in public.

## Debugging

The startup capability check tells you exactly which stage is missing a key. `NODE_ENV=development DEBUG_MODE=true npm start` gives you debug logs.

## Full docs

See [`youtube-automation-agent/README.md`](../youtube-automation-agent/README.md) for the complete upstream documentation, including extending with custom AI providers and content types.
