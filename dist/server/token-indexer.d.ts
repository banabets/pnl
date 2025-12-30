export interface TokenIndexData {
    mint: string;
    name?: string;
    symbol?: string;
    imageUrl?: string;
    createdAt: number;
    creator?: string;
    bondingCurve?: string;
    source?: 'pumpfun' | 'raydium' | 'unknown';
    price?: number;
    marketCap?: number;
    liquidity?: number;
    volume24h?: number;
    volume1h?: number;
    volume5m?: number;
    holders?: number;
    supply?: number;
    priceChange5m?: number;
    priceChange1h?: number;
    priceChange24h?: number;
    txns5m?: {
        buys: number;
        sells: number;
    };
    txns1h?: {
        buys: number;
        sells: number;
    };
    txns24h?: {
        buys: number;
        sells: number;
    };
    lastEnrichedAt?: number;
    enrichmentSource?: string;
    isNew?: boolean;
    isGraduating?: boolean;
    isTrending?: boolean;
    riskScore?: number;
    pairAddress?: string;
    dexId?: string;
    age?: number;
}
declare class TokenIndexerService {
    private isEnabled;
    /**
     * Initialize the indexer (check if MongoDB is available)
     */
    initialize(): Promise<void>;
    /**
     * Index or update a token in MongoDB
     */
    indexToken(data: TokenIndexData): Promise<void>;
    /**
     * Batch index multiple tokens
     */
    indexTokens(tokens: TokenIndexData[]): Promise<void>;
    /**
     * Get tokens from MongoDB
     */
    getTokens(options: {
        filter?: 'all' | 'new' | 'graduating' | 'trending';
        minLiquidity?: number;
        maxAge?: number;
        limit?: number;
    }): Promise<TokenIndexData[]>;
    /**
     * Get a single token by mint
     */
    getToken(mint: string): Promise<TokenIndexData | null>;
    /**
     * Update token enrichment data
     */
    updateEnrichment(mint: string, data: Partial<TokenIndexData>, source: string): Promise<void>;
    /**
     * Get tokens that need enrichment (for background worker)
     */
    getTokensNeedingEnrichment(limit?: number): Promise<string[]>;
    /**
     * Check if indexer is enabled
     */
    isActive(): boolean;
}
export declare const tokenIndexer: TokenIndexerService;
export {};
//# sourceMappingURL=token-indexer.d.ts.map