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
    private cache;
    private cacheExpiry;
    private callbacks;
    constructor();
    /**
     * Fetch latest tokens from multiple sources
     */
    fetchTokens(options?: Partial<TokenFeedOptions>): Promise<TokenData[]>;
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