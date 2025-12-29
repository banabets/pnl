"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopLossManager = void 0;
const portfolio_tracker_1 = require("./portfolio-tracker");
class StopLossManager {
    constructor() {
        this.stopLossOrders = new Map();
        this.trailingStopOrders = new Map();
        this.priceMonitors = new Map();
        // Start monitoring prices
        this.startPriceMonitoring();
    }
    // Create a stop loss order
    createStopLoss(positionId, tokenMint, tokenName, tokenSymbol, walletIndex, walletAddress, triggerPrice, amount = 100) {
        const order = {
            id: `sl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            positionId,
            tokenMint,
            tokenName,
            tokenSymbol,
            walletIndex,
            walletAddress,
            orderType: 'stop-loss',
            triggerPrice,
            amount: Math.min(100, Math.max(0, amount)),
            status: 'active',
            createdAt: Date.now() / 1000,
        };
        this.stopLossOrders.set(order.id, order);
        this.startMonitoringToken(tokenMint);
        return order;
    }
    // Create a take profit order
    createTakeProfit(positionId, tokenMint, tokenName, tokenSymbol, walletIndex, walletAddress, triggerPrice, amount = 100) {
        const order = {
            id: `tp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            positionId,
            tokenMint,
            tokenName,
            tokenSymbol,
            walletIndex,
            walletAddress,
            orderType: 'take-profit',
            triggerPrice,
            amount: Math.min(100, Math.max(0, amount)),
            status: 'active',
            createdAt: Date.now() / 1000,
        };
        this.stopLossOrders.set(order.id, order);
        this.startMonitoringToken(tokenMint);
        return order;
    }
    // Create a trailing stop order
    createTrailingStop(positionId, tokenMint, tokenName, tokenSymbol, walletIndex, walletAddress, trailingPercent, currentPrice) {
        const order = {
            id: `ts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            positionId,
            tokenMint,
            tokenName,
            tokenSymbol,
            walletIndex,
            walletAddress,
            trailingPercent: Math.min(50, Math.max(1, trailingPercent)),
            currentStopPrice: currentPrice * (1 - trailingPercent / 100),
            highestPrice: currentPrice,
            status: 'active',
            createdAt: Date.now() / 1000,
        };
        this.trailingStopOrders.set(order.id, order);
        this.startMonitoringToken(tokenMint);
        return order;
    }
    // Cancel an order
    cancelOrder(orderId) {
        const stopLoss = this.stopLossOrders.get(orderId);
        if (stopLoss && stopLoss.status === 'active') {
            stopLoss.status = 'cancelled';
            return true;
        }
        const trailingStop = this.trailingStopOrders.get(orderId);
        if (trailingStop && trailingStop.status === 'active') {
            trailingStop.status = 'cancelled';
            return true;
        }
        return false;
    }
    // Get all active orders
    getActiveOrders() {
        return {
            stopLoss: Array.from(this.stopLossOrders.values())
                .filter(o => o.status === 'active'),
            trailingStop: Array.from(this.trailingStopOrders.values())
                .filter(o => o.status === 'active'),
        };
    }
    // Get orders by token
    getOrdersByToken(tokenMint) {
        return {
            stopLoss: Array.from(this.stopLossOrders.values())
                .filter(o => o.tokenMint === tokenMint && o.status === 'active'),
            trailingStop: Array.from(this.trailingStopOrders.values())
                .filter(o => o.tokenMint === tokenMint && o.status === 'active'),
        };
    }
    // Start monitoring token prices
    startMonitoringToken(tokenMint) {
        if (this.priceMonitors.has(tokenMint)) {
            return; // Already monitoring
        }
        const interval = setInterval(async () => {
            await this.checkOrders(tokenMint);
        }, 5000); // Check every 5 seconds
        this.priceMonitors.set(tokenMint, interval);
    }
    // Start general price monitoring
    startPriceMonitoring() {
        setInterval(async () => {
            const activeOrders = this.getActiveOrders();
            const tokenMints = new Set();
            activeOrders.stopLoss.forEach(o => tokenMints.add(o.tokenMint));
            activeOrders.trailingStop.forEach(o => tokenMints.add(o.tokenMint));
            for (const tokenMint of tokenMints) {
                await this.checkOrders(tokenMint);
            }
        }, 10000); // Check every 10 seconds
    }
    // Check and execute orders for a token
    async checkOrders(tokenMint) {
        try {
            // Fetch current price (this would typically come from an API or WebSocket)
            // For now, we'll use the portfolio tracker's current price
            const positions = portfolio_tracker_1.portfolioTracker.getPositionsByToken(tokenMint);
            if (positions.length === 0)
                return;
            const currentPrice = positions[0].currentPrice;
            // Check stop loss orders
            const stopLossOrders = Array.from(this.stopLossOrders.values())
                .filter(o => o.tokenMint === tokenMint && o.status === 'active');
            for (const order of stopLossOrders) {
                if (order.orderType === 'stop-loss' && currentPrice <= order.triggerPrice) {
                    await this.executeStopLoss(order, currentPrice);
                }
                else if (order.orderType === 'take-profit' && currentPrice >= order.triggerPrice) {
                    await this.executeTakeProfit(order, currentPrice);
                }
            }
            // Check trailing stop orders
            const trailingStopOrders = Array.from(this.trailingStopOrders.values())
                .filter(o => o.tokenMint === tokenMint && o.status === 'active');
            for (const order of trailingStopOrders) {
                // Update highest price
                if (currentPrice > order.highestPrice) {
                    order.highestPrice = currentPrice;
                    order.currentStopPrice = currentPrice * (1 - order.trailingPercent / 100);
                }
                // Check if stop price is hit
                if (currentPrice <= order.currentStopPrice) {
                    await this.executeTrailingStop(order, currentPrice);
                }
            }
        }
        catch (error) {
            console.error(`Error checking orders for ${tokenMint}:`, error);
        }
    }
    // Execute stop loss order
    async executeStopLoss(order, currentPrice) {
        // This would execute the actual sell trade
        // For now, we'll just mark it as triggered
        order.status = 'triggered';
        order.triggeredAt = Date.now() / 1000;
        console.log(`🛑 Stop Loss triggered for ${order.tokenName} at ${currentPrice}`);
        // TODO: Execute actual sell trade via trading bot
        // This would require integration with the trading system
    }
    // Execute take profit order
    async executeTakeProfit(order, currentPrice) {
        order.status = 'triggered';
        order.triggeredAt = Date.now() / 1000;
        console.log(`🎯 Take Profit triggered for ${order.tokenName} at ${currentPrice}`);
        // TODO: Execute actual sell trade via trading bot
    }
    // Execute trailing stop order
    async executeTrailingStop(order, currentPrice) {
        order.status = 'triggered';
        order.triggeredAt = Date.now() / 1000;
        console.log(`📉 Trailing Stop triggered for ${order.tokenName} at ${currentPrice}`);
        // TODO: Execute actual sell trade via trading bot
    }
}
exports.stopLossManager = new StopLossManager();
//# sourceMappingURL=stop-loss-manager.js.map