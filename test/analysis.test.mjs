// Runs the templates' analysis on real Fahali responses saved in fixtures/.
// node --test
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tailConcentration, correlatedPairs, shockClauses, contagionFor } from "../lib/analysis.mjs";
import { report as guardianReport } from "../portfolio-guardian.mjs";
import { report as shockReport, parseShocks } from "../shock-tester.mjs";
import { report as contagionReport } from "../contagion-explainer.mjs";

const load = (f) => JSON.parse(readFileSync(new URL(`../fixtures/${f}`, import.meta.url), "utf8"));

test("tail concentration flags the position carrying more tail risk than its size", () => {
  const rows = tailConcentration(load("portfolio-analysis.json"));
  const corz = rows.find((r) => r.symbol === "CORZ");
  assert.equal(rows[0].symbol, "CORZ");
  assert.ok(Math.abs(corz.esSharePct - 35.3) < 0.1);
  assert.equal(corz.flagged, true);
  assert.equal(rows.find((r) => r.symbol === "AAPL").flagged, false);
});

test("correlated pairs are found and sorted", () => {
  const pairs = correlatedPairs(load("portfolio-analysis.json"));
  assert.deepEqual(pairs.map((p) => `${p.a}+${p.b}`), ["COIN+IBIT", "QQQ+NVDA"]);
});

test("shock clauses are reported separately in dollars", () => {
  const c = shockClauses(load("shock.json"));
  assert.equal(c.length, 2);
  assert.equal(c[0].pnlUsd, -6796300);
  assert.match(shockReport(load("shock.json")), /-\$6,796,300/);
});

test("shock argument parsing", () => {
  assert.deepEqual(parseShocks(["BTCUSDT:-20", "qqq:-8", "x.json", "SPY:0"]), [
    { kind: "instrument", instrument: "BTCUSDT", movePct: -20 },
    { kind: "instrument", instrument: "QQQ", movePct: -8 },
  ]);
});

test("contagion explainer finds shared cluster and measured arrivals", () => {
  const map = load("contagion.json");
  const out = contagionFor(map, ["BTCUSDT", "NVDA", "QQQ", "MSTR"]);
  assert.equal(out.clusters.length, 1);
  assert.ok(out.clusters[0].mine.length >= 3);
  assert.ok(out.arrivals.length > 0);
  assert.match(contagionReport(map, ["BTCUSDT", "NVDA"]), /Same downside cluster/);
});

test("guardian report is readable and ends with the disclaimer", () => {
  const txt = guardianReport(load("portfolio-analysis.json"));
  assert.match(txt, /CORZ.*carries more risk than its size/);
  assert.match(txt, /Observation, not advice\.$/);
});
