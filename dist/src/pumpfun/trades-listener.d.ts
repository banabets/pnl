export interface Trade {
    signature: string;
    timestamp: number;
    price: number;
    amount: number;
    side: 'buy' | 'sell';
    buyer: string;
    seller: string;
    solAmount: number;
    tokenAmount: number;
}
export declare class TradesListener {
    private connection;
    private subscriptionId;
    private tradeCallbacks;
    private isListening;
    private recentTrades;
    private maxRecentTrades;
    constructor();
    /**
     * Start listening for trades for a specific token
     */
    startListening(tokenMint: string): Promise<void>;
    /**
     * Fetch recent trades from on-chain data
     */
    private fetchRecentTrades;
    /**
     * Process a transaction to extract trade information
     */
    private processTransaction;
    /**
     * Notify all subscribers about a new trade
     */
    private notifyTrade;
    /**
     * Subscribe to trade updates
     */
    onTrade(callback: (trade: Trade) => void): () => void;
    /**
     * Get recent trades
     */
    getRecentTrades(limit?: number): Trade[];
    /**
     * Stop listening
     */
    stopListening(): Promise<void>;
}
//# sourceMappingURL=trades-listener.d.ts.map