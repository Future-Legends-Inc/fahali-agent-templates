#!/usr/bin/env node
// shock-tester — "what does a 20% BTC drop do to my book?" in dollars.
// Usage: node shock-tester.mjs [portfolio.json] BTCUSDT:-20 QQQ:-8
// Fahali is read-only. Observation, not advice.
import { connect, call, loadPortfolio, usd, pct } from "./lib/fahali.mjs";
import { shockClauses } from "./lib/analysis.mjs";

export function parseShocks(args) {
  return args
    .filter((a) => /^[A-Za-z0-9.]+:-?\d+(\.\d+)?$/.test(a))
    .map((a) => {
      const [instrument, move] = a.split(":");
      return { kind: "instrument", instrument: instrument.toUpperCase(), movePct: Number(move) };
    })
    .filter((s) => s.movePct !== 0);
}

export function report(result) {
  const lines = ["Shock".padEnd(18) + "Book move".padStart(11) + "P&L".padStart(16)];
  for (const c of shockClauses(result)) {
    lines.push(
      c.measured
        ? `${c.shock.padEnd(18)}${pct(c.portfolioMovePct, 2).padStart(11)}${usd(c.pnlUsd).padStart(16)}`
        : `${c.shock.padEnd(18)}  not measured for this book`,
    );
  }
  lines.push(
    "",
    "Each shock is shown on its own: overlapping sensitivities are not added together.",
    "Observation, not advice.",
  );
  return lines.join("\n");
}

if (process.argv[1]?.endsWith("shock-tester.mjs")) {
  const file = process.argv.find((a) => a.endsWith(".json")) || "examples/portfolio.json";
  const shocks = parseShocks(process.argv.slice(2));
  if (!shocks.length) shocks.push({ kind: "instrument", instrument: "BTCUSDT", movePct: -20 });
  const book = await loadPortfolio(file);
  const client = await connect();
  const result = await call(client, "fahali_run_shock_test", {
    positions: book,
    shocks,
    detail: "brief",
    include_withheld: false,
  });
  console.log(report(result));
  await client.close();
}
