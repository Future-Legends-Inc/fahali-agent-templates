#!/usr/bin/env node
// contagion-explainer — which of these assets fall together right now, and
// which moves have historically arrived first (measured lead, not causation).
// Usage: node contagion-explainer.mjs BTCUSDT NVDA QQQ MSTR
// Fahali is read-only. Observation, not advice.
import { connect, call } from "./lib/fahali.mjs";
import { contagionFor } from "./lib/analysis.mjs";

export function report(map, symbols) {
  const { clusters, arrivals } = contagionFor(map, symbols);
  const lines = [];
  if (!clusters.length && !arrivals.length) {
    lines.push(`No shared downside cluster or measured lead/lag among ${symbols.join(", ")} right now.`);
  }
  for (const c of clusters) {
    lines.push(`Same downside cluster (${c.size} instruments in it): ${c.mine.join(", ")}`);
  }
  if (arrivals.length) {
    lines.push("", "Measured lead/lag (precedence, not causation):");
    for (const a of arrivals.slice(0, 10)) lines.push(`  ${a.from} -> ${a.to}: ~${a.hours}h`);
  }
  lines.push("", "Observation, not advice.");
  return lines.join("\n");
}

if (process.argv[1]?.endsWith("contagion-explainer.mjs")) {
  const symbols = process.argv.slice(2).map((s) => s.toUpperCase());
  if (symbols.length < 2) {
    console.error("Give at least two symbols, e.g. BTCUSDT NVDA QQQ");
    process.exit(1);
  }
  const client = await connect();
  const map = await call(client, "fahali_get_contagion_map", {
    detail: "standard",
    include_withheld: false,
  });
  console.log(report(map, symbols));
  await client.close();
}
