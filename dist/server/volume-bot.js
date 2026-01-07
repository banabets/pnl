"use strict";
// Volume Bot - Genera volumen de trading en pump.fun
// Estrategia: Con 1 SOL generar más de $25,000 USD en volumen total (compras + ventas)
Object.defineProperty(exports, "__esModule", { value: true });
exports.VolumeBot = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const anchor_1 = require("@coral-xyz/anchor");
// Pump.fun Program ID
const PUMP_FUN_PROGRAM_ID = new web3_js_1.PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6Px');
// Load IDL dynamically
let idl;
try {
    idl = require('../src/pumpfun/pump-fun-idl.json');
}
catch (e) {
    console.warn('pump-fun-idl.json not found');
}
class VolumeBot {
    constructor(rpcUrl) {
        this.isRunning = false;
        this.wallets = [];
        this.program = null;
        this.globalState = null;
        this.currentSolPriceUSD = 150; // Precio actual de SOL en USD (actualizar dinámicamente)
        this.rpcUrl = rpcUrl || process.env.SOLANA_RPC_URL || process.env.RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=7b05747c-b100-4159-ba5f-c85e8c8d3997';
        this.connection = new web3_js_1.Connection(this.rpcUrl, 'confirmed');
    }
    /**
     * Inicializar el bot
     * Carga wallets desde keypairs o wallet-service
     */
    async initialize(wallets) {
        if (this.isRunning) {
            throw new Error('Bot is already running');
        }
        try {
            if (wallets && wallets.length > 0) {
                this.wallets = wallets;
            }
            else {
                // Intentar cargar desde keypairs directory
                const fs = require('fs');
                const path = require('path');
                const keypairsDir = path.join(process.cwd(), 'keypairs');
                if (fs.existsSync(keypairsDir)) {
                    const files = fs.readdirSync(keypairsDir)
                        .filter((file) => file.startsWith('keypair_') && file.endsWith('.json'))
                        .sort((a, b) => {
                        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
                        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
                        return numA - numB;
                    });
                    this.wallets = [];
                    for (const file of files) {
                        try {
                            const keypairData = JSON.parse(fs.readFileSync(path.join(keypairsDir, file), 'utf-8'));
                            const keypair = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(keypairData));
                            this.wallets.push(keypair);
                        }
                        catch (error) {
                            console.warn(`Failed to load wallet from ${file}:`, error);
                        }
                    }
                }
            }
            if (this.wallets.length === 0) {
                throw new Error('No wallets found. Please provide wallets or ensure keypairs directory exists.');
            }
            // Inicializar Anchor program
            await this.initializeProgram();
            // Obtener precio actual de SOL
            await this.updateSolPrice();
            console.log(`✅ VolumeBot initialized with ${this.wallets.length} wallets`);
            console.log(`💰 Current SOL price: $${this.currentSolPriceUSD.toFixed(2)}`);
        }
        catch (error) {
            console.error('Failed to initialize VolumeBot:', error);
            throw error;
        }
    }
    /**
     * Calcular estrategia óptima para generar volumen objetivo
     */
    calculateStrategy(config) {
        const { totalSolAmount, targetVolumeUSD, maxTransactions, minTransactionSize, maxTransactionSize } = config;
        // Calcular volumen necesario por SOL
        const volumePerSol = targetVolumeUSD / totalSolAmount;
        // Estrategia: Hacer compras y ventas rápidas para reutilizar el mismo SOL
        // Si hacemos N ciclos de compra/venta, cada ciclo genera: compra + venta = 2x el valor
        // Ejemplo: Comprar con 0.1 SOL, vender = 0.1 SOL (reutilizable) + volumen de 0.2 SOL
        // Opción 1: Rapid trading - muchas transacciones pequeñas rápidas
        // Si hacemos 50 transacciones de 0.02 SOL cada una:
        // - 25 compras = 25 * 0.02 * 2 (compra + venta) = 1 SOL en volumen
        // - Volumen USD = 1 SOL * precio SOL * 2 = 1 * 150 * 2 = $300
        // Necesitamos: 25000 / 300 = ~83 ciclos completos
        // Opción 2: Distributed - usar múltiples wallets con transacciones medianas
        const numWallets = config.useMultipleWallets ? Math.min(this.wallets.length, 10) : 1;
        const solPerWallet = totalSolAmount / numWallets;
        // Calcular transacciones necesarias
        // Cada transacción genera: compra + venta = 2x el valor en volumen
        // Volumen por transacción = solAmount * 2 * solPriceUSD
        // Transacciones necesarias = targetVolumeUSD / (solPerTransaction * 2 * solPriceUSD)
        const minTxSize = minTransactionSize || 0.01; // Mínimo 0.01 SOL por transacción
        const maxTxSize = maxTransactionSize || 0.1; // Máximo 0.1 SOL por transacción
        const optimalTxSize = Math.min(maxTxSize, Math.max(minTxSize, solPerWallet / 10));
        // Calcular número de transacciones necesarias
        const volumePerTransaction = optimalTxSize * 2 * this.currentSolPriceUSD; // compra + venta
        const transactionsNeeded = Math.ceil(targetVolumeUSD / volumePerTransaction);
        // Limitar por maxTransactions si se especifica
        const totalTransactions = maxTransactions ? Math.min(transactionsNeeded, maxTransactions) : transactionsNeeded;
        // Ajustar tamaño de transacción si es necesario
        const adjustedTxSize = totalTransactions > 0
            ? Math.min(maxTxSize, Math.max(minTxSize, (targetVolumeUSD / (totalTransactions * 2 * this.currentSolPriceUSD))))
            : optimalTxSize;
        const transactionsPerWallet = Math.ceil(totalTransactions / numWallets);
        const estimatedVolumeUSD = totalTransactions * adjustedTxSize * 2 * this.currentSolPriceUSD;
        // Determinar estrategia
        let strategy = 'mixed';
        if (totalTransactions > 100) {
            strategy = 'rapid';
        }
        else if (numWallets > 5) {
            strategy = 'distributed';
        }
        return {
            transactionsPerWallet,
            solPerTransaction: adjustedTxSize,
            estimatedVolumeUSD,
            totalTransactions,
            strategy,
        };
    }
    /**
     * Ejecutar bot de volumen
     */
    async executeVolumeBot(config) {
        if (this.isRunning) {
            throw new Error('Bot is already running');
        }
        this.isRunning = true;
        const result = {
            success: false,
            totalVolumeUSD: 0,
            totalTransactions: 0,
            buyTransactions: 0,
            sellTransactions: 0,
            totalSolUsed: 0,
            transactions: [],
            errors: [],
        };
        try {
            const tokenMint = new web3_js_1.PublicKey(config.tokenMint);
            const slippageBps = config.slippageBps || 100; // 1% default
            const delay = config.delayBetweenTrades || 1000; // 1 segundo default
            // Calcular estrategia
            const strategy = this.calculateStrategy(config);
            result.strategy = strategy;
            console.log(`📊 Estrategia calculada:`);
            console.log(`   - Transacciones totales: ${strategy.totalTransactions}`);
            console.log(`   - SOL por transacción: ${strategy.solPerTransaction.toFixed(4)}`);
            console.log(`   - Volumen estimado: $${strategy.estimatedVolumeUSD.toFixed(2)}`);
            console.log(`   - Estrategia: ${strategy.strategy}`);
            const numWallets = config.useMultipleWallets ? Math.min(this.wallets.length, strategy.totalTransactions) : 1;
            const solPerWallet = config.totalSolAmount / numWallets;
            // Verificar balances de wallets
            const walletsWithBalance = [];
            for (let i = 0; i < numWallets; i++) {
                const wallet = this.wallets[i % this.wallets.length];
                const balance = await this.connection.getBalance(wallet.publicKey);
                const balanceInSol = balance / web3_js_1.LAMPORTS_PER_SOL;
                if (balanceInSol >= solPerWallet + 0.001) { // +0.001 para fees
                    walletsWithBalance.push({ wallet, balance: balanceInSol, index: i });
                }
                else {
                    result.errors?.push(`Wallet ${i} has insufficient balance: ${balanceInSol.toFixed(4)} SOL (needed: ${(solPerWallet + 0.001).toFixed(4)} SOL)`);
                }
            }
            if (walletsWithBalance.length === 0) {
                throw new Error('No wallets with sufficient balance found');
            }
            console.log(`✅ Found ${walletsWithBalance.length} wallets with sufficient balance`);
            // Ejecutar trades
            let transactionIndex = 0;
            const transactionsPerWallet = Math.ceil(strategy.totalTransactions / walletsWithBalance.length);
            for (const walletInfo of walletsWithBalance) {
                if (transactionIndex >= strategy.totalTransactions)
                    break;
                const { wallet } = walletInfo;
                let walletSolUsed = 0;
                let tokensHeld = 0; // Tokens que tenemos después de comprar
                // Hacer compras y ventas alternadas
                for (let i = 0; i < transactionsPerWallet && transactionIndex < strategy.totalTransactions; i++) {
                    try {
                        // Alternar entre compra y venta
                        const isBuy = tokensHeld === 0 || Math.random() > 0.5; // Comprar si no tenemos tokens
                        if (isBuy) {
                            // COMPRA
                            const buyAmount = Math.min(strategy.solPerTransaction, solPerWallet - walletSolUsed - 0.001);
                            if (buyAmount < 0.001) {
                                console.log(`⚠️ Wallet ${walletInfo.index} out of SOL, skipping`);
                                break;
                            }
                            console.log(`🟢 [${transactionIndex + 1}/${strategy.totalTransactions}] BUY: ${buyAmount.toFixed(4)} SOL`);
                            const buySignature = await this.executeBuy(wallet, tokenMint, buyAmount, slippageBps);
                            // Obtener tokens recibidos (simplificado - en producción calcular desde la transacción)
                            const tokensReceived = await this.getTokensFromTransaction(buySignature, wallet.publicKey, tokenMint);
                            tokensHeld = tokensReceived;
                            walletSolUsed += buyAmount;
                            const volumeUSD = buyAmount * this.currentSolPriceUSD;
                            result.totalVolumeUSD += volumeUSD;
                            result.buyTransactions++;
                            result.totalTransactions++;
                            result.transactions.push({
                                type: 'buy',
                                signature: buySignature,
                                solAmount: buyAmount,
                                volumeUSD,
                                timestamp: Date.now(),
                            });
                            transactionIndex++;
                            // Pequeño delay antes de vender
                            await this.sleep(delay);
                        }
                        else {
                            // VENTA
                            if (tokensHeld === 0) {
                                continue; // No tenemos tokens para vender
                            }
                            console.log(`🔴 [${transactionIndex + 1}/${strategy.totalTransactions}] SELL: ${tokensHeld} tokens`);
                            const sellSignature = await this.executeSell(wallet, tokenMint, tokensHeld, slippageBps);
                            // Obtener SOL recibido (simplificado)
                            const solReceived = await this.getSolFromTransaction(sellSignature, wallet.publicKey);
                            tokensHeld = 0; // Vendimos todos los tokens
                            walletSolUsed -= solReceived; // Reducir SOL usado (lo recuperamos)
                            const volumeUSD = solReceived * this.currentSolPriceUSD;
                            result.totalVolumeUSD += volumeUSD;
                            result.sellTransactions++;
                            result.totalTransactions++;
                            result.transactions.push({
                                type: 'sell',
                                signature: sellSignature,
                                solAmount: solReceived,
                                volumeUSD,
                                timestamp: Date.now(),
                            });
                            transactionIndex++;
                        }
                        // Delay entre transacciones
                        if (transactionIndex < strategy.totalTransactions) {
                            await this.sleep(delay);
                        }
                    }
                    catch (error) {
                        console.error(`❌ Error en transacción ${transactionIndex + 1}:`, error.message);
                        result.errors?.push(`Transaction ${transactionIndex + 1}: ${error.message}`);
                        // Continuar con la siguiente transacción
                    }
                }
                result.totalSolUsed += walletSolUsed;
            }
            result.success = result.totalVolumeUSD >= config.targetVolumeUSD * 0.9; // 90% del objetivo es éxito
            console.log(`\n✅ VolumeBot completado:`);
            console.log(`   - Volumen total: $${result.totalVolumeUSD.toFixed(2)}`);
            console.log(`   - Transacciones: ${result.totalTransactions} (${result.buyTransactions} compras, ${result.sellTransactions} ventas)`);
            console.log(`   - SOL usado: ${result.totalSolUsed.toFixed(4)}`);
            return result;
        }
        catch (error) {
            console.error('VolumeBot error:', error);
            result.errors?.push(error.message);
            result.success = false;
            return result;
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * Detener el bot
     */
    stop() {
        this.isRunning = false;
        console.log('🛑 VolumeBot detenido');
    }
    /**
     * Obtener precio actual de SOL en USD
     */
    async updateSolPrice() {
        try {
            // Intentar obtener precio de CoinGecko o similar
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            const data = await response.json();
            if (data.solana?.usd) {
                this.currentSolPriceUSD = data.solana.usd;
            }
        }
        catch (error) {
            console.warn('No se pudo obtener precio de SOL, usando default: $150');
            this.currentSolPriceUSD = 150;
        }
    }
    /**
     * Inicializar Anchor program
     */
    async initializeProgram() {
        if (!idl) {
            console.warn('⚠️ IDL no encontrado, algunas funciones pueden no estar disponibles');
            return;
        }
        try {
            const provider = new anchor_1.AnchorProvider(this.connection, {
                publicKey: this.wallets[0]?.publicKey || web3_js_1.PublicKey.default,
                signTransaction: async (tx) => {
                    if (this.wallets[0] && tx instanceof web3_js_1.Transaction) {
                        tx.sign(this.wallets[0]);
                    }
                    return tx;
                },
                signAllTransactions: async (txs) => {
                    return txs.map(tx => {
                        if (this.wallets[0] && tx instanceof web3_js_1.Transaction) {
                            tx.sign(this.wallets[0]);
                        }
                        return tx;
                    });
                },
            }, { commitment: 'confirmed' });
            this.program = new anchor_1.Program(idl, PUMP_FUN_PROGRAM_ID, provider);
            // Derive global state
            const [globalState] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('global')], PUMP_FUN_PROGRAM_ID);
            this.globalState = globalState;
            console.log('✅ Anchor program initialized');
        }
        catch (error) {
            console.error('Failed to initialize Anchor program:', error);
            throw error;
        }
    }
    /**
     * Obtener global state
     */
    async getGlobalState() {
        const [globalState] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('global')], PUMP_FUN_PROGRAM_ID);
        return globalState;
    }
    /**
     * Obtener fee recipient
     */
    async getFeeRecipient() {
        // El fee recipient es un account conocido de pump.fun
        return new web3_js_1.PublicKey('CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM');
    }
    /**
     * Ejecutar compra
     */
    async executeBuy(wallet, tokenMint, solAmount, slippageBps) {
        try {
            const maxSolCost = new anchor_1.BN(Math.floor(solAmount * web3_js_1.LAMPORTS_PER_SOL * (1 + slippageBps / 10000)));
            const minTokenAmount = new anchor_1.BN(1);
            if (!this.program) {
                throw new Error('Anchor program not initialized');
            }
            // Derive accounts
            const globalState = await this.getGlobalState();
            const feeRecipient = await this.getFeeRecipient();
            const [bondingCurve] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('bonding-curve'), tokenMint.toBuffer()], PUMP_FUN_PROGRAM_ID);
            const associatedBondingCurve = await (0, spl_token_1.getAssociatedTokenAddress)(tokenMint, bondingCurve, true);
            const associatedTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(tokenMint, wallet.publicKey);
            // Verificar si el token account existe, crear si no
            let createATAInstruction = null;
            try {
                await (0, spl_token_1.getAccount)(this.connection, associatedTokenAccount);
            }
            catch {
                createATAInstruction = (0, spl_token_1.createAssociatedTokenAccountInstruction)(wallet.publicKey, associatedTokenAccount, wallet.publicKey, tokenMint);
            }
            const [eventAuthority] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('__event_authority')], PUMP_FUN_PROGRAM_ID);
            const accounts = {
                global: globalState,
                feeRecipient: feeRecipient,
                mint: tokenMint,
                bondingCurve: bondingCurve,
                associatedBondingCurve: associatedBondingCurve,
                associatedUser: associatedTokenAccount,
                user: wallet.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                rent: web3_js_1.SYSVAR_RENT_PUBKEY,
                eventAuthority: eventAuthority,
                program: PUMP_FUN_PROGRAM_ID,
            };
            let txBuilder = this.program.methods
                .buy(minTokenAmount, maxSolCost)
                .accounts(accounts)
                .signers([wallet]);
            // Agregar instrucción de creación de ATA si es necesario
            if (createATAInstruction) {
                txBuilder = txBuilder.preInstructions([createATAInstruction]);
            }
            const tx = await txBuilder.rpc();
            return tx;
        }
        catch (error) {
            throw new Error(`Buy failed: ${error.message}`);
        }
    }
    /**
     * Ejecutar venta
     */
    async executeSell(wallet, tokenMint, tokenAmount, slippageBps) {
        try {
            // Obtener el balance real de tokens del wallet
            const associatedTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(tokenMint, wallet.publicKey);
            let actualTokenAmount = tokenAmount;
            try {
                const tokenAccount = await (0, spl_token_1.getAccount)(this.connection, associatedTokenAccount);
                const mintInfo = await (0, spl_token_1.getMint)(this.connection, tokenMint);
                actualTokenAmount = Number(tokenAccount.amount) / Math.pow(10, mintInfo.decimals);
            }
            catch (error) {
                console.warn('Could not get token account, using provided amount');
            }
            const tokenAmountBN = new anchor_1.BN(Math.floor(actualTokenAmount * Math.pow(10, 6))); // Asumir 6 decimals
            const minSolOut = new anchor_1.BN(0); // Se calculará según slippage
            if (!this.program) {
                throw new Error('Anchor program not initialized');
            }
            // Derive accounts
            const globalState = await this.getGlobalState();
            const feeRecipient = await this.getFeeRecipient();
            const [bondingCurve] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('bonding-curve'), tokenMint.toBuffer()], PUMP_FUN_PROGRAM_ID);
            const associatedBondingCurve = await (0, spl_token_1.getAssociatedTokenAddress)(tokenMint, bondingCurve, true);
            const [eventAuthority] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('__event_authority')], PUMP_FUN_PROGRAM_ID);
            const tx = await this.program.methods
                .sell(tokenAmountBN, minSolOut)
                .accounts({
                global: globalState,
                feeRecipient: feeRecipient,
                mint: tokenMint,
                bondingCurve: bondingCurve,
                associatedBondingCurve: associatedBondingCurve,
                associatedUser: associatedTokenAccount,
                user: wallet.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                rent: web3_js_1.SYSVAR_RENT_PUBKEY,
                eventAuthority: eventAuthority,
                program: PUMP_FUN_PROGRAM_ID,
            })
                .signers([wallet])
                .rpc();
            return tx;
        }
        catch (error) {
            throw new Error(`Sell failed: ${error.message}`);
        }
    }
    /**
     * Obtener tokens de una transacción
     */
    async getTokensFromTransaction(signature, wallet, tokenMint) {
        try {
            const tx = await this.connection.getTransaction(signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
            if (!tx)
                return 0;
            // Buscar en los postTokenBalances el balance del token account del wallet
            const tokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(tokenMint, wallet);
            if (tx.meta?.postTokenBalances) {
                for (const balance of tx.meta.postTokenBalances) {
                    if (balance.owner === wallet.toBase58() || balance.accountIndex !== undefined) {
                        const uiAmount = balance.uiTokenAmount?.uiAmount;
                        if (uiAmount !== undefined && uiAmount !== null) {
                            return uiAmount;
                        }
                    }
                }
            }
            // Fallback: intentar obtener del token account directamente
            try {
                const accountInfo = await (0, spl_token_1.getAccount)(this.connection, tokenAccount);
                return Number(accountInfo.amount) / Math.pow(10, accountInfo.mint.toString() === tokenMint.toBase58() ? 6 : 6);
            }
            catch {
                return 0;
            }
        }
        catch (error) {
            console.warn('Error getting tokens from transaction:', error);
            return 0;
        }
    }
    /**
     * Obtener SOL de una transacción
     */
    async getSolFromTransaction(signature, wallet) {
        try {
            const tx = await this.connection.getTransaction(signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
            if (!tx)
                return 0;
            // Buscar el cambio en el balance de SOL del wallet
            if (tx.meta?.postBalances && tx.meta?.preBalances) {
                // Obtener account keys (puede ser VersionedTransaction o Transaction)
                let accountKeys = [];
                if ('message' in tx.transaction) {
                    if ('accountKeys' in tx.transaction.message) {
                        accountKeys = tx.transaction.message.accountKeys.map((k) => k.pubkey ? k.pubkey : new web3_js_1.PublicKey(k));
                    }
                    else if ('getAccountKeys' in tx.transaction.message) {
                        accountKeys = tx.transaction.message.getAccountKeys().staticAccountKeys;
                    }
                }
                const walletIndex = accountKeys.findIndex((key) => key.toBase58() === wallet.toBase58());
                if (walletIndex >= 0) {
                    const preBalance = tx.meta.preBalances[walletIndex];
                    const postBalance = tx.meta.postBalances[walletIndex];
                    const solReceived = (postBalance - preBalance) / web3_js_1.LAMPORTS_PER_SOL;
                    return Math.max(0, solReceived); // Solo retornar si es positivo (recibimos SOL)
                }
            }
            return 0;
        }
        catch (error) {
            console.warn('Error getting SOL from transaction:', error);
            return 0;
        }
    }
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.VolumeBot = VolumeBot;
//# sourceMappingURL=volume-bot.js.map