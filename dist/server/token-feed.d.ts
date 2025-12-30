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
    txns5m: {
        buys: number;
        sells: number;
    };
    txns1h: {
        buys: number;
        sells: number;
    };
    txns24h: {
        buys: number;
        sells: number;
    };
    createdAt: number;
    pairAddress: string;
    dexId: string;
    age: number;
    isNew: boolean;
    isGraduating: boolean;
    isTrending: boolean;
    riskScore: number;
}
interface TokenFeedOptions {
    filter: 'all' | 'new' | 'graduating' | 'trending' | 'safe';
    minLiquidity: number;
    maxAge: number;
    limit: number;
}
declare class TokenFeedService {
    private metadataCache;
    private priceCache;
    private volumeCache;
    private marketDataCache;
    private priceChangeCache;
    private fullTokenCache;
    private readonly TTL;
    private callbacks;
    private onChainTokens;
    private graduatedTokens;
    private isStarted;
    constructor();
    /**
     * Cleanup expired cache entries
     */
    private cleanupExpiredCache;
    /**
     * Get cached metadata or null if expired/missing
     */
    private getCachedMetadata;
    /**
     * Set metadata in cache
     */
    private setCachedMetadata;
    /**
     * Get cached price or null if expired/missing
     */
    private getCachedPrice;
    /**
     * Set price in cache
     */
    private setCachedPrice;
    /**
     * Get cached volume or null if expired/missing
     */
    private getCachedVolume;
    /**
     * Set volume in cache
     */
    private setCachedVolume;
    /**
     * Get cached market data or null if expired/missing
     */
    private getCachedMarketData;
    /**
     * Set market data in cache
     */
    private setCachedMarketData;
    /**
     * Get cached price changes or null if expired/missing
     */
    private getCachedPriceChanges;
    /**
     * Set price changes in cache
     */
    private setCachedPriceChanges;
    /**
     * Start the on-chain monitoring
     */
    start(): Promise<void>;
    /**
     * Get on-chain tokens map (for worker access)
     */
    getOnChainTokens(): Map<string, TokenData>;
    /**
     * Check if service is started
     */
    isServiceStarted(): boolean;
    /**
     * Enrich token data with DexScreener metadata (with intelligent caching)
     * Public method so worker can access it
     */
    enrichTokenData(mint: string): Promise<void>;
    /**
     * Enrich token data from on-chain (Metaplex metadata) - Fallback when APIs fail
     * Returns true if enrichment was successful, false otherwise
     */
    private enrichTokenDataOnChain;
    /**
     * Fetch latest tokens from on-chain + DexScreener
     */
    fetchTokens(options?: Partial<TokenFeedOptions>): Promise<TokenData[]>;
    /**
     * Fallback: Fetch from pump.fun API (last resort when all other sources fail)
     */
    private fetchFromPumpFunAPI;
    /**
     * Fetch from DexScreener search API
     */
    private fetchFromDexScreenerSearch;
    /**
     * Fetch latest Solana pairs from DexScreener
     */
    private fetchFromDexScreenerPairs;
    /**
     * Fallback: Fetch from DexScreener search
     */
    private fetchFromSearch;
    /**
     * Fetch pair data for multiple tokens
     */
    private fetchPairData;
    /**
     * Map DexScreener pair to TokenData
     */
    private mapPairToToken;
    /**
     * Subscribe to token updates
     */
    subscribe(callback: (tokens: TokenData[]) => void): () => void;
    /**
     * Broadcast tokens to all subscribers
     */
    private broadcast;
    /**
     * Get trending tokens (high volume/liquidity ratio)
     */
    getTrending(limit?: number): Promise<TokenData[]>;
    /**
     * Get newest tokens (< 30 min old)
     */
    getNew(limit?: number): Promise<TokenData[]>;
    /**
     * Get graduating tokens (about to complete bonding curve)
     */
    getGraduating(limit?: number): Promise<TokenData[]>;
    /**
     * Search for specific token by mint
     */
    getToken(mint: string): Promise<TokenData | null>;
}
export declare const tokenFeed: TokenFeedService;
export {};
//# sourceMappingURL=token-feed.d.ts.map