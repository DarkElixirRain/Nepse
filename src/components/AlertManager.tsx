import React, { useState } from "react";
import { Bell, Plus, Trash2, Eye, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Stock, StockAlert } from "../types";

interface AlertManagerProps {
  stocks: Stock[];
  alerts: StockAlert[];
  onAddAlert: (symbol: string, type: "above" | "below", value: number) => void;
  onRemoveAlert: (id: string) => void;
  isPremium: boolean;
  onUpgrade: () => void;
}

export default function AlertManager({
  stocks,
  alerts,
  onAddAlert,
  onRemoveAlert,
  isPremium,
  onUpgrade,
}: AlertManagerProps) {
  const [symbol, setSymbol] = useState("");
  const [type, setType] = useState<"above" | "below">("above");
  const [value, setValue] = useState<number | "">("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !value) return;

    // Premium limit check: Free users can only set 1 alert.
    if (!isPremium && alerts.length >= 1) {
      onUpgrade();
      return;
    }

    onAddAlert(symbol, type, Number(value));
    setValue("");
  };

  const handleSymbolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sym = e.target.value;
    setSymbol(sym);
    const selected = stocks.find((s) => s.symbol === sym);
    if (selected) {
      setValue(selected.price);
    }
  };

  return (
    <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-6 scrollbar-thin bg-slate-950">
      {/* SaaS Limit Warnings */}
      {!isPremium && (
        <div className="bg-amber-950/30 border border-amber-900/60 p-4 rounded-xl flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-300">Free Tier Alert Limitation Active</h4>
            <p className="text-[11px] text-amber-400/85">
              Free users are limited to 1 active price trigger. Upgrade to Premium for real-time push alerts, continuous websocket checks, and unlimited threshold alarms!
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Alarms Form */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 h-fit">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-indigo-400" />
            Establish Smart Alert
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Select Stock</label>
              <select
                value={symbol}
                onChange={handleSymbolChange}
                required
                className="w-full text-xs bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">-- Choose Ticker --</option>
                {stocks.map((s) => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.symbol} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Trigger Event Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("above")}
                  className={`text-xs py-2 rounded-lg border font-medium cursor-pointer transition-colors ${
                    type === "above"
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-slate-950 border-slate-850 text-slate-400"
                  }`}
                >
                  Goes Above (≥)
                </button>
                <button
                  type="button"
                  onClick={() => setType("below")}
                  className={`text-xs py-2 rounded-lg border font-medium cursor-pointer transition-colors ${
                    type === "below"
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-slate-950 border-slate-850 text-slate-400"
                  }`}
                >
                  Drops Below (≤)
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Trigger Value (Rs)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                placeholder="NPR limit..."
                value={value}
                onChange={(e) => setValue(e.target.value !== "" ? Number(e.target.value) : "")}
                required
                className="w-full text-xs bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-lg shadow-md shadow-indigo-950/30 transition-all cursor-pointer"
            >
              Configure Trigger Alarms
            </button>
          </form>
        </div>

        {/* Existing Alarms Panel */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-indigo-400" />
            Configured Alarms Listing ({alerts.length})
          </h3>

          <div className="space-y-3">
            {alerts.length > 0 ? (
              alerts.map((alert) => {
                const stock = stocks.find((s) => s.symbol === alert.symbol);
                const currentPrice = stock ? stock.price : 0;
                const isTriggered = !alert.active;

                return (
                  <div
                    key={alert.id}
                    id={`alert-card-${alert.id}`}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-colors ${
                      isTriggered
                        ? "bg-emerald-950/20 border-emerald-900/60"
                        : "bg-slate-950/50 border-slate-850"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        isTriggered ? "bg-emerald-950 text-emerald-400" : "bg-slate-900 text-slate-400"
                      }`}>
                        {isTriggered ? <CheckCircle2 className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-100">{alert.symbol}</span>
                          <span className={`text-[9px] font-semibold px-2 py-0.2 rounded uppercase ${
                            alert.type === "above" ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"
                          }`}>
                            {alert.type === "above" ? "≥ Goes Above" : "≤ Drops Below"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Target limit: <span className="font-mono font-bold text-slate-300">Rs {alert.value}</span> • Current: <span className="font-mono text-slate-300">Rs {currentPrice}</span>
                        </div>
                        {alert.triggeredAt && (
                          <div className="text-[9px] text-emerald-500 font-mono">
                            Triggered on {new Date(alert.triggeredAt).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        alert.active ? "bg-indigo-950 text-indigo-400 animate-pulse" : "bg-slate-850 text-slate-500"
                      }`}>
                        {alert.active ? "Monitoring" : "Triggered"}
                      </span>
                      <button
                        onClick={() => onRemoveAlert(alert.id)}
                        className="p-2 text-slate-500 hover:text-rose-400 transition-colors rounded cursor-pointer"
                        title="Delete Alert"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-slate-500 py-12 text-xs">
                No stock price trigger rules are currently configured. Set them on the left panel.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
