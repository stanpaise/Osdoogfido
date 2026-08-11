from bot.arbitrage import find_opportunities
from bot.price_monitor import PriceQuote


def make_quote(exchange_id, bid, ask, fee=0.001, symbol="BTC/USDT"):
    return PriceQuote(
        exchange_id=exchange_id,
        symbol=symbol,
        bid=bid,
        ask=ask,
        bid_volume=10,
        ask_volume=10,
        taker_fee=fee,
        timestamp=0,
    )


def test_finds_profitable_opportunity():
    quotes = {
        "a": make_quote("a", bid=100.0, ask=100.1),
        "b": make_quote("b", bid=102.0, ask=102.1),
    }
    opportunities = find_opportunities(quotes, min_profit_pct=0.5, slippage_buffer_pct=0.0)
    assert len(opportunities) == 1
    best = opportunities[0]
    assert best.buy_exchange == "a"
    assert best.sell_exchange == "b"
    assert best.net_profit_pct > 0.5


def test_ignores_unprofitable_spread():
    quotes = {
        "a": make_quote("a", bid=100.0, ask=100.05),
        "b": make_quote("b", bid=100.1, ask=100.15),
    }
    opportunities = find_opportunities(quotes, min_profit_pct=0.5, slippage_buffer_pct=0.0)
    assert opportunities == []


def test_does_not_cross_different_symbols():
    quotes = {
        "a": make_quote("a", bid=100.0, ask=100.1, symbol="BTC/USDT"),
        "b": make_quote("b", bid=200.0, ask=200.1, symbol="BTC/USD"),
    }
    opportunities = find_opportunities(quotes, min_profit_pct=0.5, slippage_buffer_pct=0.0)
    assert opportunities == []


def test_ranks_best_opportunity_first():
    quotes = {
        "a": make_quote("a", bid=100.0, ask=100.1),
        "b": make_quote("b", bid=101.0, ask=101.1),
        "c": make_quote("c", bid=105.0, ask=105.1),
    }
    opportunities = find_opportunities(quotes, min_profit_pct=0.1, slippage_buffer_pct=0.0)
    assert opportunities[0].buy_exchange == "a"
    assert opportunities[0].sell_exchange == "c"
