"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.portfolioTracker = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("./logger");
class PortfolioTracker {
    constructor() {
        const dataDir = path_1.default.join(__dirname, '../data');
        if (!fs_1.default.existsSync(dataDir)) {
            fs_1.default.mkdirSync(dataDir, { recursive: true });
        }
        this.positionsFile = path_1.default.join(dataDir, 'positions.json');
        this.tradesFile = path_1.default.join(dataDir, 'trades.json');
        this.positions = new Map();
        this.trades = [];
        this.loadData();
    }
    loadData() {
        try {
            if (fs_1.default.existsSync(this.positionsFile)) {
                const data = JSON.parse(fs_1.default.readFileSync(this.positionsFile, 'utf-8'));
                this.positions = new Map(Object.entries(data));
            }
        }
        catch (error) {
            logger_1.log.error('Error loading positions:', error);
        }
        try {
            if (fs_1.default.existsSync(this.tradesFile)) {
                this.trades = JSON.parse(fs_1.default.readFileSync(this.tradesFile, 'utf-8'));
            }
        }
        catch (error) {
            logger_1.log.error('Error loading trades:', error);
        }
    }
    saveData() {
        try {
            const positionsObj = Object.fromEntries(this.positions);
            fs_1.default.writeFileSync(this.positionsFile, JSON.stringify(positionsObj, null, 2));
            fs_1.default.writeFileSync(this.tradesFile, JSON.stringify(this.trades, null, 2));
        }
        catch (error) {
            logger_1.log.error('Error saving data:', error);
        }
    }
    // Record a buy trade
    recordBuy(tokenMint, tokenName, tokenSymbol, walletIndex, walletAddress, price, solAmount, tokenAmount, signature, fee = 0) {
        const positionId = `${tokenMint}-${walletIndex}`;
        const existingPosition = this.positions.get(positionId);
        const trade = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            positionId,
            tokenMint,
            tokenName,
            tokenSymbol,
            walletIndex,
            walletAddress,
            type: 'buy',
            price,
            amount: solAmount,
            tokenAmount,
            timestamp: Date.now() / 1000,
            signature,
            fee,
        };
        this.trades.push(trade);
        if (existingPosition && existingPosition.status === 'open') {
            // Update existing position (DCA)
            const totalSolInvested = existingPosition.entryAmount + solAmount;
            const totalTokens = existingPosition.tokenAmount + tokenAmount;
            const avgEntryPrice = totalSolInvested / totalTokens;
            existingPosition.entryAmount = totalSolInvested;
            existingPosition.tokenAmount = totalTokens;
            existingPosition.entryPrice = avgEntryPrice;
            existingPosition.currentPrice = price;
            existingPosition.currentValue = totalTokens * price;
            existingPosition.pnl = existingPosition.currentValue - totalSolInvested;
            existingPosition.pnlPercent = (existingPosition.pnl / totalSolInvested) * 100;
            existingPosition.lastUpdateTimestamp = Date.now() / 1000;
            this.positions.set(positionId, existingPosition);
        }
        else {
            // Create new position
            const position = {
                id: positionId,
                tokenMint,
                tokenName,
                tokenSymbol,
                walletIndex,
                walletAddress,
                entryPrice: price,
                entryAmount: solAmount,
                tokenAmount,
                currentPrice: price,
                currentValue: tokenAmount * price,
                pnl: 0,
                pnlPercent: 0,
                entryTimestamp: Date.now() / 1000,
                lastUpdateTimestamp: Date.now() / 1000,
                status: 'open',
            };
            this.positions.set(positionId, position);
        }
        this.saveData();
        return this.positions.get(positionId);
    }
    // Record a sell trade
    recordSell(tokenMint, walletIndex, price, solAmount, tokenAmount, signature, fee = 0) {
        const positionId = `${tokenMint}-${walletIndex}`;
        const position = this.positions.get(positionId);
        if (!position || position.status !== 'open') {
            return null;
        }
        const trade = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            positionId,
            tokenMint: position.tokenMint,
            tokenName: position.tokenName,
            tokenSymbol: position.tokenSymbol,
            walletIndex,
            walletAddress: position.walletAddress,
            type: 'sell',
            price,
            amount: solAmount,
            tokenAmount,
            timestamp: Date.now() / 1000,
            signature,
            fee,
        };
        this.trades.push(trade);
        // Update position
        position.tokenAmount -= tokenAmount;
        position.currentPrice = price;
        position.currentValue = position.tokenAmount * price;
        if (position.tokenAmount <= 0.000001) {
            // Position fully closed
            position.status = 'closed';
            position.exitPrice = price;
            position.exitTimestamp = Date.now() / 1000;
            position.pnl = solAmount - position.entryAmount;
            position.pnlPercent = (position.pnl / position.entryAmount) * 100;
        }
        else {
            // Partial sell - update P&L
            const remainingValue = position.tokenAmount * price;
            position.pnl = remainingValue - (position.entryAmount * (position.tokenAmount / (position.tokenAmount + tokenAmount)));
            position.pnlPercent = (position.pnl / position.entryAmount) * 100;
        }
        position.lastUpdateTimestamp = Date.now() / 1000;
        this.positions.set(positionId, position);
        this.saveData();
        return position;
    }
    // Update position prices
    updatePrice(tokenMint, currentPrice) {
        let updated = false;
        for (const [positionId, position] of this.positions.entries()) {
            if (position.tokenMint === tokenMint && position.status === 'open') {
                position.currentPrice = currentPrice;
                position.currentValue = position.tokenAmount * currentPrice;
                position.pnl = position.currentValue - position.entryAmount;
                position.pnlPercent = (position.pnl / position.entryAmount) * 100;
                position.lastUpdateTimestamp = Date.now() / 1000;
                updated = true;
            }
        }
        if (updated) {
            this.saveData();
        }
    }
    // Get all open positions
    getOpenPositions() {
        return Array.from(this.positions.values())
            .filter(p => p.status === 'open')
            .sort((a, b) => b.entryTimestamp - a.entryTimestamp);
    }
    // Get all positions (open + closed)
    getAllPositions() {
        return Array.from(this.positions.values())
            .sort((a, b) => (b.lastUpdateTimestamp || 0) - (a.lastUpdateTimestamp || 0));
    }
    // Get positions by token
    getPositionsByToken(tokenMint) {
        return Array.from(this.positions.values())
            .filter(p => p.tokenMint === tokenMint);
    }
    // Get positions by wallet
    getPositionsByWallet(walletIndex) {
        return Array.from(this.positions.values())
            .filter(p => p.walletIndex === walletIndex);
    }
    // Get a single position by ID
    getPosition(positionId) {
        return this.positions.get(positionId);
    }
    // Update position after sell
    updatePositionAfterSell(positionId, tokensSold, solReceived, currentPrice, signature) {
        const position = this.positions.get(positionId);
        if (!position)
            return;
        position.tokenAmount -= tokensSold;
        position.currentPrice = currentPrice;
        position.currentValue = position.tokenAmount * currentPrice;
        if (position.tokenAmount <= 0.000001) {
            position.status = 'closed';
            position.exitPrice = currentPrice;
            position.exitTimestamp = Date.now() / 1000;
        }
        position.lastUpdateTimestamp = Date.now() / 1000;
        this.positions.set(positionId, position);
        this.saveData();
    }
    // Get all trades
    getTrades(limit) {
        const sorted = this.trades.sort((a, b) => b.timestamp - a.timestamp);
        return limit ? sorted.slice(0, limit) : sorted;
    }
    // Get trades by token
    getTradesByToken(tokenMint) {
        return this.trades
            .filter(t => t.tokenMint === tokenMint)
            .sort((a, b) => b.timestamp - a.timestamp);
    }
    // Get portfolio summary
    getPortfolioSummary() {
        const openPositions = this.getOpenPositions();
        const totalInvested = openPositions.reduce((sum, p) => sum + (p.entryAmount || 0), 0);
        const totalValue = openPositions.reduce((sum, p) => sum + (p.currentValue || 0), 0);
        const totalPnl = openPositions.reduce((sum, p) => sum + (p.pnl || 0), 0);
        const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
        const closedPositions = Array.from(this.positions.values())
            .filter(p => p.status === 'closed');
        const realizedPnl = closedPositions.reduce((sum, p) => sum + (p.pnl || 0), 0);
        return {
            openPositions: openPositions.length || 0,
            totalInvested: totalInvested || 0,
            totalValue: totalValue || 0,
            totalPnl: (totalPnl || 0) + (realizedPnl || 0), // Total PnL including realized
            totalPnlPercent: totalPnlPercent || 0,
            realizedPnl: realizedPnl || 0,
        };
    }
}
exports.portfolioTracker = new PortfolioTracker();
//# sourceMappingURL=portfolio-tracker.js.map