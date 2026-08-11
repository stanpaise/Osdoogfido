import sqlite3
from contextlib import closing
from datetime import date
from typing import Any, Dict


class Storage:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    def _init_schema(self) -> None:
        with closing(self._connect()) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS trades (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    symbol TEXT NOT NULL,
                    buy_exchange TEXT NOT NULL,
                    sell_exchange TEXT NOT NULL,
                    buy_price REAL NOT NULL,
                    sell_price REAL NOT NULL,
                    trade_size_quote REAL NOT NULL,
                    base_amount REAL NOT NULL,
                    fees_quote REAL NOT NULL,
                    realized_pnl_quote REAL NOT NULL,
                    dry_run INTEGER NOT NULL
                )
                """
            )
            conn.commit()

    def record_trade(self, trade: Dict[str, Any]) -> None:
        with closing(self._connect()) as conn:
            conn.execute(
                """
                INSERT INTO trades (
                    timestamp, symbol, buy_exchange, sell_exchange,
                    buy_price, sell_price, trade_size_quote, base_amount,
                    fees_quote, realized_pnl_quote, dry_run
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    trade["timestamp"],
                    trade["symbol"],
                    trade["buy_exchange"],
                    trade["sell_exchange"],
                    trade["buy_price"],
                    trade["sell_price"],
                    trade["trade_size_quote"],
                    trade["base_amount"],
                    trade["fees_quote"],
                    trade["realized_pnl_quote"],
                    int(trade["dry_run"]),
                ),
            )
            conn.commit()

    def realized_pnl_since(self, since: date) -> float:
        with closing(self._connect()) as conn:
            cursor = conn.execute(
                "SELECT COALESCE(SUM(realized_pnl_quote), 0) FROM trades WHERE timestamp >= ?",
                (since.isoformat(),),
            )
            (total,) = cursor.fetchone()
            return total or 0.0
