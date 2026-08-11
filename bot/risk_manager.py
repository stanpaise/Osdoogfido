from dataclasses import dataclass
from datetime import date
from typing import Optional

from .storage import Storage


@dataclass
class SizingResult:
    trade_size_quote: float
    reason: Optional[str] = None


class RiskManager:
    """Hard safety rails around trade sizing.

    Trade size is capped to the smallest of: the fixed per-trade cap, the
    quote-currency balance already sitting on the buy exchange, and the
    base-asset balance already sitting on the sell exchange -- since this bot
    trades against pre-funded balances on each exchange rather than moving
    funds between them in real time.
    """

    def __init__(self, storage: Storage, max_trade_usd: float, daily_loss_limit_usd: float):
        self.storage = storage
        self.max_trade_usd = max_trade_usd
        self.daily_loss_limit_usd = daily_loss_limit_usd
        self._halted = False

    def is_halted(self) -> bool:
        if self._halted:
            return True
        today_pnl = self.storage.realized_pnl_since(date.today())
        if today_pnl <= -abs(self.daily_loss_limit_usd):
            self._halted = True
        return self._halted

    def size_trade(
        self,
        base_available_on_sell_exchange: float,
        quote_available_on_buy_exchange: float,
        price: float,
    ) -> SizingResult:
        if self.is_halted():
            return SizingResult(0.0, "daily loss limit reached; bot halted")

        max_by_base_balance = base_available_on_sell_exchange * price
        trade_size = min(self.max_trade_usd, quote_available_on_buy_exchange, max_by_base_balance)

        if trade_size <= 0:
            return SizingResult(0.0, "insufficient balance on buy and/or sell exchange")

        return SizingResult(trade_size)

    def reset_halt(self) -> None:
        self._halted = False
