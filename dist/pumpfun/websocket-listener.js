"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PumpFunWebSocketListener = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
// Pump.fun Program ID
const PUMP_FUN_PROGRAM_ID = new web3_js_1.PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6Px');
class PumpFunWebSocketListener {
    constructor() {
        this.subscriptionId = null;
        this.tokenCallbacks = new Set();
        this.isListening = false;
        this.recentTokens = new Map();
        this.maxRecentTokens = 100;
        // Use Helius WebSocket endpoint for real-time listening
        // Convert wss:// to https:// for Connection (it handles WebSocket internally)
        const wsRpcUrl = process.env.WS_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=b8baac5d-2270-45ba-8324-9d7024c3f828';
        this.connection = new web3_js_1.Connection(wsRpcUrl, 'confirmed');
    }
    /**
     * Start listening to pump.fun program transactions via WebSocket
     */
    async startListening() {
        if (this.isListening) {
            console.log('⚠️ Already listening to pump.fun transactions');
            return;
        }
        try {
            console.log('🔌 Starting WebSocket listener for pump.fun...');
            // First, fetch recent historical transactions to populate initial tokens
            await this.fetchRecentHistoricalTransactions();
            // Subscribe to program account changes
            // This listens to all transactions involving the pump.fun program
            this.subscriptionId = this.connection.onProgramAccountChange(PUMP_FUN_PROGRAM_ID, async (accountInfo, context) => {
                try {
                    // Extract token mint from account data if possible
                    // Pump.fun accounts typically store token mints
                    await this.processAccountChange(accountInfo.accountId.toBuffer(), context.slot);
                }
                catch (error) {
                    console.error('Error processing account change:', error);
                }
            }, 'confirmed');
            // Subscribe to logs to catch transaction signatures
            // This is the most reliable method for catching new token creations
            this.connection.onLogs(PUMP_FUN_PROGRAM_ID, async (logs, context) => {
                try {
                    if (logs.err)
                        return; // Skip failed transactions
                    console.log(`📝 New pump.fun transaction: ${logs.signature.substring(0, 16)}...`);
                    // Try to get the transaction to extract token mints
                    // Use a small delay to ensure transaction is fully processed
                    setTimeout(async () => {
                        try {
                            const tx = await this.connection.getTransaction(logs.signature, {
                                commitment: 'confirmed',
                                maxSupportedTransactionVersion: 0,
                            });
                            if (tx?.meta) {
                                await this.extractTokensFromTransaction(tx, logs.signature);
                            }
                        }
                        catch (error) {
                            // Transaction may not be available yet, ignore
                        }
                    }, 500);
                }
                catch (error) {
                    // Ignore errors
                }
            }, 'confirmed');
            this.isListening = true;
            console.log('✅ WebSocket listener started for pump.fun');
        }
        catch (error) {
            console.error('Failed to start WebSocket listener:', error);
            throw error;
        }
    }
    /**
     * Fetch recent historical transactions to populate initial token list
     */
    async fetchRecentHistoricalTransactions() {
        try {
            console.log('📡 Fetching recent historical transactions...');
            // Try with current connection first
            let recentSignatures = await this.connection.getSignaturesForAddress(PUMP_FUN_PROGRAM_ID, { limit: 50 }, 'confirmed').catch(() => []);
            // If no results, try alternative methods
            if (recentSignatures.length === 0) {
                console.log('⚠️ No transactions from pump.fun program, trying SPL Token program...');
                try {
                    // Try searching SPL Token program for recent token mints
                    const publicRpc = new web3_js_1.Connection('https://api.mainnet-beta.solana.com', 'confirmed');
                    const tokenSignatures = await publicRpc.getSignaturesForAddress(spl_token_1.TOKEN_PROGRAM_ID, { limit: 50 }, 'confirmed');
                    console.log(`Found ${tokenSignatures.length} recent SPL token transactions`);
                    // Process token program transactions to find new mints
                    // Only process very recent transactions (last 24 hours)
                    const oneDayAgo = Date.now() / 1000 - (24 * 60 * 60);
                    for (let i = 0; i < Math.min(tokenSignatures.length, 30); i++) {
                        try {
                            const sig = tokenSignatures[i];
                            const txTimestamp = sig.blockTime || Date.now() / 1000;
                            // Skip transactions older than 24 hours
                            if (txTimestamp < oneDayAgo) {
                                continue;
                            }
                            const tx = await publicRpc.getTransaction(sig.signature, {
                                commitment: 'confirmed',
                                maxSupportedTransactionVersion: 0,
                            });
                            if (tx?.meta?.postTokenBalances) {
                                for (const balance of tx.meta.postTokenBalances) {
                                    if (balance.mint) {
                                        // Filter out known tokens (USDC, USDT, SOL wrapped, etc.)
                                        const knownTokens = [
                                            'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
                                            'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
                                            'So11111111111111111111111111111111111111112', // SOL wrapped
                                            'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL
                                            '7kbnvuGBxxj8AG9qp8Scn56muWGaRaFqxg1FsRp3PaFT', // UXD
                                            'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
                                        ];
                                        if (knownTokens.includes(balance.mint)) {
                                            continue; // Skip known tokens
                                        }
                                        // Only add if transaction is recent (within 24 hours)
                                        if (txTimestamp >= oneDayAgo) {
                                            // Verify token creation time by checking account
                                            try {
                                                const mintPubkey = new web3_js_1.PublicKey(balance.mint);
                                                const mintAccount = await publicRpc.getAccountInfo(mintPubkey).catch(() => null);
                                                if (mintAccount) {
                                                    // Check if this is a new token (recently created)
                                                    // We'll use transaction timestamp as proxy for creation
                                                    // But also verify the token is actually new
                                                    const mintInfo = await (0, spl_token_1.getMint)(publicRpc, mintPubkey).catch(() => null);
                                                    if (mintInfo) {
                                                        // Only add if supply is relatively small (new tokens) or transaction is very recent
                                                        const supply = Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals);
                                                        const isVeryRecent = txTimestamp >= (Date.now() / 1000 - (6 * 60 * 60)); // Last 6 hours
                                                        // Add if very recent OR if supply is small (likely new token)
                                                        if (isVeryRecent || supply < 1000000) {
                                                            await this.notifyTokenUpdate({
                                                                mint: balance.mint,
                                                                timestamp: txTimestamp,
                                                                signature: sig.signature,
                                                            });
                                                        }
                                                    }
                                                }
                                            }
                                            catch (error) {
                                                // If verification fails, skip this token
                                                continue;
                                            }
                                        }
                                    }
                                }
                            }
                            // Small delay
                            await new Promise(resolve => setTimeout(resolve, 150));
                        }
                        catch (error) {
                            continue;
                        }
                    }
                    console.log(`✅ Found ${this.recentTokens.size} tokens from SPL Token program`);
                    return; // Exit early since we processed token program
                }
                catch (error) {
                    console.log('Alternative search also failed, will rely on real-time WebSocket only');
                    return;
                }
            }
            console.log(`Found ${recentSignatures.length} recent pump.fun transactions to process`);
            // Process transactions in batches
            const batchSize = 5;
            for (let i = 0; i < Math.min(recentSignatures.length, 30); i += batchSize) {
                const batch = recentSignatures.slice(i, i + batchSize);
                // Use the connection that worked (or try both)
                const rpcToUse = recentSignatures.length > 0 ? this.connection : new web3_js_1.Connection('https://api.mainnet-beta.solana.com', 'confirmed');
                await Promise.all(batch.map(async (sig) => {
                    try {
                        const tx = await rpcToUse.getTransaction(sig.signature, {
                            commitment: 'confirmed',
                            maxSupportedTransactionVersion: 0,
                        });
                        if (tx?.meta) {
                            const timestamp = sig.blockTime || Date.now() / 1000;
                            await this.extractTokensFromTransaction(tx, sig.signature, timestamp);
                        }
                    }
                    catch (error) {
                        // Skip failed transactions
                    }
                }));
                // Small delay between batches
                if (i + batchSize < recentSignatures.length) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            console.log(`✅ Processed historical transactions, found ${this.recentTokens.size} tokens`);
        }
        catch (error) {
            console.error('Error fetching historical transactions:', error);
        }
    }
    /**
     * Stop listening to transactions
     */
    async stopListening() {
        if (!this.isListening)
            return;
        try {
            if (this.subscriptionId !== null) {
                await this.connection.removeProgramAccountChangeListener(this.subscriptionId);
                this.subscriptionId = null;
            }
            this.isListening = false;
            console.log('🛑 WebSocket listener stopped');
        }
        catch (error) {
            console.error('Error stopping WebSocket listener:', error);
        }
    }
    /**
     * Subscribe to token updates
     */
    onTokenUpdate(callback) {
        this.tokenCallbacks.add(callback);
        // Return unsubscribe function
        return () => {
            this.tokenCallbacks.delete(callback);
        };
    }
    /**
     * Get recent tokens found via WebSocket
     * Only returns tokens from the last 6 hours (very recent)
     */
    getRecentTokens(limit = 50) {
        const sixHoursAgo = Date.now() / 1000 - (6 * 60 * 60); // Last 6 hours only
        const oneHourAgo = Date.now() / 1000 - (60 * 60); // Last 1 hour (prioritize)
        const allRecent = Array.from(this.recentTokens.values())
            .filter(token => token.timestamp >= sixHoursAgo);
        // Prioritize very recent tokens (last hour)
        const veryRecent = allRecent.filter(t => t.timestamp >= oneHourAgo);
        const olderRecent = allRecent.filter(t => t.timestamp < oneHourAgo);
        // Combine: very recent first, then older recent
        const sorted = [...veryRecent, ...olderRecent]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
        return sorted;
    }
    /**
     * Process account change and extract token mints
     */
    async processAccountChange(accountData, slot) {
        try {
            // Try to extract token mint from account data
            // Pump.fun account structure may vary, so we try multiple approaches
            if (accountData.length >= 32) {
                try {
                    const potentialMint = new web3_js_1.PublicKey(accountData.slice(0, 32));
                    // Verify it's a valid token mint
                    const mintInfo = await (0, spl_token_1.getMint)(this.connection, potentialMint).catch(() => null);
                    if (mintInfo) {
                        await this.notifyTokenUpdate({
                            mint: potentialMint.toBase58(),
                            timestamp: Date.now() / 1000,
                            signature: '', // Account changes don't have signatures
                        });
                    }
                }
                catch {
                    // Not a valid mint
                }
            }
        }
        catch (error) {
            // Ignore errors
        }
    }
    /**
     * Extract token mints from a transaction
     */
    async extractTokensFromTransaction(tx, signature, timestamp) {
        try {
            const txTimestamp = timestamp || Date.now() / 1000;
            const tokenMints = new Set();
            // Extract from post token balances
            if (tx.meta?.postTokenBalances) {
                for (const balance of tx.meta.postTokenBalances) {
                    if (balance.mint) {
                        tokenMints.add(balance.mint);
                    }
                }
            }
            // Extract from pre token balances (for new mints)
            if (tx.meta?.preTokenBalances) {
                for (const balance of tx.meta.preTokenBalances) {
                    if (balance.mint) {
                        tokenMints.add(balance.mint);
                    }
                }
            }
            // Also check account keys for potential token mints
            if (tx.transaction?.message?.accountKeys) {
                for (const accountKey of tx.transaction.message.accountKeys) {
                    const keyStr = typeof accountKey === 'string' ? accountKey : accountKey.toBase58();
                    // Token mints are 44 character base58 strings
                    if (keyStr.length === 44 &&
                        !keyStr.includes('11111111111111111111111111111111') &&
                        !keyStr.includes('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')) {
                        try {
                            // Quick check - try to get account info
                            const accountInfo = await this.connection.getAccountInfo(new web3_js_1.PublicKey(keyStr)).catch(() => null);
                            if (accountInfo && accountInfo.owner.equals(spl_token_1.TOKEN_PROGRAM_ID)) {
                                tokenMints.add(keyStr);
                            }
                        }
                        catch {
                            // Not a valid token mint
                        }
                    }
                }
            }
            // Notify about each token found
            for (const mint of tokenMints) {
                await this.notifyTokenUpdate({
                    mint,
                    timestamp: txTimestamp,
                    signature,
                });
            }
        }
        catch (error) {
            // Ignore errors
        }
    }
    /**
     * Notify all subscribers about a new token
     */
    async notifyTokenUpdate(token) {
        // Filter out old tokens (older than 24 hours)
        const oneDayAgo = Date.now() / 1000 - (24 * 60 * 60);
        if (token.timestamp < oneDayAgo) {
            return; // Skip old tokens
        }
        // Avoid duplicates
        if (this.recentTokens.has(token.mint)) {
            // Update timestamp if this is newer
            const existing = this.recentTokens.get(token.mint);
            if (existing && token.timestamp > existing.timestamp) {
                this.recentTokens.set(token.mint, token);
            }
            return;
        }
        // Store recent token
        this.recentTokens.set(token.mint, token);
        // Keep only recent tokens (last 24 hours) - oneDayAgo already defined above
        for (const [mint, tokenData] of Array.from(this.recentTokens.entries())) {
            if (tokenData.timestamp < oneDayAgo) {
                this.recentTokens.delete(mint);
            }
        }
        // Also limit total size
        if (this.recentTokens.size > this.maxRecentTokens) {
            const oldest = Array.from(this.recentTokens.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
            this.recentTokens.delete(oldest[0]);
        }
        // Notify all callbacks
        for (const callback of this.tokenCallbacks) {
            try {
                callback(token);
            }
            catch (error) {
                console.error('Error in token update callback:', error);
            }
        }
    }
    /**
     * Check if currently listening
     */
    getIsListening() {
        return this.isListening;
    }
    /**
     * Check if a token is likely a pump.fun token by checking for bonding curve
     */
    async isLikelyPumpFunToken(mint) {
        try {
            // Derive potential bonding curve PDA
            const [bondingCurve] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('bonding-curve'), mint.toBuffer()], PUMP_FUN_PROGRAM_ID);
            // Check if bonding curve account exists
            const bondingCurveInfo = await this.connection.getAccountInfo(bondingCurve).catch(() => null);
            return bondingCurveInfo !== null;
        }
        catch (error) {
            return false;
        }
    }
}
exports.PumpFunWebSocketListener = PumpFunWebSocketListener;
//# sourceMappingURL=websocket-listener.js.map