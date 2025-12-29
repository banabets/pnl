"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VolumeBot = void 0;
const wallet_1 = require("../wallet");
const trading_1 = require("../trading");
const funds_1 = require("../funds");
const config_1 = require("../config");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
class VolumeBot {
    constructor() {
        this.session = null;
        this.isRunning = false;
        this.walletManager = new wallet_1.WalletManager();
        this.trader = new trading_1.VolumeTrader();
        this.fundManager = new funds_1.FundManager();
    }
    /**
     * Initialize the volume bot with configuration
     */
    async initialize() {
        try {
            console.log(chalk_1.default.blue('🤖 Initializing Volume Bot...'));
            // Check if we have wallets
            if (!this.walletManager.hasWallets()) {
                console.log(chalk_1.default.red('❌ No wallets found. Please generate wallets first.'));
                return false;
            }
            // Display current status
            await this.displayBotStatus();
            return true;
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Failed to initialize bot: ${error}`));
            return false;
        }
    }
    /**
     * Configure and start a volume generation session
     */
    async startVolumeSession() {
        try {
            console.log(chalk_1.default.blue('\n🚀 Starting Volume Generation Session'));
            console.log(chalk_1.default.cyan('═'.repeat(50)));
            // Get configuration from user
            const volumeConfig = await this.getVolumeConfiguration();
            if (!volumeConfig) {
                console.log(chalk_1.default.yellow('Session cancelled.'));
                return;
            }
            // Validate configuration
            if (!await this.validateConfiguration(volumeConfig)) {
                console.log(chalk_1.default.red('❌ Configuration validation failed.'));
                return;
            }
            // Display configuration summary
            this.displayConfigurationSummary(volumeConfig);
            // Confirm start
            const { confirmStart } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirmStart',
                    message: config_1.config.simulationMode
                        ? 'Start volume generation in SIMULATION mode?'
                        : '⚠️  Start LIVE volume generation with real funds?',
                    default: config_1.config.simulationMode,
                },
            ]);
            if (!confirmStart) {
                console.log(chalk_1.default.yellow('Session cancelled.'));
                return;
            }
            // Start the session
            await this.executeVolumeSession(volumeConfig);
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Volume session failed: ${error}`));
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * Get volume configuration from user
     */
    async getVolumeConfiguration() {
        try {
            const tradingPairs = this.trader.getExampleTradingPairs();
            const answers = await inquirer_1.default.prompt([
                {
                    type: 'list',
                    name: 'pairIndex',
                    message: 'Select trading pair:',
                    choices: tradingPairs.map((pair, index) => ({
                        name: `${pair.name} - ${pair.poolId.substring(0, 8)}...`,
                        value: index,
                    })),
                },
                {
                    type: 'number',
                    name: 'numberOfCycles',
                    message: 'Number of trading cycles:',
                    default: 5,
                    validate: (input) => {
                        if (input < 1 || input > 100)
                            return 'Must be between 1 and 100';
                        return true;
                    },
                },
                {
                    type: 'number',
                    name: 'tradesPerCycle',
                    message: 'Number of trades per cycle (back and forth swaps):',
                    default: 3,
                    validate: (input) => {
                        if (input < 1 || input > 20)
                            return 'Must be between 1 and 20';
                        return true;
                    },
                },
                {
                    type: 'number',
                    name: 'delayBetweenTrades',
                    message: 'Delay between trades (seconds):',
                    default: 3,
                    validate: (input) => {
                        if (input < 1 || input > 60)
                            return 'Must be between 1 and 60 seconds';
                        return true;
                    },
                },
                {
                    type: 'number',
                    name: 'delayBetweenCycles',
                    message: 'Delay between cycles (seconds):',
                    default: 10,
                    validate: (input) => {
                        if (input < 5 || input > 300)
                            return 'Must be between 5 and 300 seconds';
                        return true;
                    },
                },
                {
                    type: 'confirm',
                    name: 'randomizeAmounts',
                    message: 'Randomize trade amounts for natural appearance?',
                    default: true,
                },
            ]);
            let minTradeAmount = 0.001;
            let maxTradeAmount = config_1.config.maxSolPerSwap;
            if (answers.randomizeAmounts) {
                const amountAnswers = await inquirer_1.default.prompt([
                    {
                        type: 'number',
                        name: 'minAmount',
                        message: 'Minimum trade amount (SOL):',
                        default: 0.001,
                        validate: (input) => {
                            if (input <= 0)
                                return 'Must be positive';
                            if (input > config_1.config.maxSolPerSwap)
                                return `Cannot exceed ${config_1.config.maxSolPerSwap} SOL`;
                            return true;
                        },
                    },
                    {
                        type: 'number',
                        name: 'maxAmount',
                        message: 'Maximum trade amount (SOL):',
                        default: config_1.config.maxSolPerSwap,
                        validate: (input) => {
                            if (input <= 0)
                                return 'Must be positive';
                            if (input > config_1.config.maxSolPerSwap)
                                return `Cannot exceed ${config_1.config.maxSolPerSwap} SOL`;
                            return true;
                        },
                    },
                ]);
                minTradeAmount = amountAnswers.minAmount;
                maxTradeAmount = amountAnswers.maxAmount;
                if (minTradeAmount >= maxTradeAmount) {
                    console.log(chalk_1.default.red('❌ Minimum amount must be less than maximum amount.'));
                    return null;
                }
            }
            return {
                tradingPair: tradingPairs[answers.pairIndex],
                numberOfCycles: answers.numberOfCycles,
                tradesPerCycle: answers.tradesPerCycle,
                delayBetweenTrades: answers.delayBetweenTrades * 1000, // Convert to ms
                delayBetweenCycles: answers.delayBetweenCycles * 1000, // Convert to ms
                randomizeAmounts: answers.randomizeAmounts,
                minTradeAmount,
                maxTradeAmount,
            };
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Failed to get configuration: ${error}`));
            return null;
        }
    }
    /**
     * Validate the volume configuration
     */
    async validateConfiguration(config) {
        try {
            console.log(chalk_1.default.blue('🔍 Validating configuration...'));
            // Check trading pair validity
            if (!this.trader.validateSwapPair(config.tradingPair)) {
                console.log(chalk_1.default.red('❌ Invalid trading pair.'));
                return false;
            }
            // Check wallet balances
            const keypairs = this.walletManager.loadKeypairs();
            const requiredBalance = config.maxTradeAmount * config.tradesPerCycle * 2; // Rough estimate
            let insufficientFunds = 0;
            for (const keypair of keypairs) {
                const canAfford = await this.trader.canAffordTrade(keypair.publicKey, requiredBalance);
                if (!canAfford) {
                    insufficientFunds++;
                }
            }
            if (insufficientFunds > 0) {
                console.log(chalk_1.default.yellow(`⚠️  ${insufficientFunds} wallets may have insufficient funds for this configuration.`));
                const { proceed } = await inquirer_1.default.prompt([
                    {
                        type: 'confirm',
                        name: 'proceed',
                        message: 'Continue anyway?',
                        default: false,
                    },
                ]);
                if (!proceed) {
                    return false;
                }
            }
            console.log(chalk_1.default.green('✅ Configuration validated successfully.'));
            return true;
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Configuration validation failed: ${error}`));
            return false;
        }
    }
    /**
     * Display configuration summary
     */
    displayConfigurationSummary(config) {
        const totalTrades = config.numberOfCycles * config.tradesPerCycle * 2; // Each trade has a reverse trade
        const estimatedDuration = ((config.numberOfCycles * config.delayBetweenCycles) +
            (totalTrades * config.delayBetweenTrades)) / 1000 / 60; // Convert to minutes
        console.log(chalk_1.default.cyan('\n📋 Session Configuration'));
        console.log(chalk_1.default.cyan('═'.repeat(40)));
        console.log(`Trading Pair: ${config.tradingPair.name}`);
        console.log(`Cycles: ${config.numberOfCycles}`);
        console.log(`Trades per Cycle: ${config.tradesPerCycle}`);
        console.log(`Total Trades: ${totalTrades}`);
        console.log(`Trade Delay: ${config.delayBetweenTrades / 1000}s`);
        console.log(`Cycle Delay: ${config.delayBetweenCycles / 1000}s`);
        console.log(`Estimated Duration: ${estimatedDuration.toFixed(1)} minutes`);
        if (config.randomizeAmounts) {
            console.log(`Trade Amount: ${config.minTradeAmount}-${config.maxTradeAmount} SOL (random)`);
        }
        else {
            console.log(`Trade Amount: ${config.maxTradeAmount} SOL (fixed)`);
        }
        console.log(`Mode: ${config_1.config.simulationMode ? '🧪 SIMULATION' : '⚠️  LIVE TRADING'}`);
        console.log(chalk_1.default.cyan('═'.repeat(40)));
    }
    /**
     * Execute the volume generation session
     */
    async executeVolumeSession(volumeConfig) {
        this.isRunning = true;
        // Initialize session
        this.session = {
            startTime: new Date(),
            totalTrades: 0,
            successfulTrades: 0,
            failedTrades: 0,
            totalVolume: 0,
            tradingPair: volumeConfig.tradingPair,
            isActive: true,
        };
        const keypairs = this.walletManager.loadKeypairs();
        const results = [];
        console.log(chalk_1.default.green('\n🐒 Apes are climbing the hill! Volume generation starting...'));
        console.log(chalk_1.default.green('═'.repeat(40)));
        try {
            for (let cycle = 1; cycle <= volumeConfig.numberOfCycles && this.isRunning; cycle++) {
                console.log(chalk_1.default.blue(`\n🔄 Cycle ${cycle}/${volumeConfig.numberOfCycles}`));
                for (let trade = 1; trade <= volumeConfig.tradesPerCycle && this.isRunning; trade++) {
                    // Select random wallet for this trade
                    const keypair = keypairs[Math.floor(Math.random() * keypairs.length)];
                    // Generate trade amount
                    const tradeAmount = volumeConfig.randomizeAmounts
                        ? volumeConfig.minTradeAmount + Math.random() * (volumeConfig.maxTradeAmount - volumeConfig.minTradeAmount)
                        : volumeConfig.maxTradeAmount;
                    // Execute forward trade (A → B)
                    const forwardResult = await this.trader.executeSwap(keypair, volumeConfig.tradingPair, true, // A to B
                    tradeAmount, config_1.config.slippageBps / 100);
                    results.push(forwardResult);
                    this.updateSessionStats(forwardResult);
                    // Wait between trades
                    await this.delay(volumeConfig.delayBetweenTrades);
                    if (!this.isRunning)
                        break;
                    // Execute reverse trade (B → A)
                    const reverseResult = await this.trader.executeSwap(keypair, volumeConfig.tradingPair, false, // B to A
                    tradeAmount * 0.997, // Account for fees
                    config_1.config.slippageBps / 100);
                    results.push(reverseResult);
                    this.updateSessionStats(reverseResult);
                    // Wait between trades
                    await this.delay(volumeConfig.delayBetweenTrades);
                }
                // Wait between cycles (except for last cycle)
                if (cycle < volumeConfig.numberOfCycles && this.isRunning) {
                    console.log(chalk_1.default.gray(`⏳ Waiting ${volumeConfig.delayBetweenCycles / 1000}s before next cycle...`));
                    await this.delay(volumeConfig.delayBetweenCycles);
                }
            }
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Session error: ${error}`));
        }
        finally {
            this.session.isActive = false;
            this.displaySessionResults();
            this.trader.displayTradingStats(results);
        }
    }
    /**
     * Update session statistics
     */
    updateSessionStats(result) {
        if (!this.session)
            return;
        this.session.totalTrades++;
        if (result.success) {
            this.session.successfulTrades++;
        }
        else {
            this.session.failedTrades++;
        }
        this.session.totalVolume += result.amountIn;
    }
    /**
     * Display session results
     */
    displaySessionResults() {
        if (!this.session)
            return;
        const duration = (Date.now() - this.session.startTime.getTime()) / 1000 / 60; // minutes
        const successRate = (this.session.successfulTrades / this.session.totalTrades) * 100;
        console.log(chalk_1.default.cyan('\n�️ Ape Session Complete - Hill Conquered!'));
        console.log(chalk_1.default.cyan('═'.repeat(50)));
        console.log(`Duration: ${duration.toFixed(1)} minutes of ape domination`);
        console.log(`Total Trades: ${this.session.totalTrades} ape moves`);
        console.log(`Successful: ${chalk_1.default.green(this.session.successfulTrades)} 🍌`);
        console.log(`Failed: ${chalk_1.default.red(this.session.failedTrades)} 💔`);
        console.log(`Success Rate: ${successRate.toFixed(1)}% ape efficiency`);
        console.log(`Total Volume: ${chalk_1.default.yellow(this.session.totalVolume.toFixed(4))} SOL conquered`);
        console.log(`Trading Pair: ${this.session.tradingPair.name}`);
        console.log(chalk_1.default.cyan('═'.repeat(50)));
    }
    /**
     * Stop the current session
     */
    stopSession() {
        if (this.isRunning) {
            console.log(chalk_1.default.yellow('\n⏹️  Stopping session...'));
            this.isRunning = false;
        }
    }
    /**
     * Display current bot status
     */
    async displayBotStatus() {
        console.log(chalk_1.default.cyan('\n🐒 Ape Of The Hill Status'));
        console.log(chalk_1.default.cyan('═'.repeat(40)));
        const walletCount = this.walletManager.getWalletCount();
        console.log(`Wallets: ${walletCount}`);
        console.log(`Mode: ${config_1.config.simulationMode ? '🧪 Simulation' : '⚠️  Live Trading'}`);
        console.log(`Max Trade Size: ${config_1.config.maxSolPerSwap} SOL`);
        console.log(`Network: ${config_1.config.rpcUrl.includes('devnet') ? 'Devnet' : 'Mainnet'}`);
        if (this.session?.isActive) {
            console.log(`Status: ${chalk_1.default.green('🟢 Active Session')}`);
            console.log(`Current Pair: ${this.session.tradingPair.name}`);
        }
        else {
            console.log(`Status: ${chalk_1.default.gray('⚫ Idle')}`);
        }
        console.log(chalk_1.default.cyan('═'.repeat(40)));
        if (walletCount > 0) {
            await this.walletManager.displayWalletSummary();
        }
    }
    /**
     * Utility method for delays
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Get current session info
     */
    getCurrentSession() {
        return this.session;
    }
    /**
     * Check if bot is currently running
     */
    isActive() {
        return this.isRunning;
    }
}
exports.VolumeBot = VolumeBot;
//# sourceMappingURL=index.js.map