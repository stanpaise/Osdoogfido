import logging
import signal
import sys
import time
from datetime import datetime, timezone

from .arbitrage import find_opportunities
from .config import Config
from .exchanges import build_exchange, resolve_symbol
from .executor import execute_opportunity
from .price_monitor import fetch_all_quotes
from .risk_manager import RiskManager
from .storage import Storage

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("arbitrage-bot")

_shutdown = False


def _handle_signal(signum, frame):
    global _shutdown
    logger.info("Shutdown signal received, finishing current cycle...")
    _shutdown = True


def _fetch_base_balance(exchange, symbol: str, dry_run: bool) -> float:
    base = symbol.split("/")[0]
    if dry_run:
        return float("inf")
    try:
        balance = exchange.fetch_balance()
        return balance.get(base, {}).get("free", 0.0) or 0.0
    except Exception:
        logger.exception("Failed to fetch %s balance on %s", base, exchange.id)
        return 0.0


def _fetch_quote_balance(exchange, symbol: str, dry_run: bool, cap: float) -> float:
    quote = symbol.split("/")[1]
    if dry_run:
        return cap
    try:
        balance = exchange.fetch_balance()
        return balance.get(quote, {}).get("free", 0.0) or 0.0
    except Exception:
        logger.exception("Failed to fetch %s balance on %s", quote, exchange.id)
        return 0.0


def run() -> None:
    config = Config.from_env()
    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    if config.dry_run:
        logger.warning("Running in DRY_RUN mode. No real orders will be placed.")
    else:
        logger.warning("LIVE TRADING MODE. Real orders will be placed with real funds.")

    exchanges = {}
    symbols = {}
    for exchange_id in config.exchange_ids:
        try:
            exchange = build_exchange(exchange_id, config.credentials.get(exchange_id))
        except Exception:
            logger.exception("Failed to initialize %s", exchange_id)
            continue

        symbol = resolve_symbol(exchange, config.default_symbol, config.symbol_overrides)
        if symbol is None:
            logger.warning("%s does not list a configured symbol, skipping", exchange_id)
            continue

        exchanges[exchange_id] = exchange
        symbols[exchange_id] = symbol
        if exchange_id not in config.credentials:
            logger.warning(
                "%s has no API credentials; using public data only (no live orders possible there)",
                exchange_id,
            )

    if len(exchanges) < 2:
        logger.error("Need at least 2 usable exchanges quoting the same symbol. Exiting.")
        sys.exit(1)

    storage = Storage(config.db_path)
    risk_manager = RiskManager(storage, config.max_trade_usd, config.daily_loss_limit_usd)

    while not _shutdown:
        cycle_start = time.time()
        try:
            _run_cycle(config, exchanges, symbols, storage, risk_manager)
        except Exception:
            logger.exception("Error during trading cycle")

        elapsed = time.time() - cycle_start
        time.sleep(max(config.poll_interval_seconds - elapsed, 0))

    logger.info("Bot stopped.")


def _run_cycle(config, exchanges, symbols, storage, risk_manager) -> None:
    quotes = fetch_all_quotes(exchanges, symbols)
    opportunities = find_opportunities(quotes, config.min_profit_pct, config.slippage_buffer_pct)

    if not opportunities:
        logger.info("No profitable opportunities this cycle (%d exchanges quoted)", len(quotes))
        return

    best = opportunities[0]
    logger.info(
        "Best opportunity: buy %s on %s @ %.2f, sell on %s @ %.2f, net %.3f%%",
        best.symbol,
        best.buy_exchange,
        best.buy_price,
        best.sell_exchange,
        best.sell_price,
        best.net_profit_pct,
    )

    if risk_manager.is_halted():
        logger.warning("Risk manager halted trading (daily loss limit reached).")
        return

    base_available = _fetch_base_balance(exchanges[best.sell_exchange], best.symbol, config.dry_run)
    quote_available = _fetch_quote_balance(
        exchanges[best.buy_exchange], best.symbol, config.dry_run, config.max_trade_usd
    )

    sizing = risk_manager.size_trade(base_available, quote_available, best.buy_price)
    if sizing.trade_size_quote <= 0:
        logger.info("Skipping trade: %s", sizing.reason)
        return

    result = execute_opportunity(best, sizing.trade_size_quote, exchanges, config.dry_run)
    storage.record_trade(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "symbol": result.opportunity.symbol,
            "buy_exchange": result.opportunity.buy_exchange,
            "sell_exchange": result.opportunity.sell_exchange,
            "buy_price": result.opportunity.buy_price,
            "sell_price": result.opportunity.sell_price,
            "trade_size_quote": result.trade_size_quote,
            "base_amount": result.base_amount,
            "fees_quote": result.fees_quote,
            "realized_pnl_quote": result.realized_pnl_quote,
            "dry_run": result.dry_run,
        }
    )
    logger.info(
        "%s trade executed: size=%.2f fees=%.4f pnl=%.4f",
        "[DRY RUN]" if result.dry_run else "[LIVE]",
        result.trade_size_quote,
        result.fees_quote,
        result.realized_pnl_quote,
    )


if __name__ == "__main__":
    run()
