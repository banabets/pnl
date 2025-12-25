import fs from 'fs';
import path from 'path';

export interface Position {
  id: string;
  tokenMint: string;
  tokenName: string;
  tokenSymbol: string;
  walletIndex: number;
  walletAddress: string;
  entryPrice: number;
  entryAmount: number; // SOL amount invested
  tokenAmount: number; // Token amount held
  currentPrice: number;
  currentValue: number; // Current value in SOL
  pnl: number; // Profit/Loss in SOL
  pnlPercent: number; // Profit/Loss percentage
  entryTimestamp: number;
  lastUpdateTimestamp: number;
  status: 'open' | 'closed';
  exitPrice?: number;
  exitTimestamp?: number;
}

export interface Trade {
  id: string;
  positionId: string;
  tokenMint: string;
  tokenName: string;
  tokenSymbol: string;
  walletIndex: number;
  walletAddress: string;
  type: 'buy' | 'sell';
  price: number;
  amount: number; // SOL amount
  tokenAmount: number; // Token amount
  timestamp: number;
  signature: string;
  fee: number;
}

class PortfolioTracker {
  private positionsFile: string;
  private tradesFile: string;
  private positions: Map<string, Position>;
  private trades: Trade[];

  constructor() {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    this.positionsFile = path.join(dataDir, 'positions.json');
    this.tradesFile = path.join(dataDir, 'trades.json');
    this.positions = new Map();
    this.trades = [];
    
    this.loadData();
  }

  private loadData() {
    try {
      if (fs.existsSync(this.positionsFile)) {
        const data = JSON.parse(fs.readFileSync(this.positionsFile, 'utf-8'));
        this.positions = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Error loading positions:', error);
    }

    try {
      if (fs.existsSync(this.tradesFile)) {
        this.trades = JSON.parse(fs.readFileSync(this.tradesFile, 'utf-8'));
      }
    } catch (error) {
      console.error('Error loading trades:', error);
    }
  }

  private saveData() {
    try {
      const positionsObj = Object.fromEntries(this.positions);
      fs.writeFileSync(this.positionsFile, JSON.stringify(positionsObj, null, 2));
      fs.writeFileSync(this.tradesFile, JSON.stringify(this.trades, null, 2));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  // Record a buy trade
  recordBuy(
    tokenMint: string,
    tokenName: string,
    tokenSymbol: string,
    walletIndex: number,
    walletAddress: string,
    price: number,
    solAmount: number,
    tokenAmount: number,
    signature: string,
    fee: number = 0
  ): Position {
    const positionId = `${tokenMint}-${walletIndex}`;
    const existingPosition = this.positions.get(positionId);

    const trade: Trade = {
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
    } else {
      // Create new position
      const position: Position = {
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
    return this.positions.get(positionId)!;
  }

  // Record a sell trade
  recordSell(
    tokenMint: string,
    walletIndex: number,
    price: number,
    solAmount: number,
    tokenAmount: number,
    signature: string,
    fee: number = 0
  ): Position | null {
    const positionId = `${tokenMint}-${walletIndex}`;
    const position = this.positions.get(positionId);

    if (!position || position.status !== 'open') {
      return null;
    }

    const trade: Trade = {
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
    } else {
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
  updatePrice(tokenMint: string, currentPrice: number) {
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
  getOpenPositions(): Position[] {
    return Array.from(this.positions.values())
      .filter(p => p.status === 'open')
      .sort((a, b) => b.entryTimestamp - a.entryTimestamp);
  }

  // Get all positions (open + closed)
  getAllPositions(): Position[] {
    return Array.from(this.positions.values())
      .sort((a, b) => (b.lastUpdateTimestamp || 0) - (a.lastUpdateTimestamp || 0));
  }

  // Get positions by token
  getPositionsByToken(tokenMint: string): Position[] {
    return Array.from(this.positions.values())
      .filter(p => p.tokenMint === tokenMint);
  }

  // Get positions by wallet
  getPositionsByWallet(walletIndex: number): Position[] {
    return Array.from(this.positions.values())
      .filter(p => p.walletIndex === walletIndex);
  }

  // Get all trades
  getTrades(limit?: number): Trade[] {
    const sorted = this.trades.sort((a, b) => b.timestamp - a.timestamp);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  // Get trades by token
  getTradesByToken(tokenMint: string): Trade[] {
    return this.trades
      .filter(t => t.tokenMint === tokenMint)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // Get portfolio summary
  getPortfolioSummary() {
    const openPositions = this.getOpenPositions();
    const totalInvested = openPositions.reduce((sum, p) => sum + p.entryAmount, 0);
    const totalValue = openPositions.reduce((sum, p) => sum + p.currentValue, 0);
    const totalPnl = openPositions.reduce((sum, p) => sum + p.pnl, 0);
    const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    const closedPositions = Array.from(this.positions.values())
      .filter(p => p.status === 'closed');
    const realizedPnl = closedPositions.reduce((sum, p) => sum + (p.pnl || 0), 0);

    return {
      openPositions: openPositions.length,
      totalInvested,
      totalValue,
      totalPnl,
      totalPnlPercent,
      realizedPnl,
      totalPnl: totalPnl + realizedPnl,
    };
  }
}

export const portfolioTracker = new PortfolioTracker();

