import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runScan, scanMode, validateInput } from "./scan.js";

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const PORT = Number(process.env.PORT) || 3000;
// Every live scan costs real money (AI calls + web searches), so cap scans per visitor.
const SCANS_PER_HOUR = Number(process.env.AIV_SCANS_PER_HOUR) || 5;

const hits = new Map();
export function allowScan(ip, now = Date.now()) {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= SCANS_PER_HOUR) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 10_000) throw new Error("Request too large");
  }
  return JSON.parse(raw || "{}");
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
      return send(res, 200, await fs.readFile(path.join(PUBLIC_DIR, "index.html")), "text/html; charset=utf-8");
    }
    if (req.method === "GET" && req.url === "/api/health") return send(res, 200, { ok: true, mode: scanMode() });
    if (req.method === "POST" && req.url === "/api/scan") {
      let input;
      try {
        input = validateInput(await readJson(req));
      } catch (err) {
        return send(res, 400, { error: err.message });
      }
      // Behind a hosting proxy (Render, Fly, etc.) set AIV_TRUST_PROXY=1 so limits apply per visitor, not per proxy.
      const forwarded = process.env.AIV_TRUST_PROXY === "1" ? String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() : "";
      if (!allowScan(forwarded || req.socket.remoteAddress || "unknown")) {
        return send(res, 429, { error: `Scan limit reached (${SCANS_PER_HOUR} per hour). Try again later.` });
      }
      return send(res, 200, await runScan(input));
    }
    send(res, 404, { error: "Not found" });
  } catch (err) {
    console.error(err);
    send(res, 500, { error: "Something went wrong running the scan." });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => console.log(`AI visibility scanner on http://localhost:${PORT} (mode: ${scanMode()})`));
}
