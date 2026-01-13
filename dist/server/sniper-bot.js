"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SniperBot = exports.SnipeHistory = void 0;
exports.initSniperBot = initSniperBot;
exports.getSniperBot = getSniperBot;
// Sniper Bot - Auto-buy new tokens based on criteria
const web3_js_1 = require("@solana/web3.js");
const jupiter_service_1 = require("./jupiter-service");
const token_audit_1 = require("./token-audit");
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("./logger");
// Schema for MongoDB
const SniperConfigSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    enabled: { type: Boolean, default: false },
    minLiquidity: { type: Number, default: 5000 },
    maxMarketCap: { type: Number, default: 100000 },
    minHolders: { type: Number, default: 50 },
    maxTopHolderPercent: { type: Number, default: 30 },
    requireMintDisabled: { type: Boolean, default: true },
    requireFreezeDisabled: { type: Boolean, default: true },
    skipHoneypots: { type: Boolean, default: true },
    buyAmountSol: { type: Number, default: 0.1 },
    maxSlippage: { type: Number, default: 500 },
    autoSellPercent: { type: Number },
    stopLossPercent: { type: Number }
}, { timestamps: true });
const SniperConfigModel = mongoose_1.default.model('SniperConfig', SniperConfigSchema);
// Snipe history
const SnipeHistorySchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenMint: { type: String, required: true },
    tokenName: String,
    tokenSymbol: String,
    buyPrice: { type: Number, required: true },
    buyAmountSol: { type: Number, required: true },
    tokensReceived: { type: Number, required: true },
    signature: String,
    status: { type: String, enum: ['pending', 'bought', 'sold', 'failed'], default: 'pending' },
    sellPrice: Number,
    pnl: Number,
    pnlPercent: Number,
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });
exports.SnipeHistory = mongoose_1.default.model('SnipeHistory', SnipeHistorySchema);
class SniperBot {
    constructor(rpcUrl) {
        this.activeSnipes = new Map();
        this.isRunning = false;
        this.rpcUrl = rpcUrl;
        this.connection = new web3_js_1.Connection(rpcUrl, 'confirmed');
    }
    /**
     * Get user's sniper config
     */
    async getConfig(userId) {
        const config = await SniperConfigModel.findOne({ userId }).lean();
        return config;
    }
    /**
     * Update sniper config
     */
    async updateConfig(userId, config) {
        const updated = await SniperConfigModel.findOneAndUpdate({ userId }, { $set: config }, { upsert: true, new: true }).lean();
        const typedConfig = updated;
        // Update active snipes if enabled changed
        if (config.enabled !== undefined) {
            if (config.enabled) {
                this.activeSnipes.set(userId, typedConfig);
            }
            else {
                this.activeSnipes.delete(userId);
            }
        }
        return typedConfig;
    }
    /**
     * Enable sniper for user
     */
    async enable(userId) {
        const config = await this.updateConfig(userId, { enabled: true });
        this.activeSnipes.set(userId, config);
    }
    /**
     * Disable sniper for user
     */
    async disable(userId) {
        await this.updateConfig(userId, { enabled: false });
        this.activeSnipes.delete(userId);
    }
    /**
     * Check if token passes sniper filters
     */
    async checkToken(tokenMint, config) {
        const auditService = (0, token_audit_1.getTokenAuditService)();
        if (!auditService)
            return { pass: false, reason: 'Audit service unavailable' };
        try {
            const audit = await auditService.auditToken(tokenMint);
            // Safety checks
            if (config.requireMintDisabled && !audit.checks.mintAuthorityDisabled) {
                return { pass: false, reason: 'Mint authority enabled' };
            }
            if (config.requireFreezeDisabled && !audit.checks.freezeAuthorityDisabled) {
                return { pass: false, reason: 'Freeze authority enabled' };
            }
            if (config.skipHoneypots) {
                const honeypot = await auditService.isHoneypot(tokenMint);
                if (honeypot.isHoneypot) {
                    return { pass: false, reason: `Honeypot: ${honeypot.reason}` };
                }
            }
            // Stats checks
            if (audit.stats.liquidity < config.minLiquidity) {
                return { pass: false, reason: `Low liquidity: $${audit.stats.liquidity}` };
            }
            if (audit.stats.marketCap > config.maxMarketCap) {
                return { pass: false, reason: `High market cap: $${audit.stats.marketCap}` };
            }
            if (audit.stats.holders < config.minHolders) {
                return { pass: false, reason: `Low holders: ${audit.stats.holders}` };
            }
            if (audit.checks.topHoldersConcentration > config.maxTopHolderPercent) {
                return { pass: false, reason: `High concentration: ${audit.checks.topHoldersConcentration}%` };
            }
            return { pass: true };
        }
        catch (error) {
            return { pass: false, reason: error.message };
        }
    }
    /**
     * Execute snipe (buy token)
     */
    async executeSnipe(userId, tokenMint, keypair, config) {
        const jupiterService = (0, jupiter_service_1.getJupiterService)();
        if (!jupiterService) {
            return { success: false, error: 'Jupiter service unavailable' };
        }
        try {
            // Execute buy
            const result = await jupiterService.buyToken(tokenMint, config.buyAmountSol, keypair, config.maxSlippage);
            if (result.success) {
                // Get token price for history
                const price = await jupiterService.getTokenPrice(tokenMint);
                // Save to history
                await exports.SnipeHistory.create({
                    userId,
                    tokenMint,
                    buyPrice: price || 0,
                    buyAmountSol: config.buyAmountSol,
                    tokensReceived: result.outputAmount,
                    signature: result.signature,
                    status: 'bought'
                });
                return {
                    success: true,
                    signature: result.signature,
                    tokensReceived: result.outputAmount
                };
            }
            return { success: false, error: result.error };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    /**
     * Process new token (called by WebSocket listener)
     */
    async processNewToken(tokenMint, tokenInfo) {
        // Check all active sniper configs
        for (const [userId, config] of this.activeSnipes.entries()) {
            if (!config.enabled)
                continue;
            try {
                const check = await this.checkToken(tokenMint, config);
                if (check.pass) {
                    logger_1.log.info(`🎯 Token ${tokenMint} passed filters for user ${userId}`);
                    // Note: Actual execution requires user's keypair, handled via API
                }
            }
            catch (error) {
                logger_1.log.error(`Error checking token for user ${userId}:`, error);
            }
        }
    }
    /**
     * Get snipe history for user
     */
    async getHistory(userId, limit = 50) {
        return exports.SnipeHistory.find({ userId })
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();
    }
    /**
     * Get active snipes count
     */
    getActiveCount() {
        return this.activeSnipes.size;
    }
}
exports.SniperBot = SniperBot;
// Singleton
let sniperInstance = null;
function initSniperBot(rpcUrl) {
    sniperInstance = new SniperBot(rpcUrl);
    return sniperInstance;
}
function getSniperBot() {
    return sniperInstance;
}
//# sourceMappingURL=sniper-bot.js.map