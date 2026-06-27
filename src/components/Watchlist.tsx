import React, { useState } from "react";
import { Search, Filter, ArrowUpRight, ArrowDownRight, Activity, TrendingUp } from "lucide-react";
import { Stock } from "../types";

interface WatchlistProps {
  stocks: Stock[];
  selectedStock: Stock | null;
  onSelectStock: (stock: Stock) => void;
}

export default function Watchlist({ stocks, selectedStock, onSelectStock }: WatchlistProps) {
  const [search, setSearch] = useState("");
  const [selectedSector, setSelectedSector] = useState("All");

  // Extract unique sectors - handle missing sector for real data
  const sectors = ["All", ...Array.from(new Set(stocks.map((s) => s.sector || "N/A")))];
  
  // Check if we have real data (has open/prevClose fields)
  const hasRealData = stocks.some(s => s.open !== undefined || s.prevClose !== undefined);

  // Filter stocks
  const filteredStocks = stocks.filter((stock) => {
    const matchesSearch =
      stock.symbol.toLowerCase().includes(search.toLowerCase()) ||
      stock.name.toLowerCase().includes(search.toLowerCase());
    const matchesSector = selectedSector === "All" || (stock.sector || "N/A") === selectedSector;
    return matchesSearch && matchesSector;
  });

  // Get top gainers and losers for stats
  const topGainer = stocks.length > 0 ? [...stocks].sort((a, b) => b.changePercent - a.changePercent)[0] : null;
  const topLoser = stocks.length > 0 ? [...stocks].sort((a, b) => a.changePercent - b.changePercent)[0] : null;

  return (
    <div id="nepse-watchlist" className="bg-slate-900 border-r border-slate-800 w-full lg:w-80 flex flex-col h-full overflow-hidden">
      {/* Search Header */}
      <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Market Watchlist
            {hasRealData && (
              <span className="text-[8px] font-bold text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider ml-1">
                LIVE
              </span>
            )}
          </h2>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
            {filteredStocks.length} Stocks
          </span>
        </div>

        {/* Market Stats Summary */}
        {stocks.length > 0 && (
          <div className="flex gap-2 text-[9px]">
            <div className="flex-1 bg-slate-950/50 rounded px-2 py-1 border border-slate-800">
              <span className="text-slate-500">📈 Top Gainer</span>
              <div className="flex items-center gap-1">
                <span className="font-bold text-emerald-400">{topGainer?.symbol || '-'}</span>
                <span className="text-emerald-400">+{topGainer?.changePercent || 0}%</span>
              </div>
            </div>
            <div className="flex-1 bg-slate-950/50 rounded px-2 py-1 border border-slate-800">
              <span className="text-slate-500">📉 Top Loser</span>
              <div className="flex items-center gap-1">
                <span className="font-bold text-rose-400">{topLoser?.symbol || '-'}</span>
                <span className="text-rose-400">{topLoser?.changePercent || 0}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search NEPSE stock..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Sector filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <Filter className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          {sectors.map((sector) => (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              className={`text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors font-medium cursor-pointer ${
                selectedSector === sector
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-850 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {sector}
            </button>
          ))}
        </div>
      </div>

      {/* Stock list */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-850 scrollbar-thin">
        {filteredStocks.length > 0 ? (
          filteredStocks.map((stock) => {
            const isSelected = selectedStock?.symbol === stock.symbol;
            const isUp = stock.change >= 0;
            const volumeDisplay = stock.volume >= 1000000 
              ? `${(stock.volume / 1000000).toFixed(1)}M` 
              : stock.volume >= 1000 
                ? `${(stock.volume / 1000).toFixed(1)}K` 
                : stock.volume;

            return (
              <div
                key={stock.symbol}
                onClick={() => onSelectStock(stock)}
                id={`watchlist-item-${stock.symbol.toLowerCase()}`}
                className={`p-3.5 flex items-center justify-between cursor-pointer transition-all hover:bg-slate-850/50 ${
                  isSelected ? "bg-indigo-950/40 border-l-2 border-indigo-500" : ""
                }`}
              >
                {/* Left side: Ticker and Full Name */}
                <div className="space-y-1 pr-2 max-w-[55%]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-white tracking-wide">{stock.symbol}</span>
                    <span className="text-[9px] text-slate-500 bg-slate-800 px-1 py-0.2 rounded truncate">
                      {stock.sector || "N/A"}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate" title={stock.name}>
                    {stock.name}
                  </div>
                  {/* Show extra real data fields if available */}
                  {stock.open !== undefined && (
                    <div className="flex gap-2 text-[8px] text-slate-600">
                      <span>O: {stock.open.toFixed(2)}</span>
                      {stock.prevClose !== undefined && (
                        <span>PC: {stock.prevClose.toFixed(2)}</span>
                      )}
                      <span>Vol: {volumeDisplay}</span>
                    </div>
                  )}
                </div>

                {/* Right side: Live Price and % Change */}
                <div className="text-right flex flex-col items-end gap-1 font-mono">
                  <span className="text-xs font-bold text-slate-100">
                    Rs {stock.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`flex items-center text-[10px] font-bold ${
                      isUp ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {isUp ? (
                      <ArrowUpRight className="w-3 h-3 mr-0.5" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 mr-0.5" />
                    )}
                    {isUp ? "+" : ""}
                    {stock.changePercent.toFixed(2)}%
                  </span>
                  {/* Show change in price */}
                  <span className={`text-[8px] ${isUp ? "text-emerald-400/60" : "text-rose-400/60"}`}>
                    {isUp ? "+" : ""}{stock.change.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            {stocks.length === 0 ? "Loading market data..." : "No matching companies found."}
          </div>
        )}
      </div>

      {/* Developer Profile Widget */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/40 text-[10px] text-slate-500 space-y-2 flex-shrink-0">
        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-slate-400">
          <span>Platform Developer</span>
          <span className="text-indigo-400">Verified Creator</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-950/80 border border-indigo-900/60 flex items-center justify-center text-indigo-400 font-bold text-xs uppercase shadow-inner">
            GS
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-200 truncate leading-tight">Gyan Shahi</h4>
            <a href="mailto:shahigyan181@gmail.com" className="hover:text-indigo-400 transition-colors block truncate font-mono text-[9px]">
              shahigyan181@gmail.com
            </a>
          </div>
        </div>
        <div className="text-[9px] text-slate-500 flex justify-between items-center border-t border-slate-850/60 pt-1.5 font-medium">
          <span>© 2026 Gyan Shahi</span>
          <span className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${stocks.some(s => s.open !== undefined) ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            {stocks.some(s => s.open !== undefined) ? 'LIVE' : 'SIM'}
          </span>
        </div>
      </div>
    </div>
  );
}