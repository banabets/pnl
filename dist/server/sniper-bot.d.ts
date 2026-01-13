import { Keypair } from '@solana/web3.js';
import mongoose from 'mongoose';
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
export declare const SnipeHistory: mongoose.Model<{
    timestamp: NativeDate;
    status: "pending" | "failed" | "bought" | "sold";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    tokensReceived: number;
    buyAmountSol: number;
    buyPrice: number;
    signature?: string | null | undefined;
    pnl?: number | null | undefined;
    pnlPercent?: number | null | undefined;
    tokenName?: string | null | undefined;
    tokenSymbol?: string | null | undefined;
    sellPrice?: number | null | undefined;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    timestamp: NativeDate;
    status: "pending" | "failed" | "bought" | "sold";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    tokensReceived: number;
    buyAmountSol: number;
    buyPrice: number;
    signature?: string | null | undefined;
    pnl?: number | null | undefined;
    pnlPercent?: number | null | undefined;
    tokenName?: string | null | undefined;
    tokenSymbol?: string | null | undefined;
    sellPrice?: number | null | undefined;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    timestamp: NativeDate;
    status: "pending" | "failed" | "bought" | "sold";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    tokensReceived: number;
    buyAmountSol: number;
    buyPrice: number;
    signature?: string | null | undefined;
    pnl?: number | null | undefined;
    pnlPercent?: number | null | undefined;
    tokenName?: string | null | undefined;
    tokenSymbol?: string | null | undefined;
    sellPrice?: number | null | undefined;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    timestamp: NativeDate;
    status: "pending" | "failed" | "bought" | "sold";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    tokensReceived: number;
    buyAmountSol: number;
    buyPrice: number;
    signature?: string | null | undefined;
    pnl?: number | null | undefined;
    pnlPercent?: number | null | undefined;
    tokenName?: string | null | undefined;
    tokenSymbol?: string | null | undefined;
    sellPrice?: number | null | undefined;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    timestamp: NativeDate;
    status: "pending" | "failed" | "bought" | "sold";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    tokensReceived: number;
    buyAmountSol: number;
    buyPrice: number;
    signature?: string | null | undefined;
    pnl?: number | null | undefined;
    pnlPercent?: number | null | undefined;
    tokenName?: string | null | undefined;
    tokenSymbol?: string | null | undefined;
    sellPrice?: number | null | undefined;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    timestamp: NativeDate;
    status: "pending" | "failed" | "bought" | "sold";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    tokensReceived: number;
    buyAmountSol: number;
    buyPrice: number;
    signature?: string | null | undefined;
    pnl?: number | null | undefined;
    pnlPercent?: number | null | undefined;
    tokenName?: string | null | undefined;
    tokenSymbol?: string | null | undefined;
    sellPrice?: number | null | undefined;
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
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