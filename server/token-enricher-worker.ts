// Token Enricher Worker - Background service to enrich tokens continuously
// Enriches tokens in background without blocking user requests

import { tokenIndexer } from './token-indexer';
import { tokenFeed } from './token-feed';
import { log } from './logger';

class TokenEnricherWorker {
  private isRunning = false;
  private interval: NodeJS.Timeout | null = null;
  private enrichmentQueue: string[] = []; // Queue of mints to enrich
  private processing = false;

  /**
   * Start the enricher worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      log.warn('Token Enricher Worker already running');
      return;
    }

    this.isRunning = true;
    log.info('Starting Token Enricher Worker');

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
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    this.processing = false;
    log.info('Token Enricher Worker stopped');
  }

  /**
   * Add token to enrichment queue
   */
  enqueue(mint: string): void {
    if (!this.enrichmentQueue.includes(mint)) {
      this.enrichmentQueue.push(mint);
    }
  }

  /**
   * Enrich a batch of tokens
   */
  private async enrichBatch(): Promise<void> {
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
        log.info('No tokens need enrichment at this time');
        this.processing = false;
        return;
      }

      log.info('Enriching tokens in background', { count: uniqueMints.length });

      // 3. Process in small batches to avoid rate limits
      const batchSize = 3; // Reduced from 5 to 3
      let enriched = 0;
      let failed = 0;

      for (let i = 0; i < uniqueMints.length; i += batchSize) {
        const batch = uniqueMints.slice(i, i + batchSize);

        const results = await Promise.allSettled(
          batch.map(mint => this.enrichToken(mint))
        );

        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            enriched++;
          } else {
            failed++;
          }
        }

        // Delay between batches to avoid rate limits (increased from 2s to 5s)
        if (i + batchSize < uniqueMints.length) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
        }
      }

      log.info('Enrichment complete', { enriched, failed });

    } catch (error: any) {
      log.error('Error in enricher worker', { error: error.message });
    } finally {
      this.processing = false;
    }
  }

  /**
   * Get tokens that need enrichment
   */
  private async getTokensNeedingEnrichment(): Promise<string[]> {
    const tokens: string[] = [];
    const now = Date.now();

    // Priority 1: Tokens from MongoDB that need enrichment
    if (tokenIndexer.isActive()) {
      try {
        const dbTokens = await tokenIndexer.getTokensNeedingEnrichment(30);
        tokens.push(...dbTokens);
      } catch (error) {
        log.error('Failed to get tokens from MongoDB', { error: error instanceof Error ? error.message : String(error) });
      }
    }

    // Priority 2: New tokens from in-memory cache (< 1 hour old, missing metadata)
    const onChainTokens = tokenFeed.getOnChainTokens();
    
    if (onChainTokens) {
      for (const [mint, token] of onChainTokens) {
        const age = now - token.createdAt;
        const isNew = age < 3600000; // Less than 1 hour old
        
        // Check if token needs enrichment (missing name/symbol or generic name)
        const needsEnrichment = isNew && (
          !token.name ||
          token.name.startsWith('Token ') ||
          token.symbol === 'NEW' ||
          token.symbol === 'UNK' ||
          !token.imageUrl
        );

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
  private async enrichToken(mint: string): Promise<boolean> {
    try {
      // Use the tokenFeed's public enrichTokenData method
      await tokenFeed.enrichTokenData(mint);
      return true;
    } catch (error: any) {
      log.error('Failed to enrich token', { mint: mint.slice(0, 8), error: error.message });
      return false;
    }
  }

  /**
   * Get worker status
   */
  getStatus(): {
    isRunning: boolean;
    processing: boolean;
    queueLength: number;
  } {
    return {
      isRunning: this.isRunning,
      processing: this.processing,
      queueLength: this.enrichmentQueue.length,
    };
  }

  /**
   * Force immediate enrichment of specific tokens
   */
  async enrichNow(mints: string[]): Promise<void> {
    if (mints.length === 0) return;

    log.info('Force enriching tokens', { count: mints.length });

    const batchSize = 5;
    for (let i = 0; i < mints.length; i += batchSize) {
      const batch = mints.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(mint => this.enrichToken(mint))
      );

      if (i + batchSize < mints.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    log.info('Force enrichment complete', { count: mints.length });
  }
}

// Singleton instance
export const tokenEnricherWorker = new TokenEnricherWorker();

