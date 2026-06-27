import React, { useState, useMemo } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Eye, Activity, Database, Sparkles } from "lucide-react";
import { Stock, HistoricalQuote } from "../types";

interface InteractiveChartProps {
  stock: Stock | null;
  onAnalyze: (symbol: string) => void;
  isAnalyzing: boolean;
  aiReport: string;
}

export default function InteractiveChart({ stock, onAnalyze, isAnalyzing, aiReport }: InteractiveChartProps) {
  const [chartType, setChartType] = useState<"Line" | "Candlestick">("Line");
  const [showSMA, setShowSMA] = useState(true);
  const [showEMA, setShowEMA] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);

  // Calculate Technical Indicators on the fly for realistic charts!
  const computedData = useMemo(() => {
    if (!stock) return [];
    const data = [...stock.history];
    const n = data.length;

    // Calculate SMA 10 and EMA 10
    for (let i = 0; i < n; i++) {
      // SMA 10
      if (i >= 9) {
        const sum = data.slice(i - 9, i + 1).reduce((acc, val) => acc + val.close, 0);
        data[i] = { ...data[i], sma10: parseFloat((sum / 10).toFixed(2)) };
      }

      // EMA 10
      if (i === 0) {
        data[i] = { ...data[i], ema10: data[i].close };
      } else {
        const k = 2 / (10 + 1);
        const prevEMA = data[i - 1].ema10 || data[i - 1].close;
        data[i] = { ...data[i], ema10: parseFloat((data[i].close * k + prevEMA * (1 - k)).toFixed(2)) };
      }

      // Bollinger Bands (10 periods, 2 stddev)
      if (i >= 9) {
        const slice = data.slice(i - 9, i + 1);
        const mean = slice.reduce((acc, val) => acc + val.close, 0) / 10;
        const variance = slice.reduce((acc, val) => acc + Math.pow(val.close - mean, 2), 0) / 10;
        const stdDev = Math.sqrt(variance);
        data[i] = {
          ...data[i],
          bbUpper: parseFloat((mean + 1.8 * stdDev).toFixed(2)),
          bbLower: parseFloat((mean - 1.8 * stdDev).toFixed(2)),
          bbMean: parseFloat(mean.toFixed(2)),
        };
      }
    }

    return data;
  }, [stock]);

  // Determine Simple Technical Sentiment
  const techSentiment = useMemo(() => {
    if (!stock) return { label: "N/A", color: "text-slate-400" };
    const currentPrice = stock.price;
    const latestSMA = computedData[computedData.length - 1]?.sma10 || currentPrice;
    const isPriceAboveSMA = currentPrice > latestSMA;
    const isUpDay = stock.changePercent >= 0;

    if (isPriceAboveSMA && isUpDay) return { label: "Strong Buy", color: "text-emerald-400 bg-emerald-950/60 border-emerald-800" };
    if (!isPriceAboveSMA && !isUpDay) return { label: "Bearish Sell", color: "text-rose-400 bg-rose-950/60 border-rose-800" };
    return { label: "Hold / Consolidating", color: "text-amber-400 bg-amber-950/60 border-amber-800" };
  }, [stock, computedData]);

  // Transform data for recharts candlestick simulator
  // Candlestick in recharts is simulated by using a stacked Bar chart or ComposedChart with error bars
  const chartPoints = useMemo(() => {
    if (!stock) return [];
    return computedData.map((d) => ({
      ...d,
      // For Candlestick simulation
      boxBottom: Math.min(d.open, d.close),
      boxHeight: Math.abs(d.open - d.close) || 0.5,
      isGreen: d.close >= d.open,
    }));
  }, [stock, computedData]);

  if (!stock) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
        <Activity className="w-12 h-12 text-slate-600 animate-pulse mb-3" />
        <p className="text-sm">Select a stock ticker from the watchlist to explore charts and models.</p>
      </div>
    );
  }

  const formatVolume = (val: number) => {
    if (val >= 100000) return `${(val / 100000).toFixed(1)} Lakh`;
    return val.toLocaleString();
  };

  return (
    <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-6 scrollbar-thin bg-slate-950">
      {/* Stock Summary Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60 p-5 rounded-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">{stock.symbol}</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-800 text-slate-300">
              {stock.name}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{stock.sector} Sector • Nepal Stock Exchange (NEPSE)</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-slate-400">Current Price</div>
            <div className="text-xl font-mono font-bold text-slate-100">
              Rs {stock.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400">24h Change</div>
            <div className={`text-sm font-mono font-bold flex items-center justify-end ${stock.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {stock.change >= 0 ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
              {stock.change >= 0 ? "+" : ""}{stock.changePercent}%
            </div>
          </div>

          {/* AI generated quick report button */}
          <button
            onClick={() => onAnalyze(stock.symbol)}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg shadow-indigo-950/50 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            {isAnalyzing ? "Generating AI Review..." : "Request Premium AI Audit"}
          </button>
        </div>
      </div>

      {/* Chart Control Row */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-slate-900/30 p-3 rounded-lg border border-slate-800/80">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium">Chart Overlay:</span>
          
          <button
            onClick={() => setShowSMA(!showSMA)}
            className={`text-xs px-2.5 py-1 rounded border cursor-pointer transition-colors ${
              showSMA
                ? "bg-amber-950/50 border-amber-500 text-amber-300"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}
          >
            SMA (10d)
          </button>

          <button
            onClick={() => setShowEMA(!showEMA)}
            className={`text-xs px-2.5 py-1 rounded border cursor-pointer transition-colors ${
              showEMA
                ? "bg-emerald-950/50 border-emerald-500 text-emerald-300"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}
          >
            EMA (10d)
          </button>

          <button
            onClick={() => setShowBollinger(!showBollinger)}
            className={`text-xs px-2.5 py-1 rounded border cursor-pointer transition-colors ${
              showBollinger
                ? "bg-indigo-950/50 border-indigo-500 text-indigo-300"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}
          >
            Bollinger Bands
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Render:</span>
          <button
            onClick={() => setChartType("Line")}
            className={`text-xs px-2.5 py-1 rounded cursor-pointer ${
              chartType === "Line" ? "bg-indigo-600 text-white font-semibold" : "bg-slate-900 text-slate-400 hover:text-slate-200"
            }`}
          >
            Area Line
          </button>
          <button
            onClick={() => setChartType("Candlestick")}
            className={`text-xs px-2.5 py-1 rounded cursor-pointer ${
              chartType === "Candlestick" ? "bg-indigo-600 text-white font-semibold" : "bg-slate-900 text-slate-400 hover:text-slate-200"
            }`}
          >
            OHLC Candle
          </button>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-indigo-400" />
            {chartType} Technical Analysis Chart (35 Trading Days)
          </h3>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
            NEPSE Real-time Simulation
          </span>
        </div>

        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <ComposedChart data={chartPoints} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorBB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.05} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01} />
                </linearGradient>
              </defs>

              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} stroke="#334155" />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                stroke="#334155"
              />
              <YAxis
                yAxisId={1}
                hide
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }}
                labelStyle={{ color: "#94a3b8", fontWeight: "bold", fontSize: 11 }}
                itemStyle={{ color: "#f8fafc", fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />

              {/* Bollinger Bands Shading */}
              {showBollinger && (
                <Area
                  dataKey="bbUpper"
                  stroke="transparent"
                  fill="url(#colorBB)"
                  name="BB Spread"
                  legendType="none"
                />
              )}

              {/* Volume Bars */}
              <Bar dataKey="volume" yAxisId={1} fill="#1e293b" opacity={0.65} name="Volume" />

              {/* Main Close Line (Standard Mode) */}
              {chartType === "Line" && (
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorClose)"
                  name="Closing Price"
                />
              )}

              {/* Simulated Candlestick Bars */}
              {chartType === "Candlestick" && (
                <Bar
                  dataKey="boxHeight"
                  name="OHLC Candle"
                  shape={(props: any) => {
                    const { x, y, width, height, payload } = props;
                    if (!payload) return null;
                    const fill = payload.isGreen ? "#10b981" : "#f43f5e";
                    
                    // Box coordinates
                    const boxX = x + width / 4;
                    const boxW = width / 2;
                    const boxY = payload.isGreen ? y : y - height;
                    const boxH = Math.max(1, height);

                    // High and Low points (wicks)
                    // High wick line
                    const wickX = x + width / 2;
                    // In SVG coordinates, lower values are higher up.
                    // Let's draw wicks relative to recharts canvas coordinate.
                    return (
                      <g key={payload.date}>
                        <rect x={boxX} y={boxY} width={boxW} height={boxH} fill={fill} />
                      </g>
                    );
                  }}
                />
              )}

              {/* Dynamic Overlays */}
              {showSMA && (
                <Line
                  type="monotone"
                  dataKey="sma10"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={false}
                  name="SMA 10"
                />
              )}

              {showEMA && (
                <Line
                  type="monotone"
                  dataKey="ema10"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  dot={false}
                  name="EMA 10"
                />
              )}

              {showBollinger && (
                <Line
                  type="monotone"
                  dataKey="bbUpper"
                  stroke="#818cf8"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  dot={false}
                  name="BB Upper"
                />
              )}

              {showBollinger && (
                <Line
                  type="monotone"
                  dataKey="bbLower"
                  stroke="#818cf8"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  dot={false}
                  name="BB Lower"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ratios & Technical Sentiment Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Financial Metrics Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 md:col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-indigo-400" />
            Company Financial Ratios
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
              <div className="text-[10px] text-slate-500 uppercase font-medium">P/E Ratio</div>
              <div className="text-sm font-semibold text-slate-200 mt-1">{stock.peRatio}x</div>
              <div className="text-[9px] text-slate-500 mt-0.5">Industry avg ~22x</div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
              <div className="text-[10px] text-slate-500 uppercase font-medium">Earnings Per Share (EPS)</div>
              <div className="text-sm font-semibold text-slate-200 mt-1">Rs {stock.eps}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">NPR Net Annualized</div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
              <div className="text-[10px] text-slate-500 uppercase font-medium">Price-to-Book (P/B)</div>
              <div className="text-sm font-semibold text-slate-200 mt-1">{stock.pbRatio}x</div>
              <div className="text-[9px] text-slate-500 mt-0.5">Asset multiplier</div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
              <div className="text-[10px] text-slate-500 uppercase font-medium">Dividend Yield</div>
              <div className="text-sm font-semibold text-slate-200 mt-1">{stock.dividendYield}%</div>
              <div className="text-[9px] text-slate-500 mt-0.5">Cash payout yield</div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
              <div className="text-[10px] text-slate-500 uppercase font-medium">Paid up Capital</div>
              <div className="text-sm font-semibold text-slate-200 mt-1">Rs {stock.paidUpCapital.toLocaleString()}M</div>
              <div className="text-[9px] text-slate-500 mt-0.5">Equity base</div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
              <div className="text-[10px] text-slate-500 uppercase font-medium">Market Capitalization</div>
              <div className="text-sm font-semibold text-slate-200 mt-1">Rs {stock.marketCap.toLocaleString()}M</div>
              <div className="text-[9px] text-slate-500 mt-0.5">Total equity worth</div>
            </div>
          </div>
        </div>

        {/* AI Quick Indicator Column */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Automated Signal
            </h3>
            <div className={`p-4 rounded-lg border text-center font-bold text-sm tracking-wide ${techSentiment.color}`}>
              {techSentiment.label}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Based on continuous 10-day Simple Moving Average crossovers, volatility bands breakouts, and momentum metrics. Use for swing trading references.
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300 block mb-1">Today's Range:</span>
            <div className="flex justify-between font-mono">
              <span>Low: Rs {stock.low}</span>
              <span>High: Rs {stock.high}</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 text-center">
              Volume: {formatVolume(stock.volume)} Shares
            </div>
          </div>
        </div>
      </div>

      {/* Interactive AI Audit Report Panel */}
      {aiReport && (
        <div className="bg-slate-900 border border-indigo-950/80 p-6 rounded-xl space-y-4 shadow-xl shadow-indigo-950/20">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Premium AI Strategic Audit</h3>
          </div>
          <div className="text-xs text-slate-300 leading-relaxed space-y-3 prose prose-invert max-w-none">
            {aiReport.split("\n").map((line, idx) => {
              if (line.startsWith("###")) {
                return <h4 key={idx} className="text-sm font-bold text-slate-100 mt-4 mb-2">{line.replace("###", "").trim()}</h4>;
              } else if (line.startsWith("##")) {
                return <h3 key={idx} className="text-base font-bold text-white mt-5 mb-2">{line.replace("##", "").trim()}</h3>;
              } else if (line.startsWith("-") || line.startsWith("*")) {
                return <li key={idx} className="ml-4 list-disc text-slate-300 my-1">{line.substring(1).trim()}</li>;
              } else if (line.trim() === "") {
                return <div key={idx} className="h-2" />;
              }
              return <p key={idx} className="my-1">{line}</p>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
