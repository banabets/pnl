"use strict";
// Token Enricher Worker - Background service to enrich tokens continuously
// Enriches tokens in background without blocking user requests
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenEnricherWorker = void 0;
const token_indexer_1 = require("./token-indexer");
const token_feed_1 = require("./token-feed");
class TokenEnricherWorker {
    constructor() {
        this.isRunning = false;
        this.interval = null;
        this.enrichmentQueue = []; // Queue of mints to enrich
        this.processing = false;
    }
    /**
     * Start the enricher worker
     */
    async start() {
        if (this.isRunning) {
            console.log('⚠️ Token Enricher Worker already running');
            return;
        }
        this.isRunning = true;
        console.log('🔄 Starting Token Enricher Worker...');
        // Enrich tokens every 5 minutes
        this.interval = setInterval(async () => {
            if (!this.processing) {
                await this.enrichBatch();
            }
        }, 5 * 60 * 1000); // 5 minutes
        // First execution after 30 seconds (give server time to start)
        setTimeout(() => {
            if (this.isRunning && !this.processing) {
                this.enrichBatch();
            }
        }, 30000);
    }
    /**
     * Stop the enricher worker
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
        this.processing = false;
        console.log('🛑 Token Enricher Worker stopped');
    }
    /**
     * Add token to enrichment queue
     */
    enqueue(mint) {
        if (!this.enrichmentQueue.includes(mint)) {
            this.enrichmentQueue.push(mint);
        }
    }
    /**
     * Enrich a batch of tokens
     */
    async enrichBatch() {
        if (this.processing) {
            return; // Already processing
        }
        this.processing = true;
        try {
            // 1. Get tokens that need enrichment
            const tokensToEnrich = await this.getTokensNeedingEnrichment();
            // 2. Add queued tokens
            if (this.enrichmentQueue.length > 0) {
                tokensToEnrich.push(...this.enrichmentQueue);
                this.enrichmentQueue = [];
            }
            // Remove duplicates
            const uniqueMints = Array.from(new Set(tokensToEnrich));
            if (uniqueMints.length === 0) {
                console.log('📊 No tokens need enrichment at this time');
                this.processing = false;
                return;
            }
            console.log(`🔄 Enriching ${uniqueMints.length} tokens in background...`);
            // 3. Process in small batches to avoid rate limits
            const batchSize = 5;
            let enriched = 0;
            let failed = 0;
            for (let i = 0; i < uniqueMints.length; i += batchSize) {
                const batch = uniqueMints.slice(i, i + batchSize);
                const results = await Promise.allSettled(batch.map(mint => this.enrichToken(mint)));
                for (const result of results) {
                    if (result.status === 'fulfilled' && result.value) {
                        enriched++;
                    }
                    else {
                        failed++;
                    }
                }
                // Delay between batches to avoid rate limits
                if (i + batchSize < uniqueMints.length) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
                }
            }
            console.log(`✅ Enrichment complete: ${enriched} enriched, ${failed} failed`);
        }
        catch (error) {
            console.error('❌ Error in enricher worker:', error.message);
        }
        finally {
            this.processing = false;
        }
    }
    /**
     * Get tokens that need enrichment
     */
    async getTokensNeedingEnrichment() {
        const tokens = [];
        const now = Date.now();
        // Priority 1: Tokens from MongoDB that need enrichment
        if (token_indexer_1.tokenIndexer.isActive()) {
            try {
                const dbTokens = await token_indexer_1.tokenIndexer.getTokensNeedingEnrichment(30);
                tokens.push(...dbTokens);
            }
            catch (error) {
                console.error('Failed to get tokens from MongoDB:', error);
            }
        }
        // Priority 2: New tokens from in-memory cache (< 1 hour old, missing metadata)
        const onChainTokens = token_feed_1.tokenFeed.getOnChainTokens();
        if (onChainTokens) {
            for (const [mint, token] of onChainTokens) {
                const age = now - token.createdAt;
                const isNew = age < 3600000; // Less than 1 hour old
                // Check if token needs enrichment (missing name/symbol or generic name)
                const needsEnrichment = isNew && (!token.name ||
                    token.name.startsWith('Token ') ||
                    token.symbol === 'NEW' ||
                    token.symbol === 'UNK' ||
                    !token.imageUrl);
                if (needsEnrichment && !tokens.includes(mint)) {
                    tokens.push(mint);
                }
            }
        }
        // Limit to 50 tokens per batch
        return tokens.slice(0, 50);
    }
    /**
     * Enrich a single token
     */
    async enrichToken(mint) {
        try {
            // Use the tokenFeed's public enrichTokenData method
            await token_feed_1.tokenFeed.enrichTokenData(mint);
            return true;
        }
        catch (error) {
            console.error(`Failed to enrich token ${mint.slice(0, 8)}...:`, error.message);
            return false;
        }
    }
    /**
     * Get worker status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            processing: this.processing,
            queueLength: this.enrichmentQueue.length,
        };
    }
    /**
     * Force immediate enrichment of specific tokens
     */
    async enrichNow(mints) {
        if (mints.length === 0)
            return;
        console.log(`🔄 Force enriching ${mints.length} tokens...`);
        const batchSize = 5;
        for (let i = 0; i < mints.length; i += batchSize) {
            const batch = mints.slice(i, i + batchSize);
            await Promise.allSettled(batch.map(mint => this.enrichToken(mint)));
            if (i + batchSize < mints.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        console.log(`✅ Force enrichment complete for ${mints.length} tokens`);
    }
}
// Singleton instance
exports.tokenEnricherWorker = new TokenEnricherWorker();
//# sourceMappingURL=token-enricher-worker.js.map