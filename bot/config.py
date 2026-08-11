import os
from dataclasses import dataclass
from typing import Dict, List, Optional

from dotenv import load_dotenv

load_dotenv()


@dataclass
class ExchangeCredentials:
    api_key: str
    api_secret: str
    password: Optional[str] = None


def _bool_env(name: str, default: bool) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")


def _parse_overrides(raw: str) -> Dict[str, str]:
    overrides: Dict[str, str] = {}
    for pair in raw.split(","):
        pair = pair.strip()
        if not pair or ":" not in pair:
            continue
        exchange_id, symbol = pair.split(":", 1)
        overrides[exchange_id.strip()] = symbol.strip()
    return overrides


@dataclass
class Config:
    exchange_ids: List[str]
    default_symbol: str
    symbol_overrides: Dict[str, str]
    dry_run: bool
    max_trade_usd: float
    daily_loss_limit_usd: float
    min_profit_pct: float
    slippage_buffer_pct: float
    poll_interval_seconds: float
    credentials: Dict[str, ExchangeCredentials]
    db_path: str

    @classmethod
    def from_env(cls) -> "Config":
        exchange_ids = [
            e.strip()
            for e in os.getenv("EXCHANGES", "binance,coinbase,kraken,kucoin").split(",")
            if e.strip()
        ]

        credentials: Dict[str, ExchangeCredentials] = {}
        for exchange_id in exchange_ids:
            prefix = exchange_id.upper()
            api_key = os.getenv(f"{prefix}_API_KEY")
            api_secret = os.getenv(f"{prefix}_API_SECRET")
            password = os.getenv(f"{prefix}_API_PASSPHRASE")
            if api_key and api_secret:
                credentials[exchange_id] = ExchangeCredentials(api_key, api_secret, password)

        return cls(
            exchange_ids=exchange_ids,
            default_symbol=os.getenv("SYMBOL", "BTC/USDT"),
            symbol_overrides=_parse_overrides(os.getenv("SYMBOL_OVERRIDES", "coinbase:BTC/USD")),
            dry_run=_bool_env("DRY_RUN", True),
            max_trade_usd=float(os.getenv("MAX_TRADE_USD", "25")),
            daily_loss_limit_usd=float(os.getenv("DAILY_LOSS_LIMIT_USD", "50")),
            min_profit_pct=float(os.getenv("MIN_PROFIT_PCT", "0.5")),
            slippage_buffer_pct=float(os.getenv("SLIPPAGE_BUFFER_PCT", "0.05")),
            poll_interval_seconds=float(os.getenv("POLL_INTERVAL_SECONDS", "5")),
            credentials=credentials,
            db_path=os.getenv("DB_PATH", "trades.db"),
        )
