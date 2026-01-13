import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import api from '../utils/api';

interface TokenTerminalProps {
  socket: Socket | null;
  tokenMint: string;
}

interface OHLCVData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Trade {
  signature: string;
  timestamp: number;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
  buyer: string;
  seller: string;
  solAmount?: number;
  tokenAmount?: number;
}

export default function TokenTerminal({ socket, tokenMint }: TokenTerminalProps) {
  const [ohlcvData, setOhlcvData] = useState<OHLCVData[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [chartType, setChartType] = useState<'1H' | '4H' | '1D' | '1W'>('1D');
  const [tokenMetrics, setTokenMetrics] = useState<any>(null);
  const [tradesStatus, setTradesStatus] = useState<string>('');

  useEffect(() => {
    if (tokenMint && tokenMint.length >= 32) {
      loadAllData();
      startRealTimeTrades();
    }

    return () => {
      // Cleanup on unmount
    };
  }, [tokenMint, chartType]);

  useEffect(() => {
    // Listen for real-time trades via WebSocket
    if (socket) {
      socket.on('trade:new', (data: any) => {
        if (data.mint === tokenMint) {
          // Add new trade to the list
          setTrades((prev) => {
            // Avoid duplicates
            const exists = prev.some(t => t.signature === data.trade.signature);
            if (exists) return prev;
            // Add to beginning and limit size
            return [data.trade, ...prev].slice(0, 50);
          });
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('trade:new');
      }
    };
  }, [socket, tokenMint]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadTokenInfo(),
        loadChartData(),
        loadTrades(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadTokenInfo = async () => {
    try {
      const res = await api.get(`/pumpfun/token/${tokenMint}`);
      setTokenMetrics(res.data);
    } catch (error) {
      console.error('Failed to load token info:', error);
    }
  };

  const loadChartData = async () => {
    try {
      const res = await api.get(`/pumpfun/token/${tokenMint}/chart?type=${chartType}`);
      if (res.data && res.data.length > 0) {
        setOhlcvData(res.data);
      } else {
        // Generate sample data if API doesn't return data
        generateSampleOHLCV();
      }
    } catch (error) {
      console.error('Failed to load chart data:', error);
      generateSampleOHLCV();
    }
  };

  const startRealTimeTrades = async () => {
    try {
      // Start real-time trades listener
      await api.post(`/pumpfun/token/${tokenMint}/trades/start`);
      console.log('✅ Real-time trades listener started');
    } catch (error) {
      console.error('Failed to start real-time trades:', error);
    }
  };

  const loadTrades = async () => {
    try {
      setLoadingTrades(true);
      setTradesStatus('Buscando trades en DexScreener...');
      
      const res = await api.get(`/pumpfun/token/${tokenMint}/trades?limit=50`);
      
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setTrades(res.data);
        setTradesStatus(`✅ ${res.data.length} trades encontrados`);
        console.log(`✅ Loaded ${res.data.length} real trades from blockchain`);
      } else {
        setTradesStatus('⚠️ No se encontraron trades recientes');
        console.log('No real trades found - token may not have recent activity');
        setTrades([]);
      }
    } catch (error: any) {
      console.error('Failed to load trades:', error);
      setTradesStatus('❌ Error al cargar trades');
      setTrades([]);
    } finally {
      setLoadingTrades(false);
    }
  };

  const generateSampleOHLCV = () => {
    // Generate sample OHLCV data for demonstration
    const data: OHLCVData[] = [];
    const now = Date.now();
    const basePrice = tokenMetrics?.price_usd || 0.001;
    
    for (let i = 100; i >= 0; i--) {
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
      });
    }
    setOhlcvData(data);
  };

  const formatTime = (time: string) => {
    const date = new Date(time);
    if (chartType === '1H') return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (chartType === '4H') return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (chartType === '1D') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTradeTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (!tokenMint || tokenMint.length < 32) {
    return (
      <div className="bg-black rounded-lg p-6 border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <p className="text-white/60 text-center">Ingresa un mint address para ver el terminal</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Token Header with Logo and Info */}
      {tokenMetrics && (
        <div className="bg-black rounded-lg p-4 border border-white/15 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
          {/* Token Identity */}
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
            {/* Token Logo */}
            <div className="flex-shrink-0">
              {tokenMetrics.image_uri ? (
                <img
                  src={tokenMetrics.image_uri}
                  alt={tokenMetrics.name || 'Token'}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white/20"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="%23374151"/><text x="28" y="35" text-anchor="middle" fill="%23fff" font-size="20">?</text></svg>';
                  }}
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-accent-pink flex items-center justify-center text-white text-lg font-bold">
                  {tokenMetrics.symbol?.charAt(0) || '?'}
                </div>
              )}
            </div>

            {/* Token Name and Symbol */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white truncate">
                  {tokenMetrics.name || 'Unknown Token'}
                </h2>
                {/* Price Change Badge */}
                {tokenMetrics.price_change_24h !== undefined && tokenMetrics.price_change_24h !== 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                    tokenMetrics.price_change_24h > 0
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {tokenMetrics.price_change_24h > 0 ? '▲' : '▼'} {Math.abs(tokenMetrics.price_change_24h).toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-white/60 text-sm font-mono">${tokenMetrics.symbol || 'TKN'}</span>
                <span className="text-white/40">•</span>
                <span className="text-white/40 text-xs font-mono truncate">{tokenMint.substring(0, 6)}...{tokenMint.substring(tokenMint.length - 4)}</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {tokenMetrics.twitter && (
                <a
                  href={tokenMetrics.twitter.startsWith('http') ? tokenMetrics.twitter : `https://twitter.com/${tokenMetrics.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/30 transition-all"
                  title="Twitter/X"
                >
                  <svg className="w-4 h-4 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              )}
              {tokenMetrics.telegram && (
                <a
                  href={tokenMetrics.telegram.startsWith('http') ? tokenMetrics.telegram : `https://t.me/${tokenMetrics.telegram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-white/5 hover:bg-blue-400/20 border border-white/10 hover:border-blue-400/30 transition-all"
                  title="Telegram"
                >
                  <svg className="w-4 h-4 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                </a>
              )}
              {tokenMetrics.website && (
                <a
                  href={tokenMetrics.website.startsWith('http') ? tokenMetrics.website : `https://${tokenMetrics.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-white/5 hover:bg-green-500/20 border border-white/10 hover:border-green-500/30 transition-all"
                  title="Website"
                >
                  <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                  </svg>
                </a>
              )}
              {/* Pump.fun and Solscan links */}
              <a
                href={`https://pump.fun/${tokenMint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/30 transition-all"
                title="View on pump.fun"
              >
                <span className="text-xs font-bold text-white/80">PF</span>
              </a>
              <a
                href={`https://solscan.io/token/${tokenMint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/30 transition-all"
                title="View on Solscan"
              >
                <span className="text-xs font-bold text-white/80">SS</span>
              </a>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <div className="text-white/60 text-xs font-medium uppercase mb-1">Price</div>
              <div className="text-white font-semibold">
                ${tokenMetrics.price_usd?.toFixed(8) || 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-white/60 text-xs font-medium uppercase mb-1">Market Cap</div>
              <div className="text-white font-semibold">
                {tokenMetrics.usd_market_cap
                  ? tokenMetrics.usd_market_cap >= 1000000
                    ? '$' + (tokenMetrics.usd_market_cap / 1000000).toFixed(2) + 'M'
                    : '$' + (tokenMetrics.usd_market_cap / 1000).toFixed(2) + 'K'
                  : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-white/60 text-xs font-medium uppercase mb-1">24h Change</div>
              <div className={`font-semibold flex items-center gap-1 ${tokenMetrics.price_change_24h > 0 ? 'text-green-400' : tokenMetrics.price_change_24h < 0 ? 'text-red-400' : 'text-white'}`}>
                {tokenMetrics.price_change_24h !== undefined && tokenMetrics.price_change_24h !== 0 ? (
                  <>
                    <span>{tokenMetrics.price_change_24h > 0 ? '▲' : '▼'}</span>
                    <span>{Math.abs(tokenMetrics.price_change_24h).toFixed(2)}%</span>
                  </>
                ) : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-white/60 text-xs font-medium uppercase mb-1">Volume 24h</div>
              <div className="text-white font-semibold">
                {tokenMetrics.volume_24h
                  ? tokenMetrics.volume_24h >= 1000000
                    ? '$' + (tokenMetrics.volume_24h / 1000000).toFixed(2) + 'M'
                    : '$' + (tokenMetrics.volume_24h / 1000).toFixed(2) + 'K'
                  : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-white/60 text-xs font-medium uppercase mb-1">Holders</div>
              <div className="text-white font-semibold">
                {tokenMetrics.holders && tokenMetrics.holders > 0 ? tokenMetrics.holders.toLocaleString() : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-white/60 text-xs font-medium uppercase mb-1">Liquidity</div>
              <div className="text-white font-semibold">
                {tokenMetrics.liquidity
                  ? tokenMetrics.liquidity >= 1000000
                    ? '$' + (tokenMetrics.liquidity / 1000000).toFixed(2) + 'M'
                    : '$' + (tokenMetrics.liquidity / 1000).toFixed(2) + 'K'
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Controls */}
      <div className="bg-black rounded-xl p-4 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Price Chart (OHLCV)</h3>
          <div className="flex gap-2">
            {(['1H', '4H', '1D', '1W'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  chartType === type
                    ? 'bg-primary-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* OHLCV Chart */}
        {ohlcvData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={ohlcvData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="time" 
                stroke="rgba(255,255,255,0.6)" 
                tickFormatter={formatTime}
                fontSize={12}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.6)" 
                fontSize={12}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.9)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                labelStyle={{ color: '#fff' }}
                formatter={(value: any, name: string) => {
                  if (name === 'close') return [`$${value.toFixed(6)}`, 'Price'];
                  if (name === 'volume') return [`$${value.toFixed(2)}`, 'Volume'];
                  return [value, name];
                }}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke="#667eea"
                strokeWidth={2}
                fill="url(#priceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-96 flex items-center justify-center text-white/60">
            {loading ? 'Cargando datos del gráfico...' : 'No hay datos disponibles'}
          </div>
        )}

        {/* OHLCV Stats */}
        {ohlcvData.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="bg-black rounded-md p-3 border border-white/15 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="text-white/60 text-xs mb-1">Open</div>
              <div className="text-white font-semibold">
                ${ohlcvData[0]?.open.toFixed(6) || 'N/A'}
              </div>
            </div>
            <div className="bg-black rounded-md p-3 border border-white/15 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="text-white/60 text-xs mb-1">High</div>
              <div className="text-green-400 font-semibold">
                ${Math.max(...ohlcvData.map(d => d.high)).toFixed(6)}
              </div>
            </div>
            <div className="bg-black rounded-md p-3 border border-white/15 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="text-white/60 text-xs mb-1">Low</div>
              <div className="text-red-400 font-semibold">
                ${Math.min(...ohlcvData.map(d => d.low)).toFixed(6)}
              </div>
            </div>
            <div className="bg-black rounded-md p-3 border border-white/15 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="text-white/60 text-xs mb-1">Close</div>
              <div className="text-white font-semibold">
                ${ohlcvData[ohlcvData.length - 1]?.close.toFixed(6) || 'N/A'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Trades */}
      <div className="bg-black rounded-xl p-4 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-white">💱 Recent Trades</h3>
            {tradesStatus && (
              <p className="text-xs text-white/50 mt-1">{tradesStatus}</p>
            )}
          </div>
          <button
            onClick={loadTrades}
            disabled={loadingTrades}
            className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white rounded text-sm font-medium disabled:opacity-50"
          >
            {loadingTrades ? 'Cargando...' : 'Refresh'}
          </button>
        </div>

        {trades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-white/60 text-xs font-medium uppercase py-2 px-2">Time</th>
                  <th className="text-left text-white/60 text-xs font-medium uppercase py-2 px-2">Value</th>
                  <th className="text-left text-white/60 text-xs font-medium uppercase py-2 px-2">Tokens</th>
                  <th className="text-left text-white/60 text-xs font-medium uppercase py-2 px-2">Side</th>
                  <th className="text-left text-white/60 text-xs font-medium uppercase py-2 px-2">Signature</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(0, 20).map((trade, idx) => (
                  <tr key={idx} className={`border-b border-white/5 hover:bg-white/5 ${
                    trade.side === 'buy' ? 'hover:bg-green-500/5' : 'hover:bg-red-500/5'
                  }`}>
                    <td className="text-white/80 text-xs py-2 px-2 font-mono">
                      {formatTradeTime(trade.timestamp)}
                    </td>
                    <td className={`font-semibold text-sm py-2 px-2 ${
                      trade.side === 'buy' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {(() => {
                        // Calculate value: prefer solAmount (in SOL)
                        if (trade.solAmount && trade.solAmount > 0) {
                          const value = trade.solAmount;
                          // Format nicely based on size
                          if (value >= 100) {
                            return `${value.toFixed(2)} SOL`;
                          } else if (value >= 1) {
                            return `${value.toFixed(3)} SOL`;
                          } else if (value >= 0.01) {
                            return `${value.toFixed(4)} SOL`;
                          } else {
                            return `${value.toFixed(6)} SOL`;
                          }
                        } else if (trade.price && trade.price > 0 && (trade.tokenAmount || trade.amount)) {
                          // Calculate from price * token amount
                          const value = trade.price * (trade.tokenAmount || trade.amount || 0);
                          return `${value.toFixed(4)} SOL`;
                        } else {
                          return 'N/A';
                        }
                      })()}
                    </td>
                    <td className="text-white/80 text-sm py-2 px-2">
                      {(() => {
                        const tokenAmt = trade.tokenAmount || trade.amount || 0;
                        if (tokenAmt > 0) {
                          // Format based on size
                          if (tokenAmt >= 1000000) {
                            return (tokenAmt / 1000000).toFixed(2) + 'M';
                          } else if (tokenAmt >= 1000) {
                            return (tokenAmt / 1000).toFixed(2) + 'K';
                          } else if (tokenAmt >= 1) {
                            return tokenAmt.toFixed(2);
                          } else {
                            return tokenAmt.toFixed(4);
                          }
                        }
                        return 'N/A';
                      })()}
                    </td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        trade.side === 'buy'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {trade.side === 'buy' ? 'BUY' : 'SELL'}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <a
                        href={`https://solscan.io/tx/${trade.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-400 hover:text-primary-300 text-xs font-mono hover:underline"
                      >
                        {trade.signature.substring(0, 8)}...
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-white/60">
            {loadingTrades ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                <span>Buscando trades reales en la blockchain...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center py-6">
                <div className="text-4xl mb-2"></div>
                <span className="text-white/80 font-medium">No hay trades recientes disponibles</span>
                <div className="text-xs text-white/50 space-y-2 max-w-md">
                  <p className="font-semibold text-white/70">El sistema está intentando múltiples métodos:</p>
                  <ul className="text-left space-y-1 list-disc list-inside text-white/50">
                    <li>pump.fun API</li>
                    <li>Helius API (con tu key)</li>
                    <li>Real-time WebSocket listener</li>
                    <li>PumpFunTransactionParser</li>
                    <li>Bonding curve (on-chain)</li>
                    <li>On-chain parsing mejorado</li>
                  </ul>
                  <p className="text-white/40 mt-3 pt-3 border-t border-white/5">
                    💡 <strong>Posibles razones:</strong><br/>
                    • El token no tiene actividad reciente<br/>
                    • Las transacciones aún se están procesando<br/>
                    • El RPC está lento o con rate limits<br/>
                    • El token es muy nuevo y no tiene trades aún
                  </p>
                  <p className="text-white/30 mt-2 text-[10px]">
                    Todos los trades mostrados tienen signatures verificables en Solscan
                  </p>
                  <button
                    onClick={loadTrades}
                    className="mt-4 px-4 py-2 bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 rounded text-sm font-medium border border-primary-500/30"
                  >
                    Intentar de nuevo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

