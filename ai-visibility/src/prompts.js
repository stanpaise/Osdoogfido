// Questions a homeowner actually asks an AI assistant before hiring a roofer.
// Kept to five so a scan stays cheap (each one is a live, web-searching answer).
export const ROOFING_PROMPTS = [
  "Who is the best roofing company in {city}?",
  "I need a full roof replacement in {city}. Which roofers do you recommend?",
  "My roof got storm damage in {city}. Who should I call?",
  "Recommend a reliable roofer near {city} to fix a roof leak.",
  "Which roofing contractors in {city} have the best reviews?",
];

export function buildPrompts(city, state) {
  const place = state ? `${city}, ${state}` : city;
  return ROOFING_PROMPTS.map((p) => p.replaceAll("{city}", place));
}
