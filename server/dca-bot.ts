// DCA Bot - Dollar Cost Averaging for tokens
import { Keypair } from '@solana/web3.js';
import { getJupiterService } from './jupiter-service';
import mongoose from 'mongoose';
import { log } from './logger';

export interface DCAOrder {
  userId: string;
  tokenMint: string;
  tokenName?: string;
  totalAmountSol: number;      // Total SOL to invest
  amountPerBuy: number;        // SOL per purchase
  intervalMinutes: number;      // Interval between buys
  remainingAmount: number;      // SOL remaining
  executedBuys: number;         // Number of buys executed
  totalTokensBought: number;    // Total tokens accumulated
  averagePrice: number;         // Average buy price
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  nextBuyAt: Date;
  createdAt: Date;
}

// Schema
const DCAOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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

export const DCAOrder = mongoose.model('DCAOrder', DCAOrderSchema);

// DCA execution history
const DCAExecutionSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'DCAOrder', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tokenMint: { type: String, required: true },
  amountSol: { type: Number, required: true },
  tokensReceived: { type: Number, required: true },
  pricePerToken: { type: Number, required: true },
  signature: String,
  status: { type: String, enum: ['success', 'failed'], required: true },
  error: String,
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export const DCAExecution = mongoose.model('DCAExecution', DCAExecutionSchema);

export class DCABot {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private getKeypairForUser: ((userId: string, walletIndex?: number) => Promise<Keypair | null>) | null = null;

  constructor() {}

  /**
   * Set keypair getter function (injected from wallet service)
   */
  setKeypairGetter(getter: (userId: string, walletIndex?: number) => Promise<Keypair | null>): void {
    this.getKeypairForUser = getter;
  }

  /**
   * Create new DCA order
   */
  async createOrder(
    userId: string,
    tokenMint: string,
    totalAmountSol: number,
    amountPerBuy: number,
    intervalMinutes: number,
    tokenName?: string,
    walletIndex?: number
  ): Promise<any> {
    const order = await DCAOrder.create({
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
  async pauseOrder(orderId: string, userId: string): Promise<boolean> {
    const result = await DCAOrder.updateOne(
      { _id: orderId, userId, status: 'active' },
      { status: 'paused' }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Resume DCA order
   */
  async resumeOrder(orderId: string, userId: string): Promise<boolean> {
    const result = await DCAOrder.updateOne(
      { _id: orderId, userId, status: 'paused' },
      { status: 'active', nextBuyAt: new Date() }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Cancel DCA order
   */
  async cancelOrder(orderId: string, userId: string): Promise<boolean> {
    const result = await DCAOrder.updateOne(
      { _id: orderId, userId, status: { $in: ['active', 'paused'] } },
      { status: 'cancelled' }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Get user's DCA orders
   */
  async getUserOrders(userId: string, status?: string): Promise<any[]> {
    const query: any = { userId };
    if (status) query.status = status;

    return DCAOrder.find(query).sort({ createdAt: -1 }).lean();
  }

  /**
   * Get order execution history
   */
  async getOrderHistory(orderId: string): Promise<any[]> {
    return DCAExecution.find({ orderId }).sort({ timestamp: -1 }).lean();
  }

  /**
   * Execute a single DCA buy
   */
  async executeBuy(order: any, keypair: Keypair): Promise<{ success: boolean; tokensReceived?: number; error?: string }> {
    const jupiterService = getJupiterService();
    if (!jupiterService) {
      return { success: false, error: 'Jupiter service unavailable' };
    }

    try {
      const buyAmount = Math.min(order.amountPerBuy, order.remainingAmount);

      const result = await jupiterService.buyToken(
        order.tokenMint,
        buyAmount,
        keypair,
        order.maxSlippage || 200
      );

      if (result.success) {
        // Update order
        const newTotalTokens = (order.totalTokensBought || 0) + result.outputAmount;
        const newExecutedBuys = (order.executedBuys || 0) + 1;
        const newRemaining = order.remainingAmount - buyAmount;
        const totalSpent = order.totalAmountSol - newRemaining;
        const newAveragePrice = totalSpent / newTotalTokens;

        const isCompleted = newRemaining < 0.001; // Less than 0.001 SOL remaining

        await DCAOrder.updateOne(
          { _id: order._id },
          {
            executedBuys: newExecutedBuys,
            totalTokensBought: newTotalTokens,
            remainingAmount: newRemaining,
            averagePrice: newAveragePrice,
            status: isCompleted ? 'completed' : 'active',
            nextBuyAt: isCompleted ? null : new Date(Date.now() + order.intervalMinutes * 60 * 1000)
          }
        );

        // Record execution
        await DCAExecution.create({
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
      await DCAExecution.create({
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
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Process pending DCA orders (called by scheduler)
   */
  async processPendingOrders(): Promise<void> {
    if (!this.getKeypairForUser) {
      log.warn('DCA Bot: Keypair getter not set');
      return;
    }

    const now = new Date();
    const pendingOrders = await DCAOrder.find({
      status: 'active',
      nextBuyAt: { $lte: now }
    }).lean();

    for (const order of pendingOrders) {
      try {
        const keypair = await this.getKeypairForUser(
          order.userId.toString(),
          order.walletIndex ?? undefined
        );

        if (!keypair) {
          log.warn(`DCA: No keypair for user ${order.userId}`);
          continue;
        }

        const result = await this.executeBuy(order, keypair);
        log.info(`DCA executed for order ${order._id}: ${result.success ? 'success' : result.error}`);
      } catch (error) {
        log.error(`DCA execution error for order ${order._id}:`, error);
      }
    }
  }

  /**
   * Start the DCA scheduler
   */
  start(intervalMs = 60000): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.processPendingOrders().catch((error) => {
        log.error('Error processing pending DCA orders', { error: error instanceof Error ? error.message : String(error) });
      });
    }, intervalMs);

    log.info('✅ DCA Bot started');
  }

  /**
   * Stop the DCA scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    log.info('⏹️ DCA Bot stopped');
  }

  /**
   * Get DCA stats for user
   */
  async getUserStats(userId: string): Promise<{
    activeOrders: number;
    totalInvested: number;
    totalTokensBought: number;
    completedOrders: number;
  }> {
    const stats = await DCAOrder.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
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
      if (s._id === 'active') result.activeOrders = s.count;
      if (s._id === 'completed') result.completedOrders = s.count;
      result.totalInvested += s.invested;
      result.totalTokensBought += s.tokens;
    }

    return result;
  }
}

// Singleton
let dcaInstance: DCABot | null = null;

export function initDCABot(): DCABot {
  dcaInstance = new DCABot();
  return dcaInstance;
}

export function getDCABot(): DCABot | null {
  return dcaInstance;
}
