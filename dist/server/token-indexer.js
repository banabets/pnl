"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenIndexer = void 0;
// Token Indexer Service - Persist tokens discovered on-chain to MongoDB
const database_1 = require("./database");
const logger_1 = require("./logger");
class TokenIndexerService {
    constructor() {
        this.isEnabled = false;
    }
    /**
     * Initialize the indexer (check if MongoDB is available)
     */
    async initialize() {
        this.isEnabled = (0, database_1.isConnected)();
        if (this.isEnabled) {
            logger_1.log.info('Token Indexer initialized (MongoDB connected)');
        }
        else {
            logger_1.log.warn('Token Indexer disabled (MongoDB not connected)');
        }
    }
    /**
     * Index or update a token in MongoDB
     */
    async indexToken(data) {
        if (!this.isEnabled) {
            return; // Silently skip if MongoDB not available
        }
        try {
            const tokenDoc = {
                mint: data.mint,
                name: data.name,
                symbol: data.symbol,
                imageUrl: data.imageUrl,
                createdAt: new Date(data.createdAt),
                creator: data.creator,
                bondingCurve: data.bondingCurve,
                source: data.source || 'unknown',
                price: data.price,
                marketCap: data.marketCap,
                liquidity: data.liquidity,
                volume24h: data.volume24h,
                volume1h: data.volume1h,
                volume5m: data.volume5m,
                holders: data.holders,
                supply: data.supply,
                priceChange5m: data.priceChange5m,
                priceChange1h: data.priceChange1h,
                priceChange24h: data.priceChange24h,
                txns5m: data.txns5m,
                txns1h: data.txns1h,
                txns24h: data.txns24h,
                lastEnrichedAt: data.lastEnrichedAt ? new Date(data.lastEnrichedAt) : undefined,
                enrichmentSource: data.enrichmentSource,
                isNew: data.isNew,
                isGraduating: data.isGraduating,
                isTrending: data.isTrending,
                riskScore: data.riskScore,
                pairAddress: data.pairAddress,
                dexId: data.dexId,
                age: data.age,
            };
            // Use upsert to update if exists, create if not
            await database_1.TokenIndex.findOneAndUpdate({ mint: data.mint }, { $set: tokenDoc }, { upsert: true, new: true });
        }
        catch (error) {
            // Log but don't throw - indexing failures shouldn't break the app
            logger_1.log.error('Failed to index token', { mint: data.mint, error: error.message });
        }
    }
    /**
     * Batch index multiple tokens
     */
    async indexTokens(tokens) {
        if (!this.isEnabled || tokens.length === 0) {
            return;
        }
        try {
            const operations = tokens.map(token => ({
                updateOne: {
                    filter: { mint: token.mint },
                    update: {
                        $set: {
                            mint: token.mint,
                            name: token.name,
                            symbol: token.symbol,
                            imageUrl: token.imageUrl,
                            createdAt: new Date(token.createdAt),
                            creator: token.creator,
                            bondingCurve: token.bondingCurve,
                            source: token.source || 'unknown',
                            price: token.price,
                            marketCap: token.marketCap,
                            liquidity: token.liquidity,
                            volume24h: token.volume24h,
                            volume1h: token.volume1h,
                            volume5m: token.volume5m,
                            holders: token.holders,
                            supply: token.supply,
                            priceChange5m: token.priceChange5m,
                            priceChange1h: token.priceChange1h,
                            priceChange24h: token.priceChange24h,
                            txns5m: token.txns5m,
                            txns1h: token.txns1h,
                            txns24h: token.txns24h,
                            lastEnrichedAt: token.lastEnrichedAt ? new Date(token.lastEnrichedAt) : undefined,
                            enrichmentSource: token.enrichmentSource,
                            isNew: token.isNew,
                            isGraduating: token.isGraduating,
                            isTrending: token.isTrending,
                            riskScore: token.riskScore,
                            pairAddress: token.pairAddress,
                            dexId: token.dexId,
                            age: token.age,
                        }
                    },
                    upsert: true
                }
            }));
            await database_1.TokenIndex.bulkWrite(operations);
            logger_1.log.info('Indexed tokens to MongoDB', { count: tokens.length });
        }
        catch (error) {
            logger_1.log.error('Failed to batch index tokens', { error: error.message });
        }
    }
    /**
     * Get tokens from MongoDB
     */
    async getTokens(options) {
        if (!this.isEnabled) {
            return [];
        }
        try {
            const { filter = 'all', minLiquidity = 0, maxAge = 1440, // 24 hours
            limit = 50 } = options;
            const now = Date.now();
            const maxAgeMs = maxAge * 60 * 1000;
            const minCreatedAt = new Date(now - maxAgeMs);
            // Build query
            const query = {
                createdAt: { $gte: minCreatedAt }
            };
            // Apply liquidity filter (except for new tokens)
            if (filter !== 'new' && minLiquidity > 0) {
                query.liquidity = { $gte: minLiquidity };
            }
            // Apply specific filters
            switch (filter) {
                case 'new':
                    query.isNew = true;
                    break;
                case 'graduating':
                    query.isGraduating = true;
                    break;
                case 'trending':
                    query.isTrending = true;
                    break;
            }
            const tokens = await database_1.TokenIndex.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();
            // Convert to TokenIndexData format
            return tokens.map(token => ({
                mint: token.mint,
                name: token.name ?? undefined,
                symbol: token.symbol ?? undefined,
                imageUrl: token.imageUrl ?? undefined,
                createdAt: token.createdAt.getTime(),
                creator: token.creator ?? undefined,
                bondingCurve: token.bondingCurve ?? undefined,
                source: token.source,
                price: token.price ?? undefined,
                marketCap: token.marketCap ?? undefined,
                liquidity: token.liquidity ?? undefined,
                volume24h: token.volume24h ?? undefined,
                volume1h: token.volume1h ?? undefined,
                volume5m: token.volume5m ?? undefined,
                holders: token.holders ?? undefined,
                supply: token.supply ?? undefined,
                priceChange5m: token.priceChange5m ?? undefined,
                priceChange1h: token.priceChange1h ?? undefined,
                priceChange24h: token.priceChange24h ?? undefined,
                txns5m: token.txns5m ? { buys: token.txns5m.buys ?? 0, sells: token.txns5m.sells ?? 0 } : undefined,
                txns1h: token.txns1h ? { buys: token.txns1h.buys ?? 0, sells: token.txns1h.sells ?? 0 } : undefined,
                txns24h: token.txns24h ? { buys: token.txns24h.buys ?? 0, sells: token.txns24h.sells ?? 0 } : undefined,
                lastEnrichedAt: token.lastEnrichedAt?.getTime(),
                enrichmentSource: token.enrichmentSource ?? undefined,
                isNew: token.isNew,
                isGraduating: token.isGraduating,
                isTrending: token.isTrending,
                riskScore: token.riskScore ?? undefined,
                pairAddress: token.pairAddress ?? undefined,
                dexId: token.dexId ?? undefined,
                age: token.age ?? undefined,
            }));
        }
        catch (error) {
            logger_1.log.error('Failed to get tokens from MongoDB', { error: error.message });
            return [];
        }
    }
    /**
     * Get a single token by mint
     */
    async getToken(mint) {
        if (!this.isEnabled) {
            return null;
        }
        try {
            const token = await database_1.TokenIndex.findOne({ mint }).lean();
            if (!token) {
                return null;
            }
            return {
                mint: token.mint,
                name: token.name ?? undefined,
                symbol: token.symbol ?? undefined,
                imageUrl: token.imageUrl ?? undefined,
                createdAt: token.createdAt.getTime(),
                creator: token.creator ?? undefined,
                bondingCurve: token.bondingCurve ?? undefined,
                source: token.source,
                price: token.price ?? undefined,
                marketCap: token.marketCap ?? undefined,
                liquidity: token.liquidity ?? undefined,
                volume24h: token.volume24h ?? undefined,
                volume1h: token.volume1h ?? undefined,
                volume5m: token.volume5m ?? undefined,
                holders: token.holders ?? undefined,
                supply: token.supply ?? undefined,
                priceChange5m: token.priceChange5m ?? undefined,
                priceChange1h: token.priceChange1h ?? undefined,
                priceChange24h: token.priceChange24h ?? undefined,
                txns5m: token.txns5m ? { buys: token.txns5m.buys ?? 0, sells: token.txns5m.sells ?? 0 } : undefined,
                txns1h: token.txns1h ? { buys: token.txns1h.buys ?? 0, sells: token.txns1h.sells ?? 0 } : undefined,
                txns24h: token.txns24h ? { buys: token.txns24h.buys ?? 0, sells: token.txns24h.sells ?? 0 } : undefined,
                lastEnrichedAt: token.lastEnrichedAt?.getTime(),
                enrichmentSource: token.enrichmentSource ?? undefined,
                isNew: token.isNew,
                isGraduating: token.isGraduating,
                isTrending: token.isTrending,
                riskScore: token.riskScore ?? undefined,
                pairAddress: token.pairAddress ?? undefined,
                dexId: token.dexId ?? undefined,
                age: token.age ?? undefined,
            };
        }
        catch (error) {
            logger_1.log.error('Failed to get token from MongoDB', { mint, error: error.message });
            return null;
        }
    }
    /**
     * Update token enrichment data
     */
    async updateEnrichment(mint, data, source) {
        if (!this.isEnabled) {
            return;
        }
        try {
            await database_1.TokenIndex.findOneAndUpdate({ mint }, {
                $set: {
                    ...data,
                    lastEnrichedAt: new Date(),
                    enrichmentSource: source
                }
            });
        }
        catch (error) {
            logger_1.log.error('Failed to update enrichment', { mint, error: error.message });
        }
    }
    /**
     * Get tokens that need enrichment (for background worker)
     */
    async getTokensNeedingEnrichment(limit = 50) {
        if (!this.isEnabled) {
            return [];
        }
        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            // Priority: tokens created in last hour without enrichment, or with old enrichment
            const tokens = await database_1.TokenIndex.find({
                $or: [
                    { lastEnrichedAt: { $exists: false } },
                    { lastEnrichedAt: { $lt: oneHourAgo } }
                ],
                createdAt: { $gte: oneHourAgo }
            })
                .sort({ createdAt: -1 })
                .limit(limit)
                .select('mint')
                .lean();
            return tokens.map(t => t.mint);
        }
        catch (error) {
            logger_1.log.error('Failed to get tokens needing enrichment', { error: error.message });
            return [];
        }
    }
    /**
     * Check if indexer is enabled
     */
    isActive() {
        return this.isEnabled;
    }
}
// Singleton instance
exports.tokenIndexer = new TokenIndexerService();
//# sourceMappingURL=token-indexer.js.map