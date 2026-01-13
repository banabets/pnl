"use strict";
// Volume Bot Service - Generate realistic trading volume for tokens
// Uses multiple wallets to create buy/sell activity with randomized patterns
Object.defineProperty(exports, "__esModule", { value: true });
exports.volumeBotService = void 0;
const web3_js_1 = require("@solana/web3.js");
const logger_1 = require("./logger");
const rate_limiter_1 = require("./rate-limiter");
const jupiter_service_1 = require("./jupiter-service");
class VolumeBotService {
    constructor() {
        this.isRunning = false;
        this.stopRequested = false;
        this.wallets = [];
        const rpcUrl = process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
        this.connection = new web3_js_1.Connection(rpcUrl, 'confirmed');
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
    async start(config, wallets) {
        if (this.isRunning) {
            throw new Error('Volume bot is already running');
        }
        if (!wallets || wallets.length === 0) {
            throw new Error('No wallets provided for volume bot');
        }
        if (wallets.length < config.walletCount) {
            throw new Error(`Not enough wallets. Need ${config.walletCount}, have ${wallets.length}`);
        }
        logger_1.log.info('Starting volume bot', {
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
            logger_1.log.error('Volume bot error', { error: error.message });
            this.stop();
        });
    }
    /**
     * Stop the volume bot
     */
    stop() {
        if (!this.isRunning) {
            logger_1.log.warn('Volume bot is not running');
            return;
        }
        logger_1.log.info('Stopping volume bot');
        this.stopRequested = true;
        this.isRunning = false;
        this.status.isRunning = false;
    }
    /**
     * Get current status
     */
    getStatus() {
        return { ...this.status };
    }
    /**
     * Main trading loop
     */
    async runTradingLoop(config) {
        const startTime = Date.now();
        const endTime = config.duration > 0 ? startTime + (config.duration * 60 * 1000) : null;
        while (!this.stopRequested && this.status.currentVolume < config.targetVolume) {
            // Check if duration expired
            if (endTime && Date.now() > endTime) {
                logger_1.log.info('Volume bot duration expired', {
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
            }
            catch (error) {
                logger_1.log.error('Trade execution error', { error: error.message });
                this.status.errors.push(error.message);
                // Longer wait on error
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        // Trading complete
        logger_1.log.info('Volume bot completed', {
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
    async executeTrade(config) {
        // Rate limiting
        await rate_limiter_1.rateLimiter.waitIfNeeded('pumpfun', 10000);
        rate_limiter_1.rateLimiter.recordRequest('pumpfun');
        // Select random wallet
        const wallet = this.wallets[Math.floor(Math.random() * this.wallets.length)];
        // Random trade size
        const tradeSize = this.randomTradeSize(config.minTradeSize, config.maxTradeSize);
        // Random action (buy or sell, weighted towards buys to create upward pressure)
        const isBuy = Math.random() < 0.6; // 60% buys, 40% sells
        logger_1.log.info(`Executing ${isBuy ? 'BUY' : 'SELL'} trade`, {
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
    async simulateTrade(wallet, tokenMint, amount, isBuy) {
        try {
            const jupiterService = (0, jupiter_service_1.getJupiterService)();
            if (!jupiterService) {
                throw new Error('Jupiter service not initialized');
            }
            const amountLamports = Math.floor(amount * web3_js_1.LAMPORTS_PER_SOL);
            if (isBuy) {
                // Buy token with SOL
                logger_1.log.info('Executing BUY trade via Jupiter', {
                    wallet: wallet.publicKey.toBase58().substring(0, 8),
                    token: tokenMint,
                    solAmount: amount
                });
                const result = await jupiterService.buyToken(tokenMint, amount, wallet, 200 // 2% slippage
                );
                if (!result.success) {
                    throw new Error(result.error || 'Buy trade failed');
                }
                logger_1.log.info('BUY trade successful', {
                    signature: result.signature,
                    inputAmount: result.inputAmount,
                    outputAmount: result.outputAmount
                });
            }
            else {
                // Sell token for SOL - get token balance first
                logger_1.log.info('Executing SELL trade via Jupiter', {
                    wallet: wallet.publicKey.toBase58().substring(0, 8),
                    token: tokenMint
                });
                // For sell, we need to know how many tokens we have
                // Approximate based on average buy amount
                const estimatedTokenAmount = Math.floor(amountLamports / 2); // Rough estimate
                const result = await jupiterService.sellToken(tokenMint, estimatedTokenAmount, wallet, 200 // 2% slippage
                );
                if (!result.success) {
                    throw new Error(result.error || 'Sell trade failed');
                }
                logger_1.log.info('SELL trade successful', {
                    signature: result.signature,
                    inputAmount: result.inputAmount,
                    outputAmount: result.outputAmount
                });
            }
        }
        catch (error) {
            logger_1.log.error('Trade execution failed', {
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
    randomTradeSize(min, max) {
        return min + Math.random() * (max - min);
    }
    /**
     * Randomize delay to make trading look organic (±30%)
     */
    randomizeDelay(baseDelay) {
        const variation = 0.3; // 30% variation
        const min = baseDelay * (1 - variation);
        const max = baseDelay * (1 + variation);
        return min + Math.random() * (max - min);
    }
    /**
     * Check wallet balances
     */
    async checkWalletBalances() {
        const balances = await Promise.all(this.wallets.map(async (wallet) => {
            const balance = await this.connection.getBalance(wallet.publicKey);
            return {
                wallet: wallet.publicKey.toBase58(),
                balance: balance / web3_js_1.LAMPORTS_PER_SOL
            };
        }));
        return balances;
    }
}
// Singleton instance
exports.volumeBotService = new VolumeBotService();
//# sourceMappingURL=volume-bot.js.map