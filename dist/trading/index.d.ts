import { Keypair, PublicKey } from '@solana/web3.js';
export interface TradeResult {
    signature?: string;
    success: boolean;
    error?: string;
    amountIn: number;
    amountOut?: number;
    gasUsed?: number;
}
export interface SwapPair {
    tokenA: string;
    tokenB: string;
    poolId: string;
    name: string;
}
export declare class VolumeTrader {
    private connection;
    constructor();
    /**
     * Execute a simulated or real swap
     */
    executeSwap(keypair: Keypair, swapPair: SwapPair, tokenAToB: boolean, amountInSol: number, slippagePercent?: number): Promise<TradeResult>;
    /**
     * Simulate a swap without actually executing it
     */
    private simulateSwap;
    /**
     * Get SOL balance for a wallet
     */
    getSolBalance(publicKey: PublicKey): Promise<number>;
    /**
     * Check if we have enough balance for a trade
     */
    canAffordTrade(publicKey: PublicKey, amountSol: number): Promise<boolean>;
    /**
     * Generate a random trade amount within configured limits
     */
    generateRandomTradeAmount(): number;
    /**
     * Validate that a trading pair is valid
     */
    validateSwapPair(swapPair: SwapPair): boolean;
    /**
     * Get trading pairs - Add your real tokens here!
     */
    getExampleTradingPairs(): SwapPair[];
    /**
     * Display trading statistics
     */
    displayTradingStats(results: TradeResult[]): void;
}
//# sourceMappingURL=index.d.ts.map