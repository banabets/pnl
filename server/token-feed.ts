// Token Feed Service - Real-time token discovery using multiple sources
// Similar to Axiom/GMGN token feeds

interface TokenData {
  mint: string;
  name: string;
  symbol: string;
  imageUrl?: string;
  price: number;
  priceChange5m: number;
  priceChange1h: number;
  priceChange24h: number;
  volume5m: number;
  volume1h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  fdv: number;
  holders?: number;
  txns5m: { buys: number; sells: number };
  txns1h: { buys: number; sells: number };
  txns24h: { buys: number; sells: number };
  createdAt: number;
  pairAddress: string;
  dexId: string;
  // Calculated fields
  age: number; // in minutes
  isNew: boolean; // < 30 min old
  isGraduating: boolean; // high volume, about to graduate
  isTrending: boolean; // high volume/liquidity ratio
  riskScore: number;
}

interface TokenFeedOptions {
  filter: 'all' | 'new' | 'graduating' | 'trending' | 'safe';
  minLiquidity: number;
  maxAge: number; // in minutes
  limit: number;
}

class TokenFeedService {
  private cache: Map<string, { data: TokenData; timestamp: number }> = new Map();
  private cacheExpiry = 30000; // 30 seconds
  private callbacks: Set<(tokens: TokenData[]) => void> = new Set();

  constructor() {}

  /**
   * Fetch latest tokens from multiple sources
   */
  async fetchTokens(options: Partial<TokenFeedOptions> = {}): Promise<TokenData[]> {
    const {
      filter = 'all',
      minLiquidity = 500,
      maxAge = 1440, // 24 hours default
      limit = 50
    } = options;

    try {
      const allTokens: TokenData[] = [];

      // 1. Fetch from DexScreener search for recent Solana memecoins
      const searchPromises = [
        this.fetchFromDexScreenerSearch('solana meme'),
        this.fetchFromDexScreenerSearch('pump'),
        this.fetchFromDexScreenerPairs(),
      ];

      const results = await Promise.allSettled(searchPromises);

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          allTokens.push(...result.value);
        }
      }

      // Remove duplicates by mint address
      const uniqueTokens = new Map<string, TokenData>();
      for (const token of allTokens) {
        if (!uniqueTokens.has(token.mint) ||
            (uniqueTokens.get(token.mint)!.liquidity < token.liquidity)) {
          uniqueTokens.set(token.mint, token);
        }
      }

      let tokens = Array.from(uniqueTokens.values());

      // Apply base filters
      tokens = tokens.filter(t => {
        if (t.liquidity < minLiquidity) return false;
        if (t.age > maxAge) return false;
        return true;
      });

      // Apply specific filter
      switch (filter) {
        case 'new':
          // For new tokens, be more lenient - anything under 60 min
          tokens = tokens.filter(t => t.age < 60);
          break;
        case 'graduating':
          tokens = tokens.filter(t => t.isGraduating);
          break;
        case 'trending':
          tokens = tokens.filter(t => t.isTrending);
          break;
        case 'safe':
          tokens = tokens.filter(t => t.riskScore < 30);
          break;
      }

      // Sort by creation time (newest first)
      tokens.sort((a, b) => b.createdAt - a.createdAt);

      console.log(`TokenFeed: Found ${tokens.length} tokens with filter: ${filter}`);
      return tokens.slice(0, limit);
    } catch (error) {
      console.error('Error fetching tokens:', error);
      return [];
    }
  }

  /**
   * Fetch from DexScreener search API
   */
  private async fetchFromDexScreenerSearch(query: string): Promise<TokenData[]> {
    try {
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) return [];

      const data = await response.json();
      const pairs = data.pairs || [];

      return pairs
        .filter((p: any) => p.chainId === 'solana' && p.baseToken?.address)
        .map((pair: any) => this.mapPairToToken(pair))
        .filter((t: TokenData | null) => t !== null) as TokenData[];
    } catch (error) {
      console.error('DexScreener search error:', error);
      return [];
    }
  }

  /**
   * Fetch latest Solana pairs from DexScreener
   */
  private async fetchFromDexScreenerPairs(): Promise<TokenData[]> {
    try {
      // Get pairs from multiple DEXs
      const endpoints = [
        'https://api.dexscreener.com/latest/dex/pairs/solana',
      ];

      const allPairs: any[] = [];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            headers: { 'Accept': 'application/json' }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.pairs && Array.isArray(data.pairs)) {
              allPairs.push(...data.pairs);
            }
          }
        } catch (e) {
          console.error('Error fetching from', endpoint, e);
        }
      }

      return allPairs
        .filter((p: any) => p.chainId === 'solana' && p.baseToken?.address)
        .map((pair: any) => this.mapPairToToken(pair))
        .filter((t: TokenData | null) => t !== null) as TokenData[];
    } catch (error) {
      console.error('DexScreener pairs error:', error);
      return [];
    }
  }

  /**
   * Fallback: Fetch from DexScreener search
   */
  private async fetchFromSearch(options: Partial<TokenFeedOptions>): Promise<TokenData[]> {
    try {
      // Search for recent Solana tokens
      const response = await fetch(
        'https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112',
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) return [];

      const data = await response.json();
      const pairs = data.pairs || [];

      const tokens: TokenData[] = pairs
        .filter((p: any) => p.chainId === 'solana')
        .map((pair: any) => this.mapPairToToken(pair))
        .filter((t: TokenData | null) => t !== null);

      return tokens.slice(0, options.limit || 50);
    } catch (error) {
      console.error('Search fallback error:', error);
      return [];
    }
  }

  /**
   * Fetch pair data for multiple tokens
   */
  private async fetchPairData(mintAddresses: string[]): Promise<TokenData[]> {
    const tokens: TokenData[] = [];

    try {
      const addresses = mintAddresses.join(',');
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${addresses}`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) return [];

      const data = await response.json();
      const pairs = data.pairs || [];

      // Get first (most liquid) pair for each token
      const tokenPairs = new Map<string, any>();
      for (const pair of pairs) {
        const mint = pair.baseToken?.address;
        if (!mint) continue;

        if (!tokenPairs.has(mint) ||
            (pair.liquidity?.usd || 0) > (tokenPairs.get(mint).liquidity?.usd || 0)) {
          tokenPairs.set(mint, pair);
        }
      }

      for (const [mint, pair] of tokenPairs) {
        const token = this.mapPairToToken(pair);
        if (token) tokens.push(token);
      }
    } catch (error) {
      console.error('Pair data fetch error:', error);
    }

    return tokens;
  }

  /**
   * Map DexScreener pair to TokenData
   */
  private mapPairToToken(pair: any): TokenData | null {
    try {
      const baseToken = pair.baseToken;
      if (!baseToken) return null;

      const now = Date.now();
      const createdAt = pair.pairCreatedAt || now;
      const ageMinutes = Math.floor((now - createdAt) / 60000);

      const liquidity = pair.liquidity?.usd || 0;
      const volume24h = pair.volume?.h24 || 0;
      const volume1h = pair.volume?.h1 || 0;
      const volume5m = pair.volume?.m5 || 0;

      // Calculate if graduating (high volume relative to liquidity on pump.fun)
      // Pump.fun graduation happens around $69k market cap
      const isGraduating = (pair.dexId === 'pumpfun' || pair.dexId === 'raydium') &&
        liquidity > 20000 && liquidity < 100000 && // Near graduation threshold
        volume1h > liquidity * 0.2; // Decent trading activity

      // Calculate if trending (high volume/liquidity ratio or just high volume)
      const isTrending = (volume1h > 0 && liquidity > 0 && (volume1h / liquidity) > 0.15) ||
        volume1h > 50000 || // High absolute volume
        (pair.priceChange?.h1 > 20 || pair.priceChange?.h1 < -20); // Big price movement

      // Simple risk score based on metrics
      let riskScore = 50;
      if (liquidity < 5000) riskScore += 20;
      if (ageMinutes < 10) riskScore += 15;
      if (pair.txns?.h1?.buys < 10) riskScore += 10;
      if (liquidity > 50000) riskScore -= 20;
      if (ageMinutes > 60) riskScore -= 10;
      riskScore = Math.max(0, Math.min(100, riskScore));

      return {
        mint: baseToken.address,
        name: baseToken.name || 'Unknown',
        symbol: baseToken.symbol || 'UNK',
        imageUrl: pair.info?.imageUrl,
        price: parseFloat(pair.priceUsd || '0'),
        priceChange5m: pair.priceChange?.m5 || 0,
        priceChange1h: pair.priceChange?.h1 || 0,
        priceChange24h: pair.priceChange?.h24 || 0,
        volume5m,
        volume1h,
        volume24h,
        liquidity,
        marketCap: pair.marketCap || 0,
        fdv: pair.fdv || 0,
        txns5m: pair.txns?.m5 || { buys: 0, sells: 0 },
        txns1h: pair.txns?.h1 || { buys: 0, sells: 0 },
        txns24h: pair.txns?.h24 || { buys: 0, sells: 0 },
        createdAt,
        pairAddress: pair.pairAddress,
        dexId: pair.dexId || 'unknown',
        age: ageMinutes,
        isNew: ageMinutes < 30,
        isGraduating,
        isTrending,
        riskScore
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Subscribe to token updates
   */
  subscribe(callback: (tokens: TokenData[]) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Broadcast tokens to all subscribers
   */
  private broadcast(tokens: TokenData[]): void {
    this.callbacks.forEach(cb => cb(tokens));
  }

  /**
   * Get trending tokens (high volume/liquidity ratio)
   */
  async getTrending(limit = 20): Promise<TokenData[]> {
    return this.fetchTokens({ filter: 'trending', limit, minLiquidity: 5000 });
  }

  /**
   * Get newest tokens (< 30 min old)
   */
  async getNew(limit = 20): Promise<TokenData[]> {
    return this.fetchTokens({ filter: 'new', limit, minLiquidity: 1000, maxAge: 30 });
  }

  /**
   * Get graduating tokens (about to complete bonding curve)
   */
  async getGraduating(limit = 20): Promise<TokenData[]> {
    return this.fetchTokens({ filter: 'graduating', limit });
  }

  /**
   * Search for specific token by mint
   */
  async getToken(mint: string): Promise<TokenData | null> {
    try {
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) return null;

      const data = await response.json();
      const pair = data.pairs?.[0];
      if (!pair) return null;

      return this.mapPairToToken(pair);
    } catch {
      return null;
    }
  }
}

// Singleton instance
export const tokenFeed = new TokenFeedService();
