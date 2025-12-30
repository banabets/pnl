"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopyTradingService = exports.WalletStats = exports.CopyTrade = exports.FollowedWallet = void 0;
exports.initCopyTrading = initCopyTrading;
exports.getCopyTrading = getCopyTrading;
// Copy Trading - Follow and copy trades from successful wallets
const web3_js_1 = require("@solana/web3.js");
const mongoose_1 = __importDefault(require("mongoose"));
// Wallet to follow
const FollowedWalletSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    walletAddress: { type: String, required: true },
    label: String,
    enabled: { type: Boolean, default: true },
    // Copy settings
    copyBuys: { type: Boolean, default: true },
    copySells: { type: Boolean, default: true },
    maxCopyAmountSol: { type: Number, default: 1 }, // Max SOL per copy trade
    copyPercentage: { type: Number, default: 100 }, // % of their trade to copy (100 = same amount)
    minTradeAmountSol: { type: Number, default: 0.1 }, // Min trade size to copy
    // Safety
    skipTokensBelow: { type: Number, default: 1000 }, // Skip tokens with liquidity below this
    useAudit: { type: Boolean, default: true }, // Run audit before copying
    // Stats
    totalCopied: { type: Number, default: 0 },
    successfulTrades: { type: Number, default: 0 },
    failedTrades: { type: Number, default: 0 },
    totalPnl: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });
FollowedWalletSchema.index({ userId: 1, walletAddress: 1 }, { unique: true });
exports.FollowedWallet = mongoose_1.default.model('FollowedWallet', FollowedWalletSchema);
// Copy trade history
const CopyTradeSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    followedWallet: { type: String, required: true },
    originalSignature: String,
    tokenMint: { type: String, required: true },
    tokenName: String,
    action: { type: String, enum: ['buy', 'sell'], required: true },
    originalAmountSol: { type: Number, required: true },
    copiedAmountSol: { type: Number, required: true },
    tokensTraded: { type: Number, required: true },
    price: { type: Number },
    ourSignature: String,
    status: { type: String, enum: ['pending', 'success', 'failed', 'skipped'], default: 'pending' },
    error: String,
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });
CopyTradeSchema.index({ userId: 1, timestamp: -1 });
exports.CopyTrade = mongoose_1.default.model('CopyTrade', CopyTradeSchema);
// Wallet performance stats (for leaderboard)
const WalletStatsSchema = new mongoose_1.default.Schema({
    walletAddress: { type: String, required: true, unique: true },
    label: String,
    // Performance
    totalTrades: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    totalPnl: { type: Number, default: 0 },
    avgTradeSize: { type: Number, default: 0 },
    // Recent activity
    trades24h: { type: Number, default: 0 },
    pnl24h: { type: Number, default: 0 },
    pnl7d: { type: Number, default: 0 },
    // Followers
    followerCount: { type: Number, default: 0 },
    lastActive: { type: Date },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });
exports.WalletStats = mongoose_1.default.model('WalletStats', WalletStatsSchema);
class CopyTradingService {
    constructor(rpcUrl) {
        this.activeListeners = new Map();
        this.connection = new web3_js_1.Connection(rpcUrl, 'confirmed');
    }
    /**
     * Follow a wallet
     */
    async followWallet(userId, walletAddress, settings) {
        // Validate address
        try {
            new web3_js_1.PublicKey(walletAddress);
        }
        catch {
            throw new Error('Invalid wallet address');
        }
        const followed = await exports.FollowedWallet.findOneAndUpdate({ userId, walletAddress }, { $set: { ...settings, enabled: true } }, { upsert: true, new: true });
        // Update follower count
        await exports.WalletStats.findOneAndUpdate({ walletAddress }, { $inc: { followerCount: 1 } }, { upsert: true });
        return followed;
    }
    /**
     * Unfollow a wallet
     */
    async unfollowWallet(userId, walletAddress) {
        const result = await exports.FollowedWallet.deleteOne({ userId, walletAddress });
        if (result.deletedCount > 0) {
            await exports.WalletStats.findOneAndUpdate({ walletAddress }, { $inc: { followerCount: -1 } });
            return true;
        }
        return false;
    }
    /**
     * Get followed wallets for user
     */
    async getFollowedWallets(userId) {
        return exports.FollowedWallet.find({ userId }).lean();
    }
    /**
     * Update follow settings
     */
    async updateFollowSettings(userId, walletAddress, settings) {
        return exports.FollowedWallet.findOneAndUpdate({ userId, walletAddress }, { $set: settings }, { new: true }).lean();
    }
    /**
     * Get copy trade history for user
     */
    async getCopyHistory(userId, limit = 50) {
        return exports.CopyTrade.find({ userId })
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();
    }
    /**
     * Get wallet leaderboard (top performers)
     */
    async getLeaderboard(limit = 20, sortBy = 'pnl7d') {
        const sortField = {};
        sortField[sortBy] = -1;
        return exports.WalletStats.find({ totalTrades: { $gt: 10 } })
            .sort(sortField)
            .limit(limit)
            .lean();
    }
    /**
     * Get user's copy trading stats
     */
    async getUserStats(userId) {
        const followed = await exports.FollowedWallet.find({ userId }).lean();
        const stats = {
            followedWallets: followed.length,
            totalCopiedTrades: followed.reduce((sum, w) => sum + (w.totalCopied || 0), 0),
            successRate: 0,
            totalPnl: followed.reduce((sum, w) => sum + (w.totalPnl || 0), 0)
        };
        const totalSuccess = followed.reduce((sum, w) => sum + (w.successfulTrades || 0), 0);
        const totalFailed = followed.reduce((sum, w) => sum + (w.failedTrades || 0), 0);
        if (totalSuccess + totalFailed > 0) {
            stats.successRate = (totalSuccess / (totalSuccess + totalFailed)) * 100;
        }
        return stats;
    }
    /**
     * Process incoming trade from followed wallet
     */
    async processTrade(walletAddress, tokenMint, action, amountSol, signature) {
        // Find all users following this wallet
        const followers = await exports.FollowedWallet.find({
            walletAddress,
            enabled: true,
            [action === 'buy' ? 'copyBuys' : 'copySells']: true
        }).lean();
        for (const follow of followers) {
            // Skip if trade too small
            if (amountSol < (follow.minTradeAmountSol || 0.1)) {
                await exports.CopyTrade.create({
                    userId: follow.userId,
                    followedWallet: walletAddress,
                    originalSignature: signature,
                    tokenMint,
                    action,
                    originalAmountSol: amountSol,
                    copiedAmountSol: 0,
                    tokensTraded: 0,
                    status: 'skipped',
                    error: 'Trade below minimum'
                });
                continue;
            }
            // Calculate copy amount
            let copyAmount = amountSol * ((follow.copyPercentage || 100) / 100);
            copyAmount = Math.min(copyAmount, follow.maxCopyAmountSol || 1);
            // Record pending trade (actual execution handled via API with user's keypair)
            await exports.CopyTrade.create({
                userId: follow.userId,
                followedWallet: walletAddress,
                originalSignature: signature,
                tokenMint,
                action,
                originalAmountSol: amountSol,
                copiedAmountSol: copyAmount,
                tokensTraded: 0,
                status: 'pending'
            });
        }
    }
    /**
     * Analyze a wallet's performance
     */
    async analyzeWallet(walletAddress) {
        // This would typically query on-chain data
        // For now, return placeholder data
        return {
            totalTrades: 0,
            winRate: 0,
            avgProfit: 0,
            topTokens: []
        };
    }
}
exports.CopyTradingService = CopyTradingService;
// Singleton
let copyTradingInstance = null;
function initCopyTrading(rpcUrl) {
    copyTradingInstance = new CopyTradingService(rpcUrl);
    return copyTradingInstance;
}
function getCopyTrading() {
    return copyTradingInstance;
}
//# sourceMappingURL=copy-trading.js.map