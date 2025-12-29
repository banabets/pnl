"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FundManager = void 0;
const web3_js_1 = require("@solana/web3.js");
const config_1 = require("../config");
const wallet_1 = require("../wallet");
const master_wallet_1 = require("../master-wallet");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
class FundManager {
    constructor() {
        this.connection = config_1.config.connection;
        this.walletManager = new wallet_1.WalletManager();
        this.masterWalletManager = new master_wallet_1.MasterWalletManager();
    }
    /**
     * Distribute SOL to multiple wallets
     * This method does NOT require your main wallet private key!
     * Instead, you send SOL to the generated wallets manually or via another method
     */
    async distributeSol() {
        try {
            console.log(chalk_1.default.blue('💰 SOL Distribution Setup'));
            console.log(chalk_1.default.cyan('═'.repeat(50)));
            // Check if we have wallets
            if (!this.walletManager.hasWallets()) {
                console.log(chalk_1.default.red('❌ No wallets found. Generate wallets first!'));
                return false;
            }
            const walletCount = this.walletManager.getWalletCount();
            const publicKeys = this.walletManager.getPublicKeys();
            // Get distribution parameters
            const answers = await inquirer_1.default.prompt([
                {
                    type: 'number',
                    name: 'totalAmount',
                    message: `How much SOL to distribute across ${walletCount} wallets?`,
                    default: 0.1,
                    validate: (input) => {
                        if (input <= 0)
                            return 'Amount must be positive';
                        if (input > 10)
                            return 'Amount seems too large for safety (max 10 SOL)';
                        return true;
                    },
                },
                {
                    type: 'confirm',
                    name: 'evenDistribution',
                    message: 'Distribute evenly to all wallets?',
                    default: true,
                },
            ]);
            const { totalAmount, evenDistribution } = answers;
            const perWallet = evenDistribution ? totalAmount / walletCount : 0;
            // Display distribution plan
            console.log(chalk_1.default.yellow('\n📋 Distribution Plan:'));
            console.log(chalk_1.default.yellow('─'.repeat(40)));
            console.log(`Total Amount: ${totalAmount} SOL`);
            console.log(`Number of Wallets: ${walletCount}`);
            if (evenDistribution) {
                console.log(`Per Wallet: ${perWallet.toFixed(4)} SOL`);
            }
            // Show addresses for manual funding
            console.log(chalk_1.default.blue('\n📝 Wallet Addresses for Manual Funding:'));
            console.log(chalk_1.default.blue('─'.repeat(50)));
            publicKeys.forEach((pubkey, index) => {
                const amount = evenDistribution ? perWallet : 0;
                console.log(`Wallet ${index + 1}: ${pubkey.toString()}`);
                if (evenDistribution) {
                    console.log(`  Amount: ${amount.toFixed(4)} SOL`);
                }
                console.log('');
            });
            console.log(chalk_1.default.green('✅ Fund these wallets manually using your preferred method:'));
            console.log('   • Phantom/Solflare wallet transfer');
            console.log('   • CLI: solana transfer <amount> <address>');
            console.log('   • Exchange withdrawal');
            console.log('   • Any other secure method');
            const { proceed } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'proceed',
                    message: 'Have you funded these wallets and want to check balances?',
                    default: false,
                },
            ]);
            if (proceed) {
                await this.walletManager.displayWalletSummary();
            }
            return true;
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Distribution setup failed: ${error}`));
            return false;
        }
    }
    /**
     * Check current distribution status
     */
    async checkDistributionStatus() {
        console.log(chalk_1.default.blue('📊 Checking Distribution Status...'));
        await this.walletManager.displayWalletSummary();
    }
    /**
     * Recover all SOL from generated wallets to a specified address
     */
    async recoverAllFunds(destinationAddress) {
        const result = {
            totalRecovered: 0,
            successfulRecoveries: 0,
            failedRecoveries: 0,
            details: [],
        };
        try {
            console.log(chalk_1.default.blue('🔄 Starting Fund Recovery...'));
            const keypairs = this.walletManager.loadKeypairs();
            if (keypairs.length === 0) {
                console.log(chalk_1.default.yellow('No wallets found to recover from.'));
                return result;
            }
            // Get destination address if not provided
            let destination;
            if (destinationAddress) {
                try {
                    destination = new web3_js_1.PublicKey(destinationAddress);
                }
                catch (error) {
                    throw new Error(`Invalid destination address: ${destinationAddress}`);
                }
            }
            else {
                const { destAddress } = await inquirer_1.default.prompt([
                    {
                        type: 'input',
                        name: 'destAddress',
                        message: 'Enter destination address for recovered funds:',
                        validate: (input) => {
                            try {
                                new web3_js_1.PublicKey(input);
                                return true;
                            }
                            catch {
                                return 'Invalid Solana address';
                            }
                        },
                    },
                ]);
                destination = new web3_js_1.PublicKey(destAddress);
            }
            console.log(chalk_1.default.blue(`Recovering funds to: ${destination.toString()}`));
            // Process each wallet
            for (let i = 0; i < keypairs.length; i++) {
                const keypair = keypairs[i];
                const walletAddress = keypair.publicKey.toString();
                try {
                    const balance = await this.connection.getBalance(keypair.publicKey);
                    const balanceInSol = balance / web3_js_1.LAMPORTS_PER_SOL;
                    if (balance === 0) {
                        console.log(chalk_1.default.gray(`Wallet ${i + 1}: ${walletAddress.substring(0, 8)}... - Empty`));
                        result.details.push({
                            wallet: walletAddress,
                            amount: 0,
                            success: true,
                        });
                        continue;
                    }
                    // Calculate amount to send (leave some for transaction fees)
                    const rentExempt = 890880; // Rent-exempt minimum for account
                    const transactionFee = 5000; // Estimated transaction fee
                    const amountToSend = balance - rentExempt - transactionFee;
                    if (amountToSend <= 0) {
                        console.log(chalk_1.default.yellow(`Wallet ${i + 1}: ${walletAddress.substring(0, 8)}... - Insufficient balance for transfer`));
                        result.details.push({
                            wallet: walletAddress,
                            amount: balanceInSol,
                            success: false,
                            error: 'Insufficient balance for fees',
                        });
                        result.failedRecoveries++;
                        continue;
                    }
                    if (config_1.config.simulationMode) {
                        // Simulate recovery
                        console.log(chalk_1.default.yellow(`🧪 SIMULATION: Would recover ${(amountToSend / web3_js_1.LAMPORTS_PER_SOL).toFixed(4)} SOL from wallet ${i + 1}`));
                        result.totalRecovered += amountToSend / web3_js_1.LAMPORTS_PER_SOL;
                        result.successfulRecoveries++;
                        result.details.push({
                            wallet: walletAddress,
                            amount: amountToSend / web3_js_1.LAMPORTS_PER_SOL,
                            success: true,
                        });
                    }
                    else {
                        // Create transfer transaction
                        const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
                            fromPubkey: keypair.publicKey,
                            toPubkey: destination,
                            lamports: amountToSend,
                        }));
                        // Send transaction
                        const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [keypair], { commitment: 'confirmed' });
                        const recoveredSol = amountToSend / web3_js_1.LAMPORTS_PER_SOL;
                        console.log(chalk_1.default.green(`✅ Wallet ${i + 1}: Recovered ${recoveredSol.toFixed(4)} SOL - ${signature}`));
                        result.totalRecovered += recoveredSol;
                        result.successfulRecoveries++;
                        result.details.push({
                            wallet: walletAddress,
                            amount: recoveredSol,
                            success: true,
                        });
                    }
                }
                catch (error) {
                    console.error(chalk_1.default.red(`❌ Failed to recover from wallet ${i + 1}: ${error}`));
                    result.failedRecoveries++;
                    result.details.push({
                        wallet: walletAddress,
                        amount: 0,
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
                // Small delay between transactions
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            // Display summary
            this.displayRecoveryResults(result);
            return result;
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Recovery failed: ${error}`));
            throw error;
        }
    }
    /**
     * Display recovery results
     */
    displayRecoveryResults(result) {
        console.log(chalk_1.default.cyan('\n💼 Recovery Results'));
        console.log(chalk_1.default.cyan('═'.repeat(50)));
        console.log(`Total Recovered: ${chalk_1.default.green(result.totalRecovered.toFixed(4))} SOL`);
        console.log(`Successful: ${chalk_1.default.green(result.successfulRecoveries)}`);
        console.log(`Failed: ${chalk_1.default.red(result.failedRecoveries)}`);
        console.log(`Success Rate: ${((result.successfulRecoveries / result.details.length) * 100).toFixed(1)}%`);
        console.log(chalk_1.default.cyan('═'.repeat(50)));
        if (result.failedRecoveries > 0) {
            console.log(chalk_1.default.yellow('\n⚠️  Failed Recoveries:'));
            result.details
                .filter(d => !d.success)
                .forEach((detail, index) => {
                console.log(`  ${index + 1}. ${detail.wallet.substring(0, 8)}... - ${detail.error}`);
            });
        }
    }
    /**
     * Estimate total gas costs for fund operations
     */
    async estimateGasCosts(walletCount) {
        // Estimate based on current network conditions
        const transferFee = 5000; // lamports per transfer
        const accountCreationFee = 2039280; // lamports for account creation
        // Estimate for distribution + trading + recovery
        const estimatedTransactions = walletCount * 10; // Conservative estimate
        const totalFees = estimatedTransactions * transferFee;
        return totalFees / web3_js_1.LAMPORTS_PER_SOL;
    }
    /**
     * Distribute SOL from master wallet to trading wallets
     * This uses the master wallet that the bot controls
     */
    async distributeFromMaster() {
        try {
            console.log(chalk_1.default.blue('\n💰 DISTRIBUTE FROM MASTER WALLET'));
            console.log(chalk_1.default.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
            // Check if master wallet exists
            if (!this.masterWalletManager.masterWalletExists()) {
                console.log(chalk_1.default.red('❌ No master wallet found!'));
                console.log(chalk_1.default.yellow('   Create a master wallet first.\n'));
                return false;
            }
            // Check if we have trading wallets
            if (!this.walletManager.hasWallets()) {
                console.log(chalk_1.default.red('❌ No trading wallets found!'));
                console.log(chalk_1.default.yellow('   Generate trading wallets first.\n'));
                return false;
            }
            // Get master wallet info
            const masterInfo = await this.masterWalletManager.getMasterWalletInfo(this.connection);
            const walletCount = this.walletManager.getWalletCount();
            console.log(chalk_1.default.yellow('Master Wallet Balance:'));
            console.log(chalk_1.default.green(`  ${masterInfo.balance.toFixed(4)} SOL\n`));
            if (!config_1.config.simulationMode && masterInfo.balance <= 0.01) {
                console.log(chalk_1.default.red('❌ Master wallet has insufficient balance!'));
                console.log(chalk_1.default.yellow('   Fund the master wallet first.\n'));
                return false;
            }
            // Get distribution parameters
            const answers = await inquirer_1.default.prompt([
                {
                    type: 'number',
                    name: 'totalAmount',
                    message: `How much SOL to distribute across ${walletCount} trading wallets?`,
                    default: Math.min(0.5, masterInfo.balance * 0.8),
                    validate: (input) => {
                        if (input <= 0)
                            return 'Amount must be positive';
                        if (input > masterInfo.balance)
                            return `Not enough balance (${masterInfo.balance.toFixed(4)} SOL available)`;
                        return true;
                    },
                },
                {
                    type: 'confirm',
                    name: 'evenDistribution',
                    message: 'Distribute evenly to all trading wallets?',
                    default: true,
                },
            ]);
            const { totalAmount, evenDistribution } = answers;
            const perWallet = evenDistribution ? totalAmount / walletCount : 0;
            // Display distribution plan
            console.log(chalk_1.default.yellow('\n📋 Distribution Plan:'));
            console.log(chalk_1.default.yellow('─'.repeat(50)));
            console.log(`From: Master Wallet`);
            console.log(`Total Amount: ${totalAmount.toFixed(4)} SOL`);
            console.log(`Trading Wallets: ${walletCount}`);
            console.log(`Per Wallet: ${perWallet.toFixed(4)} SOL`);
            console.log(chalk_1.default.yellow('─'.repeat(50)));
            const { confirm } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Proceed with distribution?',
                    default: true,
                },
            ]);
            if (!confirm) {
                console.log(chalk_1.default.yellow('❌ Distribution cancelled.\n'));
                return false;
            }
            // Execute distribution
            if (config_1.config.simulationMode) {
                console.log(chalk_1.default.magenta('\n🧪 SIMULATION MODE - Distribution\n'));
                const publicKeys = this.walletManager.getPublicKeys();
                publicKeys.forEach((pubkey, index) => {
                    console.log(chalk_1.default.gray(`✓ Wallet ${index + 1}: ${pubkey.toString().substring(0, 8)}... → ${perWallet.toFixed(4)} SOL`));
                });
                console.log(chalk_1.default.green('\n✅ Distribution complete (simulated)\n'));
                return true;
            }
            // Real distribution
            const masterWallet = this.masterWalletManager.loadMasterWallet();
            const keypairs = this.walletManager.loadKeypairs();
            console.log(chalk_1.default.yellow('\n📡 Distributing funds...\n'));
            let successCount = 0;
            let failCount = 0;
            for (let i = 0; i < keypairs.length; i++) {
                const recipient = keypairs[i].publicKey;
                const amount = perWallet;
                try {
                    const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
                        fromPubkey: masterWallet.publicKey,
                        toPubkey: recipient,
                        lamports: Math.floor(amount * web3_js_1.LAMPORTS_PER_SOL),
                    }));
                    await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [masterWallet], { commitment: 'confirmed' });
                    console.log(chalk_1.default.green(`✓ Wallet ${i + 1}: ${recipient.toString().substring(0, 8)}... → ${amount.toFixed(4)} SOL`));
                    successCount++;
                }
                catch (error) {
                    console.log(chalk_1.default.red(`✗ Wallet ${i + 1}: Failed - ${error}`));
                    failCount++;
                }
            }
            console.log(chalk_1.default.blue('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
            console.log(chalk_1.default.green(`✅ Distribution Complete!`));
            console.log(`   Successful: ${successCount}/${keypairs.length}`);
            if (failCount > 0) {
                console.log(chalk_1.default.yellow(`   Failed: ${failCount}`));
            }
            console.log(chalk_1.default.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
            return successCount > 0;
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Distribution failed: ${error}\n`));
            return false;
        }
    }
    /**
     * Recover all funds from trading wallets back to master wallet
     */
    async recoverToMaster() {
        const result = {
            totalRecovered: 0,
            successfulRecoveries: 0,
            failedRecoveries: 0,
            details: [],
        };
        try {
            console.log(chalk_1.default.blue('\n🔄 RECOVER FUNDS TO MASTER WALLET'));
            console.log(chalk_1.default.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
            // Check if master wallet exists
            if (!this.masterWalletManager.masterWalletExists()) {
                console.log(chalk_1.default.red('❌ No master wallet found!\n'));
                return result;
            }
            const masterWallet = this.masterWalletManager.loadMasterWallet();
            const destinationAddress = masterWallet.publicKey.toBase58();
            console.log(chalk_1.default.yellow('Recovery Destination:'));
            console.log(chalk_1.default.cyan(`  ${destinationAddress}\n`));
            // Use existing recovery logic but send to master wallet
            return await this.recoverAllFunds(destinationAddress);
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Recovery to master failed: ${error}\n`));
            return result;
        }
    }
}
exports.FundManager = FundManager;
//# sourceMappingURL=index.js.map