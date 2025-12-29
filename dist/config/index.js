"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configManager = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const web3_js_1 = require("@solana/web3.js");
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config();
class ConfigManager {
    constructor() {
        this.config = this.loadConfig();
        this.validateConfig();
    }
    loadConfig() {
        return {
            // Network
            rpcUrl: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
            connection: new web3_js_1.Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed'),
            // Trading
            slippageBps: parseInt(process.env.SLIPPAGE_BPS || '50'),
            minSolBalance: parseFloat(process.env.MIN_SOL_BALANCE || '0.1'),
            maxSolPerSwap: parseFloat(process.env.MAX_SOL_PER_SWAP || '0.05'),
            // Bot behavior
            swapDelayMs: parseInt(process.env.SWAP_DELAY_MS || '3000'),
            maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
            // Jito
            jitoTipLamports: parseInt(process.env.JITO_TIP_LAMPORTS || '10000'),
            useJito: process.env.USE_JITO === 'true',
            // Safety
            simulationMode: false, // Always false - simulation removed
            maxDailyVolumeSol: parseFloat(process.env.MAX_DAILY_VOLUME_SOL || '10.0'),
            // Paths
            keypairsDir: process.env.KEYPAIRS_DIR || './keypairs'
        };
    }
    validateConfig() {
        const errors = [];
        if (!this.config.rpcUrl) {
            errors.push('RPC_URL is required');
        }
        if (this.config.slippageBps < 1 || this.config.slippageBps > 1000) {
            errors.push('SLIPPAGE_BPS must be between 1 and 1000');
        }
        if (this.config.minSolBalance < 0) {
            errors.push('MIN_SOL_BALANCE must be positive');
        }
        if (this.config.maxSolPerSwap < 0 || this.config.maxSolPerSwap > 1) {
            errors.push('MAX_SOL_PER_SWAP should be between 0 and 1 SOL for safety');
        }
        if (this.config.swapDelayMs < 1000) {
            errors.push('SWAP_DELAY_MS should be at least 1000ms to avoid rate limiting');
        }
        if (this.config.maxDailyVolumeSol < 0) {
            errors.push('MAX_DAILY_VOLUME_SOL must be positive');
        }
        if (errors.length > 0) {
            throw new Error(`Configuration errors:\n${errors.join('\n')}`);
        }
    }
    getConfig() {
        // Always ensure simulationMode is false
        this.config.simulationMode = false;
        return this.config;
    }
    isMainnet() {
        return !this.config.rpcUrl.includes('devnet') && !this.config.rpcUrl.includes('testnet');
    }
    getKeypairsPath() {
        return path_1.default.resolve(this.config.keypairsDir);
    }
    updateSimulationMode(enabled) {
        // Simulation mode removed - always keep it false
        this.config.simulationMode = false;
    }
    displayConfig() {
        console.log('\n🔧 Bot Configuration:');
        console.log('━'.repeat(50));
        console.log(`RPC URL: ${this.config.rpcUrl}`);
        console.log(`Network: ${this.isMainnet() ? 'Mainnet' : 'Devnet/Testnet'}`);
        console.log(`Simulation Mode: ${this.config.simulationMode ? '✅ ON (Safe)' : '⚠️  OFF (Live Trading)'}`);
        console.log(`Slippage: ${this.config.slippageBps / 100}%`);
        console.log(`Min SOL Balance: ${this.config.minSolBalance} SOL`);
        console.log(`Max SOL per Swap: ${this.config.maxSolPerSwap} SOL`);
        console.log(`Swap Delay: ${this.config.swapDelayMs}ms`);
        console.log(`Daily Volume Limit: ${this.config.maxDailyVolumeSol} SOL`);
        console.log(`Use Jito: ${this.config.useJito ? 'Yes' : 'No'}`);
        console.log('━'.repeat(50));
        if (!this.config.simulationMode && this.isMainnet()) {
            console.log('⚠️  WARNING: You are in LIVE TRADING mode on MAINNET!');
            console.log('⚠️  Double-check all settings before proceeding.');
        }
    }
}
// Singleton instance
exports.config = new ConfigManager().getConfig();
exports.configManager = new ConfigManager();
exports.default = exports.configManager;
//# sourceMappingURL=index.js.map