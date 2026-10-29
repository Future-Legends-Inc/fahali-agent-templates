// Pure functions that turn Fahali responses into findings an agent can act on.
// Kept separate from the network code so they are unit-tested against real
// response shapes (see test/analysis.test.mjs).

// Positions whose share of the book's 95% expected shortfall is much larger
// than their share of capital: the "hidden" risk in a portfolio.
export function tailConcentration(analysis, ratio = 1.5) {
  const comps = analysis?.portfolio?.expectedShortfallAttribution?.components || [];
  const total = comps.reduce((s, c) => s + (c.contributionDollars || 0), 0);
  if (!total) return [];
  return comps
    .map((c) => ({
      symbol: c.symbol,
      weightPct: c.weightPct,
      esSharePct: (c.contributionDollars / total) * 100,
      esDollars: c.contributionDollars,
    }))
    .map((r) => ({ ...r, ratio: r.weightPct ? r.esSharePct / r.weightPct : null }))
    .sort((a, b) => b.esSharePct - a.esSharePct)
    .map((r) => ({ ...r, flagged: r.ratio != null && r.ratio >= ratio }));
}

// Pairs of holdings that move together (Pearson on the returned matrix).
export function correlatedPairs(analysis, threshold = 0.75) {
  const c = analysis?.correlation;
  if (!c || c.status !== "measured" || !Array.isArray(c.matrix)) return [];
  const out = [];
  for (let i = 0; i < c.symbols.length; i++) {
    for (let j = i + 1; j < c.symbols.length; j++) {
      const r = c.matrix[i][j];
      if (r != null && r >= threshold) out.push({ a: c.symbols[i], b: c.symbols[j], r });
    }
  }
  return out.sort((x, y) => y.r - x.r);
}

// Per-clause dollar impact from fahali_run_shock_test. Fahali deliberately does
// not add overlapping clauses together, so neither do we.
export function shockClauses(result) {
  const clauses = result?.requestedShocks || result?.requestedScenario?.clauses || [];
  return clauses.map((c) => ({
    shock: `${c.instrument} ${c.movePct > 0 ? "+" : ""}${c.movePct}%`,
    measured: c.calculationState === "measured",
    portfolioMovePct: c.signedPortfolioMovePct ?? null,
    pnlUsd: c.portfolioPnlUsd ?? null,
    beta: c.basis?.portfolioBeta ?? null,
  }));
}

// Clusters and measured propagation paths that touch the given symbols.
export function contagionFor(map, symbols) {
  const want = new Set(symbols.map((s) => s.toUpperCase()));
  const clusters = (map?.clusters || [])
    .map((c) => {
      const members = c.members || c.symbols || [];
      const mine = members.filter((m) => want.has(String(m).toUpperCase()));
      return { size: members.length, mine, members };
    })
    .filter((c) => c.mine.length >= 2);
  const arrivals = [];
  for (const o of map?.propagation?.origins || []) {
    for (const a of o.arrivals || []) {
      if (want.has(String(a.symbol).toUpperCase()) && a.basis === "measured") {
        arrivals.push({ from: o.origin, to: a.symbol, hours: a.arrivalHours });
      }
    }
  }
  arrivals.sort((x, y) => x.hours - y.hours);
  return { clusters, arrivals };
}
