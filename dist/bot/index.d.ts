import { SwapPair } from '../trading';
export interface VolumeSession {
    startTime: Date;
    totalTrades: number;
    successfulTrades: number;
    failedTrades: number;
    totalVolume: number;
    tradingPair: SwapPair;
    isActive: boolean;
}
export interface VolumeConfig {
    tradingPair: SwapPair;
    numberOfCycles: number;
    tradesPerCycle: number;
    delayBetweenTrades: number;
    delayBetweenCycles: number;
    randomizeAmounts: boolean;
    minTradeAmount: number;
    maxTradeAmount: number;
}
export declare class VolumeBot {
    private walletManager;
    private trader;
    private fundManager;
    private session;
    private isRunning;
    constructor();
    /**
     * Initialize the volume bot with configuration
     */
    initialize(): Promise<boolean>;
    /**
     * Configure and start a volume generation session
     */
    startVolumeSession(): Promise<void>;
    /**
     * Get volume configuration from user
     */
    private getVolumeConfiguration;
    /**
     * Validate the volume configuration
     */
    private validateConfiguration;
    /**
     * Display configuration summary
     */
    private displayConfigurationSummary;
    /**
     * Execute the volume generation session
     */
    private executeVolumeSession;
    /**
     * Update session statistics
     */
    private updateSessionStats;
    /**
     * Display session results
     */
    private displaySessionResults;
    /**
     * Stop the current session
     */
    stopSession(): void;
    /**
     * Display current bot status
     */
    displayBotStatus(): Promise<void>;
    /**
     * Utility method for delays
     */
    private delay;
    /**
     * Get current session info
     */
    getCurrentSession(): VolumeSession | null;
    /**
     * Check if bot is currently running
     */
    isActive(): boolean;
}
//# sourceMappingURL=index.d.ts.map