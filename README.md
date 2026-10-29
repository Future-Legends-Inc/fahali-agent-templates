# Fahali agent templates: give your agent a risk layer in 5 minutes

Three small, runnable agents built on the [Fahali MCP server](https://github.com/Future-Legends-Inc/fahali-mcp). Each answers one question that a trading, treasury or wealth agent should ask before it acts:

| Agent | Question it answers | Fahali tool |
| --- | --- | --- |
| `portfolio-guardian.mjs` | Which holding carries more tail risk than its size, and which "different" holdings are really one bet? | `fahali_analyze_custom_portfolio` |
| `shock-tester.mjs` | What does a 20% Bitcoin drop (or an 8% Nasdaq drop) do to this book, in dollars? | `fahali_run_shock_test` |
| `contagion-explainer.mjs` | Which of these assets fall together right now, and which moves have arrived first? | `fahali_get_contagion_map` |

Fahali is read-only market-risk intelligence: no orders, no path to capital. **Observation, not advice.**

## What the output looks like

Real output of `portfolio-guardian` on seven positions taken from a public Q1 2026 13F filing (Fahali data from 29 Oct 2026):

```
Book: $14,473,656 · 95% expected shortfall $113,689

Tail risk vs capital (95% expected shortfall share):
  CORZ      12.5% of capital   35.3% of tail loss  <- carries more risk than its size
  QQQ       32.1% of capital   22.7% of tail loss
  AAPL      31.5% of capital   15.8% of tail loss
  ...
Holdings that move as one bet (hourly correlation >= 0.75):
  COIN + IBIT: 0.77
  QQQ + NVDA: 0.75

Model check: 16 VaR breaches vs 12.4 expected over 248 days (coverage not_rejected).
```

A bitcoin miner at 12.5% of the book carried more than a third of its tail loss, while Apple, 2.5 times bigger, carried 16%. That is the kind of thing an agent should flag before it adds to a position.

## Run it

1. Get a free developer key (50 calls/day, no card): **https://app.fahaliai.com/developer**
2. Clone and install (Node 18+):

```bash
git clone https://github.com/Future-Legends-Inc/fahali-agent-templates
cd fahali-agent-templates
npm install
export FAHALI_API_KEY=sk_live_...      # Windows PowerShell: $env:FAHALI_API_KEY="sk_live_..."
```

3. Run any agent:

```bash
npm run guardian                       # examples/portfolio.json
node portfolio-guardian.mjs my-book.json --watch 60   # re-check every hour
npm run shock                          # BTCUSDT -20% and QQQ -8%
node shock-tester.mjs my-book.json BTCUSDT:-30 NVDA:-15
npm run contagion                      # BTCUSDT ETHUSDT NVDA QQQ MSTR
```

A book is a JSON array: `[{ "symbol": "NVDA", "market_value": 1350000 }, ...]`. Crypto uses exchange pairs (`BTCUSDT`); US equities and ETFs use tickers.

## Use Fahali directly from Claude, Cursor or ChatGPT

No code needed. Add the remote MCP server as a connector:

```
https://mcp.fahaliai.com/mcp
```

Sign in with "Connect with Fahali" (OAuth), or send `Authorization: Bearer sk_live_...`. Cursor `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "fahali": {
      "url": "https://mcp.fahaliai.com/mcp",
      "headers": { "Authorization": "Bearer sk_live_..." }
    }
  }
}
```

Then ask your assistant: *"Run a Fahali shock test on my book: 40% QQQ, 20% NVDA, 10% IBIT — BTC down 20%."*

## Why use Fahali rather than a price feed

- **Judgment, not raw data.** Expected-shortfall attribution, correlation, shock revaluation and contagion paths, computed for the positions you pass in.
- **A public, judged record.** Fahali's warnings are registered before outcomes and scored afterwards, misses included: `curl https://app.fahaliai.com/api/track-record/lead-time` (no key needed). Read each row's `publishable` flag and quote precision with recall and the stratum, never alone.
- **Honest absence.** When data is missing, responses say so instead of filling the gap.

## Building in Python or a framework?

[fahali-integrations](https://github.com/Future-Legends-Inc/fahali-integrations) has Python and TypeScript clients plus LangChain, CrewAI, LlamaIndex and Vercel AI SDK adapters.

## Tests

`npm test` runs the analysis code against real Fahali responses saved in `fixtures/`.

## Build something with it

Built a risk-aware agent on these templates? Open an issue with a link. We'll feature the best ones.

---

Built by Future Legends Inc · [Methodology](https://fahaliai.com/methodology) · [Developer docs](https://fahaliai.com/developer) · MIT licence · Observation, not advice.
