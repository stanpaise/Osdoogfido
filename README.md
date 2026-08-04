# Osdoogfido

## Small Body Candles (MT5 Indicator)

`MQL5/Indicators/SmallBodyCandles.mq5` highlights candles whose body is a
small fraction of their total high-low range — commonly seen as indecision
or absorption candles, and frequently found at Supply & Demand zones.

- Recolors qualifying candles directly on the chart (orange by default),
  leaving normal bullish/bearish candles in their own colors.
- Optionally plots a small marker above/below each flagged candle.
- Optionally alerts (popup / log / push) when a new small-body candle closes.
- Works on any symbol and any timeframe — no external inputs required beyond
  the body-to-range threshold (default 50%).

### Install

1. Copy `SmallBodyCandles.mq5` into your terminal's
   `MQL5/Indicators/` folder (in MetaTrader 5: *File → Open Data Folder →
   MQL5 → Indicators*).
2. Open/compile it in MetaEditor (F7), or just restart MT5 — it will appear
   in the Navigator under *Indicators*.
3. Drag it onto a chart. Adjust `BodyPercentThreshold` and colors in the
   inputs if desired.
