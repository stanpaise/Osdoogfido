import os
from datetime import date
from functools import wraps

from flask import Flask, Response, jsonify, render_template, request

from bot.config import Config
from bot.storage import Storage


def _bool_env(name: str, default: bool) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")


def require_auth(view):
    """HTTP Basic Auth gate.

    DASHBOARD_USERNAME / DASHBOARD_PASSWORD must be set -- there is no
    "no auth" fallback, since this dashboard can end up reachable from the
    public internet once deployed on a VM. Basic Auth alone is not enough
    once you're off localhost: put this behind HTTPS (e.g. an nginx/Caddy
    reverse proxy) or an SSH tunnel, since Basic Auth credentials travel in
    cleartext over plain HTTP.
    """

    @wraps(view)
    def wrapped(*args, **kwargs):
        username = os.getenv("DASHBOARD_USERNAME")
        password = os.getenv("DASHBOARD_PASSWORD")
        auth = request.authorization
        if not auth or auth.username != username or auth.password != password:
            return Response(
                "Authentication required",
                401,
                {"WWW-Authenticate": 'Basic realm="Osdoogfido dashboard"'},
            )
        return view(*args, **kwargs)

    return wrapped


def create_app() -> Flask:
    if not os.getenv("DASHBOARD_USERNAME") or not os.getenv("DASHBOARD_PASSWORD"):
        raise RuntimeError(
            "DASHBOARD_USERNAME and DASHBOARD_PASSWORD must both be set before starting "
            "the dashboard -- see .env.example."
        )

    config = Config.from_env()
    storage = Storage(config.db_path)

    app = Flask(__name__)

    @app.get("/healthz")
    def healthz():
        return "ok"

    @app.get("/")
    @require_auth
    def index():
        return render_template("dashboard.html")

    @app.get("/api/status")
    @require_auth
    def api_status():
        status = storage.get_status()
        daily_pnl = storage.realized_pnl_since(date.today())
        return jsonify(
            {
                "status": status,
                "daily_pnl": daily_pnl,
                "max_trade_usd": config.max_trade_usd,
                "daily_loss_limit_usd": config.daily_loss_limit_usd,
                "min_profit_pct": config.min_profit_pct,
                "symbol": config.default_symbol,
            }
        )

    @app.get("/api/trades")
    @require_auth
    def api_trades():
        return jsonify(storage.recent_trades(limit=50))

    return app


app = create_app()

if __name__ == "__main__":
    host = os.getenv("DASHBOARD_HOST", "127.0.0.1")
    port = int(os.getenv("DASHBOARD_PORT", "8080"))
    app.run(host=host, port=port)
