import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Clock, ShieldAlert, BadgeCheck } from "lucide-react";
import { MarketIndex, Stock } from "../types";

interface IndicesTickerProps {
  stocks: Stock[];
  isPremium: boolean;
  onUpgrade: () => void;
}

export default function IndicesTicker({ stocks, isPremium, onUpgrade }: IndicesTickerProps) {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [marketOpen, setMarketOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  // Fetch real indices from API
  useEffect(() => {
    const fetchIndices = async () => {
      try {
        setLoading(true);
        console.log("🔄 Fetching real indices from /api/indices...");
        
        const res = await fetch("http://localhost:3000/api/indices", {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          console.log("📊 Real indices data received:", data);
          setIndices(data);
        } else {
          console.warn("⚠️ Non-JSON response from /api/indices");
        }
      } catch (error) {
        console.error("❌ Error fetching indices:", error);
        // Fallback calculated indices if API fails
        if (stocks && stocks.length > 0) {
          const avgChangePercent = stocks.reduce((acc, s) => acc + s.changePercent, 0) / stocks.length;
          const baseClose = 2142.15;
          const value = parseFloat((baseClose * (1 + avgChangePercent / 100)).toFixed(2));
          const change = parseFloat((value - baseClose).toFixed(2));
          const changePercent = parseFloat(avgChangePercent.toFixed(2));

          setIndices([
            {
              name: "NEPSE Index",
              value,
              change,
              changePercent,
              high: parseFloat((value * 1.008).toFixed(2)),
              low: parseFloat((value * 0.993).toFixed(2)),
            },
            {
              name: "Sensitive Index",
              value: parseFloat((value * 0.185).toFixed(2)),
              change: parseFloat((change * 0.182).toFixed(2)),
              changePercent,
              high: parseFloat((value * 0.185 * 1.005).toFixed(2)),
              low: parseFloat((value * 0.185 * 0.994).toFixed(2)),
            },
            {
              name: "Float Index",
              value: parseFloat((value * 0.068).toFixed(2)),
              change: parseFloat((change * 0.065).toFixed(2)),
              changePercent,
              high: parseFloat((value * 0.068 * 1.006).toFixed(2)),
              low: parseFloat((value * 0.068 * 0.992).toFixed(2)),
            }
          ]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchIndices();
    
    // Refresh indices every 60 seconds
    const interval = setInterval(fetchIndices, 60000);
    return () => clearInterval(interval);
  }, [stocks]);

  // Determine NEPSE Market Open/Close status
  useEffect(() => {
    const checkMarketStatus = () => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const nepalTime = new Date(utc + 3600000 * 5.75);
      const day = nepalTime.getDay();
      const hour = nepalTime.getHours();
      
      const isWeekDay = day >= 0 && day <= 4; // Sun-Thu
      const isWorkingHour = hour >= 11 && hour < 15; // 11 AM - 3 PM

      setMarketOpen(isWeekDay && isWorkingHour);
    };

    checkMarketStatus();
    const interval = setInterval(checkMarketStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (loading && indices.length === 0) {
    return (
      <div id="indices-ticker-bar" className="w-full bg-slate-900 border-b border-slate-800 text-slate-100 py-3 px-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-6">
          <div className="text-xs text-slate-400">Loading indices...</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800/80 rounded-full px-3 py-1 border border-slate-700/50">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-medium text-slate-400">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="indices-ticker-bar" className="w-full bg-slate-900 border-b border-slate-800 text-slate-100 py-3 px-4 flex flex-wrap justify-between items-center gap-4">
      {/* Dynamic Indices Carousel */}
      <div className="flex flex-wrap items-center gap-6">
        {indices.length > 0 ? (
          indices.map((idx) => {
            const isUp = idx.change >= 0;
            return (
              <div key={idx.name} className="flex items-center gap-2" id={`index-${idx.name.replace(/\s+/g, '-').toLowerCase()}`}>
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{idx.name}</span>
                <span className="font-mono font-bold text-sm text-white">{idx.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className={`flex items-center text-xs font-semibold px-1.5 py-0.5 rounded ${isUp ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"}`}>
                  {isUp ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                  {isUp ? "+" : ""}{idx.changePercent.toFixed(2)}%
                </span>
              </div>
            );
          })
        ) : (
          <div className="text-xs text-slate-500">No index data available</div>
        )}
      </div>

      {/* Market Status and Premium Action Button */}
      <div className="flex items-center gap-4">
        {/* Market Status Flag */}
        <div className="flex items-center gap-2 bg-slate-800/80 rounded-full px-3 py-1 border border-slate-700/50">
          <Clock className={`w-3.5 h-3.5 ${marketOpen ? "text-emerald-400 animate-pulse" : "text-amber-400"}`} />
          <span className="text-xs font-medium">
            Market Status:{" "}
            <span className={marketOpen ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
              {marketOpen ? "OPEN (NPT)" : "CLOSED"}
            </span>
          </span>
        </div>

        {/* Premium Upgrade Button */}
        {isPremium ? (
          <div className="flex items-center gap-1.5 bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 px-3 py-1 rounded-full text-xs font-semibold">
            <BadgeCheck className="w-4 h-4 text-indigo-400" />
            <span>NEPSE AI Premium</span>
          </div>
        ) : (
          <button
            onClick={onUpgrade}
            className="flex items-center gap-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-3.5 py-1 rounded-full text-xs font-bold transition-all shadow-md shadow-indigo-950/40 hover:scale-105 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Unlock Deep Learning Models</span>
          </button>
        )}
      </div>
    </div>
  );
}