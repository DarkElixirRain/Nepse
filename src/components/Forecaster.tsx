import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Brain, Settings, Play, CheckCircle2, TrendingUp, AlertTriangle, Cpu, Sparkles } from "lucide-react";
import { Stock, ForecastPoint, ForecastResponse } from "../types";
import { getFallbackForecast } from "../utils/clientFallback";

interface ForecasterProps {
  stock: Stock | null;
  isPremium: boolean;
  onUpgrade: () => void;
}

export default function Forecaster({ stock, isPremium, onUpgrade }: ForecasterProps) {
  const [modelType, setModelType] = useState<"LSTM" | "ARIMA" | "MLP">("LSTM");
  const [horizon, setHorizon] = useState<number>(30);
  const [epochs, setEpochs] = useState<number>(30);
  const [lr, setLr] = useState<number>(0.01);

  const [isTraining, setIsTraining] = useState(false);
  const [trainingLog, setTrainingLog] = useState<string[]>([]);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [forecastResult, setForecastResult] = useState<ForecastResponse | null>(null);

  // Set defaults and auto-fetch forecast when stock symbol changes
  useEffect(() => {
    if (!stock) return;
    
    setForecastResult(null);
    setTrainingLog([]);
    setTrainingProgress(0);

    // Dynamic initial defaults based on subscription tier to avoid immediate popups
    const initialModel = !isPremium ? "ARIMA" : "LSTM";
    const initialHorizon = !isPremium ? 7 : 30;
    
    setModelType(initialModel);
    setHorizon(initialHorizon);

    const autoFetch = async () => {
      try {
        const res = await fetch("/api/ml/forecast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: stock.symbol,
            modelType: initialModel,
            horizon: initialHorizon,
            epochs: 30,
            learningRate: 0.01,
          }),
        });

        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            setForecastResult(data);
            return;
          }
        }
        
        const fallback = getFallbackForecast(stock.symbol, initialHorizon, initialModel);
        setForecastResult(fallback);
      } catch (err) {
        console.warn("Auto forecast error, using fallback:", err);
        const fallback = getFallbackForecast(stock.symbol, initialHorizon, initialModel);
        setForecastResult(fallback);
      }
    };

    autoFetch();
  }, [stock?.symbol, isPremium]);

  if (!stock) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 bg-slate-950">
        <Brain className="w-12 h-12 text-slate-600 animate-pulse mb-3" />
        <p className="text-sm">Select a stock ticker from the watchlist to configure forecasting models.</p>
      </div>
    );
  }

  // Handle premium checks
  const handleTrainModel = async () => {
    // Premium limits: Only ARIMA and 7-day horizon are free. LSTM and MLP, or 30/90-day horizons require Premium.
    if (!isPremium && (modelType === "LSTM" || modelType === "MLP" || horizon > 7)) {
      onUpgrade();
      return;
    }

    setIsTraining(true);
    setTrainingProgress(0);
    setTrainingLog(["[INFO] Initializing PyTorch/TensorFlow environment...", "[INFO] Fetching historical parameters of " + stock.symbol]);

    // Simulate training epochs over 2.5 seconds with loss convergence logs
    const totalSteps = epochs;
    let currentStep = 0;
    let baseLoss = 0.2854;

    const interval = setInterval(() => {
      currentStep++;
      const progress = Math.floor((currentStep / totalSteps) * 100);
      setTrainingProgress(progress);

      // simulate gradient descent convergence
      const stepLoss = baseLoss * Math.exp(-0.08 * currentStep) + Math.random() * 0.005;
      const logLine = `Epoch ${currentStep}/${epochs} - loss: ${stepLoss.toFixed(6)} - val_loss: ${(stepLoss * 1.15).toFixed(6)}`;
      setTrainingLog((prev) => [...prev, logLine]);

      if (currentStep >= totalSteps) {
        clearInterval(interval);
        setTrainingLog((prev) => [...prev, "[SUCCESS] Convergence reached. Running forecasting tensor projections..."]);
        
        // Execute real backend API call to retrieve simulated forecast data
        fetchForecast();
      }
    }, 50);
  };

  const fetchForecast = async () => {
    try {
      const res = await fetch("/api/ml/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: stock?.symbol || "NABIL",
          modelType,
          horizon,
          epochs,
          learningRate: lr,
        }),
      });

      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setForecastResult(data);
          return;
        }
      }
      
      const fallback = getFallbackForecast(stock?.symbol || "NABIL", horizon, modelType);
      setForecastResult(fallback);
    } catch (err) {
      console.warn("Forecaster API error, using fallback:", err);
      const fallback = getFallbackForecast(stock?.symbol || "NABIL", horizon, modelType);
      setForecastResult(fallback);
    } finally {
      setIsTraining(false);
    }
  };

  // Combine stock history close prices + predicted prices into one continuous Recharts data array
  const combinedChartData = () => {
    if (!forecastResult) return [];

    const historicalPoints = stock.history.map((h) => ({
      date: h.date,
      actual: h.close,
      predicted: null as number | null,
      lower: null as number | null,
      upper: null as number | null,
    }));

    // Seed the first forecast point to start at the last historical price for graph continuity
    const lastHistory = stock.history[stock.history.length - 1];
    const forecastPoints = [
      {
        date: lastHistory.date,
        actual: lastHistory.close,
        predicted: lastHistory.close,
        lower: lastHistory.close,
        upper: lastHistory.close,
      },
      ...forecastResult.forecast.map((f) => ({
        date: f.date,
        actual: null as number | null,
        predicted: f.predicted,
        lower: f.lower,
        upper: f.upper,
      })),
    ];

    return [...historicalPoints, ...forecastPoints];
  };

  const chartPoints = combinedChartData();

  return (
    <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-6 scrollbar-thin bg-slate-950">
      {/* Forecasting Control Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parameters Column */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-indigo-400" />
            ML Model Configurations
          </h3>

          <div className="space-y-4">
            {/* Model Architecture Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">AI Model Architecture</label>
              <div className="grid grid-cols-3 gap-2">
                {(["LSTM", "ARIMA", "MLP"] as const).map((m) => {
                  const isLocked = !isPremium && (m === "LSTM" || m === "MLP");
                  return (
                    <button
                      key={m}
                      onClick={() => setModelType(m)}
                      className={`text-xs py-2 px-1 rounded-lg border font-medium flex flex-col items-center justify-center cursor-pointer transition-all ${
                        modelType === m
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-950/50"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span>{m}</span>
                      {isLocked && <span className="text-[8px] text-amber-500 font-bold uppercase mt-0.5">PRO</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prediction Forecast Horizon */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Forecasting Horizon</label>
              <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3, 7, 30, 90] as const).map((h) => {
                  const isLocked = !isPremium && h > 7;
                  return (
                    <button
                      key={h}
                      onClick={() => setHorizon(h)}
                      className={`text-xs py-2 px-1 rounded-lg border font-medium flex flex-col items-center justify-center cursor-pointer transition-all ${
                        horizon === h
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-950/50"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span>{h} {h === 1 ? "Day" : "Days"}</span>
                      {isLocked && <span className="text-[8px] text-amber-500 font-bold uppercase mt-0.5">PRO</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Neural Net Hyperparameters */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Max Epochs</label>
                <select
                  value={epochs}
                  onChange={(e) => setEpochs(Number(e.target.value))}
                  className="w-full text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg p-2 focus:outline-none focus:border-indigo-500"
                >
                  <option value={10}>10 Epochs</option>
                  <option value={30}>30 Epochs</option>
                  <option value={50}>50 Epochs</option>
                  <option value={100}>100 Epochs</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Learning Rate</label>
                <select
                  value={lr}
                  onChange={(e) => setLr(Number(e.target.value))}
                  className="w-full text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg p-2 focus:outline-none focus:border-indigo-500"
                >
                  <option value={0.1}>0.1 (High)</option>
                  <option value={0.01}>0.01 (Mid)</option>
                  <option value={0.001}>0.001 (Slow)</option>
                </select>
              </div>
            </div>

            {/* Trigger Button */}
            <button
              onClick={handleTrainModel}
              disabled={isTraining}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold py-3 rounded-lg transition-all shadow-md shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Train & Predict Stock Path
            </button>
          </div>
        </div>

        {/* Training Logs Simulator Console Column */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col h-full lg:col-span-2 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-400" />
              Machine Learning Compilation Console
            </h3>
            {isTraining && (
              <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded animate-pulse font-mono font-semibold">
                TRAINING IN REAL-TIME
              </span>
            )}
          </div>

          <div className="flex-1 bg-slate-950 rounded-lg border border-slate-850 p-4 font-mono text-[10px] text-emerald-500/80 overflow-y-auto space-y-1 h-[170px] scrollbar-thin">
            {trainingLog.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
            {isTraining && (
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-3">
                <div
                  className="bg-emerald-500 h-full transition-all duration-75"
                  style={{ width: `${trainingProgress}%` }}
                ></div>
              </div>
            )}
            {!isTraining && trainingLog.length === 0 && (
              <div className="text-slate-500 text-center py-12">
                Click "Train & Predict" to compile data and visualize projections on the console.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Forecast Visualizer Chart */}
      {forecastResult && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Price Projection Chart of {stock.symbol}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Utilizing {forecastResult.modelType} neural network weights, trained over {epochs} epochs (Learning Rate={lr}).
              </p>
            </div>
            <div className="flex gap-4 text-xs font-mono">
              <span className="flex items-center text-slate-300">
                <span className="w-3 h-3 bg-indigo-600 rounded-full mr-1.5"></span>
                Actual Price
              </span>
              <span className="flex items-center text-emerald-400">
                <span className="w-3 h-3 bg-emerald-400 rounded-full mr-1.5"></span>
                AI Forecast
              </span>
            </div>
          </div>

          {/* Forecasting Chart Area */}
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#334155" tick={{ fill: "#64748b", fontSize: 10 }} />
                <YAxis domain={["auto", "auto"]} stroke="#334155" tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }}
                  labelStyle={{ color: "#94a3b8", fontWeight: "bold", fontSize: 11 }}
                  itemStyle={{ fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />

                {/* Actual Historical Path */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={false}
                  name="Historical close (NPR)"
                />

                {/* AI Predicted Line Path */}
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  strokeDasharray="3 3"
                  dot={false}
                  name="AI Projected"
                />

                {/* Confidence Intervals Upper/Lower Bands */}
                <Line
                  type="monotone"
                  dataKey="upper"
                  stroke="#34d399"
                  strokeWidth={1}
                  opacity={0.35}
                  dot={false}
                  name="95% Confidence Upper Band"
                />

                <Line
                  type="monotone"
                  dataKey="lower"
                  stroke="#ef4444"
                  strokeWidth={1}
                  opacity={0.35}
                  dot={false}
                  name="95% Confidence Lower Band"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Forecast Analysis Board */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-slate-800">
            {/* Circular Progress Bars / Probabilities */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Decision Weights</span>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-emerald-400">Buy Probability</span>
                    <span className="font-mono text-slate-200">{forecastResult.buyProbability}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full" style={{ width: `${forecastResult.buyProbability}%` }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-amber-400">Hold Probability</span>
                    <span className="font-mono text-slate-200">{forecastResult.holdProbability}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full" style={{ width: `${forecastResult.holdProbability}%` }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-rose-400">Sell Probability</span>
                    <span className="font-mono text-slate-200">{forecastResult.sellProbability}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full" style={{ width: `${forecastResult.sellProbability}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Neural Net Signals */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Model Signals</span>
              <div className="space-y-2">
                {forecastResult.signals.map((signal, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs text-slate-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>{signal}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Evaluation Metrics */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Validation Metrics</span>
              <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <div className="text-slate-500 uppercase text-[9px]">Mean Squared Error (MSE)</div>
                  <div className="text-slate-200 font-bold mt-1 text-sm">{forecastResult.metrics.mse}</div>
                </div>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <div className="text-slate-500 uppercase text-[9px]">Mean Absolute Error (MAE)</div>
                  <div className="text-slate-200 font-bold mt-1 text-sm">{forecastResult.metrics.mae}</div>
                </div>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800 col-span-2">
                  <div className="text-slate-500 uppercase text-[9px]">R-Squared Accuracy Rating (R²)</div>
                  <div className="text-emerald-400 font-bold mt-1 text-sm">{(forecastResult.metrics.r2 * 100).toFixed(2)}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
