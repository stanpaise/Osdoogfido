from datetime import datetime, timezone

import pytest

from bot.risk_manager import RiskManager
from bot.storage import Storage


@pytest.fixture
def storage(tmp_path):
    return Storage(str(tmp_path / "test.db"))


def test_caps_trade_size_to_max_trade_usd(storage):
    rm = RiskManager(storage, max_trade_usd=25, daily_loss_limit_usd=50)
    result = rm.size_trade(base_available_on_sell_exchange=1.0, quote_available_on_buy_exchange=1000, price=100)
    assert result.trade_size_quote == 25


def test_caps_trade_size_to_available_base_balance(storage):
    rm = RiskManager(storage, max_trade_usd=25, daily_loss_limit_usd=50)
    result = rm.size_trade(base_available_on_sell_exchange=0.05, quote_available_on_buy_exchange=1000, price=100)
    assert result.trade_size_quote == 5.0


def test_caps_trade_size_to_available_quote_balance(storage):
    rm = RiskManager(storage, max_trade_usd=25, daily_loss_limit_usd=50)
    result = rm.size_trade(base_available_on_sell_exchange=1.0, quote_available_on_buy_exchange=10, price=100)
    assert result.trade_size_quote == 10


def test_zero_balance_blocks_trade(storage):
    rm = RiskManager(storage, max_trade_usd=25, daily_loss_limit_usd=50)
    result = rm.size_trade(base_available_on_sell_exchange=0.0, quote_available_on_buy_exchange=1000, price=100)
    assert result.trade_size_quote == 0
    assert result.reason is not None


def test_halts_after_daily_loss_limit_reached(storage):
    storage.record_trade(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "symbol": "BTC/USDT",
            "buy_exchange": "a",
            "sell_exchange": "b",
            "buy_price": 100,
            "sell_price": 99,
            "trade_size_quote": 25,
            "base_amount": 0.25,
            "fees_quote": 0.1,
            "realized_pnl_quote": -60,
            "dry_run": True,
        }
    )
    rm = RiskManager(storage, max_trade_usd=25, daily_loss_limit_usd=50)
    assert rm.is_halted() is True
    result = rm.size_trade(1.0, 1000, 100)
    assert result.trade_size_quote == 0
    assert "halted" in result.reason
