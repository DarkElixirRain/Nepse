import React, { useEffect, useState } from "react";
import {
  LineChart,
  Brain,
  MessageSquare,
  Briefcase,
  Bell,
  Newspaper,
  Menu,
  X,
  BellRing,
  Award,
  Sparkles,
  LogOut,
  LogIn,
} from "lucide-react";

import { Stock, PortfolioItem, StockAlert } from "./types";
import { getFallbackStocks, getFallbackAnalysis } from "./utils/clientFallback";
import IndicesTicker from "./components/IndicesTicker";
import Watchlist from "./components/Watchlist";
import InteractiveChart from "./components/InteractiveChart";
import Forecaster from "./components/Forecaster";
import AIChatbot from "./components/AIChatbot";
import Portfolio from "./components/Portfolio";
import AlertManager from "./components/AlertManager";
import NewsSentiment from "./components/NewsSentiment";
import SubscriptionModal from "./components/SubscriptionModal";
import AuthModal from "./components/AuthModal";

interface ToastNotification {
  id: string;
  symbol: string;
  type: "above" | "below";
  value: number;
  price: number;
}

export default function App() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'real' | 'fallback'>('fallback');
  const [selectedSymbol, setSelectedSymbol] = useState<string>("NABIL");
  
  const selectedStock = React.useMemo(() => {
    return stocks.find((s) => s.symbol === selectedSymbol) || stocks[0] || null;
  }, [stocks, selectedSymbol]);

  const [activeTab, setActiveTab] = useState<"chart" | "ml" | "chat" | "portfolio" | "alerts" | "news">("chart");
  
  // User Session state
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(() => {
    const saved = localStorage.getItem("nepse_ai_logged_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Auto-open login for new guests, but only once per session so they aren't annoyed
  useEffect(() => {
    const saved = localStorage.getItem("nepse_ai_logged_user");
    const dismissed = sessionStorage.getItem("nepse_ai_auth_dismissed");
    if (!saved && !dismissed) {
      setAuthModalOpen(true);
    }
  }, []);

  // Premium and persistence states
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    return localStorage.getItem("nepse_ai_premium") === "true";
  });
  
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(() => {
    const saved = localStorage.getItem("nepse_ai_portfolio");
    return saved ? JSON.parse(saved) : [];
  });

  const [alerts, setAlerts] = useState<StockAlert[]>(() => {
    const saved = localStorage.getItem("nepse_ai_alerts");
    return saved ? JSON.parse(saved) : [];
  });

  // UI state managers
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReports, setAiReports] = useState<Record<string, string>>({});
  const [paymentSuccessData, setPaymentSuccessData] = useState<{ amount: string; uuid: string } | null>(null);

  // Synchronize stock details from API
  const fetchStocks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("🔄 Fetching stocks from http://localhost:3000/api/stocks...");
      const res = await fetch("http://localhost:3000/api/stocks");
      
      console.log("📡 Response status:", res.status);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Expected JSON but got content-type: ${contentType || "unknown"}`);
      }

      const data = await res.json();
      
      console.log("📦 API Response:", {
        type: typeof data,
        isArray: Array.isArray(data),
        length: data?.length,
        firstStock: data && data.length > 0 ? data[0] : null
      });
      
      if (data && Array.isArray(data) && data.length > 0) {
        // Check if this is real data (has open/prevClose fields)
        const hasRealData = data.some((stock: any) => 
          stock.open !== undefined || 
          stock.prevClose !== undefined
        );
        
        console.log(`✅ Received ${data.length} stocks from API`);
        console.log(`🔍 Data source: ${hasRealData ? 'REAL' : 'FALLBACK'}`);
        
        if (hasRealData && data.length > 10) {
          console.log("🎉 REAL NEPSE DATA DETECTED!");
          console.log("📊 Sample real stock:", {
            symbol: data[0].symbol,
            price: data[0].price,
            change: data[0].change,
            changePercent: data[0].changePercent,
            open: data[0].open,
            prevClose: data[0].prevClose,
            volume: data[0].volume
          });
        }
        
        setDataSource(hasRealData ? 'real' : 'fallback');
        setStocks(data);
      } else {
        console.warn("⚠️ No stocks received, using fallback");
        const fallbackData = getFallbackStocks();
        setDataSource('fallback');
        setStocks(fallbackData);
      }
    } catch (err) {
      console.error("❌ Error loading stocks:", err);
      setError(err instanceof Error ? err.message : "Failed to load stocks");
      const fallbackData = getFallbackStocks();
      setDataSource('fallback');
      setStocks(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
    
    // Poll every 10 seconds for updates
    const interval = setInterval(fetchStocks, 10000);
    return () => clearInterval(interval);
  }, []);

  // Listen for real-time subscription callback redirects
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");
    const uuid = params.get("uuid");
    const amount = params.get("amount");

    if (paymentStatus === "success") {
      setIsPremium(true);
      localStorage.setItem("nepse_ai_premium", "true");
      setPaymentSuccessData({
        amount: amount || "1499",
        uuid: uuid || `NEPSE-PREMIUM-${Date.now()}`
      });

      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (paymentStatus === "canceled") {
      console.log("eSewa payment transaction was canceled.");
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (paymentStatus === "error") {
      console.error("eSewa payment returned error:", params.get("message"));
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Price Alarms Real-time Loop Checker
  useEffect(() => {
    if (stocks.length === 0 || alerts.length === 0) return;

    let triggeredAny = false;
    const newToasts: ToastNotification[] = [];

    const updatedAlerts = alerts.map((alert) => {
      if (!alert.active) return alert;
      const stock = stocks.find((s) => s.symbol === alert.symbol);
      if (!stock) return alert;

      const triggered =
        (alert.type === "above" && stock.price >= alert.value) ||
        (alert.type === "below" && stock.price <= alert.value);

      if (!triggered) return alert;

      triggeredAny = true;
      newToasts.push({
        id: "toast_" + Date.now() + Math.random(),
        symbol: alert.symbol,
        type: alert.type,
        value: alert.value,
        price: stock.price,
      });

      return { ...alert, active: false, triggeredAt: new Date().toISOString() };
    });

    if (triggeredAny) {
      setToasts((prev) => [...prev, ...newToasts]);
      setAlerts(updatedAlerts);
      localStorage.setItem("nepse_ai_alerts", JSON.stringify(updatedAlerts));
    }
  }, [stocks, alerts]);

  // Handle Portfolio transaction add
  const handleAddHolding = (symbol: string, shares: number, buyPrice: number) => {
    const newItem: PortfolioItem = {
      id: "pos_" + Date.now(),
      symbol,
      shares,
      buyPrice,
      currentPrice: buyPrice,
      addedAt: new Date().toISOString(),
    };

    const updated = [...portfolio, newItem];
    setPortfolio(updated);
    localStorage.setItem("nepse_ai_portfolio", JSON.stringify(updated));
  };

  // Remove Portfolio holding
  const handleRemoveHolding = (id: string) => {
    const updated = portfolio.filter((item) => item.id !== id);
    setPortfolio(updated);
    localStorage.setItem("nepse_ai_portfolio", JSON.stringify(updated));
  };

  // Add Alert Trigger Rule
  const handleAddAlert = (symbol: string, type: "above" | "below", value: number) => {
    const newAlert: StockAlert = {
      id: "alert_" + Date.now(),
      symbol,
      type,
      value,
      active: true,
      createdAt: new Date().toISOString(),
    };

    const updated = [...alerts, newAlert];
    setAlerts(updated);
    localStorage.setItem("nepse_ai_alerts", JSON.stringify(updated));
  };

  // Remove Alert Rule
  const handleRemoveAlert = (id: string) => {
    const updated = alerts.filter((item) => item.id !== id);
    setAlerts(updated);
    localStorage.setItem("nepse_ai_alerts", JSON.stringify(updated));
  };

  // Activate premium plan
  const handleActivatePremium = () => {
    setIsPremium(true);
    localStorage.setItem("nepse_ai_premium", "true");
  };

  // Handle Gemini technical/fundamental analysis request
  const handleRunAIAnalysis = async (symbol: string) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });

      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setAiReports((prev) => ({
            ...prev,
            [symbol]: data.report,
          }));
          return;
        }
      }
      
      const report = getFallbackAnalysis(symbol, stocks);
      setAiReports((prev) => ({
        ...prev,
        [symbol]: report,
      }));
    } catch (err: any) {
      console.error("AI report error, falling back:", err);
      const report = getFallbackAnalysis(symbol, stocks);
      setAiReports((prev) => ({
        ...prev,
        [symbol]: report,
      }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Tabs layout mappings
  const tabs = [
    { id: "chart", label: "Technical Charting", shortLabel: "Chart", icon: LineChart },
    { id: "ml", label: "AI Price Forecaster", shortLabel: "Forecast", icon: Brain },
    { id: "chat", label: "AI Advisor Chat", shortLabel: "AI Chat", icon: MessageSquare },
    { id: "portfolio", label: "Portfolio Ledger", shortLabel: "Portfolio", icon: Briefcase },
    { id: "alerts", label: "Smart Price Alerts", shortLabel: "Alerts", icon: Bell },
    { id: "news", label: "News Sentiment Roll", shortLabel: "Sentiment", icon: Newspaper },
  ] as const;

  // Loading state
  if (loading && stocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading NEPSE data...</p>
          <p className="text-xs text-slate-600 mt-2">Fetching real-time market data</p>
        </div>
      </div>
    );
  }

  return (
    <div id="nepse-ai-platform-root" className="flex flex-col h-screen overflow-hidden bg-slate-950 font-sans text-slate-100 selection:bg-indigo-500/30">
      
      {/* Data Source Indicator */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-1.5 text-[10px] flex justify-between items-center">
        <span className="text-slate-500">
          📊 Data Source: 
          <span className={`ml-1 font-bold ${dataSource === 'real' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {dataSource === 'real' ? 'REAL NEPSE Market Data' : 'SIMULATED Data'}
          </span>
          {dataSource === 'real' && (
            <span className="ml-2 text-emerald-400/60">• {stocks.length} stocks • Live</span>
          )}
        </span>
        <span className="text-slate-600">
          Updated: {new Date().toLocaleTimeString()}
          {dataSource === 'real' && (
            <span className="ml-2 text-emerald-400/60">●</span>
          )}
        </span>
      </div>

      {paymentSuccessData && (
        <div className="bg-gradient-to-r from-emerald-600 via-indigo-600 to-violet-600 text-white text-xs py-2 px-4 flex justify-between items-center animate-in slide-in-from-top duration-300 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 animate-bounce text-yellow-300" />
            <span><strong>🎉 Premium Subscription Activated!</strong> eSewa payment for order <strong>{paymentSuccessData.uuid}</strong> is complete. Dynamic LSTM and 90-day forecast models are now active.</span>
          </div>
          <button onClick={() => setPaymentSuccessData(null)} className="hover:bg-white/20 p-1 rounded-full cursor-pointer transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Dynamic Indices Carousel Ticker Header */}
      <IndicesTicker stocks={stocks} isPremium={isPremium} onUpgrade={() => setSubscriptionModalOpen(true)} />

      {/* Primary Platform Toolbar */}
      <header id="platform-navbar" className="bg-slate-900 border-b border-slate-800 px-5 py-3.5 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <svg className="h-6 w-6 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M13 3v2h2v2h-2v2h-2V7H9V5h2V3h2zm4 4v2h2v2h-2v2h-2v-2h2V9h-2V7h2zM5 13v2H3v2h2v2h2v-2H5v-2h2v-2H5zm4 4v2h2v2h-2v2h-2v-2h2v-2h-2v-2h2z"/></svg>
            <span className="text-lg font-bold tracking-tight text-white">NEPSE<span className="text-indigo-600">AI</span></span>
            {dataSource === 'real' && (
              <span className="text-[8px] font-bold text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">
                LIVE
              </span>
            )}
          </div>
        </div>

        {/* Tab selection for wide screens */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-850">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Platform Settings Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/80 border border-indigo-900 px-2 sm:px-2.5 py-1 rounded-md uppercase tracking-wider hidden md:block">
            V1.2
          </span>
          
          <button
            onClick={() => setSubscriptionModalOpen(true)}
            className="p-1.5 sm:p-2 bg-slate-950 hover:bg-slate-850 text-amber-400 border border-slate-850 hover:border-slate-800 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            title="Subscription details"
          >
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse text-amber-400" />
            <span className="text-xs font-bold hidden sm:inline">Subscriptions</span>
          </button>

          {currentUser ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div 
                className="w-7 h-7 sm:w-[34px] sm:h-[34px] rounded-lg bg-indigo-950 border border-indigo-800/80 flex items-center justify-center text-indigo-300 font-bold text-[10px] sm:text-xs shadow-inner uppercase"
                title={`Logged in as ${currentUser.name} (${currentUser.email})`}
              >
                {currentUser.name.split(" ").map(n => n[0]).join("")}
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem("nepse_ai_logged_user");
                  setCurrentUser(null);
                }}
                className="p-1.5 sm:p-2 bg-slate-950 hover:bg-slate-850 hover:text-rose-400 border border-slate-850 hover:border-slate-800 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold hidden md:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="p-1.5 sm:p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all flex items-center gap-1 cursor-pointer text-xs font-bold"
            >
              <LogIn className="w-3.5 h-3.5 animate-pulse" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Layout Workspace split */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Watchlist Section (Left rail) */}
        <div className={`absolute lg:relative inset-y-0 left-0 w-80 z-20 lg:z-auto transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } transition-transform duration-200 ease-out flex-shrink-0`}>
          <Watchlist
            stocks={stocks}
            selectedStock={selectedStock}
            onSelectStock={(s) => {
              setSelectedSymbol(s.symbol);
              setIsSidebarOpen(false);
            }}
          />
        </div>

        {/* Backdrop for mobile drawer */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden absolute inset-0 bg-black/60 backdrop-blur-xs z-10"
          ></div>
        )}

        {/* Main interactive viewport container */}
        <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
          
          {/* Mobile sub navigation tabs */}
          <div className="lg:hidden bg-slate-900 border-b border-slate-850 p-2 grid grid-cols-3 gap-1.5 shadow-md">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-0.5 rounded-xl text-[10px] font-bold transition-all text-center cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/30 border border-indigo-500/30"
                      : "bg-slate-950/50 hover:bg-slate-950 text-slate-400 border border-slate-850"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[9px] tracking-wide leading-tight">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Active module renderer */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab === "chart" && (
              <InteractiveChart
                stock={selectedStock}
                onAnalyze={handleRunAIAnalysis}
                isAnalyzing={isAnalyzing}
                aiReport={selectedStock ? aiReports[selectedStock.symbol] || "" : ""}
              />
            )}
            {activeTab === "ml" && (
              <Forecaster
                stock={selectedStock}
                isPremium={isPremium}
                onUpgrade={() => setSubscriptionModalOpen(true)}
              />
            )}
            {activeTab === "chat" && <AIChatbot selectedStock={selectedStock} portfolio={portfolio} />}
            {activeTab === "portfolio" && (
              <Portfolio
                stocks={stocks}
                portfolio={portfolio}
                onAddHolding={handleAddHolding}
                onRemoveHolding={handleRemoveHolding}
              />
            )}
            {activeTab === "alerts" && (
              <AlertManager
                stocks={stocks}
                alerts={alerts}
                onAddAlert={handleAddAlert}
                onRemoveAlert={handleRemoveAlert}
                isPremium={isPremium}
                onUpgrade={() => setSubscriptionModalOpen(true)}
              />
            )}
            {activeTab === "news" && (
              <NewsSentiment isPremium={isPremium} onUpgrade={() => setSubscriptionModalOpen(true)} />
            )}
          </div>
        </main>
      </div>

      {/* Footer Status Bar */}
      <footer className="h-8 border-t border-slate-800 bg-slate-900 flex items-center justify-between px-4 text-[10px] text-slate-500 flex-shrink-0 z-10">
        <div className="flex items-center space-x-4">
          <span className="flex items-center">
            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${dataSource === 'real' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            {dataSource === 'real' ? 'Live Data' : 'Simulation'}
          </span>
          <span>NEPSE AI Platform</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">© 2026 Gyan Shahi</span>
          <span className="hidden sm:inline">Last Sync: {new Date().toLocaleTimeString()}</span>
        </div>
        <div className="flex items-center space-x-6">
          <span>Data: <span className={`uppercase font-bold ${dataSource === 'real' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {dataSource === 'real' ? 'REAL' : 'SIM'}
          </span></span>
          <span className="hidden sm:inline">API Latency: <span className="text-white font-mono">~15ms</span></span>
          <span className="text-indigo-600 font-bold">{isPremium ? "PRO PLAN ACTIVE" : "FREE TIER"}</span>
        </div>
      </footer>

      {/* Floating Real-time Alarm Popups stack */}
      <div id="toast-alerts-tray" className="fixed bottom-6 right-6 flex flex-col gap-3 z-50 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-slate-900 border-2 border-emerald-500/80 p-4 rounded-xl shadow-2xl flex items-start gap-3 relative animate-in slide-in-from-bottom duration-200 text-slate-100"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center flex-shrink-0 animate-bounce">
              <BellRing className="w-4 h-4" />
            </div>
            
            <div className="space-y-1 pr-6">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">NEPSE Price Alarm Triggered!</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <span className="font-bold text-emerald-400">{toast.symbol}</span> has gone{" "}
                <span className="font-bold">{toast.type === "above" ? "above" : "below"}</span> Rs {toast.value}! Current trading price is Rs {toast.price}.
              </p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="absolute top-3 right-3 text-slate-500 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Interactive SaaS Pricing modal */}
      <SubscriptionModal
        isOpen={subscriptionModalOpen}
        onClose={() => setSubscriptionModalOpen(false)}
        onSubscribe={handleActivatePremium}
      />

      {/* Dynamic interactive User Authenticator screen */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          sessionStorage.setItem("nepse_ai_auth_dismissed", "true");
        }}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    </div>
  );
}