// Token Feed Service - Real-time token discovery using on-chain data
// Uses Helius WebSocket for real-time monitoring + DexScreener for metadata

import { heliusWebSocket, NewTokenEvent, GraduationEvent, TradeEvent } from './helius-websocket';
import { tokenIndexer } from './token-indexer';
import { rateLimiter } from './rate-limiter';
import { Connection, PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';

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

interface CacheEntry<T> {
  data: T;
  expires: number; // timestamp when cache expires
}

class TokenFeedService {
  // Cache inteligente con diferentes TTLs según tipo de dato
  private metadataCache: Map<string, CacheEntry<any>> = new Map(); // name, symbol, image
  private priceCache: Map<string, CacheEntry<number>> = new Map();
  private volumeCache: Map<string, CacheEntry<{ volume5m: number; volume1h: number; volume24h: number }>> = new Map();
  private marketDataCache: Map<string, CacheEntry<{ marketCap: number; liquidity: number; holders?: number }>> = new Map();
  private priceChangeCache: Map<string, CacheEntry<{ priceChange5m: number; priceChange1h: number; priceChange24h: number }>> = new Map();
  private fullTokenCache: Map<string, CacheEntry<TokenData>> = new Map(); // Full token data cache
  
  // TTLs diferentes según tipo de dato (en milisegundos)
  private readonly TTL = {
    metadata: 3600000,      // 1 hora (nombres, símbolos, imágenes no cambian mucho)
    price: 60000,           // 1 minuto (precios cambian rápido)
    volume: 300000,         // 5 minutos (volumen cambia moderadamente)
    marketData: 120000,     // 2 minutos (market cap, liquidity)
    priceChange: 60000,     // 1 minuto (price changes)
    fullToken: 30000,       // 30 segundos (datos completos del token)
  };

  private callbacks: Set<(tokens: TokenData[]) => void> = new Set();
  private onChainTokens: Map<string, TokenData> = new Map();
  private graduatedTokens: Set<string> = new Set();
  private isStarted = false;

  /**
   * Check if service is started (public method)
   */
  isServiceStarted(): boolean {
    return this.isStarted;
  }

  constructor() {
    // Cleanup expired cache entries every 5 minutes
    setInterval(() => this.cleanupExpiredCache(), 5 * 60 * 1000);
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    
    // Clean metadata cache
    for (const [key, entry] of this.metadataCache) {
      if (now >= entry.expires) {
        this.metadataCache.delete(key);
      }
    }

    // Clean price cache
    for (const [key, entry] of this.priceCache) {
      if (now >= entry.expires) {
        this.priceCache.delete(key);
      }
    }

    // Clean volume cache
    for (const [key, entry] of this.volumeCache) {
      if (now >= entry.expires) {
        this.volumeCache.delete(key);
      }
    }

    // Clean market data cache
    for (const [key, entry] of this.marketDataCache) {
      if (now >= entry.expires) {
        this.marketDataCache.delete(key);
      }
    }

    // Clean price change cache
    for (const [key, entry] of this.priceChangeCache) {
      if (now >= entry.expires) {
        this.priceChangeCache.delete(key);
      }
    }

    // Clean full token cache
    for (const [key, entry] of this.fullTokenCache) {
      if (now >= entry.expires) {
        this.fullTokenCache.delete(key);
      }
    }
  }

  /**
   * Get cached metadata or null if expired/missing
   */
  private getCachedMetadata(mint: string): any | null {
    const cached = this.metadataCache.get(mint);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set metadata in cache
   */
  private setCachedMetadata(mint: string, data: any): void {
    this.metadataCache.set(mint, {
      data,
      expires: Date.now() + this.TTL.metadata
    });
  }

  /**
   * Get cached price or null if expired/missing
   */
  private getCachedPrice(mint: string): number | null {
    const cached = this.priceCache.get(mint);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set price in cache
   */
  private setCachedPrice(mint: string, price: number): void {
    this.priceCache.set(mint, {
      data: price,
      expires: Date.now() + this.TTL.price
    });
  }

  /**
   * Get cached volume or null if expired/missing
   */
  private getCachedVolume(mint: string): { volume5m: number; volume1h: number; volume24h: number } | null {
    const cached = this.volumeCache.get(mint);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set volume in cache
   */
  private setCachedVolume(mint: string, volume: { volume5m: number; volume1h: number; volume24h: number }): void {
    this.volumeCache.set(mint, {
      data: volume,
      expires: Date.now() + this.TTL.volume
    });
  }

  /**
   * Get cached market data or null if expired/missing
   */
  private getCachedMarketData(mint: string): { marketCap: number; liquidity: number; holders?: number } | null {
    const cached = this.marketDataCache.get(mint);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set market data in cache
   */
  private setCachedMarketData(mint: string, data: { marketCap: number; liquidity: number; holders?: number }): void {
    this.marketDataCache.set(mint, {
      data,
      expires: Date.now() + this.TTL.marketData
    });
  }

  /**
   * Get cached price changes or null if expired/missing
   */
  private getCachedPriceChanges(mint: string): { priceChange5m: number; priceChange1h: number; priceChange24h: number } | null {
    const cached = this.priceChangeCache.get(mint);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set price changes in cache
   */
  private setCachedPriceChanges(mint: string, changes: { priceChange5m: number; priceChange1h: number; priceChange24h: number }): void {
    this.priceChangeCache.set(mint, {
      data: changes,
      expires: Date.now() + this.TTL.priceChange
    });
  }

  /**
   * Start the on-chain monitoring
   */
  async start(): Promise<void> {
    if (this.isStarted) return;
    this.isStarted = true;

    console.log('🚀 Starting Token Feed with on-chain monitoring...');

    // Initialize token indexer
    await tokenIndexer.initialize();

    // Load recent tokens from MongoDB if available
    if (tokenIndexer.isActive()) {
      try {
        const recentTokens = await tokenIndexer.getTokens({
          filter: 'all',
          maxAge: 1440, // Last 24 hours
          limit: 100
        });

        // Add to in-memory cache and populate intelligent cache
        for (const token of recentTokens) {
          const tokenData: TokenData = {
            mint: token.mint,
            name: token.name || `Token ${token.mint.slice(0, 8)}`,
            symbol: token.symbol || 'UNK',
            imageUrl: token.imageUrl,
            price: token.price || 0,
            priceChange5m: token.priceChange5m || 0,
            priceChange1h: token.priceChange1h || 0,
            priceChange24h: token.priceChange24h || 0,
            volume5m: token.volume5m || 0,
            volume1h: token.volume1h || 0,
            volume24h: token.volume24h || 0,
            liquidity: token.liquidity || 0,
            marketCap: token.marketCap || 0,
            fdv: token.marketCap || 0,
            holders: token.holders,
            txns5m: token.txns5m || { buys: 0, sells: 0 },
            txns1h: token.txns1h || { buys: 0, sells: 0 },
            txns24h: token.txns24h || { buys: 0, sells: 0 },
            createdAt: token.createdAt,
            pairAddress: token.pairAddress || '',
            dexId: token.dexId || 'unknown',
            age: token.age || 0,
            isNew: token.isNew || false,
            isGraduating: token.isGraduating || false,
            isTrending: token.isTrending || false,
            riskScore: token.riskScore || 50,
          };
          this.onChainTokens.set(token.mint, tokenData);

          // Populate intelligent cache from MongoDB data
          if (token.name || token.symbol || token.imageUrl) {
            this.setCachedMetadata(token.mint, {
              name: token.name,
              symbol: token.symbol,
              imageUrl: token.imageUrl,
            });
          }
          if (token.price && token.price > 0) {
            this.setCachedPrice(token.mint, token.price);
          }
          if (token.volume5m || token.volume1h || token.volume24h) {
            this.setCachedVolume(token.mint, {
              volume5m: token.volume5m || 0,
              volume1h: token.volume1h || 0,
              volume24h: token.volume24h || 0,
            });
          }
          if (token.marketCap || token.liquidity || token.holders) {
            this.setCachedMarketData(token.mint, {
              marketCap: token.marketCap || 0,
              liquidity: token.liquidity || 0,
              holders: token.holders,
            });
          }
          if (token.priceChange5m || token.priceChange1h || token.priceChange24h) {
            this.setCachedPriceChanges(token.mint, {
              priceChange5m: token.priceChange5m || 0,
              priceChange1h: token.priceChange1h || 0,
              priceChange24h: token.priceChange24h || 0,
            });
          }
        }
        console.log(`📦 Loaded ${recentTokens.length} tokens from MongoDB`);
      } catch (error) {
        console.error('Failed to load tokens from MongoDB:', error);
      }
    }

    // Start Helius WebSocket
    await heliusWebSocket.start();

    // Listen for new tokens
    heliusWebSocket.on('new_token', async (event: NewTokenEvent) => {
      console.log(`🆕 On-chain: New token ${event.symbol || event.mint.slice(0, 8)}`);

      // Create TokenData from on-chain event
      const tokenData: TokenData = {
        mint: event.mint,
        name: event.name || `Token ${event.mint.slice(0, 8)}`,
        symbol: event.symbol || 'NEW',
        price: 0,
        priceChange5m: 0,
        priceChange1h: 0,
        priceChange24h: 0,
        volume5m: 0,
        volume1h: 0,
        volume24h: 0,
        liquidity: event.initialLiquidity || 0,
        marketCap: 0,
        fdv: 0,
        txns5m: { buys: 0, sells: 0 },
        txns1h: { buys: 0, sells: 0 },
        txns24h: { buys: 0, sells: 0 },
        createdAt: event.timestamp,
        pairAddress: event.bondingCurve || '',
        dexId: event.source,
        age: 0,
        isNew: true,
        isGraduating: false,
        isTrending: false,
        riskScore: 70, // New tokens are higher risk
      };

      this.onChainTokens.set(event.mint, tokenData);
      this.broadcast([tokenData]);

      // Index to MongoDB
      await tokenIndexer.indexToken({
        mint: tokenData.mint,
        name: tokenData.name,
        symbol: tokenData.symbol,
        createdAt: tokenData.createdAt,
        creator: event.creator,
        bondingCurve: event.bondingCurve,
        source: event.source,
        liquidity: tokenData.liquidity,
        isNew: tokenData.isNew,
        isGraduating: tokenData.isGraduating,
        isTrending: tokenData.isTrending,
        riskScore: tokenData.riskScore,
        pairAddress: tokenData.pairAddress,
        dexId: tokenData.dexId,
        age: tokenData.age,
      });

      // Fetch additional metadata from DexScreener after a delay
      setTimeout(() => this.enrichTokenData(event.mint), 5000);
    });

    // Listen for graduations
    heliusWebSocket.on('graduation', async (event: GraduationEvent) => {
      console.log(`🎓 On-chain: Token graduated ${event.symbol || event.mint.slice(0, 8)}`);

      this.graduatedTokens.add(event.mint);

      // Update token data
      const existing = this.onChainTokens.get(event.mint);
      if (existing) {
        existing.isGraduating = false;
        existing.dexId = 'raydium';
        existing.pairAddress = event.raydiumPool || existing.pairAddress;
        existing.liquidity = event.liquidity || existing.liquidity;
        this.broadcast([existing]);

        // Update in MongoDB
        await tokenIndexer.indexToken({
          mint: existing.mint,
          isGraduating: existing.isGraduating,
          dexId: existing.dexId,
          pairAddress: existing.pairAddress,
          liquidity: existing.liquidity,
          createdAt: existing.createdAt || Date.now()
        });
      }
    });

    // Listen for trades
    heliusWebSocket.on('trade', async (event: TradeEvent) => {
      const existing = this.onChainTokens.get(event.mint);
      if (existing) {
        // Update trade counts
        if (event.side === 'buy') {
          existing.txns5m.buys++;
          existing.txns1h.buys++;
        } else {
          existing.txns5m.sells++;
          existing.txns1h.sells++;
        }

        // Update volume
        existing.volume5m += event.amountSol;
        existing.volume1h += event.amountSol;

        // Update price if available
        if (event.price) {
          existing.price = event.price;
        }

        // Check if trending (high activity)
        existing.isTrending = (existing.txns1h.buys + existing.txns1h.sells) > 50;

        // Check if graduating
        if (existing.dexId === 'pumpfun' && existing.liquidity > 20000) {
          existing.isGraduating = true;
        }

        // Update in MongoDB (async, don't wait)
        tokenIndexer.indexToken({
          mint: existing.mint,
          price: existing.price,
          volume5m: existing.volume5m,
          volume1h: existing.volume1h,
          txns5m: existing.txns5m,
          txns1h: existing.txns1h,
          isTrending: existing.isTrending,
          isGraduating: existing.isGraduating,
        }).catch(() => {}); // Ignore errors
      }
    });

    console.log('✅ Token Feed started with on-chain monitoring');
  }

  /**
   * Get on-chain tokens map (for worker access)
   */
  getOnChainTokens(): Map<string, TokenData> {
    return this.onChainTokens;
  }

  /**
   * Enrich token data with DexScreener metadata (with intelligent caching)
   * Public method so worker can access it
   */
  async enrichTokenData(mint: string): Promise<void> {
    const existing = this.onChainTokens.get(mint);
    if (!existing) return;

    try {
      // 1. Check cache for metadata first (longest TTL)
      const cachedMetadata = this.getCachedMetadata(mint);
      if (cachedMetadata) {
        console.log(`📦 Using cached metadata for ${mint.slice(0, 8)}...`);
        existing.name = cachedMetadata.name || existing.name;
        existing.symbol = cachedMetadata.symbol || existing.symbol;
        existing.imageUrl = cachedMetadata.imageUrl || existing.imageUrl;
      }

      // 2. Check cache for price (shorter TTL)
      const cachedPrice = this.getCachedPrice(mint);
      if (cachedPrice !== null) {
        existing.price = cachedPrice;
      }

      // 3. Check cache for volume
      const cachedVolume = this.getCachedVolume(mint);
      if (cachedVolume) {
        existing.volume1h = cachedVolume.volume1h || existing.volume1h;
        existing.volume24h = cachedVolume.volume24h || existing.volume24h;
      }

      // 4. Check cache for market data
      const cachedMarketData = this.getCachedMarketData(mint);
      if (cachedMarketData) {
        existing.liquidity = cachedMarketData.liquidity || existing.liquidity;
        existing.marketCap = cachedMarketData.marketCap || existing.marketCap;
        if (cachedMarketData.holders) {
          existing.holders = cachedMarketData.holders;
        }
      }

      // 5. Check cache for price changes
      const cachedPriceChanges = this.getCachedPriceChanges(mint);
      if (cachedPriceChanges) {
        existing.priceChange5m = cachedPriceChanges.priceChange5m || existing.priceChange5m;
        existing.priceChange1h = cachedPriceChanges.priceChange1h || existing.priceChange1h;
        existing.priceChange24h = cachedPriceChanges.priceChange24h || existing.priceChange24h;
      }

      // 6. If we have all cached data, skip API call
      if (cachedMetadata && cachedPrice !== null && cachedVolume && cachedMarketData && cachedPriceChanges) {
        console.log(`✅ All data cached for ${mint.slice(0, 8)}..., skipping API call`);
        this.onChainTokens.set(mint, existing);
        return;
      }

      // 7. Fetch from API only if cache is missing/expired
      // Wait if rate limit is reached
      await rateLimiter.waitIfNeeded('dexscreener');
      
      // Check if we can make request
      if (!rateLimiter.canMakeRequest('dexscreener')) {
        console.log(`⏳ Rate limit reached for DexScreener, using on-chain fallback for ${mint.slice(0, 8)}...`);
        const onChainResult = await this.enrichTokenDataOnChain(mint);
        if (onChainResult) {
          return;
        }
        // If on-chain fails, use cached data
        return;
      }

      console.log(`🔍 Fetching fresh data from DexScreener for ${mint.slice(0, 8)}... (${rateLimiter.getRemainingRequests('dexscreener')} requests remaining)`);
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
        { headers: { 'Accept': 'application/json' } }
      );

      // Record the request
      rateLimiter.recordRequest('dexscreener');

      if (!response.ok) {
        // If API fails, try on-chain fallback
        console.log(`⚠️ DexScreener API failed for ${mint.slice(0, 8)}..., trying on-chain fallback...`);
        const onChainResult = await this.enrichTokenDataOnChain(mint);
        
        if (onChainResult) {
          console.log(`✅ On-chain enrichment successful for ${mint.slice(0, 8)}...`);
          return;
        }

        // If on-chain also fails, use cached data if available (graceful degradation)
        if (cachedMetadata || cachedPrice !== null || cachedVolume || cachedMarketData) {
          console.log(`⚠️ Using cached data as final fallback for ${mint.slice(0, 8)}...`);
        }
        return;
      }

      const data = await response.json();
      const pair = data.pairs?.[0];
      if (!pair) return;

      // 8. Update with fresh DexScreener data
      const metadata = {
        name: pair.baseToken?.name,
        symbol: pair.baseToken?.symbol,
        imageUrl: pair.info?.imageUrl,
      };
      
      const price = parseFloat(pair.priceUsd || '0');
      const priceChanges = {
        priceChange5m: pair.priceChange?.m5 || 0,
        priceChange1h: pair.priceChange?.h1 || 0,
        priceChange24h: pair.priceChange?.h24 || 0,
      };
      
      const volume = {
        volume5m: pair.volume?.m5 || 0,
        volume1h: pair.volume?.h1 || 0,
        volume24h: pair.volume?.h24 || 0,
      };
      
      const marketData = {
        marketCap: pair.marketCap || 0,
        liquidity: pair.liquidity?.usd || existing.liquidity,
        holders: pair.holders,
      };

      // 9. Update token data
      existing.name = metadata.name || existing.name;
      existing.symbol = metadata.symbol || existing.symbol;
      existing.imageUrl = metadata.imageUrl || existing.imageUrl;
      existing.price = price || existing.price;
      existing.priceChange5m = priceChanges.priceChange5m;
      existing.priceChange1h = priceChanges.priceChange1h;
      existing.priceChange24h = priceChanges.priceChange24h;
      existing.liquidity = marketData.liquidity;
      existing.marketCap = marketData.marketCap;
      existing.volume1h = volume.volume1h || existing.volume1h;
      existing.volume24h = volume.volume24h || 0;
      if (marketData.holders) {
        existing.holders = marketData.holders;
      }

      // 10. Update all caches with fresh data
      this.setCachedMetadata(mint, metadata);
      if (price > 0) {
        this.setCachedPrice(mint, price);
      }
      this.setCachedVolume(mint, volume);
      this.setCachedMarketData(mint, marketData);
      this.setCachedPriceChanges(mint, priceChanges);

      this.onChainTokens.set(mint, existing);

      // 11. Update in MongoDB with enrichment data
      await tokenIndexer.updateEnrichment(mint, {
        name: existing.name,
        symbol: existing.symbol,
        imageUrl: existing.imageUrl,
        price: existing.price,
        priceChange5m: existing.priceChange5m,
        priceChange1h: existing.priceChange1h,
        priceChange24h: existing.priceChange24h,
        liquidity: existing.liquidity,
        marketCap: existing.marketCap,
        volume1h: existing.volume1h,
        volume24h: existing.volume24h,
        holders: existing.holders,
      }, 'dexscreener');

    } catch (error) {
      // If API fails, try on-chain fallback first
      console.log(`⚠️ API error for ${mint.slice(0, 8)}..., trying on-chain fallback...`);
      const onChainResult = await this.enrichTokenDataOnChain(mint);
      
      if (!onChainResult) {
        // If on-chain also fails, use cached data (graceful degradation)
        const cachedMetadata = this.getCachedMetadata(mint);
        const cachedPrice = this.getCachedPrice(mint);
        const cachedVolume = this.getCachedVolume(mint);
        const cachedMarketData = this.getCachedMarketData(mint);
        
        if (cachedMetadata || cachedPrice !== null || cachedVolume || cachedMarketData) {
          console.log(`⚠️ Using cached data as final fallback for ${mint.slice(0, 8)}...`);
          if (cachedMetadata) {
            existing.name = cachedMetadata.name || existing.name;
            existing.symbol = cachedMetadata.symbol || existing.symbol;
            existing.imageUrl = cachedMetadata.imageUrl || existing.imageUrl;
          }
          if (cachedPrice !== null) {
            existing.price = cachedPrice;
          }
          if (cachedVolume) {
            existing.volume1h = cachedVolume.volume1h || existing.volume1h;
            existing.volume24h = cachedVolume.volume24h || existing.volume24h;
          }
          if (cachedMarketData) {
            existing.liquidity = cachedMarketData.liquidity || existing.liquidity;
            existing.marketCap = cachedMarketData.marketCap || existing.marketCap;
          }
          this.onChainTokens.set(mint, existing);
        }
      }
    }
  }

  /**
   * Enrich token data from on-chain (Metaplex metadata) - Fallback when APIs fail
   * Returns true if enrichment was successful, false otherwise
   */
  private async enrichTokenDataOnChain(mint: string): Promise<boolean> {
    const existing = this.onChainTokens.get(mint);
    if (!existing) {
      return false;
    }

    try {
      const rpcUrl = process.env.RPC_URL || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
      const connection = new Connection(rpcUrl, 'confirmed');
      const mintPubkey = new PublicKey(mint);

      // 1. Get Metaplex Token Metadata Program
      const METADATA_PROGRAM = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

      // 2. Find metadata PDA
      const [metadataPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          METADATA_PROGRAM.toBuffer(),
          mintPubkey.toBuffer(),
        ],
        METADATA_PROGRAM
      );

      // 3. Get metadata account
      const metadataAccount = await connection.getAccountInfo(metadataPDA);
      if (!metadataAccount) {
        console.log(`📊 No Metaplex metadata found on-chain for ${mint.slice(0, 8)}...`);
        return false;
      }

      // 4. Parse metadata - look for URI in the data
      const data = metadataAccount.data;
      const dataStr = data.toString('utf8');
      const uriMatch = dataStr.match(/https?:\/\/[^\x00\s]+\.json/);

      if (!uriMatch) {
        console.log(`📊 No metadata URI found for ${mint.slice(0, 8)}...`);
        return false;
      }

      const metadataUri = uriMatch[0].replace(/\x00/g, '');
      console.log(`📊 Found metadata URI on-chain: ${metadataUri}`);

      // 5. Fetch the JSON metadata from IPFS/Arweave
      const metaResponse = await fetch(metadataUri, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!metaResponse.ok) {
        console.log(`📊 Failed to fetch metadata JSON from ${metadataUri}`);
        return false;
      }

      const metaJson = await metaResponse.json();

      // 6. Update token data with on-chain metadata
      let updated = false;

      if (metaJson.name && (!existing.name || existing.name.startsWith('Token '))) {
        existing.name = metaJson.name;
        updated = true;
      }

      if (metaJson.symbol && (existing.symbol === 'NEW' || existing.symbol === 'UNK')) {
        existing.symbol = metaJson.symbol;
        updated = true;
      }

      if (metaJson.image && !existing.imageUrl) {
        existing.imageUrl = metaJson.image;
        updated = true;
      }

      // 7. Get mint info (supply, decimals)
      try {
        const mintInfo = await getMint(connection, mintPubkey);
        const supply = Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals);
        
        // Store supply if we don't have it
        // Note: TokenData doesn't have supply field, but we can store it in MongoDB
        // if (!existing.supply || existing.supply === 0) {
        // }
      } catch (mintError) {
        // Ignore mint info errors
      }

      // 8. Update cache with on-chain metadata
      if (updated) {
        this.setCachedMetadata(mint, {
          name: existing.name,
          symbol: existing.symbol,
          imageUrl: existing.imageUrl,
        });

        this.onChainTokens.set(mint, existing);

        // 9. Update MongoDB with on-chain enrichment
        await tokenIndexer.updateEnrichment(mint, {
          name: existing.name,
          symbol: existing.symbol,
          imageUrl: existing.imageUrl,
        }, 'onchain');

        console.log(`✅ On-chain enrichment successful for ${mint.slice(0, 8)}...`);
        return true;
      }

      return false;

    } catch (error: any) {
      console.log(`📊 On-chain enrichment failed for ${mint.slice(0, 8)}...: ${error.message}`);
      return false;
    }
  }

  /**
   * Fetch latest tokens from on-chain + DexScreener
   */
  async fetchTokens(options: Partial<TokenFeedOptions> = {}): Promise<TokenData[]> {
    const {
      filter = 'all',
      minLiquidity = 0, // Allow 0 liquidity for new tokens
      maxAge = 1440, // 24 hours default
      limit = 50
    } = options;

    try {
      const allTokens: TokenData[] = [];
      const now = Date.now();

      // 1. Try to get tokens from MongoDB first (if available)
      if (tokenIndexer.isActive()) {
        try {
          const dbTokens = await tokenIndexer.getTokens({
            filter: filter as any,
            minLiquidity,
            maxAge,
            limit: limit * 2 // Get more to merge with in-memory
          });

          // Convert to TokenData format
          for (const dbToken of dbTokens) {
            const tokenData: TokenData = {
              mint: dbToken.mint,
              name: dbToken.name || `Token ${dbToken.mint.slice(0, 8)}`,
              symbol: dbToken.symbol || 'UNK',
              imageUrl: dbToken.imageUrl,
              price: dbToken.price || 0,
              priceChange5m: dbToken.priceChange5m || 0,
              priceChange1h: dbToken.priceChange1h || 0,
              priceChange24h: dbToken.priceChange24h || 0,
              volume5m: dbToken.volume5m || 0,
              volume1h: dbToken.volume1h || 0,
              volume24h: dbToken.volume24h || 0,
              liquidity: dbToken.liquidity || 0,
              marketCap: dbToken.marketCap || 0,
              fdv: dbToken.marketCap || 0,
              holders: dbToken.holders,
              txns5m: dbToken.txns5m || { buys: 0, sells: 0 },
              txns1h: dbToken.txns1h || { buys: 0, sells: 0 },
              txns24h: dbToken.txns24h || { buys: 0, sells: 0 },
              createdAt: dbToken.createdAt,
              pairAddress: dbToken.pairAddress || '',
              dexId: dbToken.dexId || 'unknown',
              age: dbToken.age || Math.floor((now - dbToken.createdAt) / 60000),
              isNew: dbToken.isNew || false,
              isGraduating: dbToken.isGraduating || false,
              isTrending: dbToken.isTrending || false,
              riskScore: dbToken.riskScore || 50,
            };
            allTokens.push(tokenData);
          }
        } catch (error) {
          console.error('Failed to fetch from MongoDB, using fallback:', error);
        }
      }

      // 2. Add on-chain tokens (real-time) - these take priority
      for (const [mint, token] of this.onChainTokens) {
        // Update age
        token.age = Math.floor((now - token.createdAt) / 60000);
        token.isNew = token.age < 30;
        
        // Check if already in allTokens (from MongoDB)
        const existingIndex = allTokens.findIndex(t => t.mint === mint);
        if (existingIndex >= 0) {
          // Update existing with real-time data
          allTokens[existingIndex] = token;
        } else {
          // Add new token
          allTokens.push(token);
        }
      }

      // 2. Fetch from DexScreener for additional tokens
      const searchPromises = [
        this.fetchFromDexScreenerSearch('pump'),
        this.fetchFromDexScreenerPairs(),
      ];

      const results = await Promise.allSettled(searchPromises);

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          for (const token of result.value) {
            // Don't overwrite on-chain tokens
            if (!this.onChainTokens.has(token.mint)) {
              allTokens.push(token);
            }
          }
        }
      }

      // Remove duplicates by mint address, prefer on-chain data
      const uniqueTokens = new Map<string, TokenData>();
      for (const token of allTokens) {
        const existing = uniqueTokens.get(token.mint);
        if (!existing || token.createdAt > existing.createdAt) {
          uniqueTokens.set(token.mint, token);
        }
      }

      let tokens = Array.from(uniqueTokens.values());

      // Apply base filters
      tokens = tokens.filter(t => {
        if (filter !== 'new' && t.liquidity < minLiquidity) return false;
        if (t.age > maxAge) return false;
        return true;
      });

      // Apply specific filter
      switch (filter) {
        case 'new':
          // New tokens - under 30 min, or under 60 min with some activity
          tokens = tokens.filter(t => t.isNew || (t.age < 60 && t.txns1h.buys > 0));
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

      console.log(`TokenFeed: Found ${tokens.length} tokens with filter: ${filter} (${this.onChainTokens.size} on-chain)`);
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
      // Check rate limit
      if (!rateLimiter.canMakeRequest('dexscreener')) {
        console.log('⏳ Rate limit reached for DexScreener search, skipping...');
        return [];
      }

      await rateLimiter.waitIfNeeded('dexscreener');
      
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
        { headers: { 'Accept': 'application/json' } }
      );

      // Record request
      rateLimiter.recordRequest('dexscreener');

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
      // Check rate limit
      if (!rateLimiter.canMakeRequest('dexscreener')) {
        console.log('⏳ Rate limit reached for DexScreener pairs, skipping...');
        return [];
      }

      await rateLimiter.waitIfNeeded('dexscreener');

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

          // Record request
          rateLimiter.recordRequest('dexscreener');

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
      // Check rate limit
      if (!rateLimiter.canMakeRequest('dexscreener')) {
        console.log('⏳ Rate limit reached for DexScreener search fallback, skipping...');
        return [];
      }

      await rateLimiter.waitIfNeeded('dexscreener');

      // Search for recent Solana tokens
      const response = await fetch(
        'https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112',
        { headers: { 'Accept': 'application/json' } }
      );

      // Record request
      rateLimiter.recordRequest('dexscreener');

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
      // Check rate limit
      if (!rateLimiter.canMakeRequest('dexscreener')) {
        console.log(`⏳ Rate limit reached for DexScreener, trying on-chain for ${mint.slice(0, 8)}...`);
        // Try on-chain fallback
        const onChainResult = await this.enrichTokenDataOnChain(mint);
        if (onChainResult) {
          return this.onChainTokens.get(mint) || null;
        }
        return null;
      }

      await rateLimiter.waitIfNeeded('dexscreener');

      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
        { headers: { 'Accept': 'application/json' } }
      );

      // Record request
      rateLimiter.recordRequest('dexscreener');

      if (!response.ok) {
        // Try on-chain fallback
        const onChainResult = await this.enrichTokenDataOnChain(mint);
        if (onChainResult) {
          return this.onChainTokens.get(mint) || null;
        }
        return null;
      }

      const data = await response.json();
      const pair = data.pairs?.[0];
      if (!pair) return null;

      return this.mapPairToToken(pair);
    } catch {
      // Try on-chain fallback on error
      const onChainResult = await this.enrichTokenDataOnChain(mint);
      if (onChainResult) {
        return this.onChainTokens.get(mint) || null;
      }
      return null;
    }
  }
}

// Singleton instance
export const tokenFeed = new TokenFeedService();
