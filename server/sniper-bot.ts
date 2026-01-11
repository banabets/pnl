// Sniper Bot - Auto-buy new tokens based on criteria
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getJupiterService } from './jupiter-service';
import { getTokenAuditService } from './token-audit';
import { TradingFee } from './database';
import mongoose from 'mongoose';
import { log } from './logger';

export interface SniperConfig {
  userId: string;
  enabled: boolean;
  // Filters
  minLiquidity: number;      // Min liquidity in USD
  maxMarketCap: number;      // Max market cap to buy
  minHolders: number;        // Min holder count
  maxTopHolderPercent: number; // Max % held by top holder
  // Safety
  requireMintDisabled: boolean;
  requireFreezeDisabled: boolean;
  skipHoneypots: boolean;
  // Trade settings
  buyAmountSol: number;      // SOL amount per snipe
  maxSlippage: number;       // Max slippage in bps
  autoSellPercent?: number;  // Auto-sell at % profit (optional)
  stopLossPercent?: number;  // Stop loss at % loss (optional)
}

// Schema for MongoDB
const SniperConfigSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
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

const SniperConfigModel = mongoose.model('SniperConfig', SniperConfigSchema);

// Snipe history
const SnipeHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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

export const SnipeHistory = mongoose.model('SnipeHistory', SnipeHistorySchema);

export class SniperBot {
  private activeSnipes = new Map<string, SniperConfig>();
  private connection: Connection;
  private rpcUrl: string;
  private isRunning = false;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Get user's sniper config
   */
  async getConfig(userId: string): Promise<SniperConfig | null> {
    const config = await SniperConfigModel.findOne({ userId }).lean();
    return config as unknown as SniperConfig | null;
  }

  /**
   * Update sniper config
   */
  async updateConfig(userId: string, config: Partial<SniperConfig>): Promise<SniperConfig> {
    const updated = await SniperConfigModel.findOneAndUpdate(
      { userId },
      { $set: config },
      { upsert: true, new: true }
    ).lean();

    const typedConfig = updated as unknown as SniperConfig;

    // Update active snipes if enabled changed
    if (config.enabled !== undefined) {
      if (config.enabled) {
        this.activeSnipes.set(userId, typedConfig);
      } else {
        this.activeSnipes.delete(userId);
      }
    }

    return typedConfig;
  }

  /**
   * Enable sniper for user
   */
  async enable(userId: string): Promise<void> {
    const config = await this.updateConfig(userId, { enabled: true });
    this.activeSnipes.set(userId, config);
  }

  /**
   * Disable sniper for user
   */
  async disable(userId: string): Promise<void> {
    await this.updateConfig(userId, { enabled: false });
    this.activeSnipes.delete(userId);
  }

  /**
   * Check if token passes sniper filters
   */
  async checkToken(tokenMint: string, config: SniperConfig): Promise<{ pass: boolean; reason?: string }> {
    const auditService = getTokenAuditService();
    if (!auditService) return { pass: false, reason: 'Audit service unavailable' };

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
    } catch (error: any) {
      return { pass: false, reason: error.message };
    }
  }

  /**
   * Execute snipe (buy token)
   */
  async executeSnipe(
    userId: string,
    tokenMint: string,
    keypair: Keypair,
    config: SniperConfig
  ): Promise<{ success: boolean; signature?: string; tokensReceived?: number; error?: string }> {
    const jupiterService = getJupiterService();
    if (!jupiterService) {
      return { success: false, error: 'Jupiter service unavailable' };
    }

    try {
      // Execute buy
      const result = await jupiterService.buyToken(
        tokenMint,
        config.buyAmountSol,
        keypair,
        config.maxSlippage
      );

      if (result.success) {
        // Get token price for history
        const price = await jupiterService.getTokenPrice(tokenMint);

        // Save to history
        await SnipeHistory.create({
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
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Process new token (called by WebSocket listener)
   */
  async processNewToken(tokenMint: string, tokenInfo?: { name?: string; symbol?: string }): Promise<void> {
    // Check all active sniper configs
    for (const [userId, config] of this.activeSnipes.entries()) {
      if (!config.enabled) continue;

      try {
        const check = await this.checkToken(tokenMint, config);

        if (check.pass) {
          log.info(`🎯 Token ${tokenMint} passed filters for user ${userId}`);
          // Note: Actual execution requires user's keypair, handled via API
        }
      } catch (error) {
        log.error(`Error checking token for user ${userId}:`, error);
      }
    }
  }

  /**
   * Get snipe history for user
   */
  async getHistory(userId: string, limit = 50): Promise<any[]> {
    return SnipeHistory.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get active snipes count
   */
  getActiveCount(): number {
    return this.activeSnipes.size;
  }
}

// Singleton
let sniperInstance: SniperBot | null = null;

export function initSniperBot(rpcUrl: string): SniperBot {
  sniperInstance = new SniperBot(rpcUrl);
  return sniperInstance;
}

export function getSniperBot(): SniperBot | null {
  return sniperInstance;
}
