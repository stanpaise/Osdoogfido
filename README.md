# Osdoogfido

A cross-exchange crypto arbitrage bot. It watches BTC/USDT (configurable) on
several exchanges at once, and when one exchange's ask price is enough below
another exchange's bid price to clear both exchanges' fees plus a slippage
buffer, it buys on the cheap one and sells on the expensive one.

## How it actually works (read this first)

Real-time arbitrage does **not** move funds between exchanges as part of a
trade — a blockchain transfer takes minutes, and the price gap is long gone
by the time it lands. Instead, this bot assumes each exchange already holds
a standing balance of **both** the base asset (e.g. BTC) and the quote
currency (e.g. USDT). It buys on the cheap exchange and sells on the
expensive exchange independently, each against that exchange's own balance,
and lets the two balances drift. Rebalancing between exchanges (e.g. via a
periodic transfer) is on you — it's not automated here.

It also only ever compares exchanges quoting the **exact same symbol**
(e.g. `BTC/USDT` vs `BTC/USDT`), never across different quote currencies
(e.g. `BTC/USDT` vs `BTC/USD`), since USDT and USD are not guaranteed to be
worth exactly the same — treating them as interchangeable would produce
fake "profit" that's really just USDT/USD basis risk.

## Safety defaults

- **`DRY_RUN=true` by default.** The bot simulates fills using live prices
  and logs them, but places no real orders, until you explicitly set
  `DRY_RUN=false` in your `.env`.
- **Per-trade cap** (`MAX_TRADE_USD`, default $25) and **daily loss limit**
  (`DAILY_LOSS_LIMIT_USD`, default $50, auto-halts the bot for the day once
  hit) are enforced in `bot/risk_manager.py`. These are conservative
  placeholders — read them, change them, own the number.
- Trade size is also capped to whatever balance is actually free on the buy
  exchange (quote currency) and sell exchange (base asset) — it will never
  try to trade more than what's sitting there.
- API keys are read from environment variables / `.env` only, never
  hardcoded, and `.env` is gitignored.

**This is still real trading software. Crypto markets are volatile, exchange
APIs can fail mid-trade, and arbitrage margins are thin once fees and
slippage are accounted for. Start in `DRY_RUN` mode, watch it for a while,
and only enable live trading with money you can afford to lose.**

## Architecture

```
bot/
  config.py        Loads settings and API credentials from environment/.env
  exchanges.py      Builds ccxt exchange clients, resolves per-exchange symbols
  price_monitor.py  Fetches live bid/ask + fees from all exchanges concurrently
  arbitrage.py      Finds profitable buy-low/sell-high spreads after fees
  risk_manager.py   Enforces per-trade cap, daily loss limit, balance caps
  executor.py       Places (or simulates) the buy and sell legs
  storage.py        SQLite trade log, used for daily P&L tracking
  main.py           Polling loop tying it all together
tests/
  test_arbitrage.py
  test_risk_manager.py
```

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# edit .env: add API keys for the exchanges you want to trade live on,
# review MAX_TRADE_USD / DAILY_LOSS_LIMIT_USD / MIN_PROFIT_PCT
```

Run it (starts in dry-run mode unless you changed `.env`):

```bash
python -m bot.main
```

Stop it with Ctrl+C — it finishes the current cycle and shuts down cleanly.

## Going live

1. Fund each exchange account you enable with both BTC and USDT (or your
   configured pair).
2. Create API keys scoped to spot trading only (no withdrawal permission —
   the bot never needs to withdraw, and giving it withdrawal rights is an
   unnecessary risk).
3. Set `DRY_RUN=false` in `.env`.
4. Re-check `MAX_TRADE_USD` and `DAILY_LOSS_LIMIT_USD` for numbers you're
   actually comfortable with.

## Tests

```bash
pytest
```

Tests cover the arbitrage math and risk-limit logic with fake price data —
no network or exchange credentials required.
