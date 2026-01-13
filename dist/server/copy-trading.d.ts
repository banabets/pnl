export declare const FollowedWallet: any;
export declare const CopyTrade: any;
export declare const WalletStats: any;
export declare class CopyTradingService {
    private _connection;
    private _activeListeners;
    constructor(rpcUrl: string);
    /**
     * Follow a wallet
     */
    followWallet(userId: string, walletAddress: string, settings?: Partial<{
        label: string;
        copyBuys: boolean;
        copySells: boolean;
        maxCopyAmountSol: number;
        copyPercentage: number;
    }>): Promise<any>;
    /**
     * Unfollow a wallet
     */
    unfollowWallet(userId: string, walletAddress: string): Promise<boolean>;
    /**
     * Get followed wallets for user
     */
    getFollowedWallets(userId: string): Promise<any[]>;
    /**
     * Update follow settings
     */
    updateFollowSettings(userId: string, walletAddress: string, settings: Partial<{
        enabled: boolean;
        copyBuys: boolean;
        copySells: boolean;
        maxCopyAmountSol: number;
        copyPercentage: number;
        minTradeAmountSol: number;
    }>): Promise<any>;
    /**
     * Get copy trade history for user
     */
    getCopyHistory(userId: string, limit?: number): Promise<any[]>;
    /**
     * Get wallet leaderboard (top performers)
     */
    getLeaderboard(limit?: number, sortBy?: string): Promise<any[]>;
    /**
     * Get user's copy trading stats
     */
    getUserStats(userId: string): Promise<{
        followedWallets: number;
        totalCopiedTrades: number;
        successRate: number;
        totalPnl: number;
    }>;
    /**
     * Process incoming trade from followed wallet
     */
    processTrade(walletAddress: string, tokenMint: string, action: 'buy' | 'sell', amountSol: number, signature: string): Promise<void>;
    /**
     * Analyze a wallet's performance
     */
    analyzeWallet(_walletAddress: string): Promise<{
        totalTrades: number;
        winRate: number;
        avgProfit: number;
        topTokens: {
            mint: string;
            pnl: number;
        }[];
    }>;
}
export declare function initCopyTrading(rpcUrl: string): CopyTradingService;
export declare function getCopyTrading(): CopyTradingService | null;
//# sourceMappingURL=copy-trading.d.ts.map