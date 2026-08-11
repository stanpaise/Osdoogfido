import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import Dict, Optional

import ccxt


@dataclass
class PriceQuote:
    exchange_id: str
    symbol: str
    bid: float
    ask: float
    bid_volume: float
    ask_volume: float
    taker_fee: float
    timestamp: float


def fetch_quote(exchange: ccxt.Exchange, symbol: str) -> Optional[PriceQuote]:
    try:
        ticker = exchange.fetch_ticker(symbol)
    except Exception:
        return None

    bid = ticker.get("bid")
    ask = ticker.get("ask")
    if not bid or not ask:
        return None

    market = exchange.markets.get(symbol, {})
    taker_fee = market.get("taker")
    if taker_fee is None:
        taker_fee = 0.001

    return PriceQuote(
        exchange_id=exchange.id,
        symbol=symbol,
        bid=bid,
        ask=ask,
        bid_volume=ticker.get("bidVolume") or 0.0,
        ask_volume=ticker.get("askVolume") or 0.0,
        taker_fee=taker_fee,
        timestamp=ticker.get("timestamp") or time.time() * 1000,
    )


def fetch_all_quotes(exchanges: Dict[str, ccxt.Exchange], symbols: Dict[str, str]) -> Dict[str, PriceQuote]:
    """Fetch tickers from every exchange concurrently (ccxt's sync client is blocking)."""
    quotes: Dict[str, PriceQuote] = {}
    relevant = {eid: ex for eid, ex in exchanges.items() if eid in symbols}
    if not relevant:
        return quotes

    with ThreadPoolExecutor(max_workers=len(relevant)) as pool:
        futures = {
            pool.submit(fetch_quote, exchange, symbols[exchange_id]): exchange_id
            for exchange_id, exchange in relevant.items()
        }
        for future in as_completed(futures):
            exchange_id = futures[future]
            quote = future.result()
            if quote is not None:
                quotes[exchange_id] = quote

    return quotes
