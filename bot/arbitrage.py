from dataclasses import dataclass
from itertools import permutations
from typing import Dict, List

from .price_monitor import PriceQuote


@dataclass
class Opportunity:
    buy_exchange: str
    sell_exchange: str
    symbol: str
    buy_price: float
    sell_price: float
    gross_spread_pct: float
    net_profit_pct: float


def find_opportunities(
    quotes: Dict[str, PriceQuote],
    min_profit_pct: float,
    slippage_buffer_pct: float,
) -> List[Opportunity]:
    """Compare quotes pairwise and return profitable buy-low/sell-high opportunities.

    Quotes are only ever compared within the same exact symbol string. This
    deliberately prevents e.g. BTC/USDT (Binance) from being compared against
    BTC/USD (Coinbase) as if they were the same market -- USDT and USD are not
    guaranteed to be 1:1, and treating them as such would produce fake "profit"
    that is really just USDT/USD basis risk.
    """
    opportunities: List[Opportunity] = []
    by_symbol: Dict[str, List[PriceQuote]] = {}
    for quote in quotes.values():
        by_symbol.setdefault(quote.symbol, []).append(quote)

    for symbol_quotes in by_symbol.values():
        for buy_q, sell_q in permutations(symbol_quotes, 2):
            if buy_q.ask <= 0 or sell_q.bid <= 0:
                continue

            gross_spread_pct = (sell_q.bid - buy_q.ask) / buy_q.ask * 100
            fees_pct = (buy_q.taker_fee + sell_q.taker_fee) * 100
            net_profit_pct = gross_spread_pct - fees_pct - slippage_buffer_pct

            if net_profit_pct >= min_profit_pct:
                opportunities.append(
                    Opportunity(
                        buy_exchange=buy_q.exchange_id,
                        sell_exchange=sell_q.exchange_id,
                        symbol=buy_q.symbol,
                        buy_price=buy_q.ask,
                        sell_price=sell_q.bid,
                        gross_spread_pct=gross_spread_pct,
                        net_profit_pct=net_profit_pct,
                    )
                )

    opportunities.sort(key=lambda o: o.net_profit_pct, reverse=True)
    return opportunities
