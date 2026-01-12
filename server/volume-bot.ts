// Volume Bot Service - Generate realistic trading volume for tokens
// Uses multiple wallets to create buy/sell activity with randomized patterns

import { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { log } from './logger';
import { rateLimiter } from './rate-limiter';
import { getJupiterService } from './jupiter-service';

interface VolumeBotConfig {
  tokenMint: string;
  targetVolume: number; // Target volume in SOL
  walletCount: number; // Number of wallets to use
  minTradeSize: number; // Minimum trade size in SOL
  maxTradeSize: number; // Maximum trade size in SOL
  delayBetweenTrades: number; // Delay in ms between trades
  duration: number; // How long to run in minutes (0 = indefinite)
}

interface VolumeBotStatus {
  isRunning: boolean;
  tokenMint: string | null;
  currentVolume: number;
  targetVolume: number;
  tradesExecuted: number;
  walletsUsed: number;
  startTime: number | null;
  errors: string[];
}

class VolumeBotService {
  private connection: Connection;
  private status: VolumeBotStatus;
  private isRunning: boolean = false;
  private stopRequested: boolean = false;
  private wallets: Keypair[] = [];

  constructor() {
    const rpcUrl = process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');

    this.status = {
      isRunning: false,
      tokenMint: null,
      currentVolume: 0,
      targetVolume: 0,
      tradesExecuted: 0,
      walletsUsed: 0,
      startTime: null,
      errors: []
    };
  }

  /**
   * Start the volume bot with given configuration
   */
  async start(config: VolumeBotConfig, wallets: Keypair[]): Promise<void> {
    if (this.isRunning) {
      throw new Error('Volume bot is already running');
    }

    if (!wallets || wallets.length === 0) {
      throw new Error('No wallets provided for volume bot');
    }

    if (wallets.length < config.walletCount) {
      throw new Error(`Not enough wallets. Need ${config.walletCount}, have ${wallets.length}`);
    }

    log.info('Starting volume bot', {
      tokenMint: config.tokenMint,
      targetVolume: config.targetVolume,
      walletCount: config.walletCount
    });

    this.isRunning = true;
    this.stopRequested = false;
    this.wallets = wallets.slice(0, config.walletCount);

    this.status = {
      isRunning: true,
      tokenMint: config.tokenMint,
      currentVolume: 0,
      targetVolume: config.targetVolume,
      tradesExecuted: 0,
      walletsUsed: config.walletCount,
      startTime: Date.now(),
      errors: []
    };

    // Start trading in background
    this.runTradingLoop(config).catch(error => {
      log.error('Volume bot error', { error: error.message });
      this.stop();
    });
  }

  /**
   * Stop the volume bot
   */
  stop(): void {
    if (!this.isRunning) {
      log.warn('Volume bot is not running');
      return;
    }

    log.info('Stopping volume bot');
    this.stopRequested = true;
    this.isRunning = false;
    this.status.isRunning = false;
  }

  /**
   * Get current status
   */
  getStatus(): VolumeBotStatus {
    return { ...this.status };
  }

  /**
   * Main trading loop
   */
  private async runTradingLoop(config: VolumeBotConfig): Promise<void> {
    const startTime = Date.now();
    const endTime = config.duration > 0 ? startTime + (config.duration * 60 * 1000) : null;

    while (!this.stopRequested && this.status.currentVolume < config.targetVolume) {
      // Check if duration expired
      if (endTime && Date.now() > endTime) {
        log.info('Volume bot duration expired', {
          volumeGenerated: this.status.currentVolume,
          tradesExecuted: this.status.tradesExecuted
        });
        break;
      }

      try {
        // Execute a random trade
        await this.executeTrade(config);

        // Wait before next trade
        const delay = this.randomizeDelay(config.delayBetweenTrades);
        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (error: any) {
        log.error('Trade execution error', { error: error.message });
        this.status.errors.push(error.message);

        // Longer wait on error
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Trading complete
    log.info('Volume bot completed', {
      finalVolume: this.status.currentVolume,
      targetVolume: this.status.targetVolume,
      tradesExecuted: this.status.tradesExecuted,
      duration: (Date.now() - startTime) / 1000 / 60
    });

    this.stop();
  }

  /**
   * Execute a single trade
   */
  private async executeTrade(config: VolumeBotConfig): Promise<void> {
    // Rate limiting
    await rateLimiter.waitIfNeeded('pumpfun', 10000);
    rateLimiter.recordRequest('pumpfun');

    // Select random wallet
    const wallet = this.wallets[Math.floor(Math.random() * this.wallets.length)];

    // Random trade size
    const tradeSize = this.randomTradeSize(config.minTradeSize, config.maxTradeSize);

    // Random action (buy or sell, weighted towards buys to create upward pressure)
    const isBuy = Math.random() < 0.6; // 60% buys, 40% sells

    log.info(`Executing ${isBuy ? 'BUY' : 'SELL'} trade`, {
      wallet: wallet.publicKey.toBase58().substring(0, 8),
      size: tradeSize,
      token: config.tokenMint
    });

    // Simulate trade execution
    // In production, this would call pump.fun API or Jupiter aggregator
    await this.simulateTrade(wallet, config.tokenMint, tradeSize, isBuy);

    // Update stats
    this.status.currentVolume += tradeSize;
    this.status.tradesExecuted += 1;
  }

  /**
   * Execute real trade via Jupiter
   */
  private async simulateTrade(
    wallet: Keypair,
    tokenMint: string,
    amount: number,
    isBuy: boolean
  ): Promise<void> {
    try {
      const jupiterService = getJupiterService();
      if (!jupiterService) {
        throw new Error('Jupiter service not initialized');
      }

      const amountLamports = Math.floor(amount * LAMPORTS_PER_SOL);

      if (isBuy) {
        // Buy token with SOL
        log.info('Executing BUY trade via Jupiter', {
          wallet: wallet.publicKey.toBase58().substring(0, 8),
          token: tokenMint,
          solAmount: amount
        });

        const result = await jupiterService.buyToken(
          tokenMint,
          amount,
          wallet,
          200 // 2% slippage
        );

        if (!result.success) {
          throw new Error(result.error || 'Buy trade failed');
        }

        log.info('BUY trade successful', {
          signature: result.signature,
          inputAmount: result.inputAmount,
          outputAmount: result.outputAmount
        });

      } else {
        // Sell token for SOL - get token balance first
        log.info('Executing SELL trade via Jupiter', {
          wallet: wallet.publicKey.toBase58().substring(0, 8),
          token: tokenMint
        });

        // For sell, we need to know how many tokens we have
        // Approximate based on average buy amount
        const estimatedTokenAmount = Math.floor(amountLamports / 2); // Rough estimate

        const result = await jupiterService.sellToken(
          tokenMint,
          estimatedTokenAmount,
          wallet,
          200 // 2% slippage
        );

        if (!result.success) {
          throw new Error(result.error || 'Sell trade failed');
        }

        log.info('SELL trade successful', {
          signature: result.signature,
          inputAmount: result.inputAmount,
          outputAmount: result.outputAmount
        });
      }

    } catch (error: any) {
      log.error('Trade execution failed', {
        wallet: wallet.publicKey.toBase58().substring(0, 8),
        token: tokenMint,
        amount,
        isBuy,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate random trade size within bounds
   */
  private randomTradeSize(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  /**
   * Randomize delay to make trading look organic (±30%)
   */
  private randomizeDelay(baseDelay: number): number {
    const variation = 0.3; // 30% variation
    const min = baseDelay * (1 - variation);
    const max = baseDelay * (1 + variation);
    return min + Math.random() * (max - min);
  }

  /**
   * Check wallet balances
   */
  async checkWalletBalances(): Promise<{ wallet: string; balance: number }[]> {
    const balances = await Promise.all(
      this.wallets.map(async (wallet) => {
        const balance = await this.connection.getBalance(wallet.publicKey);
        return {
          wallet: wallet.publicKey.toBase58(),
          balance: balance / LAMPORTS_PER_SOL
        };
      })
    );
    return balances;
  }
}

// Singleton instance
export const volumeBotService = new VolumeBotService();
