// types.ts
export interface HistoricalQuote {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma10?: number;
  ema10?: number;
  bbUpper?: number;
  bbLower?: number;
  bbMean?: number;
}

export interface TechnicalIndicator {
  date: string;
  close: number;
  sma50?: number;
  ema20?: number;
  rsi?: number;
  macdLine?: number;
  signalLine?: number;
  histogram?: number;
  upperBB?: number;
  lowerBB?: number;
}

export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  marketCap: number; // in Millions NPR
  peRatio: number;
  pbRatio: number;
  eps: number;
  dividendYield: number;
  paidUpCapital: number;
  history: HistoricalQuote[];
  // Optional fields from real NEPSE data
  open?: number;
  prevClose?: number;
}

export interface ForecastPoint {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
}

export interface ForecastResponse {
  symbol: string;
  modelType: string;
  horizon: number;
  forecast: ForecastPoint[];
  buyProbability: number;
  sellProbability: number;
  holdProbability: number;
  signals: string[];
  metrics: {
    mse: number;
    mae: number;
    r2: number;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

export interface PortfolioItem {
  id: string;
  symbol: string;
  shares: number;
  buyPrice: number;
  currentPrice: number;
  addedAt: string;
}

export interface StockAlert {
  id: string;
  symbol: string;
  type: 'above' | 'below';
  value: number;
  active: boolean;
  createdAt: string;
  triggeredAt?: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  date: string;
  summary: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  impactScore: number; // 1-100
  url: string;
}

export interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
}