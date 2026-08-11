from dataclasses import dataclass
from typing import Dict

import ccxt

from .arbitrage import Opportunity


@dataclass
class TradeResult:
    opportunity: Opportunity
    trade_size_quote: float
    base_amount: float
    fees_quote: float
    realized_pnl_quote: float
    dry_run: bool


def execute_opportunity(
    opportunity: Opportunity,
    trade_size_quote: float,
    exchanges: Dict[str, ccxt.Exchange],
    dry_run: bool,
) -> TradeResult:
    """Buy on the cheap exchange and sell on the expensive one for the given quote size.

    Both legs execute independently against each exchange's own pre-funded
    balance -- there is no cross-exchange transfer in the hot path. In live
    mode the buy leg fills first; if the sell leg then fails, the position is
    left un-hedged on the buy exchange and must be handled manually (this is
    logged loudly by the caller).
    """
    base_amount = trade_size_quote / opportunity.buy_price

    if dry_run:
        buy_fill_price = opportunity.buy_price
        sell_fill_price = opportunity.sell_price
    else:
        buy_exchange = exchanges[opportunity.buy_exchange]
        sell_exchange = exchanges[opportunity.sell_exchange]

        buy_order = buy_exchange.create_market_buy_order(opportunity.symbol, base_amount)
        buy_fill_price = buy_order.get("average") or opportunity.buy_price
        base_amount = buy_order.get("filled") or base_amount

        sell_order = sell_exchange.create_market_sell_order(opportunity.symbol, base_amount)
        sell_fill_price = sell_order.get("average") or opportunity.sell_price

    buy_taker = exchanges[opportunity.buy_exchange].markets.get(opportunity.symbol, {}).get("taker") or 0.001
    sell_taker = exchanges[opportunity.sell_exchange].markets.get(opportunity.symbol, {}).get("taker") or 0.001

    cost = base_amount * buy_fill_price
    proceeds = base_amount * sell_fill_price
    fees_quote = cost * buy_taker + proceeds * sell_taker
    realized_pnl_quote = proceeds - cost - fees_quote

    return TradeResult(
        opportunity=opportunity,
        trade_size_quote=cost,
        base_amount=base_amount,
        fees_quote=fees_quote,
        realized_pnl_quote=realized_pnl_quote,
        dry_run=dry_run,
    )
