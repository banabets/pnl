#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const config_1 = require("./config");
const wallet_1 = require("./wallet");
const trading_1 = require("./trading");
const bot_1 = require("./bot");
/**
 * Simulation script to test the volume bot without real funds
 */
class VolumeSimulation {
    constructor() {
        this.walletManager = new wallet_1.WalletManager();
        this.trader = new trading_1.VolumeTrader();
        this.volumeBot = new bot_1.VolumeBot();
    }
    /**
     * Run a comprehensive simulation
     */
    async runSimulation() {
        console.log(chalk_1.default.blue('🐒 Ape Of The Hill Volume Bot - Simulation Mode'));
        console.log(chalk_1.default.cyan('═'.repeat(60)));
        console.log(chalk_1.default.yellow('This simulation will test all ape functionality safely! 🏔️\n'));
        try {
            // Ensure we're in simulation mode
            config_1.configManager.updateSimulationMode(true);
            console.log(chalk_1.default.green('✅ Simulation mode enabled\n'));
            // Step 1: Generate test wallets
            await this.simulateWalletGeneration();
            // Step 2: Simulate fund distribution
            await this.simulateFundDistribution();
            // Step 3: Run trading simulation
            await this.simulateTrading();
            // Step 4: Test volume bot
            await this.simulateVolumeBot();
            // Step 5: Display final results
            await this.displaySimulationResults();
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Simulation failed: ${error}`));
        }
    }
    /**
     * Simulate wallet generation
     */
    async simulateWalletGeneration() {
        console.log(chalk_1.default.blue('📋 Step 1: Wallet Generation'));
        console.log(chalk_1.default.gray('─'.repeat(40)));
        try {
            // Generate test wallets
            const keypairs = this.walletManager.generateKeypairs(5);
            console.log(chalk_1.default.green(`✅ Generated ${keypairs.length} test wallets`));
            // Display wallet summary
            await this.walletManager.displayWalletSummary();
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Wallet generation failed: ${error}`));
            throw error;
        }
    }
    /**
     * Simulate fund distribution
     */
    async simulateFundDistribution() {
        console.log(chalk_1.default.blue('\n📋 Step 2: Fund Distribution Simulation'));
        console.log(chalk_1.default.gray('─'.repeat(40)));
        const publicKeys = this.walletManager.getPublicKeys();
        console.log(chalk_1.default.yellow('In a real scenario, you would fund these addresses:'));
        publicKeys.forEach((pubkey, index) => {
            console.log(chalk_1.default.gray(`  Wallet ${index + 1}: ${pubkey.toString()}`));
            console.log(chalk_1.default.gray(`    Recommended: 0.1-0.5 SOL for trading`));
        });
        console.log(chalk_1.default.green('\n✅ Fund distribution addresses displayed'));
    }
    /**
     * Simulate individual trades
     */
    async simulateTrading() {
        console.log(chalk_1.default.blue('\n📋 Step 3: Trading Simulation'));
        console.log(chalk_1.default.gray('─'.repeat(40)));
        const keypairs = this.walletManager.loadKeypairs();
        if (keypairs.length === 0) {
            throw new Error('No wallets available for trading simulation');
        }
        const tradingPairs = this.trader.getExampleTradingPairs();
        const testPair = tradingPairs[0];
        console.log(chalk_1.default.yellow(`Testing with pair: ${testPair.name}`));
        // Simulate multiple trades
        const results = [];
        for (let i = 0; i < 10; i++) {
            const keypair = keypairs[i % keypairs.length];
            const amount = 0.01 + Math.random() * 0.04; // 0.01-0.05 SOL
            const direction = Math.random() > 0.5;
            const result = await this.trader.executeSwap(keypair, testPair, direction, amount, 1 // 1% slippage
            );
            results.push(result);
            // Small delay between trades
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        // Display trading results
        this.trader.displayTradingStats(results);
        console.log(chalk_1.default.green('✅ Trading simulation completed'));
    }
    /**
     * Simulate the full volume bot
     */
    async simulateVolumeBot() {
        console.log(chalk_1.default.blue('\n📋 Step 4: Volume Bot Simulation'));
        console.log(chalk_1.default.gray('─'.repeat(40)));
        // Initialize bot
        const initialized = await this.volumeBot.initialize();
        if (!initialized) {
            throw new Error('Failed to initialize volume bot');
        }
        console.log(chalk_1.default.yellow('Simulating a short volume session...'));
        // Create a simple configuration for simulation
        const keypairs = this.walletManager.loadKeypairs();
        const tradingPairs = this.trader.getExampleTradingPairs();
        if (keypairs.length === 0 || tradingPairs.length === 0) {
            throw new Error('No wallets or trading pairs available');
        }
        // Run a quick simulation session (5 trades)
        const results = [];
        for (let i = 0; i < 5; i++) {
            console.log(chalk_1.default.blue(`  Simulating trade ${i + 1}/5`));
            const keypair = keypairs[i % keypairs.length];
            const pair = tradingPairs[0];
            const amount = 0.01 + Math.random() * 0.02;
            const result = await this.trader.executeSwap(keypair, pair, Math.random() > 0.5, amount);
            results.push(result);
            // Short delay
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        this.trader.displayTradingStats(results);
        console.log(chalk_1.default.green('✅ Volume bot simulation completed'));
    }
    /**
     * Display final simulation results
     */
    async displaySimulationResults() {
        console.log(chalk_1.default.cyan('\n🐒 Ape Simulation Complete! 🏔️'));
        console.log(chalk_1.default.cyan('═'.repeat(50)));
        console.log(chalk_1.default.green('✅ All ape systems tested successfully!'));
        console.log('');
        console.log(chalk_1.default.yellow('🦍 Next steps to dominate the hill:'));
        console.log(chalk_1.default.gray('1. Fund the generated wallets with real SOL'));
        console.log(chalk_1.default.gray('2. Configure your ape trading parameters'));
        console.log(chalk_1.default.gray('3. Switch to live mode (disable simulation)'));
        console.log(chalk_1.default.gray('4. Start with small banana amounts to test'));
        console.log(chalk_1.default.gray('5. Monitor your hill-climbing carefully'));
        console.log('');
        console.log(chalk_1.default.red('🦍 Ape Wisdom: Smart apes test with small bananas first!'));
        console.log(chalk_1.default.cyan('═'.repeat(50)));
        // Display final wallet summary
        await this.walletManager.displayWalletSummary();
    }
    /**
     * Clean up after simulation (optional)
     */
    async cleanup() {
        console.log(chalk_1.default.yellow('\n🧹 Cleaning up ape test data...'));
        this.walletManager.cleanupKeypairs();
        console.log(chalk_1.default.green('✅ Ape cleanup complete! 🐒'));
    }
}
// Handle process signals
process.on('SIGINT', () => {
    console.log(chalk_1.default.yellow('\n\n⏹️  Simulation interrupted'));
    process.exit(0);
});
// Main simulation runner
async function runSimulation() {
    const simulation = new VolumeSimulation();
    console.log(chalk_1.default.green('🐒 Welcome to Ape Of The Hill Simulation!'));
    console.log(chalk_1.default.yellow('Time to test our ape powers safely! 🏔️\n'));
    try {
        await simulation.runSimulation();
        // Ask if user wants to clean up
        console.log('\n');
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        readline.question(chalk_1.default.blue('Clean up test wallets? (y/N): '), async (answer) => {
            if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                await simulation.cleanup();
            }
            readline.close();
            process.exit(0);
        });
    }
    catch (error) {
        console.error(chalk_1.default.red(`\n💥 Simulation error: ${error}`));
        process.exit(1);
    }
}
// Run the simulation
runSimulation();
//# sourceMappingURL=simulate.js.map