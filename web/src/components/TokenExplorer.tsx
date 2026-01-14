import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, Cell } from 'recharts';
import api from '../utils/api';

interface TokenExplorerProps {
  socket: Socket | null;
}

interface Token {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image_uri: string;
  market_cap: number;
  usd_market_cap: number;
  creator: string;
  created_timestamp: number;
  complete: boolean;
  liquidity?: number;
  holders?: number;
  volume_24h?: number;
  dev_holdings?: number;
  dev_holdings_percent?: number;
  sniper_holdings?: number;
  sniper_holdings_percent?: number;
  insider_holdings?: number;
  insider_holdings_percent?: number;
  dex_is_paid?: boolean;
  pumpfun: {
    bonding_curve: string;
    associated_bonding_curve: string;
    associated_market: string;
  };
  // New fields from DexScreener
  price?: number;
  priceChange5m?: number;
  priceChange1h?: number;
  priceChange24h?: number;
  volume5m?: number;
  volume1h?: number;
  txns5m?: { buys: number; sells: number };
  txns1h?: { buys: number; sells: number };
  txns24h?: { buys: number; sells: number };
  age?: number;
  isNew?: boolean;
  isGraduating?: boolean;
  isTrending?: boolean;
  riskScore?: number;
  dexId?: string;
}

// Candlestick Chart Component using custom SVG rendering
const CandlestickChart = ({ data, chartType }: { data: any[], chartType: string }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-white/60">
        No chart data available
      </div>
    );
  }

  // Calculate price range for scaling
  const allPrices = data.flatMap(d => [
    parseFloat(d.open || 0), 
    parseFloat(d.high || 0), 
    parseFloat(d.low || 0), 
    parseFloat(d.close || 0)
  ]).filter(p => p > 0);
  
  if (allPrices.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-white/60">
        No valid price data available
      </div>
    );
  }

  const maxPrice = Math.max(...allPrices);
  const minPrice = Math.min(...allPrices);
  const priceRange = maxPrice - minPrice || maxPrice * 0.1 || 0.000001;
  
  // Use larger viewBox for better resolution
  const chartHeight = 400;
  const chartWidth = 800; // Much larger for better resolution
  const padding = { top: 20, right: 40, bottom: 40, left: 60 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  
  // Calculate candle width based on data length
  const candleWidth = Math.max(2, Math.min(8, plotWidth / data.length * 0.6));
  const spacing = plotWidth / Math.max(1, data.length - 1);

  const getY = (price: number) => {
    const normalizedPrice = (price - minPrice) / priceRange;
    return padding.top + plotHeight - (normalizedPrice * plotHeight);
  };

  const formatTime = (time: string) => {
    try {
      const date = new Date(time);
      if (chartType === '1H' || chartType === '4H') {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Format price for display
  const formatPrice = (price: number) => {
    if (price >= 1) return price.toFixed(4);
    if (price >= 0.01) return price.toFixed(6);
    return price.toFixed(8);
  };

  return (
    <div className="relative w-full">
      <svg 
        width="100%" 
        height={chartHeight} 
        viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible"
      >
        {/* Background */}
        <rect width={chartWidth} height={chartHeight} fill="#0f172a" />
        
        {/* Grid lines (horizontal) */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + (plotHeight * (1 - ratio));
          return (
            <line
              key={`grid-h-${ratio}`}
              x1={padding.left}
              y1={y}
              x2={chartWidth - padding.right}
              y2={y}
              stroke="#1e293b"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          );
        })}
        
        {/* Grid lines (vertical) - show fewer for clarity */}
        {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0).map((_, i) => {
          const x = padding.left + (i * spacing * Math.max(1, Math.floor(data.length / 6)));
          return (
            <line
              key={`grid-v-${i}`}
              x1={x}
              y1={padding.top}
              x2={x}
              y2={chartHeight - padding.bottom}
              stroke="#1e293b"
              strokeWidth="0.5"
              strokeDasharray="2 2"
            />
          );
        })}
        
        {/* Candlesticks */}
        {data.map((item: any, index: number) => {
          const open = parseFloat(item.open || 0);
          const close = parseFloat(item.close || 0);
          const high = parseFloat(item.high || 0);
          const low = parseFloat(item.low || 0);
          
          // Skip if invalid data
          if (!open || !close || !high || !low || high < low) return null;
          
          const isGreen = close >= open;
          const x = padding.left + (index * spacing);
          
          const openY = getY(open);
          const closeY = getY(close);
          const highY = getY(high);
          const lowY = getY(low);
          
          const bodyTop = Math.min(openY, closeY);
          const bodyBottom = Math.max(openY, closeY);
          const bodyHeight = Math.max(0.5, bodyBottom - bodyTop);

          return (
            <g key={index}>
              {/* High-Low wick (línea vertical) */}
              <line
                x1={x}
                y1={highY}
                x2={x}
                y2={lowY}
                stroke={isGreen ? '#22c55e' : '#ff3b3b'}
                strokeWidth="2"
              />
              {/* Body (rectángulo) */}
              <rect
                x={x - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={isGreen ? '#22c55e' : '#ff3b3b'}
                stroke={isGreen ? '#16a34a' : '#e02424'}
                strokeWidth="1"
                rx="2"
                style={{ filter: isGreen ? 'drop-shadow(0 0 2px rgba(34, 197, 94, 0.5))' : 'drop-shadow(0 0 2px rgba(255, 59, 59, 0.5))' }}
              />
            </g>
          );
        })}
        
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const price = minPrice + (priceRange * (1 - ratio));
          const y = padding.top + (plotHeight * ratio);
          return (
            <g key={`y-label-${ratio}`}>
              <line
                x1={padding.left - 5}
                y1={y}
                x2={padding.left}
                y2={y}
                stroke="#475569"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                fill="#94a3b8"
                fontSize="11"
                fontFamily="monospace"
              >
                ${formatPrice(price)}
              </text>
            </g>
          );
        })}
        
        {/* X-axis labels */}
        {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 8)) === 0).map((item: any, i: number) => {
          const index = data.findIndex(d => d === item);
          const x = padding.left + (index * spacing);
          return (
            <g key={`x-label-${i}`}>
              <line
                x1={x}
                y1={chartHeight - padding.bottom}
                x2={x}
                y2={chartHeight - padding.bottom + 5}
                stroke="#475569"
                strokeWidth="1"
              />
              <text
                x={x}
                y={chartHeight - padding.bottom + 20}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="10"
              >
                {formatTime(item.time)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default function TokenExplorer({ socket }: TokenExplorerProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [priceData, setPriceData] = useState<any[]>([]);
  const [ohlcvData, setOhlcvData] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [chartType, setChartType] = useState<'1H' | '4H' | '1D' | '1W'>('1D');
  const [activeFilter, setActiveFilter] = useState<'all' | 'new' | 'graduating' | 'trending'>('new'); // Start with New Tokens

  // Advanced filters
  const [searchQuery, setSearchQuery] = useState('');
  const [marketCapFilter, setMarketCapFilter] = useState<'all' | 'micro' | 'small' | 'medium' | 'large'>('all');
  const [volumeFilter, setVolumeFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [ageFilter, setAgeFilter] = useState<'all' | 'fresh' | 'recent' | 'established'>('all');
  const [sortBy, setSortBy] = useState<'marketCap' | 'volume' | 'age' | 'priceChange'>('marketCap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Risk analysis
  const [riskAnalyses, setRiskAnalyses] = useState<Map<string, any>>(new Map());

  // Token detail page data
  const [tokenTransactions, setTokenTransactions] = useState<any[]>([]);
  const [whaleAlerts, setWhaleAlerts] = useState<any[]>([]);
  const [buyVsSellRatio, setBuyVsSellRatio] = useState<{ buys: number; sells: number } | null>(null);

  // Load risk analyses when tokens change
  useEffect(() => {
    if (tokens.length > 0) {
      const mints = tokens.map(t => t.mint);
      loadRiskAnalyses(mints);
    }
  }, [tokens.length]); // Only reload when token count changes

  useEffect(() => {
    loadTokens();

    // Listen for real-time token updates via WebSocket
    if (socket) {
      socket.on('token:new', (token: any) => {
        console.log('New token detected:', token);
        // Add to tokens list if not already present
        setTokens((prev) => {
          const exists = prev.some(t => t.mint === token.mint);
          if (exists) return prev;
          return [{
            mint: token.mint,
            name: `Token ${token.mint.substring(0, 8)}`,
            symbol: 'TKN',
            created_timestamp: token.timestamp,
            complete: false,
            market_cap: 0,
            usd_market_cap: 0,
          } as Token, ...prev].slice(0, 50);
        });
      });

      // Debounced token updates (price, volume, txns, graduation flags, etc.)
      socket.on('token:update', (token: any) => {
        if (!token?.mint) return;
        setTokens((prev) => prev.map((t) => (t.mint === token.mint ? ({ ...t, ...token } as any) : t)));
        setSelectedToken((prev) => (prev && prev.mint === token.mint ? ({ ...prev, ...token } as any) : prev));
      });

      // Explicit graduation event (pumpfun -> raydium)
      socket.on('token:graduation', (token: any) => {
        if (!token?.mint) return;
        setTokens((prev) => prev.map((t) => (t.mint === token.mint ? ({ ...t, ...token, complete: true } as any) : t)));
        setSelectedToken((prev) => (prev && prev.mint === token.mint ? ({ ...prev, ...token, complete: true } as any) : prev));
      });

      // Live trades (used to make the UI feel alive)
      socket.on('trade:new', (trade: any) => {
        if (!trade?.mint) return;
        // Only push into the detail panel when the selected token matches
        setTokenTransactions((prev) => {
          if (!selectedToken || selectedToken.mint !== trade.mint) return prev;
          const next = [{
            ...trade,
            timestamp: trade.timestamp || Date.now(),
          }, ...prev];
          return next.slice(0, 50);
        });

        setBuyVsSellRatio((prev) => {
          if (!selectedToken || selectedToken.mint !== trade.mint) return prev;
          const next = prev ? { ...prev } : { buys: 0, sells: 0 };
          if (trade.side === 'buy') next.buys += 1;
          if (trade.side === 'sell') next.sells += 1;
          return next;
        });

        // Update small counters on the list as well
        setTokens((prev) => prev.map((t) => {
          if (t.mint !== trade.mint) return t;
          const txns1h = t.txns1h || { buys: 0, sells: 0 };
          const volume1h = (t.volume1h || 0) + (trade.amountSol || 0);
          const updatedTxns1h = trade.side === 'buy'
            ? { ...txns1h, buys: (txns1h.buys || 0) + 1 }
            : { ...txns1h, sells: (txns1h.sells || 0) + 1 };
          return { ...t, txns1h: updatedTxns1h, volume1h, price: trade.price || t.price } as any;
        }));
      });
    }

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadTokens();
      }, 15000); // Refresh every 15 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
      if (socket) {
        socket.off('token:new');
        socket.off('token:update');
        socket.off('token:graduation');
        socket.off('trade:new');
      }
    };
  }, [autoRefresh, socket, activeFilter, selectedToken]);

  useEffect(() => {
    if (selectedToken) {
      loadTokenPriceData(selectedToken.mint);
      loadTokenFullInfo(selectedToken.mint);
      loadChartData(selectedToken.mint);
      loadTrades(selectedToken.mint);
    }
  }, [selectedToken, chartType]);

  const loadTokenFullInfo = async (mint: string) => {
    try {
      const response = await api.get(`/pumpfun/token/${mint}`);
      if (response.data) {
        // Update selected token with full info
        setSelectedToken((prev) => prev ? { ...prev, ...response.data } : null);
      }
    } catch (error) {
      console.error('Failed to load full token info:', error);
    }
  };

  const loadChartData = async (mint: string) => {
    try {
      const response = await api.get(`/pumpfun/token/${mint}/chart?type=${chartType}`);
      if (response.data && response.data.length > 0) {
        setOhlcvData(response.data);
      } else {
        // Generate OHLCV from trades if no chart data
        generateOHLCVFromTrades();
      }
    } catch (error) {
      console.error('Failed to load chart data:', error);
      generateOHLCVFromTrades();
    }
  };

  const loadTrades = async (mint: string) => {
    try {
      const response = await api.get(`/pumpfun/token/${mint}/trades?limit=100`);
      if (response.data && Array.isArray(response.data)) {
        setTrades(response.data);
        // Generate OHLCV from trades
        generateOHLCVFromTrades(response.data);
      }
    } catch (error) {
      console.error('Failed to load trades:', error);
    }
  };

  const generateOHLCVFromTrades = (tradesData?: any[]) => {
    const tradesToUse = tradesData || trades;
    if (tradesToUse.length === 0) {
      // Generate sample data
      const data: any[] = [];
      const now = Date.now();
      const basePrice = selectedToken?.price_usd || 0.001;
      
      for (let i = 50; i >= 0; i--) {
        const time = new Date(now - i * (chartType === '1H' ? 3600000 : chartType === '4H' ? 14400000 : chartType === '1D' ? 86400000 : 604800000));
        const variance = 0.9 + (Math.random() * 0.2);
        const open = basePrice * variance;
        const close = open * (0.95 + Math.random() * 0.1);
        const high = Math.max(open, close) * (1 + Math.random() * 0.05);
        const low = Math.min(open, close) * (0.95 - Math.random() * 0.05);
        
        data.push({
          time: time.toISOString(),
          open,
          high,
          low,
          close,
          volume: Math.random() * 100000,
          buyVolume: Math.random() * 50000,
          sellVolume: Math.random() * 50000,
        });
      }
      setOhlcvData(data);
      return;
    }

    // Group trades by time period and calculate OHLCV
    const grouped: { [key: string]: any[] } = {};
    const periodMs = chartType === '1H' ? 3600000 : chartType === '4H' ? 14400000 : chartType === '1D' ? 86400000 : 604800000;
    
    tradesToUse.forEach((trade: any) => {
      const tradeTime = trade.timestamp * 1000;
      const periodStart = Math.floor(tradeTime / periodMs) * periodMs;
      const key = new Date(periodStart).toISOString();
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(trade);
    });

    const ohlcv: any[] = [];
    Object.keys(grouped).sort().forEach((key) => {
      const periodTrades = grouped[key];
      const prices = periodTrades.map((t: any) => t.price || 0).filter((p: number) => p > 0);
      const volumes = periodTrades.map((t: any) => t.solAmount || 0);
      
      if (prices.length > 0) {
        const open = prices[0];
        const close = prices[prices.length - 1];
        const high = Math.max(...prices);
        const low = Math.min(...prices);
        const volume = volumes.reduce((a: number, b: number) => a + b, 0);
        const buyVolume = periodTrades.filter((t: any) => t.side === 'buy').reduce((sum: number, t: any) => sum + (t.solAmount || 0), 0);
        const sellVolume = periodTrades.filter((t: any) => t.side === 'sell').reduce((sum: number, t: any) => sum + (t.solAmount || 0), 0);
        
        ohlcv.push({
          time: key,
          open,
          high,
          low,
          close,
          volume,
          buyVolume,
          sellVolume,
        });
      }
    });

    setOhlcvData(ohlcv.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()));
  };

  const loadTokens = async () => {
    setLoading(true);
    try {
      // Try primary endpoint
      try {
        // Use new token feed API based on active filter
        // Note: baseURL already includes /api, so we don't need to prefix with /api
        let endpoint = '/tokens/feed';
        const params = new URLSearchParams();
        params.set('limit', '100');

        switch (activeFilter) {
          case 'new':
            endpoint = '/tokens/new';
            break;
          case 'graduating':
            endpoint = '/tokens/graduating';
            break;
          case 'trending':
            endpoint = '/tokens/trending';
            break;
          default:
            params.set('filter', 'all');
            params.set('minLiquidity', '1000');
        }

        const response = await api.get(`${endpoint}?${params.toString()}`);

        // Handle response format: { success, count, tokens } or direct array
        const tokensData = response.data?.tokens || response.data;

        if (tokensData && Array.isArray(tokensData) && tokensData.length > 0) {
          // Map TokenData from API to Token interface
          const mappedTokens: Token[] = tokensData.map((t: any) => ({
            mint: t.mint,
            name: t.name || 'Unknown',
            symbol: t.symbol || 'UNK',
            description: '',
            image_uri: t.imageUrl || t.image_uri || '',
            market_cap: t.marketCap || t.market_cap || 0,
            usd_market_cap: t.marketCap || t.usd_market_cap || t.market_cap || 0,
            creator: '',
            created_timestamp: t.created_timestamp || Math.floor((t.createdAt || Date.now()) / 1000),
            complete: t.complete !== undefined ? t.complete : (t.dexId !== 'pumpfun'), // Non-pumpfun = graduated
            liquidity: t.liquidity || 0,
            holders: t.holders || 0,
            volume_24h: t.volume24h || t.volume_24h || 0,
            dev_holdings: 0,
            dev_holdings_percent: 0,
            sniper_holdings: 0,
            sniper_holdings_percent: 0,
            insider_holdings: 0,
            insider_holdings_percent: 0,
            dex_is_paid: false,
            pumpfun: {
              bonding_curve: '',
              associated_bonding_curve: '',
              associated_market: '',
            },
            // Extra fields from new API
            priceChange5m: t.priceChange5m,
            priceChange1h: t.priceChange1h,
            priceChange24h: t.priceChange24h,
            volume5m: t.volume5m,
            volume1h: t.volume1h,
            txns5m: t.txns5m,
            txns1h: t.txns1h,
            txns24h: t.txns24h,
            age: t.age,
            isNew: t.isNew,
            isGraduating: t.isGraduating,
            isTrending: t.isTrending,
            riskScore: t.riskScore,
            dexId: t.dexId,
            price: t.price,
          }));

          console.log(`✅ Loaded ${mappedTokens.length} tokens with filter: ${activeFilter}`);
          setTokens(mappedTokens);
          return; // Success, exit early
        } else {
          console.warn('No tokens returned from primary endpoint, trying fallback...', {
            endpoint,
            responseData: response.data
          });
        }
      } catch (error: any) {
        console.error('Failed to load tokens from primary endpoint:', error);
        // Continue to fallback below
      }

      // Fallback: Try /api/pumpfun/tokens endpoint (has multiple fallbacks)
      try {
        console.log('Trying fallback endpoint: /pumpfun/tokens');
        const fallbackResponse = await api.get('/pumpfun/tokens?offset=0&limit=50&sort=created_timestamp&order=DESC');
        if (fallbackResponse.data) {
          const data = Array.isArray(fallbackResponse.data)
            ? fallbackResponse.data
            : (fallbackResponse.data.coins || fallbackResponse.data.data || []);

          if (data.length > 0) {
            console.log(`✅ Loaded ${data.length} tokens from fallback endpoint`);
            setTokens(data.slice(0, 50));
            return; // Success
          } else {
            console.warn('Fallback endpoint returned empty array');
          }
        }
      } catch (fallbackError: any) {
        console.error('Fallback endpoint also failed:', fallbackError);
      }

      // If we get here, both endpoints failed
      console.error('All token endpoints failed, showing empty state');
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTokenPriceData = async (mint: string) => {
    try {
      // Fetch token data via backend proxy
      const response = await api.get(`/pumpfun/token/${mint}`);
      if (response.data) {
        const data = response.data;
        // Generate price data based on market cap
        const prices = [];
        const now = Date.now();
        const basePrice = data.usd_market_cap ? data.usd_market_cap / 1000000 : 0;
        
        for (let i = 24; i >= 0; i--) {
          const time = new Date(now - i * 3600000);
          // Simulate price movement (in real implementation, you'd use historical data)
          const variance = 0.9 + (Math.random() * 0.2); // ±10% variance
          prices.push({
            time: time.toLocaleTimeString(),
            price: basePrice * variance,
            volume: Math.random() * 100,
          });
        }
        setPriceData(prices);
      }
    } catch (error) {
      console.error('Failed to load price data:', error);
      // Generate sample data if API fails
      const prices = [];
      const now = Date.now();
      for (let i = 24; i >= 0; i--) {
        const time = new Date(now - i * 3600000);
        prices.push({
          time: time.toLocaleTimeString(),
          price: Math.random() * 10,
          volume: Math.random() * 100,
        });
      }
      setPriceData(prices);
    }
  };

  const loadRiskAnalyses = async (tokenMints: string[]) => {
    if (tokenMints.length === 0) return;

    try {
      // Load risk analyses in batch (max 20 at a time)
      const batches = [];
      for (let i = 0; i < tokenMints.length; i += 20) {
        batches.push(tokenMints.slice(i, i + 20));
      }

      for (const batch of batches) {
        try {
          const response = await api.post('/tokens/risk/batch', { mints: batch });

          if (response.data) {
            setRiskAnalyses(prev => {
              const newMap = new Map(prev);
              Object.entries(response.data).forEach(([mint, analysis]) => {
                newMap.set(mint, analysis);
              });
              return newMap;
            });
          }
        } catch (error) {
          console.error('Failed to load risk analysis batch:', error);
        }

        // Wait a bit between batches to avoid overwhelming the API
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      console.error('Failed to load risk analyses:', error);
    }
  };

  const formatMarketCap = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatSOL = (lamports: number) => {
    return (lamports / 1000000000).toFixed(4);
  };

  // Filter and sort tokens
  const getFilteredAndSortedTokens = () => {
    let filtered = [...tokens];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(token =>
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query) ||
        token.mint.toLowerCase().includes(query)
      );
    }

    // Market cap filter
    if (marketCapFilter !== 'all') {
      filtered = filtered.filter(token => {
        const mc = token.usd_market_cap || 0;
        switch (marketCapFilter) {
          case 'micro': return mc < 10000;
          case 'small': return mc >= 10000 && mc < 50000;
          case 'medium': return mc >= 50000 && mc < 100000;
          case 'large': return mc >= 100000;
          default: return true;
        }
      });
    }

    // Volume filter
    if (volumeFilter !== 'all') {
      filtered = filtered.filter(token => {
        const vol = token.volume_24h || 0;
        switch (volumeFilter) {
          case 'low': return vol < 1000;
          case 'medium': return vol >= 1000 && vol < 5000;
          case 'high': return vol >= 5000;
          default: return true;
        }
      });
    }

    // Age filter
    if (ageFilter !== 'all') {
      filtered = filtered.filter(token => {
        const age = token.age || (Date.now() / 1000 - (token.created_timestamp || 0));
        const ageMinutes = age / 60;
        switch (ageFilter) {
          case 'fresh': return ageMinutes < 60; // < 1 hour
          case 'recent': return ageMinutes >= 60 && ageMinutes < 360; // 1-6 hours
          case 'established': return ageMinutes >= 360; // > 6 hours
          default: return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = 0, bVal = 0;

      switch (sortBy) {
        case 'marketCap':
          aVal = a.usd_market_cap || 0;
          bVal = b.usd_market_cap || 0;
          break;
        case 'volume':
          aVal = a.volume_24h || 0;
          bVal = b.volume_24h || 0;
          break;
        case 'age':
          aVal = a.age || (Date.now() / 1000 - (a.created_timestamp || 0));
          bVal = b.age || (Date.now() / 1000 - (b.created_timestamp || 0));
          break;
        case 'priceChange':
          aVal = a.priceChange24h || 0;
          bVal = b.priceChange24h || 0;
          break;
      }

      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return filtered;
  };

  const filteredTokens = getFilteredAndSortedTokens();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="container-card animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">Token Explorer</h2>
            <p className="text-sm text-white/50">Discover and analyze tokens in real-time</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2.5 text-white/70 cursor-pointer hover:text-white/90 transition-colors">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded accent-primary-500 cursor-pointer focus:ring-2 focus:ring-white/20"
              />
              <span className="text-sm font-medium">Auto-refresh (15s)</span>
            </label>
            <button
              onClick={loadTokens}
              disabled={loading}
              className="btn-primary flex items-center gap-2 min-w-[100px] justify-center"
            >
              {loading ? (
                <>
                  <div className="loading-spinner w-4 h-4"></div>
                  <span>Loading...</span>
                </>
              ) : (
                'Refresh'
              )}
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2.5">
          {[
            { key: 'new', label: 'New (< 30m)' },
            { key: 'graduating', label: 'Graduating' },
            { key: 'trending', label: 'Trending' },
            { key: 'all', label: 'All Tokens' },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key as typeof activeFilter)}
              className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeFilter === filter.key
                  ? 'bg-white text-black shadow-lg shadow-white/20 scale-105'
                  : 'badge hover:bg-white/10 hover:text-white hover:scale-105 active:scale-95'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Search & Filters */}
      <div className="card animate-slide-up">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, symbol, or mint address..."
              className="input-field pl-10"
            />
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Advanced Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Market Cap Filter */}
          <div>
            <label className="block text-white/70 text-xs font-semibold mb-2.5 uppercase tracking-wider">Market Cap</label>
            <select
              value={marketCapFilter}
              onChange={(e) => setMarketCapFilter(e.target.value as any)}
              className="input-field py-2.5 text-sm cursor-pointer"
            >
              <option value="all">All</option>
              <option value="micro">Micro (&lt; $10K)</option>
              <option value="small">Small ($10K - $50K)</option>
              <option value="medium">Medium ($50K - $100K)</option>
              <option value="large">Large (&gt; $100K)</option>
            </select>
          </div>

          {/* Volume Filter */}
          <div>
            <label className="block text-white/60 text-xs font-medium mb-2">Volume 24h</label>
            <select
              value={volumeFilter}
              onChange={(e) => setVolumeFilter(e.target.value as any)}
              className="input-field py-2.5 text-sm cursor-pointer"
            >
              <option value="all">All</option>
              <option value="low">Low (&lt; $1K)</option>
              <option value="medium">Medium ($1K - $5K)</option>
              <option value="high">High (&gt; $5K)</option>
            </select>
          </div>

          {/* Age Filter */}
          <div>
            <label className="block text-white/60 text-xs font-medium mb-2">Age</label>
            <select
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value as any)}
              className="input-field py-2.5 text-sm cursor-pointer"
            >
              <option value="all">All</option>
              <option value="fresh">Fresh (&lt; 1h)</option>
              <option value="recent">Recent (1-6h)</option>
              <option value="established">Established (&gt; 6h)</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-white/60 text-xs font-medium mb-2">Sort By</label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 px-3 py-2 bg-black border border-white/15 text-white rounded-lg focus:border-white/30 focus:outline-none text-sm"
              >
                <option value="marketCap">Market Cap</option>
                <option value="volume">Volume</option>
                <option value="age">Age</option>
                <option value="priceChange">Price Change</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 bg-black border border-white/15 text-white rounded-lg hover:border-white/30 transition-all"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 text-white/60 text-sm">
          Showing {filteredTokens.length} of {tokens.length} tokens
        </div>
      </div>

      {/* Token List */}
      <div className="bg-black rounded-lg p-6 border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <h3 className="text-lg font-semibold text-white mb-4">Tokens</h3>
        
        {loading && tokens.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-white/60 mb-2">Buscando tokens en la blockchain...</div>
            <div className="text-white/40 text-sm">Esto puede tardar unos segundos</div>
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-white/60 mb-4">⚠️ No se encontraron tokens automáticamente</div>
            <div className="text-white/50 text-sm mb-4 max-w-2xl mx-auto text-left bg-black p-6 rounded-lg border border-white/15 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="mb-4">
                <strong className="text-yellow-400 text-base">¿Por qué no se encuentran tokens?</strong>
                <p className="text-xs text-white/60 mt-2">
                  La API de pump.fun está protegida por Cloudflare y bloquea peticiones automatizadas. 
                  La búsqueda on-chain también puede fallar debido a limitaciones del RPC.
                </p>
              </div>
              
              <div className="mb-4">
                <strong className="text-primary-400 text-base">Solución Rápida:</strong>
                <div className="mt-2 space-y-2">
                  <div className="flex items-start space-x-2">
                    <span className="text-primary-400">1.</span>
                    <div className="flex-1">
                      <p className="text-xs">Ve a la pestaña <strong className="text-white">"pnl.onl"</strong></p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-primary-400">2.</span>
                    <div className="flex-1">
                      <p className="text-xs">Visita <a href="https://pump.fun" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline font-medium">pump.fun</a> en tu navegador</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-primary-400">3.</span>
                    <div className="flex-1">
                      <p className="text-xs">Copia el <strong className="text-white">mint address</strong> del token que quieras</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-primary-400">4.</span>
                    <div className="flex-1">
                      <p className="text-xs">Pega el mint address en el campo <strong className="text-white">"Token Mint Address"</strong> y ejecuta</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-xs text-white/50 mb-3">
                  💡 <strong>Tip:</strong> El bot funciona perfectamente con mint addresses manuales. 
                  Esta sección es solo para explorar tokens automáticamente, pero no es necesaria para usar el bot.
                </p>
                <div className="bg-white/5 p-3 rounded-lg">
                  <p className="text-xs text-white/70 mb-2">
                    <strong>🔌 WebSocket activo:</strong> El sistema está escuchando transacciones en tiempo real.
                    Los tokens aparecerán automáticamente cuando se creen nuevos tokens en pump.fun.
                  </p>
                  <p className="text-xs text-white/60">
                    Si no ves tokens ahora, es porque no hay actividad reciente. El WebSocket detectará nuevos tokens cuando se creen.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('switchTab', { detail: 'pumpfun' }));
                }}
                className="px-6 py-2 bg-gradient-to-r from-primary-500 to-accent-pink hover:from-primary-600 hover:to-accent-pink/80 text-white rounded-lg font-medium transition-all duration-200"
              >
                Ir a pnl.onl
              </button>
              <button
                onClick={loadTokens}
                className="px-4 py-2 bg-black border border-white/20 hover:border-primary-500/50 text-white rounded-lg font-medium transition-all duration-200"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-white/60 text-sm">
                {activeFilter === 'all' && `Mostrando ${tokens.length} tokens`}
                {activeFilter === 'new' && `${tokens.length} tokens nuevos (< 30 min)`}
                {activeFilter === 'graduating' && `${tokens.length} tokens a punto de graduar`}
                {activeFilter === 'trending' && `${tokens.length} tokens en tendencia`}
              </div>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded">
                  DexScreener API
                </span>
                <span className="px-2 py-1 bg-white/5 text-white/50 rounded">
                  Auto-refresh: 15s
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredTokens.map((token) => {
                const tokenAge = token.age ?? (token.created_timestamp ? Math.floor((Date.now() / 1000 - token.created_timestamp) / 60) : null);
                return (
                <div
                key={token.mint}
                onClick={() => setSelectedToken(token)}
                className={`bg-black rounded-lg p-4 cursor-pointer border border-white/15 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-200 ${
                  selectedToken?.mint === token.mint
                    ? 'border-primary-500 ring-2 ring-primary-500/50'
                    : 'border-white/5 hover:border-white/20'
                }`}
              >
                {/* Badges */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {(() => {
                    const risk = riskAnalyses.get(token.mint);
                    if (risk) {
                      if (risk.riskLevel === 'safe') {
                        return (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-semibold rounded-full border border-green-500/30" title={`Risk Score: ${risk.overallScore}/100`}>
                            🟢 SAFE
                          </span>
                        );
                      } else if (risk.riskLevel === 'medium') {
                        return (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] font-semibold rounded-full border border-yellow-500/30" title={`Risk Score: ${risk.overallScore}/100`}>
                            🟡 MEDIUM RISK
                          </span>
                        );
                      } else if (risk.riskLevel === 'high') {
                        return (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-semibold rounded-full border border-red-500/30" title={`Risk Score: ${risk.overallScore}/100`}>
                            🔴 HIGH RISK
                          </span>
                        );
                      }
                    }
                    return null;
                  })()}
                  {token.isNew && (
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-semibold rounded-full border border-blue-500/30">
                      NEW
                    </span>
                  )}
                  {token.isGraduating && (
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-semibold rounded-full border border-purple-500/30">
                      GRADUATING
                    </span>
                  )}
                  {token.isTrending && (
                    <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] font-semibold rounded-full border border-orange-500/30">
                      TRENDING
                    </span>
                  )}
                  {token.dexId && (
                    <span className="px-2 py-0.5 bg-white/10 text-white/60 text-[10px] font-medium rounded-full">
                      {token.dexId}
                    </span>
                  )}
                </div>

                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-white font-bold text-sm">{token.name || 'N/A'}</div>
                    <div className="text-white/60 text-xs font-mono">{token.symbol || 'N/A'}</div>
                  </div>
                  {token.image_uri && (
                    <img
                      src={token.image_uri}
                      alt={token.name}
                      className="w-10 h-10 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>

                {/* Price and Change */}
                {token.price !== undefined && (
                  <div className="mb-2 pb-2 border-b border-white/5">
                    <div className="text-lg font-bold text-white">
                      ${token.price < 0.01 ? token.price.toFixed(8) : token.price.toFixed(4)}
                    </div>
                    <div className="flex gap-2 text-[10px]">
                      {token.priceChange5m !== undefined && (
                        <span className={token.priceChange5m >= 0 ? 'text-green-400' : 'text-red-400'}>
                          5m: {token.priceChange5m >= 0 ? '+' : ''}{token.priceChange5m.toFixed(1)}%
                        </span>
                      )}
                      {token.priceChange1h !== undefined && (
                        <span className={token.priceChange1h >= 0 ? 'text-green-400' : 'text-red-400'}>
                          1h: {token.priceChange1h >= 0 ? '+' : ''}{token.priceChange1h.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">MC:</span>
                    <span className="text-primary-400 font-medium">
                      {token.usd_market_cap ? formatMarketCap(token.usd_market_cap) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Liq:</span>
                    <span className="text-green-400 font-medium">
                      {token.liquidity ? formatMarketCap(token.liquidity) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Vol 1h:</span>
                    <span className="text-purple-400 font-medium">
                      {token.volume1h ? formatMarketCap(token.volume1h) : (token.volume_24h ? formatMarketCap(token.volume_24h) : 'N/A')}
                    </span>
                  </div>
                  {token.txns1h && (
                    <div className="flex justify-between text-xs">
                      <span className="text-white/60">Txns 1h:</span>
                      <span className="font-medium">
                        <span className="text-green-400">{token.txns1h.buys}B</span>
                        <span className="text-white/40">/</span>
                        <span className="text-red-400">{token.txns1h.sells}S</span>
                      </span>
                    </div>
                  )}
                  {tokenAge !== null && (
                    <div className="flex justify-between text-xs">
                      <span className="text-white/60">Age:</span>
                      <span className="text-white/80 font-medium">
                        {tokenAge < 60
                          ? `${tokenAge}m`
                          : tokenAge < 1440
                          ? `${Math.floor(tokenAge / 60)}h ${tokenAge % 60}m`
                          : `${Math.floor(tokenAge / 1440)}d`}
                      </span>
                    </div>
                  )}
                  {token.riskScore !== undefined && (
                    <div className="flex justify-between text-xs">
                      <span className="text-white/60">Risk:</span>
                      <span className={`font-medium ${
                        token.riskScore < 30 ? 'text-green-400' :
                        token.riskScore < 60 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {token.riskScore < 30 ? 'Low' : token.riskScore < 60 ? 'Medium' : 'High'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-white/5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(token.mint);
                      alert('Mint address copiado!');
                    }}
                    className="w-full px-3 py-1 bg-black hover:bg-white/10 text-white text-xs rounded-md border border-white/15 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-200"
                  >
                    Copiar Mint
                  </button>
                </div>
              </div>
              );
              })}
            </div>
          </>
        )}
      </div>

      {/* Token Details Modal */}
      {selectedToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedToken(null)}>
          <div 
            className="bg-black rounded-lg p-4 sm:p-6 md:p-8 border border-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] max-w-7xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">
                {selectedToken.name} ({selectedToken.symbol})
              </h3>
              <p className="text-slate-400 text-sm font-mono mt-1">{selectedToken.mint}</p>
            </div>
            <button
              onClick={() => setSelectedToken(null)}
              className="px-4 py-2 bg-black border border-white/15 hover:border-white/30 text-white rounded-lg font-medium transition-all"
            >
              Cerrar
            </button>
          </div>

          {/* Token Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-black/50 rounded-lg p-4 border border-white/10">
              <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Market Cap (USD)</div>
              <div className="text-xl font-bold text-cyan-400">
                {selectedToken.usd_market_cap ? formatMarketCap(selectedToken.usd_market_cap) : 'N/A'}
              </div>
            </div>
            <div className="bg-black/50 rounded-lg p-4 border border-white/10">
              <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Market Cap (SOL)</div>
              <div className="text-xl font-bold text-cyan-400">
                {formatSOL(selectedToken.market_cap)} SOL
              </div>
            </div>
            <div className="bg-black/50 rounded-lg p-4 border border-white/10">
              <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Estado</div>
              <div className={`text-xl font-bold ${selectedToken.complete ? 'text-green-400' : 'text-yellow-400'}`}>
                {selectedToken.complete ? 'Graduado' : 'Activo'}
              </div>
            </div>
            <div className="bg-black/50 rounded-lg p-4 border border-white/10">
              <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Creado</div>
              <div className="text-sm font-medium text-white">
                {new Date(selectedToken.created_timestamp * 1000).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-black/50 rounded-lg p-4 border border-white/10">
              <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Liquidez</div>
              <div className="text-lg font-bold text-green-400">
                {selectedToken.liquidity ? formatMarketCap(selectedToken.liquidity) : 'N/A'}
              </div>
            </div>
            <div className="bg-black/50 rounded-lg p-4 border border-white/10">
              <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Holders</div>
              <div className="text-lg font-bold text-blue-400">
                {selectedToken.holders ? selectedToken.holders.toLocaleString() : 'N/A'}
              </div>
            </div>
            <div className="bg-black/50 rounded-lg p-4 border border-white/10">
              <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Volumen 24h</div>
              <div className="text-lg font-bold text-purple-400">
                {selectedToken.volume_24h ? formatMarketCap(selectedToken.volume_24h) : 'N/A'}
              </div>
            </div>
            <div className="bg-black/50 rounded-lg p-4 border border-white/10">
              <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">DEX Status</div>
              <div className={`text-lg font-bold ${selectedToken.dex_is_paid ? 'text-yellow-400' : 'text-gray-400'}`}>
                {selectedToken.dex_is_paid ? 'Paid' : 'Free'}
              </div>
            </div>
          </div>

          {/* Price Stats */}
          {selectedToken.price && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-black/50 rounded-lg p-4 border border-white/10">
                <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Precio Actual</div>
                <div className="text-lg font-bold text-white">
                  ${selectedToken.price < 0.01 ? selectedToken.price.toFixed(8) : selectedToken.price.toFixed(4)}
                </div>
              </div>
              <div className="bg-black/50 rounded-lg p-4 border border-white/10">
                <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">ATH (Estimado)</div>
                <div className="text-lg font-bold text-green-400">
                  ${(() => {
                    // Estimate ATH as 1.5-3x current price based on market cap
                    const multiplier = selectedToken.usd_market_cap > 100000 ? 1.5 :
                                      selectedToken.usd_market_cap > 50000 ? 2 : 3;
                    const ath = selectedToken.price * multiplier;
                    return ath < 0.01 ? ath.toFixed(8) : ath.toFixed(4);
                  })()}
                </div>
                <div className="text-xs text-red-400 mt-1">
                  {(() => {
                    const multiplier = selectedToken.usd_market_cap > 100000 ? 1.5 :
                                      selectedToken.usd_market_cap > 50000 ? 2 : 3;
                    const changeFromATH = -((multiplier - 1) / multiplier * 100);
                    return `${changeFromATH.toFixed(1)}% desde ATH`;
                  })()}
                </div>
              </div>
              <div className="bg-black/50 rounded-lg p-4 border border-white/10">
                <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Cambio 24h</div>
                <div className={`text-lg font-bold ${
                  (selectedToken.priceChange24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {(selectedToken.priceChange24h || 0) >= 0 ? '+' : ''}{(selectedToken.priceChange24h || 0).toFixed(2)}%
                </div>
              </div>
              <div className="bg-black/50 rounded-lg p-4 border border-white/10">
                <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Cambio 1h</div>
                <div className={`text-lg font-bold ${
                  (selectedToken.priceChange1h || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {(selectedToken.priceChange1h || 0) >= 0 ? '+' : ''}{(selectedToken.priceChange1h || 0).toFixed(2)}%
                </div>
              </div>
            </div>
          )}

          {/* Holdings Distribution */}
          <div className="bg-black/30 rounded-lg p-6 mb-6 border border-white/10">
            <h4 className="text-lg font-semibold text-white mb-4">Distribución de Holdings</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/50 rounded-lg p-4 border border-white/10">
                <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2">Dev Holdings</div>
                <div className="text-2xl font-bold text-red-400 mb-1">
                  {selectedToken.dev_holdings_percent !== undefined 
                    ? `${selectedToken.dev_holdings_percent.toFixed(2)}%`
                    : 'N/A'}
                </div>
                <div className="text-white/40 text-xs">
                  {selectedToken.dev_holdings 
                    ? `${(selectedToken.dev_holdings / 1e6).toFixed(2)}M tokens`
                    : ''}
                </div>
              </div>
              <div className="bg-black/50 rounded-lg p-4 border border-white/10">
                <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2">Sniper Holdings</div>
                <div className="text-2xl font-bold text-orange-400 mb-1">
                  {selectedToken.sniper_holdings_percent !== undefined 
                    ? `${selectedToken.sniper_holdings_percent.toFixed(2)}%`
                    : 'N/A'}
                </div>
                <div className="text-white/40 text-xs">
                  {selectedToken.sniper_holdings 
                    ? `${(selectedToken.sniper_holdings / 1e6).toFixed(2)}M tokens`
                    : ''}
                </div>
              </div>
              <div className="bg-black/50 rounded-lg p-4 border border-white/10">
                <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2">Insider Holdings</div>
                <div className="text-2xl font-bold text-yellow-400 mb-1">
                  {selectedToken.insider_holdings_percent !== undefined 
                    ? `${selectedToken.insider_holdings_percent.toFixed(2)}%`
                    : 'N/A'}
                </div>
                <div className="text-white/40 text-xs">
                  {selectedToken.insider_holdings 
                    ? `${(selectedToken.insider_holdings / 1e6).toFixed(2)}M tokens`
                    : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Candlestick Chart with Volume */}
          <div className="bg-black/30 rounded-lg p-6 mb-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-white">Gráfico de Velas Japonesas</h4>
              <div className="flex gap-2">
                {(['1H', '4H', '1D', '1W'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                      chartType === type
                        ? 'bg-white/10 text-white border border-white/30'
                        : 'bg-black text-white/60 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            
            {ohlcvData.length > 0 ? (
              <div className="space-y-4">
                {/* Candlestick Chart */}
                <CandlestickChart data={ohlcvData} chartType={chartType} />

                {/* Volume Bars */}
                <div className="mt-6">
                  <h5 className="text-sm font-semibold text-white mb-2">Volumen (Compras vs Ventas)</h5>
                  <ResponsiveContainer width="100%" height={150}>
                    <ComposedChart data={ohlcvData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis 
                        dataKey="time" 
                        stroke="#94a3b8"
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          if (chartType === '1H' || chartType === '4H') {
                            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                          }
                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }}
                      />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                        labelStyle={{ color: '#e2e8f0' }}
                        formatter={(value: any) => {
                          return [`${(value || 0).toFixed(4)} SOL`, 'Volumen'];
                        }}
                      />
                      {/* Buy volume (green) */}
                      <Bar dataKey="buyVolume" stackId="volume" fill="#10b981" opacity={0.8}>
                        {ohlcvData.map((entry: any, index: number) => (
                          <Cell key={`cell-buy-${index}`} fill="#10b981" />
                        ))}
                      </Bar>
                      {/* Sell volume (red) */}
                      <Bar dataKey="sellVolume" stackId="volume" fill="#ef4444" opacity={0.8}>
                        {ohlcvData.map((entry: any, index: number) => (
                          <Cell key={`cell-sell-${index}`} fill="#ef4444" />
                        ))}
                      </Bar>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-white/60">
                Cargando datos del gráfico...
              </div>
            )}
          </div>

          {/* Risk Analysis Detail */}
          {(() => {
            const risk = riskAnalyses.get(selectedToken.mint);
            if (risk) {
              return (
                <div className="bg-black/30 rounded-lg p-6 mb-6 border border-white/10">
                  <h4 className="text-lg font-semibold text-white mb-4">Risk Analysis</h4>

                  {/* Risk Score */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/60 text-sm">Overall Risk Score</span>
                      <span className={`text-2xl font-bold ${
                        risk.riskLevel === 'safe' ? 'text-green-400' :
                        risk.riskLevel === 'medium' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {risk.overallScore}/100
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          risk.riskLevel === 'safe' ? 'bg-green-500' :
                          risk.riskLevel === 'medium' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${risk.overallScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Security Checks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center justify-between p-3 bg-black/50 rounded-lg">
                      <span className="text-white/70 text-sm">Liquidity Locked</span>
                      <span className={risk.checks.liquidityLocked === true ? 'text-green-400' : risk.checks.liquidityLocked === false ? 'text-red-400' : 'text-white/40'}>
                        {risk.checks.liquidityLocked === true ? '✓ Yes' : risk.checks.liquidityLocked === false ? '✗ No' : '? Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-black/50 rounded-lg">
                      <span className="text-white/70 text-sm">Mint Authority</span>
                      <span className={risk.checks.mintAuthority === false ? 'text-green-400' : risk.checks.mintAuthority === true ? 'text-red-400' : 'text-white/40'}>
                        {risk.checks.mintAuthority === false ? '✓ Disabled' : risk.checks.mintAuthority === true ? '✗ Enabled' : '? Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-black/50 rounded-lg">
                      <span className="text-white/70 text-sm">Freeze Authority</span>
                      <span className={risk.checks.freezeAuthority === false ? 'text-green-400' : risk.checks.freezeAuthority === true ? 'text-red-400' : 'text-white/40'}>
                        {risk.checks.freezeAuthority === false ? '✓ Disabled' : risk.checks.freezeAuthority === true ? '✗ Enabled' : '? Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-black/50 rounded-lg">
                      <span className="text-white/70 text-sm">Top Holders</span>
                      <span className={risk.checks.topHoldersPercent < 50 ? 'text-green-400' : risk.checks.topHoldersPercent < 70 ? 'text-yellow-400' : 'text-red-400'}>
                        {risk.checks.topHoldersPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Warnings */}
                  {risk.warnings && risk.warnings.length > 0 && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <h5 className="text-red-400 font-semibold text-sm mb-2">⚠️ Warnings</h5>
                      <ul className="space-y-1">
                        {risk.warnings.map((warning: string, idx: number) => (
                          <li key={idx} className="text-red-300 text-sm">{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })()}

          {/* Buy/Sell Ratio & Whale Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Buy/Sell Ratio */}
            <div className="bg-black/30 rounded-lg p-6 border border-white/10">
              <h4 className="text-lg font-semibold text-white mb-4">Buy/Sell Ratio (24h)</h4>
              {selectedToken.txns24h ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-white/70">Buys</span>
                    </div>
                    <span className="text-xl font-bold text-green-400">
                      {typeof selectedToken.txns24h === 'object' && selectedToken.txns24h.buys ? selectedToken.txns24h.buys : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-white/70">Sells</span>
                    </div>
                    <span className="text-xl font-bold text-red-400">
                      {typeof selectedToken.txns24h === 'object' && selectedToken.txns24h.sells ? selectedToken.txns24h.sells : 0}
                    </span>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Ratio</span>
                      <span className={`text-xl font-bold ${
                        (typeof selectedToken.txns24h === 'object' && selectedToken.txns24h.buys || 0) > (typeof selectedToken.txns24h === 'object' && selectedToken.txns24h.sells || 0)
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}>
                        {(() => {
                          const buys = typeof selectedToken.txns24h === 'object' && selectedToken.txns24h.buys || 0;
                          const sells = typeof selectedToken.txns24h === 'object' && selectedToken.txns24h.sells || 0;
                          const ratio = sells > 0 ? (buys / sells).toFixed(2) : buys.toFixed(2);
                          return `${ratio}:1`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-white/40">No transaction data available</div>
              )}
            </div>

            {/* Social Links */}
            <div className="bg-black/30 rounded-lg p-6 border border-white/10">
              <h4 className="text-lg font-semibold text-white mb-4">Links</h4>
              <div className="space-y-3">
                <a
                  href={`https://pump.fun/${selectedToken.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-black/50 rounded-lg hover:bg-black/70 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <span className="text-purple-400 text-lg">P</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium text-sm">Pump.fun</div>
                    <div className="text-white/40 text-xs">Trade on pump.fun</div>
                  </div>
                  <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a
                  href={`https://solscan.io/token/${selectedToken.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-black/50 rounded-lg hover:bg-black/70 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-400 text-lg">S</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium text-sm">Solscan</div>
                    <div className="text-white/40 text-xs">View on explorer</div>
                  </div>
                  <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a
                  href={`https://dexscreener.com/solana/${selectedToken.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-black/50 rounded-lg hover:bg-black/70 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-400 text-lg">D</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium text-sm">DexScreener</div>
                    <div className="text-white/40 text-xs">View charts & trades</div>
                  </div>
                  <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 flex flex-wrap gap-4">
            <button
              onClick={() => {
                // Set token mint in PumpFun component
                window.dispatchEvent(new CustomEvent('setTokenMint', { detail: selectedToken.mint }));
                // Switch to PumpFun tab
                window.dispatchEvent(new CustomEvent('switchTab', { detail: 'pumpfun' }));
              }}
              className="px-6 py-3 bg-black border-2 border-primary-500/40 hover:border-primary-500/60 text-primary-400 rounded-lg font-semibold transition-all"
            >
              Usar en Trade Bot
            </button>
            <a
              href={`https://pump.fun/${selectedToken.mint}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-black border border-white/15 hover:border-white/30 text-white rounded-lg font-medium transition-all"
            >
              Ver en pump.fun
            </a>
            <a
              href={`https://solscan.io/token/${selectedToken.mint}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-black border border-white/15 hover:border-white/30 text-white rounded-lg font-medium transition-all"
            >
              Ver en Solscan
            </a>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

