import json
import sqlite3
from contextlib import closing
from datetime import date
from typing import Any, Dict, List, Optional


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
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS status (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    updated_at TEXT NOT NULL,
                    dry_run INTEGER NOT NULL,
                    halted INTEGER NOT NULL,
                    quotes_json TEXT NOT NULL,
                    best_opportunity_json TEXT,
                    last_error TEXT
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

    def recent_trades(self, limit: int = 50) -> List[Dict[str, Any]]:
        with closing(self._connect()) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                "SELECT * FROM trades ORDER BY id DESC LIMIT ?",
                (limit,),
            )
            return [dict(row) for row in cursor.fetchall()]

    def update_status(
        self,
        updated_at: str,
        dry_run: bool,
        halted: bool,
        quotes: Dict[str, Any],
        best_opportunity: Optional[Dict[str, Any]],
        last_error: Optional[str] = None,
    ) -> None:
        with closing(self._connect()) as conn:
            conn.execute(
                """
                INSERT INTO status (id, updated_at, dry_run, halted, quotes_json, best_opportunity_json, last_error)
                VALUES (1, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    updated_at=excluded.updated_at,
                    dry_run=excluded.dry_run,
                    halted=excluded.halted,
                    quotes_json=excluded.quotes_json,
                    best_opportunity_json=excluded.best_opportunity_json,
                    last_error=excluded.last_error
                """,
                (
                    updated_at,
                    int(dry_run),
                    int(halted),
                    json.dumps(quotes),
                    json.dumps(best_opportunity) if best_opportunity is not None else None,
                    last_error,
                ),
            )
            conn.commit()

    def get_status(self) -> Optional[Dict[str, Any]]:
        with closing(self._connect()) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("SELECT * FROM status WHERE id = 1")
            row = cursor.fetchone()
            if row is None:
                return None
            data = dict(row)
            data["dry_run"] = bool(data["dry_run"])
            data["halted"] = bool(data["halted"])
            data["quotes"] = json.loads(data.pop("quotes_json") or "{}")
            best_raw = data.pop("best_opportunity_json")
            data["best_opportunity"] = json.loads(best_raw) if best_raw else None
            return data
