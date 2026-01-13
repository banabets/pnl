import { Keypair } from '@solana/web3.js';
export interface DCAOrder {
    userId: string;
    tokenMint: string;
    tokenName?: string;
    totalAmountSol: number;
    amountPerBuy: number;
    intervalMinutes: number;
    remainingAmount: number;
    executedBuys: number;
    totalTokensBought: number;
    averagePrice: number;
    status: 'active' | 'paused' | 'completed' | 'cancelled';
    nextBuyAt: Date;
    createdAt: Date;
}
export declare const DCAOrder: any;
export declare const DCAExecution: any;
export declare class DCABot {
    private intervalId;
    private isRunning;
    private getKeypairForUser;
    constructor();
    /**
     * Set keypair getter function (injected from wallet service)
     */
    setKeypairGetter(getter: (userId: string, walletIndex?: number) => Promise<Keypair | null>): void;
    /**
     * Create new DCA order
     */
    createOrder(userId: string, tokenMint: string, totalAmountSol: number, amountPerBuy: number, intervalMinutes: number, tokenName?: string, walletIndex?: number): Promise<any>;
    /**
     * Pause DCA order
     */
    pauseOrder(orderId: string, userId: string): Promise<boolean>;
    /**
     * Resume DCA order
     */
    resumeOrder(orderId: string, userId: string): Promise<boolean>;
    /**
     * Cancel DCA order
     */
    cancelOrder(orderId: string, userId: string): Promise<boolean>;
    /**
     * Get user's DCA orders
     */
    getUserOrders(userId: string, status?: string): Promise<any[]>;
    /**
     * Get order execution history
     */
    getOrderHistory(orderId: string): Promise<any[]>;
    /**
     * Execute a single DCA buy
     */
    executeBuy(order: any, keypair: Keypair): Promise<{
        success: boolean;
        tokensReceived?: number;
        error?: string;
    }>;
    /**
     * Process pending DCA orders (called by scheduler)
     */
    processPendingOrders(): Promise<void>;
    /**
     * Start the DCA scheduler
     */
    start(intervalMs?: number): void;
    /**
     * Stop the DCA scheduler
     */
    stop(): void;
    /**
     * Get DCA stats for user
     */
    getUserStats(userId: string): Promise<{
        activeOrders: number;
        totalInvested: number;
        totalTokensBought: number;
        completedOrders: number;
    }>;
}
export declare function initDCABot(): DCABot;
export declare function getDCABot(): DCABot | null;
//# sourceMappingURL=dca-bot.d.ts.map