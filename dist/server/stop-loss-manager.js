"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopLossManager = void 0;
const portfolio_tracker_1 = require("./portfolio-tracker");
const jupiter_service_1 = require("./jupiter-service");
const wallet_service_1 = require("./wallet-service");
const database_1 = require("./database");
const logger_1 = require("./logger");
class StopLossManager {
    constructor() {
        this.stopLossOrders = new Map();
        this.trailingStopOrders = new Map();
        this.priceMonitors = new Map();
        // Start monitoring prices
        this.startPriceMonitoring();
    }
    // Create a stop loss order
    createStopLoss(userId, positionId, tokenMint, tokenName, tokenSymbol, walletIndex, walletAddress, triggerPrice, amount = 100) {
        const order = {
            id: `sl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId,
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
    createTakeProfit(userId, positionId, tokenMint, tokenName, tokenSymbol, walletIndex, walletAddress, triggerPrice, amount = 100) {
        const order = {
            id: `tp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId,
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
    createTrailingStop(userId, positionId, tokenMint, tokenName, tokenSymbol, walletIndex, walletAddress, trailingPercent, currentPrice) {
        const order = {
            id: `ts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId,
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
            logger_1.log.error('Error checking stop-loss orders', { tokenMint, error: error.message });
        }
    }
    // Execute stop loss order
    async executeStopLoss(order, currentPrice) {
        order.status = 'triggered';
        order.triggeredAt = Date.now() / 1000;
        logger_1.log.info('Stop Loss triggered', {
            token: order.tokenName,
            symbol: order.tokenSymbol,
            currentPrice,
            triggerPrice: order.triggerPrice,
            amount: `${order.amount}%`,
            orderId: order.id
        });
        try {
            // Get Jupiter service
            const jupiterService = (0, jupiter_service_1.getJupiterService)();
            if (!jupiterService) {
                throw new Error('Jupiter service not available');
            }
            // Get wallet keypair (MongoDB required)
            if (!(0, database_1.isConnected)()) {
                throw new Error('MongoDB not connected - cannot access wallet');
            }
            const walletWithKey = await wallet_service_1.walletService.getWalletWithKey(order.userId, order.walletIndex);
            if (!walletWithKey) {
                throw new Error(`Wallet ${order.walletIndex} not found for user`);
            }
            // Get position to determine how many tokens to sell
            const position = portfolio_tracker_1.portfolioTracker.getPosition(order.positionId);
            if (!position) {
                throw new Error(`Position ${order.positionId} not found`);
            }
            // Calculate amount to sell (percentage of position)
            const tokensToSell = (position.tokenAmount * order.amount) / 100;
            logger_1.log.info('Executing sell', { tokensToSell, symbol: order.tokenSymbol });
            // Execute sell via Jupiter
            const result = await jupiterService.sellToken(order.tokenMint, tokensToSell, walletWithKey.keypair, 500 // 5% slippage for urgency
            );
            if (result.success && result.signature) {
                order.status = 'executed';
                order.executedSignature = result.signature;
                (0, logger_1.logTrade)('sell', {
                    tokenMint: order.tokenMint,
                    tokenName: order.tokenName,
                    tokensSold: tokensToSell,
                    solReceived: result.outputAmount,
                    price: currentPrice,
                    signature: result.signature
                });
                logger_1.log.info('Stop Loss executed successfully', {
                    signature: result.signature,
                    received: `${result.outputAmount} SOL`,
                    token: order.tokenName
                });
                // Update portfolio
                portfolio_tracker_1.portfolioTracker.updatePositionAfterSell(order.positionId, tokensToSell, result.outputAmount, currentPrice, result.signature);
            }
            else {
                throw new Error(result.error || 'Sell failed');
            }
        }
        catch (error) {
            order.status = 'failed';
            order.error = error.message;
            logger_1.log.error('Stop Loss execution failed', {
                error: error.message,
                token: order.tokenName,
                orderId: order.id
            });
        }
    }
    // Execute take profit order
    async executeTakeProfit(order, currentPrice) {
        order.status = 'triggered';
        order.triggeredAt = Date.now() / 1000;
        logger_1.log.info('Take Profit triggered', {
            token: order.tokenName,
            symbol: order.tokenSymbol,
            currentPrice,
            triggerPrice: order.triggerPrice,
            amount: `${order.amount}%`,
            orderId: order.id
        });
        try {
            // Get Jupiter service
            const jupiterService = (0, jupiter_service_1.getJupiterService)();
            if (!jupiterService) {
                throw new Error('Jupiter service not available');
            }
            // Get wallet keypair (MongoDB required)
            if (!(0, database_1.isConnected)()) {
                throw new Error('MongoDB not connected - cannot access wallet');
            }
            const walletWithKey = await wallet_service_1.walletService.getWalletWithKey(order.userId, order.walletIndex);
            if (!walletWithKey) {
                throw new Error(`Wallet ${order.walletIndex} not found for user`);
            }
            // Get position to determine how many tokens to sell
            const position = portfolio_tracker_1.portfolioTracker.getPosition(order.positionId);
            if (!position) {
                throw new Error(`Position ${order.positionId} not found`);
            }
            // Calculate amount to sell (percentage of position)
            const tokensToSell = (position.tokenAmount * order.amount) / 100;
            logger_1.log.info('Executing sell', { tokensToSell, symbol: order.tokenSymbol });
            // Execute sell via Jupiter
            const result = await jupiterService.sellToken(order.tokenMint, tokensToSell, walletWithKey.keypair, 100 // 1% slippage (less urgent than stop-loss)
            );
            if (result.success && result.signature) {
                order.status = 'executed';
                order.executedSignature = result.signature;
                (0, logger_1.logTrade)('sell', {
                    tokenMint: order.tokenMint,
                    tokenName: order.tokenName,
                    tokensSold: tokensToSell,
                    solReceived: result.outputAmount,
                    price: currentPrice,
                    signature: result.signature
                });
                logger_1.log.info('Take Profit executed successfully', {
                    signature: result.signature,
                    received: `${result.outputAmount} SOL`,
                    token: order.tokenName
                });
                // Update portfolio
                portfolio_tracker_1.portfolioTracker.updatePositionAfterSell(order.positionId, tokensToSell, result.outputAmount, currentPrice, result.signature);
            }
            else {
                throw new Error(result.error || 'Sell failed');
            }
        }
        catch (error) {
            order.status = 'failed';
            order.error = error.message;
            logger_1.log.error('Take Profit execution failed', {
                error: error.message,
                token: order.tokenName,
                orderId: order.id
            });
        }
    }
    // Execute trailing stop order
    async executeTrailingStop(order, currentPrice) {
        order.status = 'triggered';
        order.triggeredAt = Date.now() / 1000;
        logger_1.log.info('Trailing Stop triggered', {
            token: order.tokenName,
            symbol: order.tokenSymbol,
            currentPrice,
            highestPrice: order.highestPrice,
            stopPrice: order.currentStopPrice,
            orderId: order.id
        });
        try {
            // Get Jupiter service
            const jupiterService = (0, jupiter_service_1.getJupiterService)();
            if (!jupiterService) {
                throw new Error('Jupiter service not available');
            }
            // Get wallet keypair (MongoDB required)
            if (!(0, database_1.isConnected)()) {
                throw new Error('MongoDB not connected - cannot access wallet');
            }
            const walletWithKey = await wallet_service_1.walletService.getWalletWithKey(order.userId, order.walletIndex);
            if (!walletWithKey) {
                throw new Error(`Wallet ${order.walletIndex} not found for user`);
            }
            // Get position to determine how many tokens to sell
            const position = portfolio_tracker_1.portfolioTracker.getPosition(order.positionId);
            if (!position) {
                throw new Error(`Position ${order.positionId} not found`);
            }
            // Trailing stops sell 100% of position
            const tokensToSell = position.tokenAmount;
            logger_1.log.info('Executing Trailing Stop sell (100%)', { tokensToSell, symbol: order.tokenSymbol });
            // Execute sell via Jupiter
            const result = await jupiterService.sellToken(order.tokenMint, tokensToSell, walletWithKey.keypair, 500 // 5% slippage for urgency
            );
            if (result.success && result.signature) {
                order.status = 'executed';
                order.executedSignature = result.signature;
                (0, logger_1.logTrade)('sell', {
                    tokenMint: order.tokenMint,
                    tokenName: order.tokenName,
                    tokensSold: tokensToSell,
                    solReceived: result.outputAmount,
                    price: currentPrice,
                    signature: result.signature
                });
                logger_1.log.info('Trailing Stop executed successfully', {
                    signature: result.signature,
                    received: `${result.outputAmount} SOL`,
                    token: order.tokenName
                });
                // Update portfolio
                portfolio_tracker_1.portfolioTracker.updatePositionAfterSell(order.positionId, tokensToSell, result.outputAmount, currentPrice, result.signature);
            }
            else {
                throw new Error(result.error || 'Sell failed');
            }
        }
        catch (error) {
            order.status = 'failed';
            order.error = error.message;
            logger_1.log.error('Trailing Stop execution failed', {
                error: error.message,
                token: order.tokenName,
                orderId: order.id
            });
        }
    }
}
exports.stopLossManager = new StopLossManager();
//# sourceMappingURL=stop-loss-manager.js.map