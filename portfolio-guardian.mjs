#!/usr/bin/env node
// portfolio-guardian — finds the hidden risk in a book and keeps watching it.
// Usage: node portfolio-guardian.mjs [portfolio.json] [--watch MINUTES]
// Fahali is read-only. Observation, not advice.
import { connect, call, loadPortfolio, usd, pct } from "./lib/fahali.mjs";
import { tailConcentration, correlatedPairs } from "./lib/analysis.mjs";

const file = process.argv.find((a) => a.endsWith(".json")) || "examples/portfolio.json";
const watchIdx = process.argv.indexOf("--watch");
const everyMin = watchIdx > -1 ? Number(process.argv[watchIdx + 1] || 60) : 0;

export function report(analysis) {
  const lines = [];
  const p = analysis.portfolio || {};
  lines.push(`Book: ${usd(p.totalValue)} · 95% expected shortfall ${usd(p.expectedShortfall95)}`);
  const tail = tailConcentration(analysis);
  if (tail.length) {
    lines.push("", "Tail risk vs capital (95% expected shortfall share):");
    for (const r of tail) {
      lines.push(
        `  ${r.symbol.padEnd(8)} ${pct(r.weightPct).padStart(6)} of capital  ${pct(r.esSharePct).padStart(6)} of tail loss${r.flagged ? "  <- carries more risk than its size" : ""}`,
      );
    }
  }
  const pairs = correlatedPairs(analysis);
  if (pairs.length) {
    lines.push("", "Holdings that move as one bet (hourly correlation >= 0.75):");
    for (const x of pairs) lines.push(`  ${x.a} + ${x.b}: ${x.r.toFixed(2)}`);
  }
  const bt = p.varBacktest;
  if (bt?.status === "measured") {
    lines.push(
      "",
      `Model check: ${bt.violations} VaR breaches vs ${bt.expectedViolations} expected over ${bt.observations} days (coverage ${bt.unconditionalCoverage}).`,
    );
  }
  lines.push("", "Observation, not advice.");
  return lines.join("\n");
}

async function once(client, book) {
  const analysis = await call(client, "fahali_analyze_custom_portfolio", {
    positions: book,
    detail: "brief",
    include_withheld: false,
  });
  console.log(`\n[${new Date().toISOString()}]\n${report(analysis)}`);
  return analysis;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("portfolio-guardian.mjs")) {
  const book = await loadPortfolio(file);
  const client = await connect();
  await once(client, book);
  if (everyMin > 0) {
    console.log(`\nWatching every ${everyMin} min. Ctrl+C to stop.`);
    setInterval(() => once(client, book).catch((e) => console.error(e.message)), everyMin * 60_000);
  } else {
    await client.close();
  }
}
