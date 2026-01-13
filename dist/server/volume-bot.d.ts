import { Keypair } from '@solana/web3.js';
interface VolumeBotConfig {
    tokenMint: string;
    targetVolume: number;
    walletCount: number;
    minTradeSize: number;
    maxTradeSize: number;
    delayBetweenTrades: number;
    duration: number;
}
interface VolumeBotStatus {
    isRunning: boolean;
    tokenMint: string | null;
    currentVolume: number;
    targetVolume: number;
    tradesExecuted: number;
    walletsUsed: number;
    startTime: number | null;
    errors: string[];
}
declare class VolumeBotService {
    private connection;
    private status;
    private isRunning;
    private stopRequested;
    private wallets;
    constructor();
    /**
     * Start the volume bot with given configuration
     */
    start(config: VolumeBotConfig, wallets: Keypair[]): Promise<void>;
    /**
     * Stop the volume bot
     */
    stop(): void;
    /**
     * Get current status
     */
    getStatus(): VolumeBotStatus;
    /**
     * Main trading loop
     */
    private runTradingLoop;
    /**
     * Execute a single trade
     */
    private executeTrade;
    /**
     * Execute real trade via Jupiter
     */
    private simulateTrade;
    /**
     * Generate random trade size within bounds
     */
    private randomTradeSize;
    /**
     * Randomize delay to make trading look organic (±30%)
     */
    private randomizeDelay;
    /**
     * Check wallet balances
     */
    checkWalletBalances(): Promise<{
        wallet: string;
        balance: number;
    }[]>;
}
export declare const volumeBotService: VolumeBotService;
export {};
//# sourceMappingURL=volume-bot.d.ts.map