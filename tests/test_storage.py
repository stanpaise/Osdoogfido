from datetime import datetime, timezone

import pytest

from bot.storage import Storage


@pytest.fixture
def storage(tmp_path):
    return Storage(str(tmp_path / "test.db"))


def test_get_status_returns_none_before_first_update(storage):
    assert storage.get_status() is None


def test_update_and_get_status_round_trips(storage):
    now = datetime.now(timezone.utc).isoformat()
    quotes = {"a": {"bid": 100.0, "ask": 100.1}}
    best_opportunity = {"buy_exchange": "a", "sell_exchange": "b", "net_profit_pct": 1.2}

    storage.update_status(now, dry_run=True, halted=False, quotes=quotes, best_opportunity=best_opportunity)
    status = storage.get_status()

    assert status["updated_at"] == now
    assert status["dry_run"] is True
    assert status["halted"] is False
    assert status["quotes"] == quotes
    assert status["best_opportunity"] == best_opportunity
    assert status["last_error"] is None


def test_update_status_overwrites_previous_row(storage):
    now = datetime.now(timezone.utc).isoformat()
    storage.update_status(now, dry_run=True, halted=False, quotes={}, best_opportunity=None)
    storage.update_status(now, dry_run=True, halted=True, quotes={}, best_opportunity=None, last_error="boom")

    status = storage.get_status()
    assert status["halted"] is True
    assert status["last_error"] == "boom"


def test_recent_trades_returns_most_recent_first(storage):
    for i in range(3):
        storage.record_trade(
            {
                "timestamp": f"2026-08-1{i}T00:00:00+00:00",
                "symbol": "BTC/USDT",
                "buy_exchange": "a",
                "sell_exchange": "b",
                "buy_price": 100,
                "sell_price": 101,
                "trade_size_quote": 25,
                "base_amount": 0.25,
                "fees_quote": 0.1,
                "realized_pnl_quote": 0.5,
                "dry_run": True,
            }
        )
    trades = storage.recent_trades(limit=2)
    assert len(trades) == 2
    assert trades[0]["timestamp"] == "2026-08-12T00:00:00+00:00"
