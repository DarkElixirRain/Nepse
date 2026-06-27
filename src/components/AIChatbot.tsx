import React, { useState, useRef, useEffect } from "react";
import { Send, User, Sparkles, MessageSquare, Briefcase, ChevronRight, HelpCircle } from "lucide-react";
import { Stock, ChatMessage, PortfolioItem } from "../types";
import { getFallbackChat } from "../utils/clientFallback";

interface AIChatbotProps {
  selectedStock: Stock | null;
  portfolio: PortfolioItem[];
}

export default function AIChatbot({ selectedStock, portfolio }: AIChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial_1",
      sender: "bot",
      text: "Namaste! I am your intelligent NEPSE Financial Advisor. I have context on your active stock selection and asset portfolio. Ask me anything about Nepalese equities, market trends, or portfolio optimization!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Handle Preset quick queries
  const handleQuickPrompt = (prompt: string) => {
    if (isLoading) return;
    sendMessage(prompt);
  };

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: "msg_" + Date.now(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          portfolio,
          selectedStock,
        }),
      });

      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          const botMsg: ChatMessage = {
            id: "msg_" + (Date.now() + 1),
            sender: "bot",
            text: data.text || "I was unable to formulate a response. Please try again.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setMessages((prev) => [...prev, botMsg]);
          setIsLoading(false);
          return;
        }
      }
      
      throw new Error("Chat request returned non-JSON/error.");
    } catch (err: any) {
      console.warn("Chat API error, using intelligent client fallback:", err);
      const fallbackText = getFallbackChat(textToSend, selectedStock, portfolio);
      const botMsg: ChatMessage = {
        id: "msg_fallback_" + Date.now(),
        sender: "bot",
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const presets = [
    { label: `Evaluate ${selectedStock?.symbol || "NABIL"} Outlook`, query: `Analyze the technical and fundamental outlook of ${selectedStock?.symbol || "NABIL"} for short-term and long-term traders.` },
    { label: "Evaluate Portfolio Risk Profile", query: "Take a look at my current stock portfolio holdings. Analyze my diversification, average costs, and calculate my potential overall risk profile in NEPSE." },
    { label: "Underlying NEPSE Trends Today", query: "What are the core market drivers on the Nepal Stock Exchange today? Describe the key micro and macro economic factors currently influencing Nepalese stock prices." },
    { label: "Explain PE Ratio significance", query: "As a Nepalese stock market investor, how should I evaluate the P/E Ratio when choosing banking or hydropower stocks? Explain standard valuation bounds." },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Active Context Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <div>
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">NEPSE AI Financial Advisor</h2>
            <p className="text-[10px] text-slate-500">Grounded in local regulations & live portfolio statistics</p>
          </div>
        </div>

        {/* Selected Context Flags */}
        <div className="flex items-center gap-3">
          {selectedStock && (
            <div className="flex items-center gap-1.5 bg-indigo-950/80 border border-indigo-900 px-2.5 py-1 rounded-md text-[10px] text-indigo-300">
              <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
              <span>Grounded: {selectedStock.symbol}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-[10px] text-slate-400">
            <Briefcase className="w-3.5 h-3.5 text-slate-500" />
            <span>Portfolio: {portfolio.length} Assets</span>
          </div>
        </div>
      </div>

      {/* Messages Scroll Panel */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((msg) => {
          const isBot = msg.sender === "bot";
          return (
            <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isBot ? "" : "ml-auto flex-row-reverse"}`}>
              {/* Avatar Icon */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isBot ? "bg-indigo-950 border border-indigo-800 text-indigo-400" : "bg-slate-800 text-slate-300"}`}>
                {isBot ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className="space-y-1">
                <div className={`rounded-xl p-3.5 text-xs leading-relaxed border ${
                  isBot 
                    ? "bg-slate-900/60 border-slate-800/80 text-slate-200" 
                    : "bg-indigo-600 border-indigo-500 text-white"
                }`}>
                  {/* Parse standard markdown paragraphs/bullets */}
                  <div className="space-y-2">
                    {msg.text.split("\n").map((line, lIdx) => {
                      if (line.startsWith("-") || line.startsWith("*")) {
                        return <li key={lIdx} className="ml-4 list-disc my-1">{line.substring(1).trim()}</li>;
                      }
                      return <p key={lIdx} className="my-0.5">{line}</p>;
                    })}
                  </div>
                </div>
                <div className={`text-[9px] text-slate-500 font-mono ${isBot ? "" : "text-right"}`}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex gap-3 max-w-[80%]">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center justify-center animate-spin">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Preset Queries panel & Input Form */}
      <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-3.5">
        {/* Presets Grid */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            Suggested Advisor Queries
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {presets.map((preset, pIdx) => (
              <button
                key={pIdx}
                onClick={() => handleQuickPrompt(preset.query)}
                className="text-left text-[11px] px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg hover:bg-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-slate-100 transition-colors cursor-pointer truncate flex items-center justify-between"
              >
                <span>{preset.label}</span>
                <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Input box */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Ask about active trends, banking multiples, or portfolio adjustments..."
            className="flex-1 bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs rounded-lg px-3.5 py-3.5 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-950/40 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
