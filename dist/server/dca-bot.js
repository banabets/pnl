"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DCABot = exports.DCAExecution = exports.DCAOrder = void 0;
exports.initDCABot = initDCABot;
exports.getDCABot = getDCABot;
const jupiter_service_1 = require("./jupiter-service");
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("./logger");
// Schema
const DCAOrderSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenMint: { type: String, required: true },
    tokenName: String,
    totalAmountSol: { type: Number, required: true },
    amountPerBuy: { type: Number, required: true },
    intervalMinutes: { type: Number, required: true, default: 60 },
    remainingAmount: { type: Number, required: true },
    executedBuys: { type: Number, default: 0 },
    totalTokensBought: { type: Number, default: 0 },
    averagePrice: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'paused', 'completed', 'cancelled'], default: 'active' },
    nextBuyAt: { type: Date, required: true },
    walletIndex: { type: Number }, // Optional: specific wallet to use
    maxSlippage: { type: Number, default: 200 }
}, { timestamps: true });
DCAOrderSchema.index({ status: 1, nextBuyAt: 1 });
exports.DCAOrder = mongoose_1.default.model('DCAOrder', DCAOrderSchema);
// DCA execution history
const DCAExecutionSchema = new mongoose_1.default.Schema({
    orderId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'DCAOrder', required: true, index: true },
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    tokenMint: { type: String, required: true },
    amountSol: { type: Number, required: true },
    tokensReceived: { type: Number, required: true },
    pricePerToken: { type: Number, required: true },
    signature: String,
    status: { type: String, enum: ['success', 'failed'], required: true },
    error: String,
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });
exports.DCAExecution = mongoose_1.default.model('DCAExecution', DCAExecutionSchema);
class DCABot {
    constructor() {
        this.intervalId = null;
        this.isRunning = false;
        this.getKeypairForUser = null;
    }
    /**
     * Set keypair getter function (injected from wallet service)
     */
    setKeypairGetter(getter) {
        this.getKeypairForUser = getter;
    }
    /**
     * Create new DCA order
     */
    async createOrder(userId, tokenMint, totalAmountSol, amountPerBuy, intervalMinutes, tokenName, walletIndex) {
        const order = await exports.DCAOrder.create({
            userId,
            tokenMint,
            tokenName,
            totalAmountSol,
            amountPerBuy,
            intervalMinutes,
            remainingAmount: totalAmountSol,
            nextBuyAt: new Date(), // Start immediately
            walletIndex,
            status: 'active'
        });
        return order;
    }
    /**
     * Pause DCA order
     */
    async pauseOrder(orderId, userId) {
        const result = await exports.DCAOrder.updateOne({ _id: orderId, userId, status: 'active' }, { status: 'paused' });
        return result.modifiedCount > 0;
    }
    /**
     * Resume DCA order
     */
    async resumeOrder(orderId, userId) {
        const result = await exports.DCAOrder.updateOne({ _id: orderId, userId, status: 'paused' }, { status: 'active', nextBuyAt: new Date() });
        return result.modifiedCount > 0;
    }
    /**
     * Cancel DCA order
     */
    async cancelOrder(orderId, userId) {
        const result = await exports.DCAOrder.updateOne({ _id: orderId, userId, status: { $in: ['active', 'paused'] } }, { status: 'cancelled' });
        return result.modifiedCount > 0;
    }
    /**
     * Get user's DCA orders
     */
    async getUserOrders(userId, status) {
        const query = { userId };
        if (status)
            query.status = status;
        return exports.DCAOrder.find(query).sort({ createdAt: -1 }).lean();
    }
    /**
     * Get order execution history
     */
    async getOrderHistory(orderId) {
        return exports.DCAExecution.find({ orderId }).sort({ timestamp: -1 }).lean();
    }
    /**
     * Execute a single DCA buy
     */
    async executeBuy(order, keypair) {
        const jupiterService = (0, jupiter_service_1.getJupiterService)();
        if (!jupiterService) {
            return { success: false, error: 'Jupiter service unavailable' };
        }
        try {
            const buyAmount = Math.min(order.amountPerBuy, order.remainingAmount);
            const result = await jupiterService.buyToken(order.tokenMint, buyAmount, keypair, order.maxSlippage || 200);
            if (result.success) {
                // Update order
                const newTotalTokens = (order.totalTokensBought || 0) + result.outputAmount;
                const newExecutedBuys = (order.executedBuys || 0) + 1;
                const newRemaining = order.remainingAmount - buyAmount;
                const totalSpent = order.totalAmountSol - newRemaining;
                const newAveragePrice = totalSpent / newTotalTokens;
                const isCompleted = newRemaining < 0.001; // Less than 0.001 SOL remaining
                await exports.DCAOrder.updateOne({ _id: order._id }, {
                    executedBuys: newExecutedBuys,
                    totalTokensBought: newTotalTokens,
                    remainingAmount: newRemaining,
                    averagePrice: newAveragePrice,
                    status: isCompleted ? 'completed' : 'active',
                    nextBuyAt: isCompleted ? null : new Date(Date.now() + order.intervalMinutes * 60 * 1000)
                });
                // Record execution
                await exports.DCAExecution.create({
                    orderId: order._id,
                    userId: order.userId,
                    tokenMint: order.tokenMint,
                    amountSol: buyAmount,
                    tokensReceived: result.outputAmount,
                    pricePerToken: buyAmount / result.outputAmount,
                    signature: result.signature,
                    status: 'success'
                });
                return { success: true, tokensReceived: result.outputAmount };
            }
            // Record failed execution
            await exports.DCAExecution.create({
                orderId: order._id,
                userId: order.userId,
                tokenMint: order.tokenMint,
                amountSol: order.amountPerBuy,
                tokensReceived: 0,
                pricePerToken: 0,
                status: 'failed',
                error: result.error
            });
            return { success: false, error: result.error };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    /**
     * Process pending DCA orders (called by scheduler)
     */
    async processPendingOrders() {
        if (!this.getKeypairForUser) {
            logger_1.log.warn('DCA Bot: Keypair getter not set');
            return;
        }
        const now = new Date();
        const pendingOrders = await exports.DCAOrder.find({
            status: 'active',
            nextBuyAt: { $lte: now }
        }).lean();
        for (const order of pendingOrders) {
            try {
                const keypair = await this.getKeypairForUser(order.userId.toString(), order.walletIndex ?? undefined);
                if (!keypair) {
                    logger_1.log.warn(`DCA: No keypair for user ${order.userId}`);
                    continue;
                }
                const result = await this.executeBuy(order, keypair);
                logger_1.log.info(`DCA executed for order ${order._id}: ${result.success ? 'success' : result.error}`);
            }
            catch (error) {
                logger_1.log.error(`DCA execution error for order ${order._id}:`, error);
            }
        }
    }
    /**
     * Start the DCA scheduler
     */
    start(intervalMs = 60000) {
        if (this.isRunning)
            return;
        this.isRunning = true;
        this.intervalId = setInterval(() => {
            this.processPendingOrders().catch((error) => {
                logger_1.log.error('Error processing pending DCA orders', { error: error instanceof Error ? error.message : String(error) });
            });
        }, intervalMs);
        logger_1.log.info('✅ DCA Bot started');
    }
    /**
     * Stop the DCA scheduler
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        logger_1.log.info('⏹️ DCA Bot stopped');
    }
    /**
     * Get DCA stats for user
     */
    async getUserStats(userId) {
        const stats = await exports.DCAOrder.aggregate([
            { $match: { userId: new mongoose_1.default.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    invested: { $sum: { $subtract: ['$totalAmountSol', '$remainingAmount'] } },
                    tokens: { $sum: '$totalTokensBought' }
                }
            }
        ]);
        const result = {
            activeOrders: 0,
            totalInvested: 0,
            totalTokensBought: 0,
            completedOrders: 0
        };
        for (const s of stats) {
            if (s._id === 'active')
                result.activeOrders = s.count;
            if (s._id === 'completed')
                result.completedOrders = s.count;
            result.totalInvested += s.invested;
            result.totalTokensBought += s.tokens;
        }
        return result;
    }
}
exports.DCABot = DCABot;
// Singleton
let dcaInstance = null;
function initDCABot() {
    dcaInstance = new DCABot();
    return dcaInstance;
}
function getDCABot() {
    return dcaInstance;
}
//# sourceMappingURL=dca-bot.js.map