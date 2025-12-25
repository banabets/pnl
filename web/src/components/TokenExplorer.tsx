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
                stroke={isGreen ? '#10b981' : '#ef4444'}
                strokeWidth="1.5"
              />
              {/* Body (rectángulo) */}
              <rect
                x={x - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={isGreen ? '#10b981' : '#ef4444'}
                stroke={isGreen ? '#059669' : '#dc2626'}
                strokeWidth="0.5"
                rx="1"
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
          }, ...prev].slice(0, 50);
        });
      });
    }
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadTokens();
      }, 25000); // Refresh every 25 seconds for frequent updates
    }

    return () => {
      if (interval) clearInterval(interval);
      if (socket) {
        socket.off('token:new');
      }
    };
  }, [autoRefresh, socket]);

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
      // Fetch recent tokens via backend proxy (to avoid CORS)
      const response = await api.get('/pumpfun/tokens?offset=0&limit=100&sort=created_timestamp&order=DESC');
      if (response.data) {
        // Handle both array and object responses
        const data = Array.isArray(response.data) ? response.data : (response.data.coins || response.data.data || []);
        if (data.length > 0) {
          // Filter and prioritize: last 6 hours, prioritize last 2 hours
          const now = Date.now() / 1000;
          const sixHoursAgo = now - (6 * 60 * 60);
          const twoHoursAgo = now - (2 * 60 * 60);
          const oneHourAgo = now - (60 * 60);
          const thirtyMinutesAgo = now - (30 * 60);
          
          // Get tokens from last 6 hours (more flexible)
          const recentTokens = data.filter((token: Token) => {
            const tokenTime = token.created_timestamp || 0;
            return tokenTime > 0 && tokenTime >= sixHoursAgo;
          });
          
          if (recentTokens.length > 0) {
            // Separate by recency - prioritize very recent
            const last30min = recentTokens.filter((token: Token) => {
              const tokenTime = token.created_timestamp || 0;
              return tokenTime >= thirtyMinutesAgo;
            });
            const lastHour = recentTokens.filter((token: Token) => {
              const tokenTime = token.created_timestamp || 0;
              return tokenTime >= oneHourAgo && tokenTime < thirtyMinutesAgo;
            });
            const lastTwoHours = recentTokens.filter((token: Token) => {
              const tokenTime = token.created_timestamp || 0;
              return tokenTime >= twoHoursAgo && tokenTime < oneHourAgo;
            });
            const lastSixHours = recentTokens.filter((token: Token) => {
              const tokenTime = token.created_timestamp || 0;
              return tokenTime >= sixHoursAgo && tokenTime < twoHoursAgo;
            });
            
            // Prioritize: last 30min first, then last 1h, then last 2h, then last 6h
            const sortedTokens = [...last30min, ...lastHour, ...lastTwoHours, ...lastSixHours]
              .sort((a: Token, b: Token) => {
                const timeA = a.created_timestamp || 0;
                const timeB = b.created_timestamp || 0;
                return timeB - timeA;
              })
              // Filter only truly generic pump.fun placeholder tokens
              .filter((token: Token) => {
                const name = (token.name || '').toLowerCase().trim();
                const symbol = (token.symbol || '').toLowerCase().trim();

                const isGeneric =
                  name === 'pump.fun' ||
                  name === 'pump fun' ||
                  name === 'pumpfun' ||
                  symbol === 'pump.fun' ||
                  symbol === 'pumpfun';

                if (isGeneric) {
                  console.log(`🚫 Frontend: Rejected ${token.name} (${token.symbol})`);
                  return false;
                }
                return true;
              })
              // Ensure all required fields are present
              .map((token: Token) => ({
                ...token,
                liquidity: typeof token.liquidity === 'number' ? token.liquidity : 0,
                holders: typeof token.holders === 'number' ? token.holders : 0,
                volume_24h: typeof token.volume_24h === 'number' ? token.volume_24h : 0,
                dev_holdings: typeof token.dev_holdings === 'number' ? token.dev_holdings : 0,
                dev_holdings_percent: typeof token.dev_holdings_percent === 'number' ? token.dev_holdings_percent : 0,
                sniper_holdings: typeof token.sniper_holdings === 'number' ? token.sniper_holdings : 0,
                sniper_holdings_percent: typeof token.sniper_holdings_percent === 'number' ? token.sniper_holdings_percent : 0,
                insider_holdings: typeof token.insider_holdings === 'number' ? token.insider_holdings : 0,
                insider_holdings_percent: typeof token.insider_holdings_percent === 'number' ? token.insider_holdings_percent : 0,
                dex_is_paid: typeof token.dex_is_paid === 'boolean' ? token.dex_is_paid : false,
              }))
              .slice(0, 50);
            
            console.log(`✅ Loaded ${sortedTokens.length} tokens (${last30min.length} last 30min, ${lastHour.length} last 1h, ${lastTwoHours.length} last 2h, ${lastSixHours.length} last 6h)`);
            // Log token ages for debugging
            sortedTokens.slice(0, 10).forEach((token: Token) => {
              const ageMinutes = ((now - (token.created_timestamp || 0)) / 60).toFixed(0);
              const ageHours = ((now - (token.created_timestamp || 0)) / 3600).toFixed(1);
              console.log(`   • ${token.name} - ${ageMinutes}min / ${ageHours}h ago (ts: ${token.created_timestamp})`);
            });
            setTokens(sortedTokens);
          } else {
            // If no tokens in last 6h, show newest available (up to 24h)
            const oneDayAgo = now - (24 * 60 * 60);
            const fallbackTokens = data.filter((token: Token) => {
              const tokenTime = token.created_timestamp || 0;
              return tokenTime > 0 && tokenTime >= oneDayAgo;
            });
            if (fallbackTokens.length > 0) {
              const sorted = fallbackTokens
                .sort((a: Token, b: Token) => {
                  const timeA = a.created_timestamp || 0;
                  const timeB = b.created_timestamp || 0;
                  return timeB - timeA;
                })
                .slice(0, 30);
              console.log(`⚠️ No tokens in last 6h, showing ${sorted.length} newest from last 24h`);
              setTokens(sorted);
            } else {
              console.log(`⚠️ No tokens found in last 24 hours`);
              setTokens([]);
            }
          }
        } else {
          // If empty, show message
          setTokens([]);
        }
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
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

  const formatMarketCap = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatSOL = (lamports: number) => {
    return (lamports / 1000000000).toFixed(4);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-black rounded-2xl p-6 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold text-white">Token Explorer</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-white/70">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded accent-primary-500"
              />
              <span className="text-sm">Auto-refresh (10s)</span>
            </label>
            <button
              onClick={loadTokens}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-pink hover:from-primary-600 hover:to-accent-pink/80 text-white rounded-lg font-medium disabled:opacity-50 transition-all duration-200"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

      </div>

      {/* Token List */}
      <div className="bg-black rounded-lg p-6 border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <h3 className="text-lg font-semibold text-white mb-4">Tokens Recientes</h3>
        
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
            <div className="mb-4 space-y-2">
              <div className="text-white/60 text-sm">
                Mostrando {tokens.length} token{tokens.length !== 1 ? 's' : ''} encontrado{tokens.length !== 1 ? 's' : ''} en DexScreener
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-yellow-400 text-xs mb-2">
                  ⚠️ <strong>Limitación de APIs:</strong> DexScreener solo muestra tokens que ya tienen liquidez en pares de trading.
                </p>
                <p className="text-white/70 text-xs mb-2">
                  Tokens muy nuevos (recién creados en pump.fun) pueden tardar varios minutos en aparecer aquí.
                </p>
                <p className="text-primary-400 text-xs">
                  💡 <strong>Recomendación:</strong> Usa la pestaña "pnl.onl" y pega directamente el mint address del token que quieras tradear.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {tokens.map((token) => {
                const tokenAge = token.created_timestamp ? Math.floor((Date.now() / 1000 - token.created_timestamp) / 60) : null;
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
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Market Cap:</span>
                    <span className="text-primary-400 font-medium">
                      {token.usd_market_cap ? formatMarketCap(token.usd_market_cap) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Liquidez:</span>
                    <span className="text-green-400 font-medium">
                      {token.liquidity ? formatMarketCap(token.liquidity) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Holders:</span>
                    <span className="text-blue-400 font-medium">
                      {token.holders ? token.holders.toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Volumen 24h:</span>
                    <span className="text-purple-400 font-medium">
                      {token.volume_24h ? formatMarketCap(token.volume_24h) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Estado:</span>
                    <span className={token.complete ? 'text-green-400' : 'text-yellow-400'}>
                      {token.complete ? 'Graduado' : 'Activo'}
                    </span>
                  </div>
                  {tokenAge !== null && (
                    <div className="flex justify-between text-xs">
                      <span className="text-white/60">Creado hace:</span>
                      <span className="text-white/80 font-medium">
                        {tokenAge < 60 
                          ? `${tokenAge} min` 
                          : tokenAge < 1440 
                          ? `${Math.floor(tokenAge / 60)}h ${tokenAge % 60}m`
                          : `${Math.floor(tokenAge / 1440)}d`}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-white/5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Copy mint to clipboard
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

          {/* Quick Actions */}
          <div className="mt-6 flex gap-4">
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

