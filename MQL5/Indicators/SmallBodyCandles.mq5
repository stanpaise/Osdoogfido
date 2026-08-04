//+------------------------------------------------------------------+
//|                                          SmallBodyCandles.mq5     |
//|          Highlights candles whose body is a small fraction        |
//|          of their total high-low range (indecision / absorption   |
//|          candles often found at Supply & Demand zones).           |
//+------------------------------------------------------------------+
#property copyright "Osdoogfido"
#property link      ""
#property version   "1.00"
#property description "Highlights candles where body size < X% of the total "
#property description "high-low range. These small-body candles often mark "
#property description "indecision / absorption and frequently sit at Supply "
#property description "and Demand zones. Works on any symbol and timeframe."

#property indicator_chart_window
#property indicator_buffers 6
#property indicator_plots   2

//--- Plot 1: recolored candles (bullish / bearish / small-body highlight)
#property indicator_type1   DRAW_COLOR_CANDLES
#property indicator_color1  clrLimeGreen, clrDimGray, clrDarkOrange
#property indicator_width1  1
#property indicator_label1  "Open;High;Low;Close"

//--- Plot 2: optional marker drawn above/below highlighted candles
#property indicator_type2   DRAW_ARROW
#property indicator_color2  clrDarkOrange
#property indicator_width2  1
#property indicator_label2  "Small Body Marker"

//--- Inputs -----------------------------------------------------------
input group "Detection"
input double BodyPercentThreshold = 50.0;   // Body must be < this % of range to be flagged
input bool   RecolorCandles       = true;   // Recolor candle bodies on the chart
input bool   ShowMarker           = true;   // Draw a marker above/below flagged candles
input int    MarkerArrowCode      = 159;    // Wingdings arrow code for the marker (159 = dot)
input double MarkerOffsetPoints   = 50;     // Marker distance from the candle wick, in points

input group "Colors"
input color  BullishColor  = clrLimeGreen;  // Normal bullish candle color
input color  BearishColor  = clrDimGray;    // Normal bearish candle color
input color  HighlightColor= clrDarkOrange; // Small-body (indecision) candle color

input group "Alerts"
input bool   EnableAlerts     = false;      // Alert when a new small-body candle forms
input bool   PopupAlert       = true;       // Show terminal popup alert
input bool   PushAlert        = false;      // Send push notification to mobile
input bool   PrintToLog       = true;       // Print message to Experts log

//--- Indicator buffers --------------------------------------------------
double BufOpen[];
double BufHigh[];
double BufLow[];
double BufClose[];
double BufColor[];
double BufMarker[];

string IndicatorTag;
datetime lastAlertedBarTime = 0;

//+------------------------------------------------------------------+
int OnInit()
  {
   SetIndexBuffer(0, BufOpen,  INDICATOR_DATA);
   SetIndexBuffer(1, BufHigh,  INDICATOR_DATA);
   SetIndexBuffer(2, BufLow,   INDICATOR_DATA);
   SetIndexBuffer(3, BufClose, INDICATOR_DATA);
   SetIndexBuffer(4, BufColor, INDICATOR_COLOR_INDEX);
   SetIndexBuffer(5, BufMarker, INDICATOR_DATA);

   PlotIndexSetInteger(0, PLOT_COLOR_INDEXES, 3);
   PlotIndexSetInteger(0, PLOT_DRAW_TYPE, RecolorCandles ? DRAW_COLOR_CANDLES : DRAW_NONE);
   PlotIndexSetInteger(0, PLOT_LINE_COLOR, 0, BullishColor);
   PlotIndexSetInteger(0, PLOT_LINE_COLOR, 1, BearishColor);
   PlotIndexSetInteger(0, PLOT_LINE_COLOR, 2, HighlightColor);

   PlotIndexSetInteger(1, PLOT_ARROW, MarkerArrowCode);
   PlotIndexSetInteger(1, PLOT_LINE_COLOR, 0, HighlightColor);
   PlotIndexSetDouble(1, PLOT_EMPTY_VALUE, EMPTY_VALUE);
   if(!ShowMarker)
      PlotIndexSetInteger(1, PLOT_DRAW_TYPE, DRAW_NONE);

   ArraySetAsSeries(BufOpen, false);
   ArraySetAsSeries(BufHigh, false);
   ArraySetAsSeries(BufLow, false);
   ArraySetAsSeries(BufClose, false);
   ArraySetAsSeries(BufColor, false);
   ArraySetAsSeries(BufMarker, false);

   IndicatorTag = "SmallBodyCandles(" + DoubleToString(BodyPercentThreshold, 1) + "%)";
   IndicatorSetString(INDICATOR_SHORTNAME, IndicatorTag);

   double threshold = BodyPercentThreshold;
   if(threshold <= 0.0 || threshold > 100.0)
      Print("SmallBodyCandles: BodyPercentThreshold should be between 0 and 100 (exclusive of 0). Using 50.0.");

   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
int OnCalculate(const int rates_total,
                const int prev_calculated,
                const datetime &time[],
                const double &open[],
                const double &high[],
                const double &low[],
                const double &close[],
                const long &tick_volume[],
                const long &volume[],
                const int &spread[])
  {
   if(rates_total < 1)
      return(0);

   double threshold = (BodyPercentThreshold > 0.0 && BodyPercentThreshold <= 100.0)
                       ? BodyPercentThreshold : 50.0;

   int start = (prev_calculated > 1) ? prev_calculated - 1 : 0;

   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   double markerOffset = MarkerOffsetPoints * point;

   for(int i = start; i < rates_total; i++)
     {
      BufOpen[i]  = open[i];
      BufHigh[i]  = high[i];
      BufLow[i]   = low[i];
      BufClose[i] = close[i];

      double range = high[i] - low[i];
      double body  = MathAbs(close[i] - open[i]);
      bool   isSmallBody = (range <= 0.0) ? true : ((body / range) * 100.0 < threshold);

      if(isSmallBody)
        {
         BufColor[i] = 2; // highlight color
        }
      else if(close[i] >= open[i])
        {
         BufColor[i] = 0; // bullish
        }
      else
        {
         BufColor[i] = 1; // bearish
        }

      if(isSmallBody && ShowMarker)
        {
         // Place marker on the side with more room: above the high if the
         // upper wick is the larger one, otherwise below the low.
         double upperWick = high[i] - MathMax(open[i], close[i]);
         double lowerWick = MathMin(open[i], close[i]) - low[i];
         if(upperWick >= lowerWick)
            BufMarker[i] = high[i] + markerOffset;
         else
            BufMarker[i] = low[i] - markerOffset;
        }
      else
        {
         BufMarker[i] = EMPTY_VALUE;
        }
     }

   //--- alert on the most recently closed bar
   if(EnableAlerts && rates_total >= 2)
     {
      int closedBar = rates_total - 2; // last fully closed bar
      if(BufColor[closedBar] == 2 && time[closedBar] != lastAlertedBarTime)
        {
         lastAlertedBarTime = time[closedBar];
         string msg = StringFormat("%s: small-body candle on %s %s at %s",
                                    IndicatorTag, _Symbol, EnumToString(Period()),
                                    TimeToString(time[closedBar], TIME_DATE | TIME_MINUTES));
         if(PopupAlert)
            Alert(msg);
         if(PrintToLog)
            Print(msg);
         if(PushAlert)
            SendNotification(msg);
        }
     }

   return(rates_total);
  }
//+------------------------------------------------------------------+
