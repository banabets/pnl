"use strict";
// Token Enricher Worker - Background service to enrich tokens continuously
// Enriches tokens in background without blocking user requests
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenEnricherWorker = void 0;
const token_indexer_1 = require("./token-indexer");
const token_feed_1 = require("./token-feed");
const logger_1 = require("./logger");
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
            logger_1.log.warn('Token Enricher Worker already running');
            return;
        }
        this.isRunning = true;
        logger_1.log.info('Starting Token Enricher Worker');
        // Enrich tokens every 30 minutes (reduced from 5 to save API credits)
        this.interval = setInterval(async () => {
            if (!this.processing) {
                await this.enrichBatch();
            }
        }, 30 * 60 * 1000); // 30 minutes
        // First execution after 2 minutes (give server time to start)
        setTimeout(() => {
            if (this.isRunning && !this.processing) {
                this.enrichBatch();
            }
        }, 120000); // 2 minutes
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
        logger_1.log.info('Token Enricher Worker stopped');
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
                logger_1.log.info('No tokens need enrichment at this time');
                this.processing = false;
                return;
            }
            logger_1.log.info('Enriching tokens in background', { count: uniqueMints.length });
            // 3. Process in small batches to avoid rate limits
            const batchSize = 3; // Reduced from 5 to 3
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
                // Delay between batches to avoid rate limits (increased from 2s to 5s)
                if (i + batchSize < uniqueMints.length) {
                    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
                }
            }
            logger_1.log.info('Enrichment complete', { enriched, failed });
        }
        catch (error) {
            logger_1.log.error('Error in enricher worker', { error: error.message });
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
                logger_1.log.error('Failed to get tokens from MongoDB', { error: error instanceof Error ? error.message : String(error) });
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
        // Limit to 15 tokens per batch (reduced from 50 to save API credits)
        return tokens.slice(0, 15);
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
            logger_1.log.error('Failed to enrich token', { mint: mint.slice(0, 8), error: error.message });
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
        logger_1.log.info('Force enriching tokens', { count: mints.length });
        const batchSize = 5;
        for (let i = 0; i < mints.length; i += batchSize) {
            const batch = mints.slice(i, i + batchSize);
            await Promise.allSettled(batch.map(mint => this.enrichToken(mint)));
            if (i + batchSize < mints.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        logger_1.log.info('Force enrichment complete', { count: mints.length });
    }
}
// Singleton instance
exports.tokenEnricherWorker = new TokenEnricherWorker();
//# sourceMappingURL=token-enricher-worker.js.map