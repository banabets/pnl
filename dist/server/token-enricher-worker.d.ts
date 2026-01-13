declare class TokenEnricherWorker {
    private isRunning;
    private interval;
    private enrichmentQueue;
    private processing;
    /**
     * Start the enricher worker
     */
    start(): Promise<void>;
    /**
     * Stop the enricher worker
     */
    stop(): void;
    /**
     * Add token to enrichment queue
     */
    enqueue(mint: string): void;
    /**
     * Enrich a batch of tokens
     */
    private enrichBatch;
    /**
     * Get tokens that need enrichment
     */
    private getTokensNeedingEnrichment;
    /**
     * Enrich a single token
     */
    private enrichToken;
    /**
     * Get worker status
     */
    getStatus(): {
        isRunning: boolean;
        processing: boolean;
        queueLength: number;
    };
    /**
     * Force immediate enrichment of specific tokens
     */
    enrichNow(mints: string[]): Promise<void>;
}
export declare const tokenEnricherWorker: TokenEnricherWorker;
export {};
//# sourceMappingURL=token-enricher-worker.d.ts.map