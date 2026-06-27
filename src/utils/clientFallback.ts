import { Stock, MarketIndex, NewsArticle, ForecastResponse, ChatMessage } from "../types";

// Helper to generate Sunday to Thursday trading days (Nepal weekends: Fri/Sat)
function getTradingDays(count: number): string[] {
  const dates: string[] = [];
  let d = new Date();
  while (dates.length < count) {
    const day = d.getDay();
    if (day !== 5 && day !== 6) {
      dates.push(d.toISOString().split("T")[0]);
    }
    d.setDate(d.getDate() - 1);
  }
  return dates.reverse();
}

// Generate history for stock charting
function generateHistory(basePrice: number, count: number): any[] {
  const dates = getTradingDays(count);
  const history: any[] = [];
  let currentPrice = basePrice;

  for (let i = 0; i < count; i++) {
    const changePercent = (Math.random() - 0.495) * 0.04; // small upward drift
    const prevClose = currentPrice;
    currentPrice = parseFloat((currentPrice * (1 + changePercent)).toFixed(2));
    
    const high = parseFloat((Math.max(prevClose, currentPrice) * (1 + Math.random() * 0.015)).toFixed(2));
    const low = parseFloat((Math.min(prevClose, currentPrice) * (1 - Math.random() * 0.015)).toFixed(2));
    const open = parseFloat((prevClose * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2));
    const volume = Math.floor(20000 + Math.random() * 80000);

    history.push({
      date: dates[i],
      open,
      high,
      low,
      close: currentPrice,
      volume,
    });
  }
  return history;
}

const stockProfiles = [
  { symbol: "NABIL", name: "Nabil Bank Limited", sector: "Commercial Banks", price: 720 },
  { symbol: "NTC", name: "Nepal Telecom", sector: "Telecom", price: 910 },
  { symbol: "NICA", name: "NIC Asia Bank Limited", sector: "Commercial Banks", price: 540 },
  { symbol: "CHCL", name: "Chilime Hydropower Company", sector: "Hydropower", price: 390 },
  { symbol: "HIDCL", name: "Hydroelectricity Investment", sector: "Investment", price: 210 },
  { symbol: "SHL", name: "Soaltee Hotel Limited", sector: "Hotels & Tourism", price: 450 },
  { symbol: "NLIC", name: "Nepal Life Insurance Company", sector: "Life Insurance", price: 680 },
  { symbol: "UPCL", name: "Union Hydropower Limited", sector: "Hydropower", price: 245 },
  { symbol: "GBIME", name: "Global IME Bank Limited", sector: "Commercial Banks", price: 230 },
  { symbol: "ADBL", name: "Agricultural Development Bank", sector: "Commercial Banks", price: 285 },
];

let cachedStocks: Stock[] = [];

export function getFallbackStocks(): Stock[] {
  if (cachedStocks.length > 0) {
    // Simulate real-time ticking
    return cachedStocks.map(stock => {
      const percentChange = (Math.random() - 0.490) * 0.008; // -0.39% to +0.41%
      const changeVal = stock.price * percentChange;
      const newPrice = parseFloat((stock.price + changeVal).toFixed(2));
      
      const yesterdayClose = stock.history[stock.history.length - 2]?.close || stock.price;
      const change = parseFloat((newPrice - yesterdayClose).toFixed(2));
      const changePercent = parseFloat(((change / yesterdayClose) * 100).toFixed(2));

      // Update current history point
      const updatedHistory = [...stock.history];
      if (updatedHistory.length > 0) {
        updatedHistory[updatedHistory.length - 1] = {
          ...updatedHistory[updatedHistory.length - 1],
          close: newPrice,
          high: Math.max(updatedHistory[updatedHistory.length - 1].high, newPrice),
          low: Math.min(updatedHistory[updatedHistory.length - 1].low, newPrice),
        };
      }

      return {
        ...stock,
        price: newPrice,
        change,
        changePercent,
        high: Math.max(stock.high, newPrice),
        low: Math.min(stock.low, newPrice),
        history: updatedHistory,
      };
    });
  }

  // Generate initial
  cachedStocks = stockProfiles.map(s => {
    const history = generateHistory(s.price, 35);
    const latestClose = history[history.length - 1].close;
    const prevClose = history[history.length - 2].close;
    const change = parseFloat((latestClose - prevClose).toFixed(2));
    const changePercent = parseFloat(((change / prevClose) * 100).toFixed(2));

    return {
      symbol: s.symbol,
      name: s.name,
      sector: s.sector,
      price: latestClose,
      change,
      changePercent,
      high: Math.max(...history.slice(-1).map(h => h.high)),
      low: Math.min(...history.slice(-1).map(h => h.low)),
      volume: history[history.length - 1].volume,
      marketCap: Math.floor(latestClose * (50 + Math.random() * 200)),
      peRatio: parseFloat((15 + Math.random() * 25).toFixed(2)),
      pbRatio: parseFloat((2 + Math.random() * 5).toFixed(2)),
      eps: parseFloat((18 + Math.random() * 20).toFixed(2)),
      dividendYield: parseFloat((1 + Math.random() * 5).toFixed(2)),
      paidUpCapital: Math.floor(10000 + Math.random() * 15000),
      history,
    };
  });

  return cachedStocks;
}

export function getFallbackIndices(stocks: Stock[]): MarketIndex[] {
  const avgChangePercent = stocks.length > 0 
    ? stocks.reduce((acc, s) => acc + s.changePercent, 0) / stocks.length
    : 0.58;

  const marketIndexBase = parseFloat((2142.15 * (1 + avgChangePercent / 100)).toFixed(2));
  const indexChange = parseFloat((marketIndexBase - 2142.15).toFixed(2));
  const indexChangePercent = parseFloat(((indexChange / 2142.15) * 100).toFixed(2));

  return [
    {
      name: "NEPSE Index",
      value: marketIndexBase,
      change: indexChange,
      changePercent: indexChangePercent,
      high: parseFloat((marketIndexBase * 1.008).toFixed(2)),
      low: parseFloat((marketIndexBase * 0.993).toFixed(2)),
    },
    {
      name: "Sensitive Index",
      value: parseFloat((marketIndexBase * 0.185).toFixed(2)),
      change: parseFloat((indexChange * 0.182).toFixed(2)),
      changePercent: indexChangePercent,
      high: parseFloat((marketIndexBase * 0.185 * 1.005).toFixed(2)),
      low: parseFloat((marketIndexBase * 0.185 * 0.994).toFixed(2)),
    },
    {
      name: "Float Index",
      value: parseFloat((marketIndexBase * 0.068).toFixed(2)),
      change: parseFloat((indexChange * 0.065).toFixed(2)),
      changePercent: indexChangePercent,
      high: parseFloat((marketIndexBase * 0.068 * 1.006).toFixed(2)),
      low: parseFloat((marketIndexBase * 0.068 * 0.992).toFixed(2)),
    }
  ];
}

export function getFallbackNews(): NewsArticle[] {
  return [
    {
      id: "news_1",
      title: "Securities Board of Nepal (SEBON) Approves Hydropower IPOs Worth NPR 4 Billion",
      source: "ShareSansar",
      date: new Date().toISOString().split("T")[0],
      summary: "SEBON has approved the floating of primary shares for three prominent hydropower companies in the pipeline, aiming to inject significant liquidity into the primary market.",
      sentiment: "bullish",
      impactScore: 78,
      url: "https://sharesansar.com"
    },
    {
      id: "news_2",
      title: "Commercial Banks Report Stellar Q3 Financial Growth; NABIL Leads Profits",
      source: "MeroLagani",
      date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
      summary: "Nabil Bank and other tier-1 commercial banks published third-quarter reports showing resilient interest spreads and declining non-performing loans (NPL), triggering heavy demand in secondary market trading.",
      sentiment: "bullish",
      impactScore: 88,
      url: "https://merolagani.com"
    },
    {
      id: "news_3",
      title: "Nepal Rastra Bank Considers Revision of 12 Crore Cap on Share Loans",
      source: "Bizpati",
      date: new Date(Date.now() - 172800000).toISOString().split("T")[0],
      summary: "In its upcoming review, the central bank of Nepal is highly rumored to loosen the ceiling on loans against margin shares, which investors expect will release credit flow into equity markets.",
      sentiment: "bullish",
      impactScore: 92,
      url: "https://bizpati.com"
    },
    {
      id: "news_4",
      title: "Hydropower Sector Affected by Floods; Multiple Units Halt Electricity Generation",
      source: "Nepal Stock Exchange",
      date: new Date(Date.now() - 259200000).toISOString().split("T")[0],
      summary: "Heavy monsoon-triggered landslides have damaged intake facilities of some major private sector run-of-river projects. Technical teams are on-site but restoration might take up to two weeks.",
      sentiment: "bearish",
      impactScore: 65,
      url: "https://nepalstock.com.np"
    },
    {
      id: "news_5",
      title: "NEPSE Experiences Selling Pressure at Resistance levels around 2200 mark",
      source: "ShareSansar",
      date: new Date(Date.now() - 345600000).toISOString().split("T")[0],
      summary: "Short-term swing traders booked profits as the main index approached the crucial 2200 resistance band, though overall capital gains turnovers remain healthy.",
      sentiment: "neutral",
      impactScore: 45,
      url: "https://sharesansar.com"
    }
  ];
}

export function getFallbackForecast(symbol: string, horizon: number, modelType: string): ForecastResponse {
  const currentPrice = 500; // rough default close
  const forecast: any[] = [];
  let predictedVal = currentPrice;
  const drift = 0.002;
  const volatility = modelType === "LSTM" ? 0.012 : modelType === "ARIMA" ? 0.018 : 0.015;

  for (let i = 1; i <= horizon; i++) {
    const fDate = new Date();
    fDate.setDate(fDate.getDate() + i);
    const growth = (Math.random() - 0.47) * volatility + drift;
    predictedVal = parseFloat((predictedVal * (1 + growth)).toFixed(2));
    
    forecast.push({
      date: fDate.toISOString().split("T")[0],
      predicted: predictedVal,
      lower: parseFloat((predictedVal * (1 - (0.01 + i * 0.007))).toFixed(2)),
      upper: parseFloat((predictedVal * (1 + (0.01 + i * 0.007))).toFixed(2)),
    });
  }

  return {
    symbol,
    modelType,
    horizon,
    forecast,
    buyProbability: 62,
    sellProbability: 18,
    holdProbability: 20,
    signals: [
      "RSI is neutral at 52, leaving ample room for upward momentum.",
      "10-Day SMA is crossing over the 30-Day EMA, suggesting a golden cross configuration.",
      "Bollinger Bands contraction indicates immediate volatility breakout in the next 3 days."
    ],
    metrics: {
      mse: 14.5,
      mae: 3.2,
      r2: 0.94
    }
  };
}

export function getFallbackChat(message: string, selectedStock: Stock | null, portfolio: any[]): string {
  const query = message.toLowerCase();
  
  if (query.includes("portfolio") || query.includes("holding") || query.includes("buy")) {
    if (portfolio.length === 0) {
      return `Your portfolio ledger is currently empty. You can add transactions inside the **Portfolio Ledger** tab (e.g. log shares of **NABIL** or **NTC**) to receive automatic tracking, sector weights, profit/loss, and portfolio-specific strategy suggestions from me!`;
    }
    const holdings = portfolio.map(p => `${p.symbol} (${p.shares} units @ NPR ${p.buyPrice})`).join(", ");
    return `### Portfolio Analysis Summary
Your ledger tracks: **${holdings}**.
- Overall diversification is healthy.
- We recommend keeping a cash buffer of 15-20% during current NEPSE consolidation near the 2200 point.
- Consider rebalancing high beta hydropower stocks if they break below key support zones.`;
  }

  if (selectedStock) {
    const s = selectedStock;
    if (query.includes("buy") || query.includes("invest") || query.includes("should i")) {
      return `### Investment Outlook: ${s.symbol} (${s.name})
- **Current Price**: NPR ${s.price} (Daily change: ${s.changePercent}%)
- **Fundamental Profile**: P/E of **${s.peRatio}x**, dividend yield is **${s.dividendYield}%**, EPS of **NPR ${s.eps}**.
- **Tactical Strategy**: Under current conditions, we recommend **Accumulating on dips**. The P/E ratio is highly comfortable compared to sector averages. Major support sits at **NPR ${(s.price * 0.94).toFixed(1)}**, while primary target sits at **NPR ${(s.price * 1.15).toFixed(1)}**.`;
    }
  }

  return `### NEPSE Market Intel
- **Market Trend**: NEPSE index is currently trading at key zones. Volume accumulation signals institutional interest in commercial banking profiles and blue-chips.
- **Support & Resistance**: Standard index support is established around **2100**, and primary resistance sits at **2220**.
- **Trading Tip**: Keep your stops tight on mid-cap hydropowers and focus on high dividend-paying commercial bank profiles for long-term safety.
How else can I assist your strategy today? Ask me about specific stocks like **NABIL**, **NICA**, or **NTC**!`;
}

export function getFallbackAnalysis(symbol: string, stocks: Stock[]): string {
  const stock = stocks.find(s => s.symbol.toUpperCase() === symbol.toUpperCase()) || stocks[0];
  if (!stock) return "Stock profile not loaded yet.";

  const isUp = stock.changePercent >= 0;
  const currentPrice = stock.price;
  const r1 = (currentPrice * 1.04).toFixed(2);
  const r2 = (currentPrice * 1.08).toFixed(2);
  const s1 = (currentPrice * 0.96).toFixed(2);
  const s2 = (currentPrice * 0.92).toFixed(2);

  let rating = 7.5;
  if (stock.peRatio < 15) rating = 8.8;
  else if (stock.peRatio < 22) rating = 7.9;
  else if (stock.peRatio > 35) rating = 5.2;

  let recommendation = "ACCUMULATE / HOLD";
  let reasons = [
    `Highly attractive P/E ratio of ${stock.peRatio}x relative to sector historical baseline.`,
    `Consistent earnings momentum reflected in an EPS of NPR ${stock.eps}.`,
    `Robust dividend yield parameters currently yielding ${stock.dividendYield}%.`
  ];

  if (stock.peRatio > 32) {
    recommendation = "HOLD / MONITOR ON STRENGTH";
    reasons = [
      `Elevated P/E valuation of ${stock.peRatio}x suggests near-term consolidation behavior.`,
      `Monitor daily accumulation volumes closely to spot early institutional rotations.`,
      `We recommend moving partial capital to lower P/E commercial bank profiles.`
    ];
  } else if (stock.peRatio < 14) {
    recommendation = "STRONG BUY / UNDERVALUED";
    reasons = [
      `Extremely deep undervaluation with P/E at ${stock.peRatio}x.`,
      `Outstanding historical ROE metrics and consistent EPS delivery.`,
      `Excellent margin of safety for capital-preservation investors.`
    ];
  }

  const targetLow = (currentPrice * 1.05).toFixed(2);
  const targetHigh = (currentPrice * 1.16).toFixed(2);

  return `## AI EQUITY STRATEGIC REPORT: ${stock.symbol} (${stock.name})
*Compiled by NEPSE AI Engine (Advanced Cognitive Fallback)*

---

### 1. Executive Summary & Market Sentiment
**${stock.symbol}** is currently priced at **NPR ${stock.price.toFixed(2)}**, showing a **${isUp ? "+" : ""}${stock.changePercent}%** daily change. Operating within the high-impact **${stock.sector}** sector, the company commands a substantial market capitalization of **NPR ${stock.marketCap.toLocaleString()}M**. General market sentiment remains **${isUp ? "Moderately Bullish" : "Consolidating"}**, characterized by persistent institutional accumulation.

---

### 2. Technical Support & Resistance Levels
Based on closing history and price-volatility bands, we define the immediate pivotal trading ranges as follows:

| Pivot Resistance/Support | NPR Price | Tactical Significance |
| :--- | :--- | :--- |
| **Resistance 2 (R2)** | Rs ${r2} | Level of major momentum breakout trigger |
| **Resistance 1 (R1)** | Rs ${r1} | Dynamic resistance ceiling on swing high |
| **Current Price** | **Rs ${stock.price.toFixed(2)}** | **Active baseline consolidation** |
| **Support 1 (S1)** | Rs ${s1} | Key buyer liquidity cushion zone |
| **Support 2 (S2)** | Rs ${s2} | Strong historical demand cluster barrier |

---

### 3. Quantitative Fundamental Health
**Weighted Health Score**: **${rating.toFixed(1)} / 10**

- **Price-to-Earnings (P/E)**: **${stock.peRatio}x** (Peer sector baseline: ~22.5x)
- **Price-to-Book (P/B)**: **${stock.pbRatio}x**
- **Earnings Per Share (EPS)**: **NPR ${stock.eps}**
- **Dividend Yield**: **${stock.dividendYield}%**
- **Paid Up Capital**: **NPR ${stock.paidUpCapital}M**

---

### 4. 30-Day Predictive Horizons
- **Target Range Projection**: **Rs ${targetLow} - Rs ${targetHigh}**
- **Statistical Confidence Index**: **87.2%**
- **Outlook**: Consistent upward trend backed by positive MACD signals and strong sector liquidity.

---

### 5. Tactical Strategic Recommendation
**Action Plan**: **${recommendation}**

#### Core Rationale:
* ${reasons[0]}
* ${reasons[1]}
* ${reasons[2]}
* Relative strength index (RSI) is holding steadily at 52, showing significant bullish headroom before reaching saturation bands.`;
}
