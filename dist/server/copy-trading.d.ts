import mongoose from 'mongoose';
export declare const FollowedWallet: mongoose.Model<{
    createdAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    walletAddress: string;
    enabled: boolean;
    copyBuys: boolean;
    copySells: boolean;
    maxCopyAmountSol: number;
    copyPercentage: number;
    minTradeAmountSol: number;
    skipTokensBelow: number;
    useAudit: boolean;
    totalCopied: number;
    successfulTrades: number;
    failedTrades: number;
    totalPnl: number;
    label?: string;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    createdAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    walletAddress: string;
    enabled: boolean;
    copyBuys: boolean;
    copySells: boolean;
    maxCopyAmountSol: number;
    copyPercentage: number;
    minTradeAmountSol: number;
    skipTokensBelow: number;
    useAudit: boolean;
    totalCopied: number;
    successfulTrades: number;
    failedTrades: number;
    totalPnl: number;
    label?: string;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    createdAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    walletAddress: string;
    enabled: boolean;
    copyBuys: boolean;
    copySells: boolean;
    maxCopyAmountSol: number;
    copyPercentage: number;
    minTradeAmountSol: number;
    skipTokensBelow: number;
    useAudit: boolean;
    totalCopied: number;
    successfulTrades: number;
    failedTrades: number;
    totalPnl: number;
    label?: string;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    createdAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    walletAddress: string;
    enabled: boolean;
    copyBuys: boolean;
    copySells: boolean;
    maxCopyAmountSol: number;
    copyPercentage: number;
    minTradeAmountSol: number;
    skipTokensBelow: number;
    useAudit: boolean;
    totalCopied: number;
    successfulTrades: number;
    failedTrades: number;
    totalPnl: number;
    label?: string;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    createdAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    walletAddress: string;
    enabled: boolean;
    copyBuys: boolean;
    copySells: boolean;
    maxCopyAmountSol: number;
    copyPercentage: number;
    minTradeAmountSol: number;
    skipTokensBelow: number;
    useAudit: boolean;
    totalCopied: number;
    successfulTrades: number;
    failedTrades: number;
    totalPnl: number;
    label?: string;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    createdAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    walletAddress: string;
    enabled: boolean;
    copyBuys: boolean;
    copySells: boolean;
    maxCopyAmountSol: number;
    copyPercentage: number;
    minTradeAmountSol: number;
    skipTokensBelow: number;
    useAudit: boolean;
    totalCopied: number;
    successfulTrades: number;
    failedTrades: number;
    totalPnl: number;
    label?: string;
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const CopyTrade: mongoose.Model<{
    timestamp: NativeDate;
    status: "pending" | "failed" | "success" | "skipped";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    action: "buy" | "sell";
    followedWallet: string;
    originalAmountSol: number;
    copiedAmountSol: number;
    tokensTraded: number;
    price?: number;
    tokenName?: string;
    error?: string;
    originalSignature?: string;
    ourSignature?: string;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    timestamp: NativeDate;
    status: "pending" | "failed" | "success" | "skipped";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    action: "buy" | "sell";
    followedWallet: string;
    originalAmountSol: number;
    copiedAmountSol: number;
    tokensTraded: number;
    price?: number;
    tokenName?: string;
    error?: string;
    originalSignature?: string;
    ourSignature?: string;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    timestamp: NativeDate;
    status: "pending" | "failed" | "success" | "skipped";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    action: "buy" | "sell";
    followedWallet: string;
    originalAmountSol: number;
    copiedAmountSol: number;
    tokensTraded: number;
    price?: number;
    tokenName?: string;
    error?: string;
    originalSignature?: string;
    ourSignature?: string;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    timestamp: NativeDate;
    status: "pending" | "failed" | "success" | "skipped";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    action: "buy" | "sell";
    followedWallet: string;
    originalAmountSol: number;
    copiedAmountSol: number;
    tokensTraded: number;
    price?: number;
    tokenName?: string;
    error?: string;
    originalSignature?: string;
    ourSignature?: string;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    timestamp: NativeDate;
    status: "pending" | "failed" | "success" | "skipped";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    action: "buy" | "sell";
    followedWallet: string;
    originalAmountSol: number;
    copiedAmountSol: number;
    tokensTraded: number;
    price?: number;
    tokenName?: string;
    error?: string;
    originalSignature?: string;
    ourSignature?: string;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    timestamp: NativeDate;
    status: "pending" | "failed" | "success" | "skipped";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    action: "buy" | "sell";
    followedWallet: string;
    originalAmountSol: number;
    copiedAmountSol: number;
    tokensTraded: number;
    price?: number;
    tokenName?: string;
    error?: string;
    originalSignature?: string;
    ourSignature?: string;
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const WalletStats: mongoose.Model<{
    updatedAt: NativeDate;
    totalTrades: number;
    winRate: number;
    walletAddress: string;
    totalPnl: number;
    avgTradeSize: number;
    trades24h: number;
    pnl24h: number;
    pnl7d: number;
    followerCount: number;
    lastActive?: NativeDate;
    label?: string;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    updatedAt: NativeDate;
    totalTrades: number;
    winRate: number;
    walletAddress: string;
    totalPnl: number;
    avgTradeSize: number;
    trades24h: number;
    pnl24h: number;
    pnl7d: number;
    followerCount: number;
    lastActive?: NativeDate;
    label?: string;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    updatedAt: NativeDate;
    totalTrades: number;
    winRate: number;
    walletAddress: string;
    totalPnl: number;
    avgTradeSize: number;
    trades24h: number;
    pnl24h: number;
    pnl7d: number;
    followerCount: number;
    lastActive?: NativeDate;
    label?: string;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    updatedAt: NativeDate;
    totalTrades: number;
    winRate: number;
    walletAddress: string;
    totalPnl: number;
    avgTradeSize: number;
    trades24h: number;
    pnl24h: number;
    pnl7d: number;
    followerCount: number;
    lastActive?: NativeDate;
    label?: string;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    updatedAt: NativeDate;
    totalTrades: number;
    winRate: number;
    walletAddress: string;
    totalPnl: number;
    avgTradeSize: number;
    trades24h: number;
    pnl24h: number;
    pnl7d: number;
    followerCount: number;
    lastActive?: NativeDate;
    label?: string;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    updatedAt: NativeDate;
    totalTrades: number;
    winRate: number;
    walletAddress: string;
    totalPnl: number;
    avgTradeSize: number;
    trades24h: number;
    pnl24h: number;
    pnl7d: number;
    followerCount: number;
    lastActive?: NativeDate;
    label?: string;
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare class CopyTradingService {
    private connection;
    private activeListeners;
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
    analyzeWallet(walletAddress: string): Promise<{
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