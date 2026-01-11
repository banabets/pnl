"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletManager = void 0;
const web3_js_1 = require("@solana/web3.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_1 = require("../config");
const chalk_1 = __importDefault(require("chalk"));
class WalletManager {
    constructor() {
        this.keypairsDir = path.resolve(config_1.config.keypairsDir);
        this.ensureKeypairsDirectory();
    }
    /**
     * Ensure the keypairs directory exists
     */
    ensureKeypairsDirectory() {
        if (!fs.existsSync(this.keypairsDir)) {
            fs.mkdirSync(this.keypairsDir, { recursive: true });
            console.log(chalk_1.default.green(`💰 Created keypairs directory: ${this.keypairsDir}`));
        }
    }
    /**
     * Generate a specified number of new keypairs
     * NOTE: This does not require or store your main wallet private key!
     */
    generateKeypairs(count) {
        if (count <= 0 || count > 20) {
            throw new Error('Keypair count must be between 1 and 20 for safety');
        }
        console.log(chalk_1.default.blue(`� Generating ${count} new ape keypairs for hill domination...`));
        const keypairs = [];
        for (let i = 0; i < count; i++) {
            const keypair = web3_js_1.Keypair.generate();
            keypairs.push(keypair);
            // Save to file with encryption-ready format
            this.saveKeypairToFile(keypair, i + 1);
            console.log(chalk_1.default.gray(`  Wallet ${i + 1}: ${keypair.publicKey.toString()}`));
        }
        console.log(chalk_1.default.green(`✅ Generated ${count} keypairs successfully!`));
        return keypairs;
    }
    /**
     * Save a keypair to an encrypted file
     */
    saveKeypairToFile(keypair, index) {
        const filePath = path.join(this.keypairsDir, `keypair_${index}.json`);
        // Store as array of numbers (standard Solana format)
        const secretKeyArray = Array.from(keypair.secretKey);
        const walletData = {
            publicKey: keypair.publicKey.toString(),
            secretKey: secretKeyArray,
            createdAt: new Date().toISOString(),
            index: index
        };
        fs.writeFileSync(filePath, JSON.stringify(walletData, null, 2));
        
        // CRITICAL: Also create a backup file with timestamp
        try {
            const backupDir = path.join(this.keypairsDir, 'backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            const backupPath = path.join(backupDir, `keypair_${index}_${Date.now()}.json`);
            fs.writeFileSync(backupPath, JSON.stringify(walletData, null, 2));
            console.log(chalk_1.default.green(`💾 Backup saved: ${backupPath}`));
        } catch (backupError) {
            console.warn(chalk_1.default.yellow(`⚠️  Could not create backup: ${backupError}`));
        }
    }
    /**
     * Load all existing keypairs from the directory
     */
    loadKeypairs() {
        if (!fs.existsSync(this.keypairsDir)) {
            return [];
        }
        const files = fs.readdirSync(this.keypairsDir)
            .filter(file => file.startsWith('keypair_') && file.endsWith('.json'))
            .sort();
        const keypairs = [];
        for (const file of files) {
            try {
                const filePath = path.join(this.keypairsDir, file);
                const walletData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                if (walletData.secretKey && Array.isArray(walletData.secretKey)) {
                    const keypair = web3_js_1.Keypair.fromSecretKey(new Uint8Array(walletData.secretKey));
                    keypairs.push(keypair);
                }
            }
            catch (error) {
                console.warn(chalk_1.default.yellow(`⚠️  Failed to load keypair from ${file}: ${error}`));
            }
        }
        return keypairs;
    }
    /**
     * Get wallet information including balances
     */
    async getWalletSummary() {
        const keypairs = this.loadKeypairs();
        const wallets = [];
        let totalBalance = 0;
        console.log(chalk_1.default.blue('📊 Fetching wallet balances...'));
        for (let i = 0; i < keypairs.length; i++) {
            try {
                const balance = await config_1.config.connection.getBalance(keypairs[i].publicKey);
                const balanceInSol = balance / web3_js_1.LAMPORTS_PER_SOL;
                wallets.push({
                    publicKey: keypairs[i].publicKey.toString(),
                    balance: balanceInSol,
                    index: i + 1
                });
                totalBalance += balanceInSol;
            }
            catch (error) {
                console.warn(chalk_1.default.yellow(`⚠️  Failed to fetch balance for wallet ${i + 1}`));
                wallets.push({
                    publicKey: keypairs[i].publicKey.toString(),
                    balance: 0,
                    index: i + 1
                });
            }
        }
        return {
            totalWallets: keypairs.length,
            totalBalance,
            wallets
        };
    }
    /**
     * Display wallet summary in a nice format
     */
    async displayWalletSummary() {
        const summary = await this.getWalletSummary();
        console.log(chalk_1.default.cyan('\n💼 Wallet Summary'));
        console.log(chalk_1.default.cyan('═'.repeat(60)));
        console.log(`Total Wallets: ${summary.totalWallets}`);
        console.log(`Total Balance: ${chalk_1.default.green(summary.totalBalance.toFixed(4))} SOL`);
        console.log(chalk_1.default.cyan('─'.repeat(60)));
        if (summary.wallets.length === 0) {
            console.log(chalk_1.default.yellow('No wallets found. Generate some first!'));
            return;
        }
        summary.wallets.forEach(wallet => {
            const balanceColor = wallet.balance > 0 ? chalk_1.default.green : chalk_1.default.gray;
            const balanceText = balanceColor(`${wallet.balance.toFixed(4)} SOL`);
            console.log(`Wallet ${wallet.index}: ${wallet.publicKey.substring(0, 8)}...${wallet.publicKey.substring(-8)} | ${balanceText}`);
        });
        console.log(chalk_1.default.cyan('═'.repeat(60)));
    }
    /**
     * Clean up - remove all keypair files
     * WARNING: This will permanently delete all generated wallets!
     */
    cleanupKeypairs() {
        if (!fs.existsSync(this.keypairsDir)) {
            console.log(chalk_1.default.yellow('No keypairs directory found.'));
            return;
        }
        const files = fs.readdirSync(this.keypairsDir)
            .filter(file => file.startsWith('keypair_') && file.endsWith('.json'));
        if (files.length === 0) {
            console.log(chalk_1.default.yellow('No keypair files found.'));
            return;
        }
        console.log(chalk_1.default.red(`⚠️  This will permanently delete ${files.length} keypair files!`));
        for (const file of files) {
            const filePath = path.join(this.keypairsDir, file);
            fs.unlinkSync(filePath);
        }
        console.log(chalk_1.default.green(`✅ Cleaned up ${files.length} keypair files.`));
    }
    /**
     * Get public keys only (for airdrops, fund distribution, etc.)
     */
    getPublicKeys() {
        const keypairs = this.loadKeypairs();
        return keypairs.map(kp => kp.publicKey);
    }
    /**
     * Check if any wallets exist
     */
    hasWallets() {
        return this.loadKeypairs().length > 0;
    }
    /**
     * Get the number of existing wallets
     */
    getWalletCount() {
        return this.loadKeypairs().length;
    }
}
exports.WalletManager = WalletManager;
//# sourceMappingURL=index.js.map