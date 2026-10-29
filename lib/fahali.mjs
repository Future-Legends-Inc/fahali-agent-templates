// Minimal Fahali MCP client shared by the templates.
// Fahali is read-only market-risk intelligence. Observation, not advice.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export const FAHALI_URL = process.env.FAHALI_MCP_URL || "https://mcp.fahaliai.com/mcp";

export async function connect() {
  const key = process.env.FAHALI_API_KEY;
  if (!key) {
    console.error(
      "Set FAHALI_API_KEY first. A free developer key (50 calls/day, no card) is at https://app.fahaliai.com/developer",
    );
    process.exit(1);
  }
  const transport = new StreamableHTTPClientTransport(new URL(FAHALI_URL), {
    requestInit: { headers: { Authorization: `Bearer ${key}` } },
  });
  const client = new Client({ name: "fahali-agent-templates", version: "0.1.0" });
  await client.connect(transport);
  return client;
}

// Call a Fahali tool and return its JSON payload. Fahali tools return one JSON
// document as text content (and sometimes structuredContent).
export async function call(client, name, args = {}) {
  const res = await client.callTool({ name, arguments: args });
  if (res.isError) {
    const text = (res.content || []).map((c) => c.text || "").join("\n");
    throw new Error(`${name} failed: ${text.slice(0, 400)}`);
  }
  return parseResult(res);
}

export function parseResult(res) {
  if (res.structuredContent) return res.structuredContent;
  const text = (res.content || []).find((c) => c.type === "text")?.text;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export const usd = (v) =>
  v == null ? "n/a" : `${v < 0 ? "-" : ""}$${Math.abs(Math.round(v)).toLocaleString("en-US")}`;
export const pct = (v, d = 1) => (v == null ? "n/a" : `${v.toFixed(d)}%`);

export function loadPortfolio(path) {
  return import("node:fs").then(({ readFileSync }) => {
    const book = JSON.parse(readFileSync(path, "utf8"));
    if (!Array.isArray(book) || !book.every((p) => p.symbol && p.market_value > 0)) {
      throw new Error(`${path} must be a JSON array of {symbol, market_value}`);
    }
    return book;
  });
}
