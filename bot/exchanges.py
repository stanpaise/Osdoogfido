from typing import Dict, Optional

import ccxt

from .config import ExchangeCredentials


def build_exchange(exchange_id: str, creds: Optional[ExchangeCredentials]) -> ccxt.Exchange:
    """Instantiate and load markets for a single ccxt exchange.

    Works with or without credentials -- public market data (tickers) does not
    require auth, only balance lookups and order placement do.
    """
    if not hasattr(ccxt, exchange_id):
        raise ValueError(f"Unknown ccxt exchange id: {exchange_id}")

    exchange_class = getattr(ccxt, exchange_id)
    params = {"enableRateLimit": True}
    if creds:
        params["apiKey"] = creds.api_key
        params["secret"] = creds.api_secret
        if creds.password:
            params["password"] = creds.password

    exchange = exchange_class(params)
    exchange.load_markets()
    return exchange


def resolve_symbol(exchange: ccxt.Exchange, default_symbol: str, overrides: Dict[str, str]) -> Optional[str]:
    """Pick the market symbol this exchange should be quoted on.

    Returns None if the exchange does not list the resolved symbol at all,
    so callers can skip exchanges that can't participate in this pair.
    """
    symbol = overrides.get(exchange.id, default_symbol)
    if symbol in exchange.markets:
        return symbol
    return None
