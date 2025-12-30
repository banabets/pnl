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
   * Fetch latest tokens from DexScreener
   */
  async fetchTokens(options: Partial<TokenFeedOptions> = {}): Promise<TokenData[]> {
    const {
      filter = 'all',
      minLiquidity = 1000,
      maxAge = 1440, // 24 hours default
      limit = 50
    } = options;

    try {
      // Use DexScreener's token boosts API for recent tokens
      const boostsResponse = await fetch(
        'https://api.dexscreener.com/token-boosts/top/v1',
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0'
          }
        }
      );

      let mintAddresses: string[] = [];

      if (boostsResponse.ok) {
        const boostsData = await boostsResponse.json();
        if (Array.isArray(boostsData)) {
          // Filter for Solana tokens
          mintAddresses = boostsData
            .filter((t: any) => t.chainId === 'solana')
            .map((t: any) => t.tokenAddress)
            .slice(0, 50);
        }
      }

      // Also fetch from latest pairs endpoint
      const pairsResponse = await fetch(
        'https://api.dexscreener.com/latest/dex/pairs/solana',
        {
          headers: { 'Accept': 'application/json' }
        }
      );

      if (pairsResponse.ok) {
        const pairsData = await pairsResponse.json();
        if (pairsData.pairs && Array.isArray(pairsData.pairs)) {
          // Get base token addresses from recent pairs
          const pairMints = pairsData.pairs
            .filter((p: any) => p.baseToken?.address)
            .map((p: any) => p.baseToken.address)
            .slice(0, 50);

          // Combine with boost addresses, remove duplicates
          const combined = [...new Set([...mintAddresses, ...pairMints])];
          mintAddresses = combined.slice(0, 100);
        }
      }

      if (mintAddresses.length === 0) {
        console.log('No tokens found from DexScreener, using fallback');
        return this.fetchFromSearch(options);
      }

      // Fetch detailed pair data for all tokens
      const tokens: TokenData[] = [];
      for (let i = 0; i < mintAddresses.length; i += 30) {
        const batch = mintAddresses.slice(i, i + 30);
        const pairData = await this.fetchPairData(batch);
        tokens.push(...pairData);
      }

      // Apply filters
      let filtered = tokens.filter(t => {
        if (t.liquidity < minLiquidity) return false;
        if (t.age > maxAge) return false;
        return true;
      });

      // Apply specific filter
      switch (filter) {
        case 'new':
          filtered = filtered.filter(t => t.isNew);
          break;
        case 'graduating':
          filtered = filtered.filter(t => t.isGraduating);
          break;
        case 'trending':
          filtered = filtered.filter(t => t.isTrending);
          break;
        case 'safe':
          filtered = filtered.filter(t => t.riskScore < 30);
          break;
      }

      // Sort by creation time (newest first)
      filtered.sort((a, b) => b.createdAt - a.createdAt);

      console.log(`TokenFeed: Found ${filtered.length} tokens with filter: ${filter}`);
      return filtered.slice(0, limit);
    } catch (error) {
      console.error('Error fetching tokens:', error);
      return this.fetchFromSearch(options);
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
      const isGraduating = pair.dexId === 'pumpfun' &&
        liquidity > 30000 && liquidity < 69000 && // Near graduation threshold
        volume1h > liquidity * 0.5; // High trading activity

      // Calculate if trending (high volume/liquidity ratio)
      const isTrending = volume1h > 0 && liquidity > 0 &&
        (volume1h / liquidity) > 0.3;

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
