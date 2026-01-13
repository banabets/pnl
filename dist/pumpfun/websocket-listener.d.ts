export interface TokenUpdate {
    mint: string;
    timestamp: number;
    signature: string;
}
export declare class PumpFunWebSocketListener {
    private connection;
    private subscriptionId;
    private tokenCallbacks;
    private isListening;
    private recentTokens;
    private maxRecentTokens;
    constructor();
    /**
     * Start listening to pump.fun program transactions via WebSocket
     */
    startListening(): Promise<void>;
    /**
     * Fetch recent historical transactions to populate initial token list
     */
    private fetchRecentHistoricalTransactions;
    /**
     * Stop listening to transactions
     */
    stopListening(): Promise<void>;
    /**
     * Subscribe to token updates
     */
    onTokenUpdate(callback: (token: TokenUpdate) => void): () => void;
    /**
     * Get recent tokens found via WebSocket
     * Only returns tokens from the last 6 hours (very recent)
     */
    getRecentTokens(limit?: number): TokenUpdate[];
    /**
     * Process account change and extract token mints
     */
    private processAccountChange;
    /**
     * Extract token mints from a transaction
     */
    private extractTokensFromTransaction;
    /**
     * Notify all subscribers about a new token
     */
    private notifyTokenUpdate;
    /**
     * Check if currently listening
     */
    getIsListening(): boolean;
    /**
     * Check if a token is likely a pump.fun token by checking for bonding curve
     */
    private isLikelyPumpFunToken;
}
//# sourceMappingURL=websocket-listener.d.ts.map