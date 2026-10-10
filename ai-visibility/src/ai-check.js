// Asks an AI assistant (Claude with live web search) the homeowner questions, then extracts
// which roofing businesses each answer recommends.
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.AIV_MODEL || "claude-opus-5-5";
const BETAS = ["server-side-fallback-2026-07-01"];

const ANSWER_SYSTEM =
  "You are a helpful AI assistant answering a homeowner's question. Search the web, then recommend " +
  "specific local businesses by name the way you normally would, with a short reason for each.";

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    businesses: {
      type: "array",
      description: "Every roofing business the answer names, in the order they first appear.",
      items: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  required: ["businesses"],
  additionalProperties: false,
};

function collectAnswer(content) {
  let text = "";
  const sources = new Set();
  for (const block of content) {
    if (block.type === "text") {
      text += block.text;
      for (const c of block.citations ?? []) if (c.url) sources.add(c.url);
    } else if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const r of block.content) if (r.url) sources.add(r.url);
    }
  }
  return { text: text.trim(), sources: [...sources] };
}

async function askAssistant(client, question, location) {
  const messages = [{ role: "user", content: question }];
  // pause_turn means a long server-side search turn was paused; resend to let it finish.
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      betas: BETAS,
      fallbacks: "default",
      system: ANSWER_SYSTEM,
      output_config: { effort: "low" },
      tools: [{
        type: "web_search_20260209",
        name: "web_search",
        max_uses: 3,
        user_location: { type: "approximate", city: location.city, region: location.state || undefined, country: "US" },
      }],
      messages,
    });
    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      continue;
    }
    if (res.stop_reason === "refusal") return { text: "", sources: [], error: "The assistant declined to answer." };
    return collectAnswer(res.content);
  }
  return { text: "", sources: [], error: "The assistant didn't finish its answer." };
}

async function extractBusinesses(client, answer) {
  if (!answer) return [];
  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 2000,
    betas: BETAS,
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: EXTRACT_SCHEMA } },
    messages: [{
      role: "user",
      content: `List the roofing businesses named in this answer, in order of first appearance. ` +
        `Exclude directories and platforms (Angi, HomeAdvisor, Yelp, BBB, Google) unless the answer presents them as the roofer.\n\n<answer>\n${answer}\n</answer>`,
    }],
  });
  if (res.stop_reason === "refusal") return [];
  const block = res.content.find((b) => b.type === "text");
  try {
    return JSON.parse(block?.text ?? "{}").businesses?.map((b) => b.name).filter(Boolean) ?? [];
  } catch {
    return [];
  }
}

export async function runLiveQuestion(client, question, location) {
  try {
    const { text, sources, error } = await askAssistant(client, question, location);
    const recommended = await extractBusinesses(client, text);
    return { question, answer: text, sources, recommended, error };
  } catch (err) {
    const msg = err instanceof Anthropic.RateLimitError ? "AI service is busy, try again in a minute."
      : err instanceof Anthropic.AuthenticationError ? "AI service key is invalid."
      : err instanceof Anthropic.APIError ? `AI service error (${err.status}).`
      : "Couldn't reach the AI service.";
    return { question, answer: "", sources: [], recommended: [], error: msg };
  }
}

// Demo mode: realistic fake answers so the app can be shown and tested without an API key.
const DEMO_COMPETITORS = ["Summit Peak Roofing", "Ironclad Roofing & Exteriors", "BlueSky Roof Pros", "Heritage Roofing Co."];

export function runDemoQuestion(question, index, businessName) {
  const recommended = [...DEMO_COMPETITORS.slice(index % 2, (index % 2) + 3)];
  if (index === 0) recommended.splice(2, 0, businessName);
  if (index === 3) recommended.push(businessName);
  const answer = `DEMO DATA. Here are roofers worth calling:\n` +
    recommended.map((n, i) => `${i + 1}. ${n}: well reviewed, offers free inspections.`).join("\n");
  return { question, answer, sources: [], recommended, demo: true };
}
