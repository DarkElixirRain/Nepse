import React, { useState } from "react";
import { Plus, Trash2, Wallet, DollarSign, TrendingUp, TrendingDown, Briefcase } from "lucide-react";
import { Stock, PortfolioItem } from "../types";

interface PortfolioProps {
  stocks: Stock[];
  portfolio: PortfolioItem[];
  onAddHolding: (symbol: string, shares: number, buyPrice: number) => void;
  onRemoveHolding: (id: string) => void;
}

export default function Portfolio({ stocks, portfolio, onAddHolding, onRemoveHolding }: PortfolioProps) {
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState<number | "">("");
  const [buyPrice, setBuyPrice] = useState<number | "">("");

  // Calculate dynamic metrics based on latest simulated stock prices
  const portfolioSummary = React.useMemo(() => {
    let totalInvested = 0;
    let totalCurrentValue = 0;

    const items = portfolio.map((item) => {
      // Find latest live stock price
      const latestStock = stocks.find((s) => s.symbol === item.symbol);
      const currentPrice = latestStock ? latestStock.price : item.buyPrice;
      const invested = item.shares * item.buyPrice;
      const currentValue = item.shares * currentPrice;
      const gain = currentValue - invested;
      const gainPercent = invested > 0 ? (gain / invested) * 100 : 0;

      totalInvested += invested;
      totalCurrentValue += currentValue;

      return {
        ...item,
        currentPrice,
        invested,
        currentValue,
        gain,
        gainPercent,
      };
    });

    const netGain = totalCurrentValue - totalInvested;
    const netGainPercent = totalInvested > 0 ? (netGain / totalInvested) * 100 : 0;

    return {
      items,
      totalInvested,
      totalCurrentValue,
      netGain,
      netGainPercent,
    };
  }, [portfolio, stocks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !shares || !buyPrice) return;

    onAddHolding(symbol, Number(shares), Number(buyPrice));
    
    // reset form
    setShares("");
    setBuyPrice("");
  };

  // Pre-fill buy price if symbol is chosen
  const handleSymbolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sym = e.target.value;
    setSymbol(sym);
    const selected = stocks.find((s) => s.symbol === sym);
    if (selected) {
      setBuyPrice(selected.price);
    }
  };

  return (
    <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-6 scrollbar-thin bg-slate-950">
      {/* Portfolio Bento Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Net Worth */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Portfolio valuation</div>
            <div className="text-lg font-mono font-bold text-white mt-0.5">
              Rs {portfolioSummary.totalCurrentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Continuous live updates</div>
          </div>
        </div>

        {/* Invested Capital */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Invested Capital</div>
            <div className="text-lg font-mono font-bold text-slate-200 mt-0.5">
              Rs {portfolioSummary.totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Total purchase cost</div>
          </div>
        </div>

        {/* Unrealized Gain */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            portfolioSummary.netGain >= 0 ? "bg-emerald-950/80 text-emerald-400" : "bg-rose-950/80 text-rose-400"
          }`}>
            {portfolioSummary.netGain >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Profit / Loss</div>
            <div className={`text-lg font-mono font-bold mt-0.5 ${
              portfolioSummary.netGain >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              Rs {portfolioSummary.netGain.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-[10px] font-semibold mt-0.5 ${
              portfolioSummary.netGain >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              {portfolioSummary.netGain >= 0 ? "+" : ""}{portfolioSummary.netGainPercent.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction Ledger Input Form */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 h-fit">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-indigo-400" />
            Log Equity Buy Transaction
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Select Stock Ticker</label>
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
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Quantity (Shares)</label>
              <input
                type="number"
                min="1"
                placeholder="Number of shares..."
                value={shares}
                onChange={(e) => setShares(e.target.value !== "" ? Number(e.target.value) : "")}
                required
                className="w-full text-xs bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Buy Price (Rs per share)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                placeholder="Purchase price in NPR..."
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value !== "" ? Number(e.target.value) : "")}
                required
                className="w-full text-xs bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-lg shadow-md shadow-indigo-950/30 transition-all cursor-pointer"
            >
              Add Holding Asset
            </button>
          </form>
        </div>

        {/* Assets Holdings Table Column */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-indigo-400" />
            Equity Asset Allocations ({portfolioSummary.items.length} positions)
          </h3>

          <div className="overflow-x-auto">
            {portfolioSummary.items.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase">
                    <th className="pb-2.5">Asset</th>
                    <th className="pb-2.5">Shares</th>
                    <th className="pb-2.5">Avg Cost</th>
                    <th className="pb-2.5">Current Value</th>
                    <th className="pb-2.5 text-right">Profit / Loss</th>
                    <th className="pb-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-xs">
                  {portfolioSummary.items.map((item) => {
                    const isGain = item.gain >= 0;
                    return (
                      <tr key={item.id} className="hover:bg-slate-850/20" id={`holding-row-${item.symbol.toLowerCase()}`}>
                        <td className="py-3 font-semibold text-slate-200">{item.symbol}</td>
                        <td className="py-3 font-mono text-slate-300">{item.shares}</td>
                        <td className="py-3 font-mono text-slate-300">Rs {item.buyPrice.toFixed(2)}</td>
                        <td className="py-3 font-mono font-semibold text-slate-200">
                          Rs {item.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`py-3 text-right font-mono font-bold ${isGain ? "text-emerald-400" : "text-rose-400"}`}>
                          <div>Rs {item.gain.toFixed(2)}</div>
                          <div className="text-[10px] font-semibold mt-0.5">
                            {isGain ? "+" : ""}{item.gainPercent.toFixed(2)}%
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => onRemoveHolding(item.id)}
                            className="text-slate-500 hover:text-rose-400 p-1.5 rounded transition-colors cursor-pointer"
                            title="Liquidate / delete holding"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center text-slate-500 py-12 text-xs">
                Your portfolio ledger is currently empty. Use the left panel form to add your shares.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
