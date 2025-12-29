export interface PumpFunBotConfig {
    tokenMint: string;
    tokenName?: string;
    totalBuyAmount: number;
    selectedWalletIndices?: number[];
    tradeType: 'buy' | 'sell';
    slippageBps?: number;
    mode?: 'simultaneous' | 'sequential' | 'bundled';
    delay?: number;
    simulationMode?: boolean;
}
export interface PumpFunResult {
    success: boolean;
    transactions: string[];
    totalSpent: number;
    tokensReceived: number;
    averagePrice: number;
    errors?: string[];
}
export declare class PumpFunBot {
    private connection;
    private isRunning;
    private wallets;
    private rpcUrl;
    private program;
    private globalState;
    constructor(rpcUrl?: string);
    /**
     * Initialize the bot
     * Loads wallets from keypairs directory
     */
    initialize(): Promise<void>;
    /**
     * Execute pump operation
     */
    executePump(config: PumpFunBotConfig): Promise<PumpFunResult>;
    /**
     * Stop the pump operation
     */
    stopPump(): void;
    /**
     * Execute a single trade
     */
    private executeTrade;
    /**
     * Execute a buy order on pump.fun
     */
    private executeBuy;
    /**
     * Execute a sell order on pump.fun
     */
    private executeSell;
    /**
     * Get wallets to use based on selected indices
     */
    private getWalletsToUse;
    /**
     * Initialize Anchor program
     */
    private initializeProgram;
    /**
     * Get global state account
     */
    private getGlobalState;
    /**
     * Get fee recipient from global state
     */
    private getFeeRecipient;
    /**
     * Check if bot is running
     */
    getIsRunning(): boolean;
}
//# sourceMappingURL=pumpfun-bot.d.ts.map