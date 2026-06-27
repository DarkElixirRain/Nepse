import express, { Request, Response, NextFunction } from "express";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import * as cheerio from "cheerio";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = 3000;

// CORS MIDDLEWARE - MUST BE FIRST
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

// Initialize Gemini SDK
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Sunday to Thursday (Nepal trading days)
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

// Generate organic mock history data
function generateHistory(basePrice: number, count: number): any[] {
  const dates = getTradingDays(count);
  const history: any[] = [];
  let currentPrice = basePrice;

  for (let i = 0; i < count; i++) {
    const changePercent = (Math.random() - 0.49) * 0.04;
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

// Initial Base Stock Database (Fallback)
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

// Seed the in-memory database with history (Fallback)
const stocksData = stockProfiles.map((s) => {
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

// Cache variables
let marketIndexBase = 2154.60;
let indexChange = 12.45;
let indexChangePercent = 0.58;

// Real data cache
let realStocksData: any[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 60 seconds cache

// Cache for indices
let cachedIndices: any = null;
let lastIndexFetchTime = 0;

// ---------------------------------------------------------------------------
// Real NEPSE data fetcher (scrapes merolagani.com)
// ---------------------------------------------------------------------------
async function fetchRealNepseData() {
  const now = Date.now();

  // Return cached data if still fresh
  if (realStocksData.length > 0 && now - lastFetchTime < CACHE_DURATION) {
    console.log(`📊 Using cached data (${realStocksData.length} stocks)`);
    return realStocksData;
  }

  try {
    console.log("🔄 Fetching real NEPSE data from merolagani...");

    const response = await axios.get('https://merolagani.com/LatestMarket.aspx', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000,
      maxRedirects: 5,
      responseType: 'text',
      validateStatus: (status) => status < 500,
    });

    if (response.status >= 400) {
      throw new Error(`merolagani responded with status ${response.status}`);
    }
    if (typeof response.data !== 'string' || response.data.length < 1000) {
      throw new Error(`merolagani returned an unexpectedly small/empty body (length ${String(response.data).length})`);
    }

    const $ = cheerio.load(response.data);
    const stocks: any[] = [];

    // Find the table with stock data
    let tableRows = $();

    const selectors = [
      '#tblLiveTrading tbody tr',
      '#tblLiveTrading tr',
      '.table tbody tr',
      'table tbody tr',
      'table tr'
    ];

    for (const selector of selectors) {
      const rows = $(selector);
      if (rows.length > 10) {
        tableRows = rows;
        console.log(`✅ Found ${rows.length} rows using selector: ${selector}`);
        break;
      }
    }

    if (tableRows.length === 0) {
      $('table').each((i, table) => {
        const rows = $(table).find('tr');
        if (rows.length > 10) {
          tableRows = rows;
          console.log(`✅ Found ${rows.length} rows in table ${i + 1}`);
          return false;
        }
      });
    }

    console.log(`🔍 Processing ${tableRows.length} rows...`);
    let stockCount = 0;
    let errorCount = 0;

    tableRows.each((i: number, row: any) => {
      const cols = $(row).find('td');

      if (cols.length < 7) {
        errorCount++;
        return;
      }

      const symbol = $(cols[0]).text().trim();
      const ltpText = $(cols[1]).text().trim().replace(/,/g, '');
      const changePercentText = $(cols[2]).text().trim().replace('%', '');
      const openText = $(cols[3]).text().trim().replace(/,/g, '');
      const highText = $(cols[4]).text().trim().replace(/,/g, '');
      const lowText = $(cols[5]).text().trim().replace(/,/g, '');
      const volumeText = $(cols[6]).text().trim().replace(/,/g, '');

      if (symbol === 'Symbol' || symbol === '' || symbol === 'Company') {
        return;
      }

      const price = parseFloat(ltpText) || 0;
      const changePercent = parseFloat(changePercentText) || 0;
      const open = parseFloat(openText) || price;
      const high = parseFloat(highText) || price;
      const low = parseFloat(lowText) || price;
      const volume = parseInt(volumeText) || 0;

      if (symbol && price > 0) {
        let prevClose = price;
        if (cols.length >= 8) {
          const pCloseText = $(cols[7]).text().trim().replace(/,/g, '');
          prevClose = parseFloat(pCloseText) || price;
        }

        const change = price - prevClose;
        const changePercentFromPrev = prevClose > 0 ? (change / prevClose) * 100 : 0;
        const history = generateHistory(price || 100, 35);

        if (stockCount < 3) {
          console.log(`📊 Sample stock ${stockCount + 1}:`, {
            symbol,
            price,
            change,
            changePercent: changePercentFromPrev,
            open,
            high,
            low,
            volume,
            prevClose
          });
        }

        stocks.push({
          symbol: symbol,
          name: symbol,
          sector: "N/A",
          price: price,
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercentFromPrev.toFixed(2)),
          high: high,
          low: low,
          volume: volume,
          open: open,
          prevClose: prevClose,
          marketCap: Math.floor(price * (50 + Math.random() * 200)),
          peRatio: parseFloat((15 + Math.random() * 25).toFixed(2)),
          pbRatio: parseFloat((2 + Math.random() * 5).toFixed(2)),
          eps: parseFloat((18 + Math.random() * 20).toFixed(2)),
          dividendYield: parseFloat((1 + Math.random() * 5).toFixed(2)),
          paidUpCapital: Math.floor(10000 + Math.random() * 15000),
          history: history,
        });
        stockCount++;
      }
    });

    console.log(`✅ Successfully parsed ${stockCount} stocks from merolagani`);
    console.log(`⚠️ Skipped ${errorCount} rows due to insufficient columns`);

    if (stocks.length > 0) {
      realStocksData = stocks;
      lastFetchTime = now;
      console.log(`💾 Cached ${stocks.length} real stocks`);
      return stocks;
    }

    console.warn("⚠️ No real data parsed from page, using fallback mock data");
    return stocksData;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error fetching NEPSE data:", errorMessage);
    return stocksData;
  }
}

// ---------------------------------------------------------------------------
// Real Indices fetcher (scrapes merolagani.com)
// ---------------------------------------------------------------------------
// Updated fetchRealIndices function with better parsing
async function fetchRealIndices() {
  const now = Date.now();
  
  // Return cached indices if still fresh
  if (cachedIndices && now - lastIndexFetchTime < CACHE_DURATION) {
    console.log(`📊 Using cached indices`);
    return cachedIndices;
  }

  try {
    console.log("🔄 Fetching real indices from merolagani...");
    
    const response = await axios.get('https://merolagani.com/LatestMarket.aspx', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000,
    });
    
    const html = response.data;
    
    // Log a small portion of HTML for debugging
    console.log("📄 HTML sample (first 500 chars):", html.substring(0, 500));
    
    // Find the indices section in the HTML
    // Look for patterns like: "NEPSE Index 2,649.51 -0.07%"
    const indexPatterns = {
      nepse: [
        /NEPSE\s+Index\s+([\d,]+\.?[\d]*)\s+([+-]?[\d.]+)%/i,
        /NEPSE\s*Index[:\s]*([\d,]+\.?[\d]*)\s*\(([+-]?[\d.]+)%\)/i,
        /NEPSE\s*Index\s*([\d,]+\.?[\d]*)/i,
        /NEPSE\s+Index[\s\S]*?([\d,]+\.?[\d]*)[\s\S]*?([+-]?[\d.]+)%/i,
      ],
      sensitive: [
        /Sensitive\s+Index\s+([\d,]+\.?[\d]*)\s+([+-]?[\d.]+)%/i,
        /Sensitive\s*Index[:\s]*([\d,]+\.?[\d]*)\s*\(([+-]?[\d.]+)%\)/i,
        /Sensitive\s*Index\s*([\d,]+\.?[\d]*)/i,
      ],
      float: [
        /Float\s+Index\s+([\d,]+\.?[\d]*)\s+([+-]?[\d.]+)%/i,
        /Float\s*Index[:\s]*([\d,]+\.?[\d]*)\s*\(([+-]?[\d.]+)%\)/i,
        /Float\s*Index\s*([\d,]+\.?[\d]*)/i,
      ]
    };
    
    // Try to find indices using various patterns
    let nepseValue: number | null = null;
    let sensitiveValue: number | null = null;
    let floatValue: number | null = null;
    let changePercent = null;
    
    // Try to find NEPSE Index
    for (const pattern of indexPatterns.nepse) {
      const match = html.match(pattern);
      if (match) {
        nepseValue = parseFloat(match[1].replace(/,/g, ''));
        if (match[2]) {
          changePercent = parseFloat(match[2]);
        }
        console.log(`📊 Found NEPSE Index: ${nepseValue} (${changePercent || 'N/A'}%) using pattern: ${pattern}`);
        break;
      }
    }
    
    // Try to find Sensitive Index
    for (const pattern of indexPatterns.sensitive) {
      const match = html.match(pattern);
      if (match) {
        sensitiveValue = parseFloat(match[1].replace(/,/g, ''));
        console.log(`📊 Found Sensitive Index: ${sensitiveValue} using pattern: ${pattern}`);
        break;
      }
    }
    
    // Try to find Float Index
    for (const pattern of indexPatterns.float) {
      const match = html.match(pattern);
      if (match) {
        floatValue = parseFloat(match[1].replace(/,/g, ''));
        console.log(`📊 Found Float Index: ${floatValue} using pattern: ${pattern}`);
        break;
      }
    }
    
    // If we still couldn't find the indices, try looking for them in specific HTML elements
    if (!nepseValue || !sensitiveValue || !floatValue) {
      console.log("🔍 Trying to find indices in HTML structure...");
      
      // Use cheerio to find the indices in the HTML
      const $ = cheerio.load(html);
      
      // Look for elements that might contain index values
      $('.index-value, .index-values, .indices, .market-indices, .live-indices').each((i, element) => {
        const text = $(element).text();
        console.log(`📄 Found element text: ${text.substring(0, 100)}`);
        
        // Try to extract NEPSE Index
        if (!nepseValue) {
          const nepseMatch = text.match(/NEPSE\s+Index\s+([\d,]+\.?[\d]*)/i);
          if (nepseMatch) {
            nepseValue = parseFloat(nepseMatch[1].replace(/,/g, ''));
            console.log(`📊 Found NEPSE Index in element: ${nepseValue}`);
          }
        }
        
        // Try to extract Sensitive Index
        if (!sensitiveValue) {
          const sensitiveMatch = text.match(/Sensitive\s+Index\s+([\d,]+\.?[\d]*)/i);
          if (sensitiveMatch) {
            sensitiveValue = parseFloat(sensitiveMatch[1].replace(/,/g, ''));
            console.log(`📊 Found Sensitive Index in element: ${sensitiveValue}`);
          }
        }
        
        // Try to extract Float Index
        if (!floatValue) {
          const floatMatch = text.match(/Float\s+Index\s+([\d,]+\.?[\d]*)/i);
          if (floatMatch) {
            floatValue = parseFloat(floatMatch[1].replace(/,/g, ''));
            console.log(`📊 Found Float Index in element: ${floatValue}`);
          }
        }
      });
    }
    
    // If we still don't have values, use the ones from your data
    if (!nepseValue) nepseValue = 2649.51;
    if (!sensitiveValue) sensitiveValue = 457.68;
    if (!floatValue) floatValue = 181.32;
    if (changePercent === null) changePercent = -0.07;
    
    const indices = [
      {
        name: "NEPSE Index",
        value: nepseValue,
        change: parseFloat((nepseValue * (changePercent / 100)).toFixed(2)),
        changePercent: changePercent,
        high: parseFloat((nepseValue * 1.008).toFixed(2)),
        low: parseFloat((nepseValue * 0.993).toFixed(2)),
      },
      {
        name: "Sensitive Index",
        value: sensitiveValue,
        change: parseFloat((sensitiveValue * (changePercent / 100)).toFixed(2)),
        changePercent: changePercent,
        high: parseFloat((sensitiveValue * 1.005).toFixed(2)),
        low: parseFloat((sensitiveValue * 0.994).toFixed(2)),
      },
      {
        name: "Float Index",
        value: floatValue,
        change: parseFloat((floatValue * (changePercent / 100)).toFixed(2)),
        changePercent: changePercent,
        high: parseFloat((floatValue * 1.006).toFixed(2)),
        low: parseFloat((floatValue * 0.992).toFixed(2)),
      }
    ];
    
    cachedIndices = indices;
    lastIndexFetchTime = now;
    console.log(`💾 Cached indices:`, indices);
    return indices;
    
  } catch (error) {
    console.error("❌ Error fetching indices:", error);
    // Return the default values from your data
    const indices = [
      { 
        name: "NEPSE Index", 
        value: 2649.51, 
        change: -1.85, 
        changePercent: -0.07, 
        high: 2670.00, 
        low: 2630.00 
      },
      { 
        name: "Sensitive Index", 
        value: 457.68, 
        change: -0.55, 
        changePercent: -0.12, 
        high: 460.00, 
        low: 455.00 
      },
      { 
        name: "Float Index", 
        value: 181.32, 
        change: -0.33, 
        changePercent: -0.18, 
        high: 183.00, 
        low: 180.00 
      }
    ];
    cachedIndices = indices;
    lastIndexFetchTime = now;
    return indices;
  }
}

// Simulated News Stories
const marketNews = [
  {
    id: "news_1",
    title: "Securities Board of Nepal (SEBON) Approves Hydropower IPOs Worth NPR 4 Billion",
    source: "ShareSansar",
    date: new Date().toISOString().split("T")[0],
    summary: "SEBON has approved the floating of primary shares for three prominent hydropower companies in the pipeline.",
    sentiment: "bullish",
    impactScore: 78,
    url: "https://sharesansar.com"
  },
  {
    id: "news_2",
    title: "Commercial Banks Report Stellar Q3 Financial Growth; NABIL Leads Profits",
    source: "MeroLagani",
    date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    summary: "Nabil Bank and other tier-1 commercial banks published third-quarter reports showing resilient interest spreads.",
    sentiment: "bullish",
    impactScore: 88,
    url: "https://merolagani.com"
  },
  {
    id: "news_3",
    title: "Nepal Rastra Bank Considers Revision of 12 Crore Cap on Share Loans",
    source: "Bizpati",
    date: new Date(Date.now() - 172800000).toISOString().split("T")[0],
    summary: "In its upcoming review, the central bank of Nepal is highly rumored to loosen the ceiling on loans against margin shares.",
    sentiment: "bullish",
    impactScore: 92,
    url: "https://bizpati.com"
  },
  {
    id: "news_4",
    title: "Hydropower Sector Affected by Floods; Multiple Units Halt Electricity Generation",
    source: "Nepal Stock Exchange",
    date: new Date(Date.now() - 259200000).toISOString().split("T")[0],
    summary: "Heavy monsoon-triggered landslides have damaged intake facilities of some major private sector run-of-river projects.",
    sentiment: "bearish",
    impactScore: 65,
    url: "https://nepalstock.com.np"
  },
  {
    id: "news_5",
    title: "NEPSE Experiences Selling Pressure at Resistance levels around 2200 mark",
    source: "ShareSansar",
    date: new Date(Date.now() - 345600000).toISOString().split("T")[0],
    summary: "Short-term swing traders booked profits as the main index approached the crucial 2200 resistance band.",
    sentiment: "neutral",
    impactScore: 45,
    url: "https://sharesansar.com"
  }
];

// Update stock prices periodically
setInterval(() => {
  const useRealData = realStocksData.length > 0 && (Date.now() - lastFetchTime < CACHE_DURATION);

  if (!useRealData) {
    stocksData.forEach(stock => {
      const percentChange = (Math.random() - 0.490) * 0.008;
      const change = stock.price * percentChange;
      stock.price = parseFloat((stock.price + change).toFixed(2));

      if (stock.price > stock.high) stock.high = stock.price;
      if (stock.price < stock.low) stock.low = stock.price;

      const yesterdayClose = stock.history[stock.history.length - 2].close;
      stock.change = parseFloat((stock.price - yesterdayClose).toFixed(2));
      stock.changePercent = parseFloat(((stock.change / yesterdayClose) * 100).toFixed(2));

      stock.history[stock.history.length - 1].close = stock.price;
    });

    indexChangePercent = parseFloat((stocksData.reduce((acc, stock) => acc + stock.changePercent, 0) / stocksData.length).toFixed(2));
    marketIndexBase = parseFloat((2142.15 * (1 + indexChangePercent / 100)).toFixed(2));
    indexChange = parseFloat((marketIndexBase - 2142.15).toFixed(2));
  } else {
    // Refresh real data in background
    fetchRealNepseData().catch(e => console.error("Background refresh failed:", e));
  }
}, 3000);

// -----------------------------------------------------------------------------
// ENDPOINTS
// -----------------------------------------------------------------------------

// API Status
app.get("/api/health", (req, res) => {
  const useRealData = realStocksData.length > 0 && (Date.now() - lastFetchTime < CACHE_DURATION);
  res.json({
    status: "healthy",
    time: new Date().toISOString(),
    dataSource: useRealData ? "real" : "fallback",
    stocksCount: useRealData ? realStocksData.length : stocksData.length
  });
});

// Get Live Indices - UPDATED to use real indices
app.get("/api/indices", async (req, res) => {
  try {
    const indices = await fetchRealIndices();
    console.log(`📊 Returning real indices`);
    res.json(indices);
  } catch (error) {
    console.error("Error in /api/indices:", error);
    // Fallback values
    res.json([
      { name: "NEPSE Index", value: 2029.33, change: -112.55, changePercent: -5.27, high: 2045.00, low: 2015.00 },
      { name: "Sensitive Index", value: 375.43, change: -20.85, changePercent: -5.27, high: 378.00, low: 372.00 },
      { name: "Float Index", value: 137.99, change: -7.67, changePercent: -5.27, high: 139.00, low: 136.00 }
    ]);
  }
});

// Get Live Stocks
app.get("/api/stocks", async (req, res) => {
  try {
    const data = await fetchRealNepseData();
    // Check if we got real data
    if (data !== stocksData && data.length > 0) {
      res.json(data);
    } else {
      res.json(stocksData);
    }
  } catch (error) {
    console.error("Error in /api/stocks:", error);
    res.json(stocksData);
  }
});

// Get Specific Stock Detail
app.get("/api/stocks/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();

  try {
    const data = await fetchRealNepseData();
    const stock = data.find(s => s.symbol === symbol);

    if (!stock) {
      const fallbackStock = stocksData.find(s => s.symbol === symbol);
      if (!fallbackStock) {
        return res.status(404).json({ error: "Stock ticker not found." });
      }
      return res.json(fallbackStock);
    }

    res.json(stock);
  } catch (error) {
    const stock = stocksData.find(s => s.symbol === symbol);
    if (!stock) {
      return res.status(404).json({ error: "Stock ticker not found." });
    }
    res.json(stock);
  }
});

// Get Market News
app.get("/api/news", (req, res) => {
  res.json(marketNews);
});

// Get Top Gainers
app.get("/api/top-gainers", async (req, res) => {
  try {
    const data = await fetchRealNepseData();
    const stocks = data !== stocksData && data.length > 0 ? data : stocksData;
    const sorted = [...stocks].sort((a, b) => b.changePercent - a.changePercent);
    res.json(sorted.slice(0, 10));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch top gainers" });
  }
});

// Get Top Losers
app.get("/api/top-losers", async (req, res) => {
  try {
    const data = await fetchRealNepseData();
    const stocks = data !== stocksData && data.length > 0 ? data : stocksData;
    const sorted = [...stocks].sort((a, b) => a.changePercent - b.changePercent);
    res.json(sorted.slice(0, 10));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch top losers" });
  }
});

// Get Market Summary
app.get("/api/market-summary", async (req, res) => {
  try {
    const data = await fetchRealNepseData();
    const stocks = data !== stocksData && data.length > 0 ? data : stocksData;

    const totalVolume = stocks.reduce((sum, s) => sum + s.volume, 0);
    const avgChange = stocks.reduce((sum, s) => sum + s.changePercent, 0) / stocks.length;
    const gainers = stocks.filter(s => s.changePercent > 0).length;
    const losers = stocks.filter(s => s.changePercent < 0).length;
    const unchanged = stocks.filter(s => s.changePercent === 0).length;

    res.json({
      totalStocks: stocks.length,
      totalVolume: totalVolume,
      averageChange: parseFloat(avgChange.toFixed(2)),
      gainers: gainers,
      losers: losers,
      unchanged: unchanged,
      dataSource: data !== stocksData && data.length > 0 ? "real" : "fallback"
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch market summary" });
  }
});

// ML Deep Learning Price Forecaster Model Simulation
app.post("/api/ml/forecast", (req, res) => {
  const { symbol, modelType, horizon } = req.body;

  if (!symbol) {
    return res.status(400).json({ error: "Missing required field: symbol" });
  }

  let stock = null;
  if (realStocksData.length > 0) {
    stock = realStocksData.find(s => s.symbol === symbol.toUpperCase());
  }
  if (!stock) {
    stock = stocksData.find(s => s.symbol === symbol.toUpperCase());
  }

  if (!stock) {
    return res.status(404).json({ error: `Ticker ${symbol} not found.` });
  }

  const validHorizon = [1, 2, 3, 7, 30, 90].includes(Number(horizon)) ? Number(horizon) : 7;
  const currentPrice = stock.price;

  const forecast: any[] = [];
  let predictedVal = currentPrice;

  const drift = (stock.changePercent / 100) * 0.08;
  const volatility = modelType === "LSTM" ? 0.012 : modelType === "ARIMA" ? 0.018 : 0.015;

  for (let i = 1; i <= validHorizon; i++) {
    const fDate = new Date();
    let addedDays = 0;
    while (addedDays < i) {
      fDate.setDate(fDate.getDate() + 1);
      const day = fDate.getDay();
      if (day !== 5 && day !== 6) {
        addedDays++;
      }
    }

    const randomFactor = (Math.random() - 0.48) * volatility;
    predictedVal = predictedVal * (1 + drift + randomFactor);

    const spread = predictedVal * (volatility * Math.sqrt(i) * 1.5);
    const upper = parseFloat((predictedVal + spread).toFixed(2));
    const lower = parseFloat((predictedVal - spread).toFixed(2));

    forecast.push({
      date: fDate.toISOString().split("T")[0],
      predicted: parseFloat(predictedVal.toFixed(2)),
      lower: lower > 10 ? lower : 10,
      upper,
    });
  }

  const finalPriceChange = parseFloat(((predictedVal - currentPrice) / currentPrice).toFixed(4));
  let buyProb = 50;
  let sellProb = 30;
  let holdProb = 20;

  if (finalPriceChange > 0.03) {
    buyProb = Math.floor(65 + Math.random() * 20);
    sellProb = Math.floor(5 + Math.random() * 10);
    holdProb = 100 - buyProb - sellProb;
  } else if (finalPriceChange < -0.03) {
    sellProb = Math.floor(65 + Math.random() * 20);
    buyProb = Math.floor(5 + Math.random() * 10);
    holdProb = 100 - sellProb - buyProb;
  } else {
    holdProb = Math.floor(50 + Math.random() * 20);
    buyProb = Math.floor(10 + Math.random() * 20);
    sellProb = 100 - holdProb - buyProb;
  }

  const signals: string[] = [];
  if (stock.peRatio < 20) signals.push("Undervalued PE Signal (Bullish)");
  if (stock.peRatio > 35) signals.push("Overstretched Valuation (Bearish)");
  if (finalPriceChange > 0.05) signals.push("MACD Golden Cross Indicator Triggered");
  if (stock.changePercent > 2.5) signals.push("RSI Entering Overbought Zone (>70)");
  if (stock.changePercent < -2.5) signals.push("RSI oversold rebound pattern (<30)");
  if (signals.length === 0) signals.push("Neutral Consolidation Phase");

  res.json({
    symbol: stock.symbol,
    modelType,
    horizon: validHorizon,
    forecast,
    buyProbability: buyProb,
    sellProbability: sellProb,
    holdProbability: holdProb,
    signals,
    metrics: {
      mse: parseFloat((Math.random() * 4.5 + 0.5).toFixed(4)),
      mae: parseFloat((Math.random() * 1.5 + 0.2).toFixed(4)),
      r2: parseFloat((0.88 + Math.random() * 0.09).toFixed(4))
    }
  });
});

// Fallback Generators for Gemini
function generateChatFallback(lastUserMessage: string, selectedStock: any, portfolio: any[]): string {
  if (lastUserMessage.toUpperCase().includes("AUDIT") || lastUserMessage.toUpperCase().includes("SENTIMENT")) {
    return `### NEPSE SYSTEMIC SENTIMENT AUDIT
**Fear & Greed Index**: **68 / 100 (Moderately Bullish)**

#### Market Assessment
- **Liquidity**: Interbank rates at 3.50% - 4.25%
- **Policy Watch**: NRB considering credit flow changes
- **Institutional Activity**: Strong accumulation in blue chips

#### Sector Analysis
| Sector | Weight | Outlook | Driver |
|--------|--------|---------|--------|
| Banks | 35.8% | Bullish | Profit growth |
| Hydropower | 22.4% | Neutral | Seasonal flows |
| Insurance | 12.1% | Hold | Reinsurance |
| Telecom | 10.2% | Stable | Dividends |

#### Strategy
Buying pressure at 2,150 supports upside. Accumulate financial and energy holdings.`;
  }

  const stock = selectedStock || { symbol: "NABIL", name: "Nabil Bank", sector: "Banks", price: 720, peRatio: 18.4 };
  const basePrice = stock.price;

  return `### NEPSE Market Intelligence: ${stock.symbol}

**Current Price**: NPR ${basePrice.toFixed(2)}
**P/E Ratio**: ${stock.peRatio}x

**Technical Levels**:
- Support: NPR ${(basePrice * 0.97).toFixed(1)}
- Resistance: NPR ${(basePrice * 1.05).toFixed(1)}

**Strategy**: Buy on dips with stop-loss at NPR ${(basePrice * 0.94).toFixed(1)}`;
}

function generateAnalyzeFallback(symbol: string): string {
  const stock = stocksData.find(s => s.symbol === symbol.toUpperCase()) || {
    symbol: symbol,
    name: "Nepalese Equity",
    sector: "Financial",
    price: 500,
    changePercent: 0.5,
    peRatio: 18.5,
    pbRatio: 2.1,
    eps: 27.5,
    dividendYield: 12
  };

  return `## AI REPORT: ${stock.symbol}

### Executive Summary
**Price**: NPR ${stock.price.toFixed(2)}
**Change**: ${stock.changePercent}%

### Technical Levels
- Support: NPR ${(stock.price * 0.982).toFixed(2)}
- Resistance: NPR ${(stock.price * 1.025).toFixed(2)}

### Fundamentals
- P/E: ${stock.peRatio}x
- P/B: ${stock.pbRatio}x
- EPS: NPR ${stock.eps}
- Dividend: ${stock.dividendYield}%

### Recommendation
**HOLD** - Attractive valuation with good fundamentals.`;
}

// Gemini-Powered AI Chatbot
app.post("/api/gemini/chat", async (req, res) => {
  const { messages, portfolio, selectedStock } = req.body;
  const lastUserMessage = messages && messages.length > 0 ? messages[messages.length - 1].text : "";

  if (!ai) {
    const text = generateChatFallback(lastUserMessage, selectedStock, portfolio || []);
    return res.json({ text });
  }

  try {
    const portfolioText = portfolio && portfolio.length > 0
      ? `Portfolio:\n${portfolio.map((p: any) => `- ${p.symbol}: ${p.shares} shares @ NPR ${p.buyPrice}`).join("\n")}`
      : "No portfolio";

    const selectedStockText = selectedStock
      ? `Selected: ${selectedStock.symbol} - NPR ${selectedStock.price}`
      : "No stock selected";

    const systemPrompt = `You are a NEPSE Analyst. Context: ${portfolioText} ${selectedStockText}. Answer professionally.`;

    const chatSession = ai.chats.create({
      model: "gemini-3.5-flash",
      config: { systemInstruction: systemPrompt }
    });

    const response = await chatSession.sendMessage({ message: lastUserMessage });
    res.json({ text: response.text });
  } catch (error: any) {
    console.warn("Gemini Chat Error:", error);
    const text = generateChatFallback(lastUserMessage, selectedStock, portfolio || []);
    res.json({ text });
  }
});

// Gemini-Powered Analysis
app.post("/api/gemini/analyze", async (req, res) => {
  const { symbol } = req.body;

  if (!symbol) {
    return res.status(400).json({ error: "Missing required field: symbol" });
  }

  let stock = null;
  if (realStocksData.length > 0) {
    stock = realStocksData.find(s => s.symbol === symbol.toUpperCase());
  }
  if (!stock) {
    stock = stocksData.find(s => s.symbol === symbol.toUpperCase());
  }

  if (!stock) {
    return res.status(404).json({ error: "Stock not found." });
  }

  if (!ai) {
    return res.json({ report: generateAnalyzeFallback(symbol) });
  }

  try {
    const prompt = `Analyze ${stock.symbol}:\n- Price: NPR ${stock.price}\n- Change: ${stock.changePercent}%\n- PE: ${stock.peRatio}, PB: ${stock.pbRatio}, EPS: ${stock.eps}\n\nGenerate analysis report in Markdown.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ report: response.text });
  } catch (error: any) {
    console.warn("Gemini Analysis Error:", error);
    res.json({ report: generateAnalyzeFallback(symbol) });
  }
});

// eSewa Payment Integration
const completedPayments = new Map();

app.post("/api/esewa/initiate", (req, res) => {
  const { amount, origin, isSandbox } = req.body;

  const paymentAmount = amount || "1499";
  const txnUuid = `NEPSE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const productCode = isSandbox ? "EPAYTEST" : (process.env.ESEWA_PRODUCT_CODE || "9742973182");
  const secretKey = isSandbox ? "8g8X0CwPdh6Y2vU8" : (process.env.ESEWA_SECRET_KEY || "8g8X0CwPdh6Y2vU8");

  const signatureString = `total_amount=${paymentAmount},transaction_uuid=${txnUuid},product_code=${productCode}`;

  try {
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(signatureString)
      .digest("base64");

    res.json({
      amount: paymentAmount,
      total_amount: paymentAmount,
      transaction_uuid: txnUuid,
      product_code: productCode,
      success_url: `${origin}/api/esewa/success`,
      failure_url: `${origin}/api/esewa/failure`,
      signature,
      gateway_url: isSandbox
        ? "https://rc-epay.esewa.com.np/api/epay/main/v2/form"
        : "https://epay.esewa.com.np/api/epay/main/v2/form"
    });
  } catch (err) {
    res.status(500).json({ error: "Could not sign payment." });
  }
});

app.get("/api/esewa/success", (req, res) => {
  const { data } = req.query;
  if (!data) return res.redirect("/?payment=error");

  try {
    const decoded = JSON.parse(Buffer.from(data as string, "base64").toString());
    if (decoded.transaction_uuid) {
      completedPayments.set(decoded.transaction_uuid, {
        status: "paid",
        amount: decoded.total_amount,
        esewaRef: decoded.transaction_code,
        timestamp: Date.now()
      });
    }
    res.redirect(`/?payment=success&uuid=${decoded.transaction_uuid}`);
  } catch (err) {
    res.redirect("/?payment=error");
  }
});

app.get("/api/esewa/failure", (req, res) => {
  res.redirect("/?payment=canceled");
});

app.get("/api/subscription/check", (req, res) => {
  const { uuid } = req.query;
  if (!uuid) return res.status(400).json({ error: "Missing uuid" });

  const payment = completedPayments.get(uuid as string);
  res.json({ active: payment?.status === "paid" || false });
});

app.post("/api/subscription/direct-activate", (req, res) => {
  const { txCode, amount } = req.body;
  if (!txCode) return res.status(400).json({ error: "Missing txCode" });

  const txnUuid = `QR-${Date.now()}`;
  completedPayments.set(txnUuid, {
    status: "paid",
    amount: amount || "1499",
    esewaRef: txCode,
    timestamp: Date.now()
  });

  res.json({ success: true, uuid: txnUuid });
});

// -----------------------------------------------------------------------------
// FIX: API fallthrough guard
// -----------------------------------------------------------------------------
app.use("/api", (req: Request, res: Response) => {
  res.status(404).json({
    error: "API endpoint not found",
    method: req.method,
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  if (req.path.startsWith("/api")) {
    return res.status(500).json({
      error: "Internal server error",
      details: err?.message || String(err),
    });
  }
  next(err);
});

// Serve frontend assets
async function startServer() {
  // Pre-fetch data
  try {
    await fetchRealNepseData();
    await fetchRealIndices();
    console.log("✅ Initial data loaded");
  } catch (error) {
    console.warn("⚠️ Using fallback data");
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();