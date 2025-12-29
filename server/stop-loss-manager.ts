import { portfolioTracker } from './portfolio-tracker';

export interface StopLossOrder {
  id: string;
  positionId: string;
  tokenMint: string;
  tokenName: string;
  tokenSymbol: string;
  walletIndex: number;
  walletAddress: string;
  orderType: 'stop-loss' | 'take-profit';
  triggerPrice: number;
  amount: number; // Percentage of position to sell (0-100)
  status: 'active' | 'triggered' | 'cancelled';
  createdAt: number;
  triggeredAt?: number;
  executedSignature?: string;
}

export interface TrailingStopOrder {
  id: string;
  positionId: string;
  tokenMint: string;
  tokenName: string;
  tokenSymbol: string;
  walletIndex: number;
  walletAddress: string;
  trailingPercent: number; // Percentage to trail (e.g., 10 = 10%)
  currentStopPrice: number;
  highestPrice: number;
  status: 'active' | 'triggered' | 'cancelled';
  createdAt: number;
  triggeredAt?: number;
  executedSignature?: string;
}

class StopLossManager {
  private stopLossOrders: Map<string, StopLossOrder>;
  private trailingStopOrders: Map<string, TrailingStopOrder>;
  private priceMonitors: Map<string, NodeJS.Timeout>;

  constructor() {
    this.stopLossOrders = new Map();
    this.trailingStopOrders = new Map();
    this.priceMonitors = new Map();
    
    // Start monitoring prices
    this.startPriceMonitoring();
  }

  // Create a stop loss order
  createStopLoss(
    positionId: string,
    tokenMint: string,
    tokenName: string,
    tokenSymbol: string,
    walletIndex: number,
    walletAddress: string,
    triggerPrice: number,
    amount: number = 100
  ): StopLossOrder {
    const order: StopLossOrder = {
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
  createTakeProfit(
    positionId: string,
    tokenMint: string,
    tokenName: string,
    tokenSymbol: string,
    walletIndex: number,
    walletAddress: string,
    triggerPrice: number,
    amount: number = 100
  ): StopLossOrder {
    const order: StopLossOrder = {
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
  createTrailingStop(
    positionId: string,
    tokenMint: string,
    tokenName: string,
    tokenSymbol: string,
    walletIndex: number,
    walletAddress: string,
    trailingPercent: number,
    currentPrice: number
  ): TrailingStopOrder {
    const order: TrailingStopOrder = {
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
  cancelOrder(orderId: string): boolean {
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
  getActiveOrders(): { stopLoss: StopLossOrder[]; trailingStop: TrailingStopOrder[] } {
    return {
      stopLoss: Array.from(this.stopLossOrders.values())
        .filter(o => o.status === 'active'),
      trailingStop: Array.from(this.trailingStopOrders.values())
        .filter(o => o.status === 'active'),
    };
  }

  // Get orders by token
  getOrdersByToken(tokenMint: string): { stopLoss: StopLossOrder[]; trailingStop: TrailingStopOrder[] } {
    return {
      stopLoss: Array.from(this.stopLossOrders.values())
        .filter(o => o.tokenMint === tokenMint && o.status === 'active'),
      trailingStop: Array.from(this.trailingStopOrders.values())
        .filter(o => o.tokenMint === tokenMint && o.status === 'active'),
    };
  }

  // Start monitoring token prices
  private startMonitoringToken(tokenMint: string) {
    if (this.priceMonitors.has(tokenMint)) {
      return; // Already monitoring
    }

    const interval = setInterval(async () => {
      await this.checkOrders(tokenMint);
    }, 5000); // Check every 5 seconds

    this.priceMonitors.set(tokenMint, interval);
  }

  // Start general price monitoring
  private startPriceMonitoring() {
    setInterval(async () => {
      const activeOrders = this.getActiveOrders();
      const tokenMints = new Set<string>();
      
      activeOrders.stopLoss.forEach(o => tokenMints.add(o.tokenMint));
      activeOrders.trailingStop.forEach(o => tokenMints.add(o.tokenMint));

      for (const tokenMint of tokenMints) {
        await this.checkOrders(tokenMint);
      }
    }, 10000); // Check every 10 seconds
  }

  // Check and execute orders for a token
  private async checkOrders(tokenMint: string) {
    try {
      // Fetch current price (this would typically come from an API or WebSocket)
      // For now, we'll use the portfolio tracker's current price
      const positions = portfolioTracker.getPositionsByToken(tokenMint);
      if (positions.length === 0) return;

      const currentPrice = positions[0].currentPrice;

      // Check stop loss orders
      const stopLossOrders = Array.from(this.stopLossOrders.values())
        .filter(o => o.tokenMint === tokenMint && o.status === 'active');

      for (const order of stopLossOrders) {
        if (order.orderType === 'stop-loss' && currentPrice <= order.triggerPrice) {
          await this.executeStopLoss(order, currentPrice);
        } else if (order.orderType === 'take-profit' && currentPrice >= order.triggerPrice) {
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
    } catch (error) {
      console.error(`Error checking orders for ${tokenMint}:`, error);
    }
  }

  // Execute stop loss order
  private async executeStopLoss(order: StopLossOrder, currentPrice: number) {
    // This would execute the actual sell trade
    // For now, we'll just mark it as triggered
    order.status = 'triggered';
    order.triggeredAt = Date.now() / 1000;
    
    console.log(`🛑 Stop Loss triggered for ${order.tokenName} at ${currentPrice}`);
    
    // TODO: Execute actual sell trade via trading bot
    // This would require integration with the trading system
  }

  // Execute take profit order
  private async executeTakeProfit(order: StopLossOrder, currentPrice: number) {
    order.status = 'triggered';
    order.triggeredAt = Date.now() / 1000;
    
    console.log(`🎯 Take Profit triggered for ${order.tokenName} at ${currentPrice}`);
    
    // TODO: Execute actual sell trade via trading bot
  }

  // Execute trailing stop order
  private async executeTrailingStop(order: TrailingStopOrder, currentPrice: number) {
    order.status = 'triggered';
    order.triggeredAt = Date.now() / 1000;
    
    console.log(`📉 Trailing Stop triggered for ${order.tokenName} at ${currentPrice}`);
    
    // TODO: Execute actual sell trade via trading bot
  }
}

export const stopLossManager = new StopLossManager();


