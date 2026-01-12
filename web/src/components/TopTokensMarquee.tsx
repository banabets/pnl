import { useState, useEffect } from 'react';
import api from '../utils/api';

interface TopToken {
  mint: string;
  name: string;
  symbol: string;
  image_uri: string;
  price_change_1h: number;
  price_change_24h: number;
  price_usd: number;
  market_cap: number;
}

export default function TopTokensMarquee() {
  const [tokens, setTokens] = useState<TopToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopGainers = async () => {
      try {
        // First try top gainers
        let response = await api.get('/tokens/top-gainers?limit=20&hours=5');
        if (response.data.success && response.data.tokens && response.data.tokens.length > 0) {
          setTokens(response.data.tokens);
          setLoading(false);
          return;
        }

        // Fallback: get any recent tokens from /tokens/new
        try {
          response = await api.get('/tokens/new?limit=20');
          if (response.data.tokens && Array.isArray(response.data.tokens)) {
            const formattedTokens = response.data.tokens.map((t: any) => ({
              mint: t.mint,
              name: t.name || t.symbol || 'Unknown',
              symbol: t.symbol || 'TKN',
              image_uri: t.imageUrl || t.image_uri || '',
              price_change_1h: t.priceChange1h || 0,
              price_change_24h: t.priceChange24h || 0,
              price_usd: t.price || 0,
              market_cap: t.usd_market_cap || 0,
            }));
            setTokens(formattedTokens);
          }
        } catch (fallbackError) {
          console.error('Failed to fetch fallback tokens:', fallbackError);
        }
      } catch (error) {
        console.error('Failed to fetch top gainers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopGainers();

    // Refresh every 30 seconds
    const interval = setInterval(fetchTopGainers, 30000);

    return () => clearInterval(interval);
  }, []);

  // Always show the marquee, even while loading
  if (loading && tokens.length === 0) {
    return (
      <div className="bg-gradient-to-r from-black via-black/95 to-black border-b border-white/10 py-2 overflow-hidden relative z-[55]">
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin"></div>
          <span className="text-white/60 text-sm">Loading trending tokens...</span>
        </div>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="bg-gradient-to-r from-black via-black/95 to-black border-b border-white/10 py-2 overflow-hidden relative z-[55]">
        <div className="flex items-center justify-center">
          <span className="text-white/60 text-sm">No trending tokens available</span>
        </div>
      </div>
    );
  }

  // Duplicate tokens for seamless loop
  const duplicatedTokens = [...tokens, ...tokens, ...tokens];

  return (
    <div className="bg-gradient-to-r from-black via-black/95 to-black border-b border-white/10 py-2 overflow-hidden relative z-[55]">
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <div className="flex-shrink-0 px-3 py-1 bg-white/5 rounded-r-lg border-r border-white/10 z-10 relative">
          <span className="text-white/60 font-medium whitespace-nowrap">🔥 Top Gainers (5h)</span>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="flex marquee-container whitespace-nowrap">
            {duplicatedTokens.map((token, index) => (
              <div
                key={`${token.mint}-${index}`}
                className="flex items-center gap-2 px-4 py-1 mx-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer flex-shrink-0"
                onClick={() => {
                  // Navigate to token explorer with this token
                  window.dispatchEvent(new CustomEvent('switchTab', { detail: 'explorer' }));
                  // You could also emit an event to select this specific token
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('selectToken', { detail: token.mint }));
                  }, 100);
                }}
              >
                {/* Token Image */}
                {token.image_uri ? (
                  <img
                    src={token.image_uri}
                    alt={token.symbol}
                    className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-500 to-accent-pink flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-white">
                      {token.symbol.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                
                {/* Token Name/Symbol */}
                <span className="text-white font-medium whitespace-nowrap">
                  {token.symbol || token.name.substring(0, 8)}
                </span>
                
                {/* Price Change */}
                <span
                  className={`font-bold whitespace-nowrap ${
                    token.price_change_1h > 0
                      ? 'text-green-400'
                      : token.price_change_1h < 0
                      ? 'text-red-400'
                      : 'text-white/60'
                  }`}
                >
                  {token.price_change_1h > 0 ? '▲' : token.price_change_1h < 0 ? '▼' : '—'}
                  {Math.abs(token.price_change_1h).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .marquee-container {
          animation: marquee 90s linear infinite;
          will-change: transform;
        }
        .marquee-container:hover {
          animation-play-state: paused;
        }
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
      `}</style>
    </div>
  );
}

