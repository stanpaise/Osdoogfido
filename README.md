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
  storage.py        SQLite trade log + latest-cycle status, read by the dashboard
  main.py           Polling loop tying it all together
dashboard/
  app.py            View-only Flask dashboard (Basic Auth required)
  templates/dashboard.html
deploy/
  osdoogfido-bot.service         systemd unit for the trading loop
  osdoogfido-dashboard.service   systemd unit for the dashboard
  nginx.conf.example             optional TLS reverse proxy for public access
tests/
  test_arbitrage.py
  test_risk_manager.py
  test_storage.py
```

The bot and the dashboard are two separate processes that share the same
SQLite file: the bot writes trades and a "latest cycle" status row after
every loop iteration, and the dashboard just reads that file and serves it
as JSON/HTML. The dashboard never touches exchange APIs or API keys itself
— it's read-only by design, so there's no path from "someone loads the
webpage" to "an order gets placed."

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

## Web dashboard

A small view-only dashboard shows live quotes, the current best opportunity,
today's P&L, and recent trades in a browser. It's a **separate process**
from the bot — starting or stopping the dashboard never starts or stops
trading, and it can't place orders. It requires HTTP Basic Auth credentials
to even boot (`DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` in `.env`) — there
is no unauthenticated mode.

### Run it locally, next to the bot

In one terminal:

```bash
python -m bot.main
```

In another (same `.env`, same venv):

```bash
python -m dashboard.app
```

Then open `http://127.0.0.1:8080` and log in with the credentials you set.
It polls its own API every 5 seconds, so leave it open and it updates live.

### Run it 24/7 on a small cloud VM

I can't provision cloud infrastructure on your behalf (no access to your
cloud account), but here's the exact path once you have a VM (DigitalOcean,
Hetzner, Linode — any small Ubuntu box works, $5-6/mo tier is plenty):

1. **Provision** a small Ubuntu 22.04+ VM and SSH in.

2. **Install prerequisites:**
   ```bash
   sudo apt update && sudo apt install -y python3-venv git
   sudo useradd --system --create-home --shell /usr/sbin/nologin osdoogfido
   ```

3. **Deploy the code:**
   ```bash
   sudo git clone https://github.com/stanpaise/Osdoogfido.git /opt/osdoogfido
   cd /opt/osdoogfido
   sudo python3 -m venv .venv
   sudo .venv/bin/pip install -r requirements.txt
   sudo cp .env.example .env
   sudo nano .env   # fill in API keys, DASHBOARD_USERNAME/PASSWORD, risk limits
   sudo chown -R osdoogfido:osdoogfido /opt/osdoogfido
   sudo chmod 600 /opt/osdoogfido/.env
   ```

4. **Install the systemd services:**
   ```bash
   sudo cp deploy/osdoogfido-bot.service deploy/osdoogfido-dashboard.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now osdoogfido-bot
   sudo systemctl enable --now osdoogfido-dashboard
   ```

5. **Check they're running:**
   ```bash
   sudo systemctl status osdoogfido-bot
   sudo systemctl status osdoogfido-dashboard
   journalctl -u osdoogfido-bot -f       # live bot logs
   ```

6. **View the dashboard.** By default it's bound to `127.0.0.1` on the VM
   (not exposed to the internet) — reach it through an SSH tunnel, which is
   the simplest secure option and needs no further setup:
   ```bash
   ssh -L 8080:127.0.0.1:8080 you@your-vm-ip
   ```
   then open `http://127.0.0.1:8080` on your own machine.

   If you'd rather have a real public URL, put nginx + Let's Encrypt in
   front of it instead of exposing the dashboard directly — see
   `deploy/nginx.conf.example`. Basic Auth alone is not sufficient once
   you're off localhost, since credentials travel in cleartext over plain
   HTTP.

### Updating a running deployment

```bash
cd /opt/osdoogfido
sudo git pull
sudo .venv/bin/pip install -r requirements.txt
sudo systemctl restart osdoogfido-bot osdoogfido-dashboard
```

## Tests

```bash
pytest
```

Tests cover the arbitrage math, risk-limit logic, and status/trade storage
with fake data — no network or exchange credentials required.
