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
exports.MasterWalletManager = void 0;
const web3_js_1 = require("@solana/web3.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_1 = require("../config");
const chalk_1 = __importDefault(require("chalk"));
class MasterWalletManager {
    constructor() {
        this.keypairsDir = path.resolve(config_1.config.keypairsDir);
        this.masterWalletPath = path.join(this.keypairsDir, 'master-wallet.json');
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
     * Check if master wallet exists
     */
    masterWalletExists() {
        return fs.existsSync(this.masterWalletPath);
    }
    /**
     * Create a new master wallet
     * This is the central wallet that manages all funds
     */
    createMasterWallet() {
        if (this.masterWalletExists()) {
            throw new Error('Master wallet already exists! Delete it first if you want to create a new one.');
        }
        console.log(chalk_1.default.blue('🏦 Creating master ape wallet for hill domination...'));
        const masterKeypair = web3_js_1.Keypair.generate();
        // Save the master wallet
        const secretKeyArray = Array.from(masterKeypair.secretKey);
        fs.writeFileSync(this.masterWalletPath, JSON.stringify(secretKeyArray, null, 2));
        console.log(chalk_1.default.green('✅ Master wallet created successfully!'));
        console.log(chalk_1.default.yellow('\n🔑 Master Wallet Address:'));
        console.log(chalk_1.default.cyan(`   ${masterKeypair.publicKey.toBase58()}\n`));
        console.log(chalk_1.default.gray('💡 Fund this address with SOL to start trading!\n'));
        return masterKeypair;
    }
    /**
     * Load the master wallet
     */
    loadMasterWallet() {
        if (!this.masterWalletExists()) {
            throw new Error('Master wallet does not exist! Create one first.');
        }
        const secretKeyString = fs.readFileSync(this.masterWalletPath, 'utf-8');
        const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
        return web3_js_1.Keypair.fromSecretKey(secretKey);
    }
    /**
     * Get master wallet info including balance
     */
    async getMasterWalletInfo(connection) {
        if (!this.masterWalletExists()) {
            return {
                publicKey: 'N/A',
                balance: 0,
                exists: false
            };
        }
        const masterWallet = this.loadMasterWallet();
        // Simulation mode removed - always get real balance
        // if (false) { // Simulation mode removed - always real
        //     return {
        //         publicKey: masterWallet.publicKey.toBase58(),
        //         balance: 5.0, // Simulated balance
        //         exists: true
        //     };
        // }
        const balance = await connection.getBalance(masterWallet.publicKey);
        return {
            publicKey: masterWallet.publicKey.toBase58(),
            balance: balance / web3_js_1.LAMPORTS_PER_SOL,
            exists: true
        };
    }
    /**
     * Display master wallet information
     */
    async displayMasterWalletInfo(connection) {
        console.log(chalk_1.default.blue('\n🏦 MASTER APE WALLET INFO'));
        console.log(chalk_1.default.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
        const info = await this.getMasterWalletInfo(connection);
        if (!info.exists) {
            console.log(chalk_1.default.yellow('⚠️  No master wallet found.'));
            console.log(chalk_1.default.gray('   Create one to get started!\n'));
            return;
        }
        console.log(chalk_1.default.yellow('Address:'));
        console.log(chalk_1.default.cyan(`  ${info.publicKey}\n`));
        console.log(chalk_1.default.yellow('Balance:'));
        console.log(chalk_1.default.green(`  ${info.balance.toFixed(4)} SOL\n`));
        // Simulation mode removed - always real balance
        // if (false) { // Simulation mode removed - always real
        //     console.log(chalk_1.default.magenta('🧪 Simulation Mode - Balance is simulated\n'));
        // }
    }
    /**
     * Delete the master wallet
     * WARNING: This will permanently delete the master wallet!
     */
    deleteMasterWallet() {
        if (!this.masterWalletExists()) {
            throw new Error('No master wallet to delete!');
        }
        console.log(chalk_1.default.yellow('⚠️  Deleting master wallet...'));
        fs.unlinkSync(this.masterWalletPath);
        console.log(chalk_1.default.green('✅ Master wallet deleted successfully!'));
    }
    /**
     * Export master wallet private key
     * Use this to import the wallet into Phantom/Solflare
     */
    exportMasterWalletKey() {
        if (!this.masterWalletExists()) {
            throw new Error('No master wallet to export!');
        }
        const masterWallet = this.loadMasterWallet();
        const secretKeyArray = Array.from(masterWallet.secretKey);
        console.log(chalk_1.default.yellow('\n🔑 MASTER WALLET PRIVATE KEY (Keep this SECRET!):'));
        console.log(chalk_1.default.red('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
        console.log(chalk_1.default.gray('Secret Key (Array format):'));
        console.log(chalk_1.default.cyan(`[${secretKeyArray.join(',')}]\n`));
        console.log(chalk_1.default.gray('Public Address:'));
        console.log(chalk_1.default.cyan(`${masterWallet.publicKey.toBase58()}\n`));
        console.log(chalk_1.default.red('⚠️  NEVER share this key with anyone!\n'));
        return JSON.stringify(secretKeyArray);
    }
    /**
     * Withdraw all funds from master wallet to a specified address
     */
    async withdrawFromMaster(connection, destinationAddress, amount) {
        const masterWallet = this.loadMasterWallet();
        // Simulation mode removed - always execute real withdrawals
        // if (config_1.config.simulationMode) {
        //     console.log(chalk_1.default.magenta('\n🧪 SIMULATION MODE - Withdraw Operation\n'));
        //     console.log(chalk_1.default.gray(`From: ${masterWallet.publicKey.toBase58()}`));
        //     console.log(chalk_1.default.gray(`To: ${destinationAddress}`));
        //     console.log(chalk_1.default.gray(`Amount: ${amount || 'ALL'} SOL`));
        //     console.log(chalk_1.default.green('\n✅ Would have withdrawn funds (simulation)\n'));
        //     return;
        // }
        const balance = await connection.getBalance(masterWallet.publicKey);
        const balanceInSol = balance / web3_js_1.LAMPORTS_PER_SOL;
        console.log(chalk_1.default.blue('\n💸 WITHDRAWING FROM MASTER WALLET'));
        console.log(chalk_1.default.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
        if (balance === 0) {
            console.log(chalk_1.default.red('❌ Master wallet has no balance to withdraw!\n'));
            return;
        }
        // Calculate amount to send (leave some for transaction fee)
        const txFee = 0.000005; // 5000 lamports
        const withdrawAmount = amount || (balanceInSol - txFee);
        if (withdrawAmount <= 0) {
            console.log(chalk_1.default.red('❌ Not enough balance to cover transaction fee!\n'));
            return;
        }
        console.log(chalk_1.default.gray(`Current Balance: ${balanceInSol.toFixed(6)} SOL`));
        console.log(chalk_1.default.gray(`Withdraw Amount: ${withdrawAmount.toFixed(6)} SOL`));
        console.log(chalk_1.default.gray(`Transaction Fee: ~${txFee.toFixed(6)} SOL`));
        console.log(chalk_1.default.gray(`Destination: ${destinationAddress}\n`));
        try {
            const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
                fromPubkey: masterWallet.publicKey,
                toPubkey: new web3_js_1.PublicKey(destinationAddress),
                lamports: Math.floor(withdrawAmount * web3_js_1.LAMPORTS_PER_SOL)
            }));
            console.log(chalk_1.default.yellow('📡 Sending transaction...'));
            const signature = await (0, web3_js_1.sendAndConfirmTransaction)(connection, transaction, [masterWallet]);
            console.log(chalk_1.default.green(`✅ Withdrawal successful!`));
            console.log(chalk_1.default.gray(`Transaction: ${signature}\n`));
        }
        catch (error) {
            console.log(chalk_1.default.red(`❌ Withdrawal failed: ${error}\n`));
            throw error;
        }
    }
    /**
     * Get the master wallet's public key as a string
     */
    getMasterWalletAddress() {
        if (!this.masterWalletExists()) {
            return null;
        }
        const masterWallet = this.loadMasterWallet();
        return masterWallet.publicKey.toBase58();
    }
}
exports.MasterWalletManager = MasterWalletManager;
//# sourceMappingURL=index.js.map