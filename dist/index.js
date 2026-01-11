#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const config_1 = require("./config");
const wallet_1 = require("./wallet");
const funds_1 = require("./funds");
const bot_1 = require("./bot");
const master_wallet_1 = require("./master-wallet");
class SecureVolumeBotCLI {
    constructor() {
        this.walletManager = new wallet_1.WalletManager();
        this.fundManager = new funds_1.FundManager();
        this.volumeBot = new bot_1.VolumeBot();
        this.masterWalletManager = new master_wallet_1.MasterWalletManager();
    }
    /**
     * Main entry point
     */
    async run() {
        try {
            this.displayWelcome();
            config_1.configManager.displayConfig();
            let running = true;
            while (running) {
                const choice = await this.showMainMenu();
                switch (choice) {
                    case 'create-master':
                        await this.createMasterWallet();
                        break;
                    case 'view-master':
                        await this.viewMasterWallet();
                        break;
                    case 'fund-trading':
                        await this.fundTradingWallets();
                        break;
                    case 'withdraw-master':
                        await this.withdrawFromMaster();
                        break;
                    case 'export-master':
                        await this.exportMasterKey();
                        break;
                    case 'delete-master':
                        await this.deleteMasterWallet();
                        break;
                    case 'generate-wallets':
                        await this.generateWallets();
                        break;
                    case 'view-wallets':
                        await this.viewWallets();
                        break;
                    case 'distribute-funds':
                        await this.distributeFunds();
                        break;
                    case 'start-volume':
                        await this.startVolumeGeneration();
                        break;
                    case 'recover-funds':
                        await this.recoverFunds();
                        break;
                    case 'bot-status':
                        await this.showBotStatus();
                        break;
                    case 'settings':
                        await this.showSettings();
                        break;
                    case 'cleanup':
                        await this.cleanupWallets();
                        break;
                    case 'exit':
                        running = false;
                        break;
                }
            }
            console.log(chalk_1.default.green('\n� Thanks for choosing PNL Trading Bot! Happy trading! 🏔️'));
            process.exit(0);
        }
        catch (error) {
            console.error(chalk_1.default.red(`\n❌ Application error: ${error}`));
            process.exit(1);
        }
    }
    /**
     * Display welcome message
     */
    displayWelcome() {
        console.clear();
        console.log(chalk_1.default.cyan('╔═══════════════════════════════════════════════╗'));
        console.log(chalk_1.default.cyan('║      💰 PNL TRADING BOT v1.0      ║'));
        console.log(chalk_1.default.cyan('║                                               ║'));
        console.log(chalk_1.default.cyan('║  🔒 Secure • 🧪 Testable • 📊 Transparent     ║'));
        console.log(chalk_1.default.cyan('║        "Track profits, minimize losses!"   ║'));
        console.log(chalk_1.default.cyan('╚═══════════════════════════════════════════════╝'));
        console.log(chalk_1.default.yellow('\n⚠️  IMPORTANT DISCLAIMERS:'));
        console.log(chalk_1.default.yellow('   • Use at your own risk'));
        console.log(chalk_1.default.yellow('   • Test with small amounts first'));
        console.log(chalk_1.default.yellow('   • Check local regulations'));
        console.log(chalk_1.default.yellow('   • Not financial advice\n'));
    }
    /**
     * Show main menu
     */
    async showMainMenu() {
        console.log('\n');
        // Check master wallet status
        const hasMasterWallet = this.masterWalletManager.masterWalletExists();
        const { choice } = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'choice',
                message: 'What would you like to do?',
                choices: [
                    new inquirer_1.default.Separator('─── 🏦 MASTER WALLET ───'),
                    {
                        name: hasMasterWallet ? '✅ Master Wallet (Created)' : '🏦 Create Master Wallet',
                        value: hasMasterWallet ? 'view-master' : 'create-master',
                        short: 'Master',
                    },
                    ...(hasMasterWallet ? [
                        {
                            name: '� Fund Trading Wallets (from Master)',
                            value: 'fund-trading',
                            short: 'Fund Trading',
                        },
                        {
                            name: '💸 Withdraw from Master',
                            value: 'withdraw-master',
                            short: 'Withdraw',
                        },
                        {
                            name: '� Export Master Key',
                            value: 'export-master',
                            short: 'Export',
                        },
                        {
                            name: '🗑️  Delete Master Wallet',
                            value: 'delete-master',
                            short: 'Delete Master',
                        },
                    ] : []),
                    new inquirer_1.default.Separator('─── 🎯 TRADING WALLETS ───'),
                    {
                        name: '🔑 Generate Trading Wallets',
                        value: 'generate-wallets',
                        short: 'Generate',
                    },
                    {
                        name: '👀 View Trading Wallets',
                        value: 'view-wallets',
                        short: 'View',
                    },
                    new inquirer_1.default.Separator('─── 🚀 VOLUME BOT ───'),
                    {
                        name: '🚀 Start Volume Generation',
                        value: 'start-volume',
                        short: 'Volume',
                    },
                    {
                        name: '🔄 Recover Funds to Master',
                        value: 'recover-funds',
                        short: 'Recover',
                    },
                    new inquirer_1.default.Separator('─── ⚙️  ADVANCED ───'),
                    {
                        name: '💰 Manual Fund Distribution',
                        value: 'distribute-funds',
                        short: 'Distribute',
                    },
                    {
                        name: '📊 Bot Status',
                        value: 'bot-status',
                        short: 'Status',
                    },
                    {
                        name: '⚙️  Settings',
                        value: 'settings',
                        short: 'Settings',
                    },
                    {
                        name: '🧹 Cleanup All Wallets',
                        value: 'cleanup',
                        short: 'Cleanup',
                    },
                    new inquirer_1.default.Separator(),
                    {
                        name: '🚪 Exit',
                        value: 'exit',
                        short: 'Exit',
                    },
                ],
            },
        ]);
        return choice;
    }
    /**
     * Generate new wallets
     */
    async generateWallets() {
        try {
            console.log(chalk_1.default.blue('\n🔑 Wallet Generation'));
            console.log(chalk_1.default.cyan('═'.repeat(40)));
            if (this.walletManager.hasWallets()) {
                const { proceed } = await inquirer_1.default.prompt([
                    {
                        type: 'confirm',
                        name: 'proceed',
                        message: 'You already have wallets. Generate new ones? (This will not delete existing ones)',
                        default: false,
                    },
                ]);
                if (!proceed)
                    return;
            }
            const { count } = await inquirer_1.default.prompt([
                {
                    type: 'number',
                    name: 'count',
                    message: 'How many wallets to generate?',
                    default: 5,
                    validate: (input) => {
                        if (input < 1 || input > 20)
                            return 'Must be between 1 and 20';
                        return true;
                    },
                },
            ]);
            const keypairs = this.walletManager.generateKeypairs(count);
            console.log(chalk_1.default.green(`\n✅ Generated ${keypairs.length} wallets successfully!`));
            await this.walletManager.displayWalletSummary();
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Failed to generate wallets: ${error}`));
        }
    }
    /**
     * View existing wallets
     */
    async viewWallets() {
        console.log(chalk_1.default.blue('\n👀 Wallet Overview'));
        await this.walletManager.displayWalletSummary();
    }
    /**
     * Distribute funds to wallets
     */
    async distributeFunds() {
        await this.fundManager.distributeSol();
    }
    /**
     * Start volume generation
     */
    async startVolumeGeneration() {
        try {
            const initialized = await this.volumeBot.initialize();
            if (initialized) {
                await this.volumeBot.startVolumeSession();
            }
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Volume generation failed: ${error}`));
        }
    }
    /**
     * Recover funds from wallets
     */
    async recoverFunds() {
        try {
            console.log(chalk_1.default.blue('\n🔄 Fund Recovery'));
            console.log(chalk_1.default.cyan('═'.repeat(40)));
            if (!this.walletManager.hasWallets()) {
                console.log(chalk_1.default.yellow('No wallets found to recover from.'));
                return;
            }
            // Check if master wallet exists
            const hasMasterWallet = this.masterWalletManager.masterWalletExists();
            if (hasMasterWallet) {
                console.log(chalk_1.default.yellow('🏦 Master wallet detected!'));
                console.log(chalk_1.default.gray('   Funds will be recovered to your master wallet.\n'));
            }
            const { confirm } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: hasMasterWallet
                        ? 'Recover all funds to master wallet?'
                        : 'Start fund recovery process?',
                    default: false,
                },
            ]);
            if (confirm) {
                if (hasMasterWallet) {
                    await this.fundManager.recoverToMaster();
                }
                else {
                    await this.fundManager.recoverAllFunds();
                }
            }
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Fund recovery failed: ${error}`));
        }
    }
    /**
     * Show bot status
     */
    async showBotStatus() {
        await this.volumeBot.displayBotStatus();
    }
    /**
     * Show settings menu
     */
    async showSettings() {
        console.log(chalk_1.default.blue('\n⚙️  Settings'));
        console.log(chalk_1.default.cyan('═'.repeat(30)));
        const { setting } = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'setting',
                message: 'What would you like to configure?',
                choices: [
                    {
                        name: `Simulation Mode: ${config_1.configManager.getConfig().simulationMode ? '🧪 ON' : '⚠️  OFF'}`,
                        value: 'simulation',
                    },
                    {
                        name: 'View Current Configuration',
                        value: 'view-config',
                    },
                    {
                        name: 'Back to Main Menu',
                        value: 'back',
                    },
                ],
            },
        ]);
        switch (setting) {
            case 'simulation':
                await this.toggleSimulationMode();
                break;
            case 'view-config':
                config_1.configManager.displayConfig();
                break;
            case 'back':
                return;
        }
    }
    /**
     * Toggle simulation mode
     */
    async toggleSimulationMode() {
        const currentMode = config_1.configManager.getConfig().simulationMode;
        const { newMode } = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'newMode',
                message: 'Select mode:',
                default: currentMode,
                choices: [
                    {
                        name: '🧪 Simulation Mode (Safe - No real trades)',
                        value: true,
                    },
                    {
                        name: '⚠️  Live Trading Mode (Real funds at risk)',
                        value: false,
                    },
                ],
            },
        ]);
        if (!currentMode && newMode === false) {
            const { confirmLive } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirmLive',
                    message: '⚠️  Are you absolutely sure you want to enable LIVE trading with real funds?',
                    default: false,
                },
            ]);
            if (!confirmLive) {
                console.log(chalk_1.default.yellow('Staying in simulation mode for safety.'));
                return;
            }
        }
        config_1.configManager.updateSimulationMode(newMode);
        console.log(chalk_1.default.green(`✅ Mode updated to: ${newMode ? '🧪 Simulation' : '⚠️  Live Trading'}`));
    }
    /**
     * Cleanup wallets
     */
    async cleanupWallets() {
        console.log(chalk_1.default.red('\n🧹 Wallet Cleanup'));
        console.log(chalk_1.default.red('═'.repeat(30)));
        console.log(chalk_1.default.red('⚠️  WARNING: This will permanently delete all wallet files!'));
        console.log(chalk_1.default.red('⚠️  Make sure you have recovered all funds first!'));
        const { confirm1 } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'confirm1',
                message: 'Are you sure you want to delete all wallets?',
                default: false,
            },
        ]);
        if (!confirm1) {
            console.log(chalk_1.default.yellow('Cleanup cancelled.'));
            return;
        }
        const { confirm2 } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'confirm2',
                message: 'This action cannot be undone. Proceed with deletion?',
                default: false,
            },
        ]);
        if (confirm2) {
            this.walletManager.cleanupKeypairs();
        }
        else {
            console.log(chalk_1.default.yellow('Cleanup cancelled.'));
        }
    }
    /**
     * Create master wallet
     */
    async createMasterWallet() {
        try {
            if (this.masterWalletManager.masterWalletExists()) {
                console.log(chalk_1.default.yellow('\n⚠️  Master wallet already exists!'));
                await this.viewMasterWallet();
                return;
            }
            console.log(chalk_1.default.blue('\n🏦 CREATE MASTER WALLET'));
            console.log(chalk_1.default.blue('═'.repeat(50)));
            console.log(chalk_1.default.gray('The master wallet is the central wallet that manages all funds.'));
            console.log(chalk_1.default.gray('Fund this wallet, and the bot will distribute to trading wallets.\n'));
            const { confirm } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Create a new master wallet?',
                    default: true,
                },
            ]);
            if (!confirm) {
                console.log(chalk_1.default.yellow('Cancelled.'));
                return;
            }
            this.masterWalletManager.createMasterWallet();
            console.log(chalk_1.default.green('🎉 Master wallet created successfully!\n'));
            console.log(chalk_1.default.yellow('NEXT STEPS:'));
            console.log(chalk_1.default.gray('1. Fund the master wallet address shown above'));
            console.log(chalk_1.default.gray('2. Generate trading wallets'));
            console.log(chalk_1.default.gray('3. Use "Fund Trading Wallets" to distribute from master\n'));
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Failed to create master wallet: ${error}`));
        }
    }
    /**
     * View master wallet info
     */
    async viewMasterWallet() {
        try {
            await this.masterWalletManager.displayMasterWalletInfo(config_1.configManager.getConfig().connection);
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Failed to view master wallet: ${error}`));
        }
    }
    /**
     * Fund trading wallets from master
     */
    async fundTradingWallets() {
        try {
            if (!this.masterWalletManager.masterWalletExists()) {
                console.log(chalk_1.default.red('\n❌ No master wallet found!'));
                console.log(chalk_1.default.yellow('   Create a master wallet first.\n'));
                return;
            }
            await this.fundManager.distributeFromMaster();
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Failed to fund trading wallets: ${error}`));
        }
    }
    /**
     * Withdraw from master wallet
     */
    async withdrawFromMaster() {
        try {
            if (!this.masterWalletManager.masterWalletExists()) {
                console.log(chalk_1.default.red('\n❌ No master wallet found!\n'));
                return;
            }
            console.log(chalk_1.default.blue('\n💸 WITHDRAW FROM MASTER WALLET'));
            console.log(chalk_1.default.blue('═'.repeat(50)));
            const masterInfo = await this.masterWalletManager.getMasterWalletInfo(config_1.configManager.getConfig().connection);
            console.log(chalk_1.default.yellow(`\nCurrent Balance: ${masterInfo.balance.toFixed(4)} SOL\n`));
            const answers = await inquirer_1.default.prompt([
                {
                    type: 'input',
                    name: 'destination',
                    message: 'Enter destination wallet address:',
                    validate: (input) => {
                        if (!input || input.length < 32)
                            return 'Invalid address';
                        return true;
                    },
                },
                {
                    type: 'number',
                    name: 'amount',
                    message: 'Amount to withdraw (0 for all):',
                    default: 0,
                    validate: (input) => {
                        if (input < 0)
                            return 'Amount must be positive';
                        if (input > masterInfo.balance)
                            return 'Insufficient balance';
                        return true;
                    },
                },
            ]);
            await this.masterWalletManager.withdrawFromMaster(config_1.configManager.getConfig().connection, answers.destination, answers.amount || undefined);
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Withdrawal failed: ${error}`));
        }
    }
    /**
     * Export master wallet key
     */
    async exportMasterKey() {
        try {
            if (!this.masterWalletManager.masterWalletExists()) {
                console.log(chalk_1.default.red('\n❌ No master wallet found!\n'));
                return;
            }
            console.log(chalk_1.default.red('\n⚠️  WARNING: SENSITIVE OPERATION'));
            console.log(chalk_1.default.red('═'.repeat(50)));
            console.log(chalk_1.default.yellow('You are about to view the master wallet private key.'));
            console.log(chalk_1.default.yellow('Never share this key with anyone!\n'));
            const { confirm } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Are you sure you want to export the private key?',
                    default: false,
                },
            ]);
            if (!confirm) {
                console.log(chalk_1.default.yellow('Cancelled.'));
                return;
            }
            this.masterWalletManager.exportMasterWalletKey();
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Export failed: ${error}`));
        }
    }
    /**
     * Delete master wallet
     */
    async deleteMasterWallet() {
        try {
            if (!this.masterWalletManager.masterWalletExists()) {
                console.log(chalk_1.default.red('\n❌ No master wallet to delete!\n'));
                return;
            }
            console.log(chalk_1.default.red('\n🗑️  DELETE MASTER WALLET'));
            console.log(chalk_1.default.red('═'.repeat(50)));
            console.log(chalk_1.default.red('⚠️  WARNING: This will permanently delete the master wallet!'));
            console.log(chalk_1.default.red('⚠️  Make sure you have withdrawn all funds first!\n'));
            const masterInfo = await this.masterWalletManager.getMasterWalletInfo(config_1.configManager.getConfig().connection);
            console.log(chalk_1.default.yellow(`Current Balance: ${masterInfo.balance.toFixed(4)} SOL\n`));
            if (masterInfo.balance > 0.001) {
                console.log(chalk_1.default.red('⚠️  Master wallet still has funds!'));
                console.log(chalk_1.default.yellow('   Withdraw funds before deleting.\n'));
                const { continueAnyway } = await inquirer_1.default.prompt([
                    {
                        type: 'confirm',
                        name: 'continueAnyway',
                        message: 'Delete anyway? (Funds will be lost!)',
                        default: false,
                    },
                ]);
                if (!continueAnyway) {
                    console.log(chalk_1.default.yellow('Deletion cancelled.'));
                    return;
                }
            }
            const { confirm1 } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirm1',
                    message: 'Are you ABSOLUTELY sure you want to delete the master wallet?',
                    default: false,
                },
            ]);
            if (!confirm1) {
                console.log(chalk_1.default.yellow('Deletion cancelled.'));
                return;
            }
            const { confirm2 } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirm2',
                    message: 'This action cannot be undone. Final confirmation:',
                    default: false,
                },
            ]);
            if (confirm2) {
                this.masterWalletManager.deleteMasterWallet();
                console.log(chalk_1.default.green('\n✅ Master wallet deleted successfully!\n'));
            }
            else {
                console.log(chalk_1.default.yellow('Deletion cancelled.'));
            }
        }
        catch (error) {
            console.error(chalk_1.default.red(`❌ Deletion failed: ${error}`));
        }
    }
}
// Handle process signals gracefully
process.on('SIGINT', () => {
    console.log(chalk_1.default.yellow('\n\n⏹️  Received interrupt signal. Shutting down gracefully...'));
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log(chalk_1.default.yellow('\n\n⏹️  Received termination signal. Shutting down gracefully...'));
    process.exit(0);
});
// Main entry point
const cli = new SecureVolumeBotCLI();
cli.run().catch((error) => {
    console.error(chalk_1.default.red(`\n💥 Fatal error: ${error}`));
    process.exit(1);
});
//# sourceMappingURL=index.js.map