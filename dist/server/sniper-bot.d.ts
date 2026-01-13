import { Keypair } from '@solana/web3.js';
export interface SniperConfig {
    userId: string;
    enabled: boolean;
    minLiquidity: number;
    maxMarketCap: number;
    minHolders: number;
    maxTopHolderPercent: number;
    requireMintDisabled: boolean;
    requireFreezeDisabled: boolean;
    skipHoneypots: boolean;
    buyAmountSol: number;
    maxSlippage: number;
    autoSellPercent?: number;
    stopLossPercent?: number;
}
export declare const SnipeHistory: any;
export declare class SniperBot {
    private activeSnipes;
    private connection;
    private rpcUrl;
    private isRunning;
    constructor(rpcUrl: string);
    /**
     * Get user's sniper config
     */
    getConfig(userId: string): Promise<SniperConfig | null>;
    /**
     * Update sniper config
     */
    updateConfig(userId: string, config: Partial<SniperConfig>): Promise<SniperConfig>;
    /**
     * Enable sniper for user
     */
    enable(userId: string): Promise<void>;
    /**
     * Disable sniper for user
     */
    disable(userId: string): Promise<void>;
    /**
     * Check if token passes sniper filters
     */
    checkToken(tokenMint: string, config: SniperConfig): Promise<{
        pass: boolean;
        reason?: string;
    }>;
    /**
     * Execute snipe (buy token)
     */
    executeSnipe(userId: string, tokenMint: string, keypair: Keypair, config: SniperConfig): Promise<{
        success: boolean;
        signature?: string;
        tokensReceived?: number;
        error?: string;
    }>;
    /**
     * Process new token (called by WebSocket listener)
     */
    processNewToken(tokenMint: string, tokenInfo?: {
        name?: string;
        symbol?: string;
    }): Promise<void>;
    /**
     * Get snipe history for user
     */
    getHistory(userId: string, limit?: number): Promise<any[]>;
    /**
     * Get active snipes count
     */
    getActiveCount(): number;
}
export declare function initSniperBot(rpcUrl: string): SniperBot;
export declare function getSniperBot(): SniperBot | null;
//# sourceMappingURL=sniper-bot.d.ts.map