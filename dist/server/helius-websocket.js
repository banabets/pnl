"use strict";
// Helius WebSocket Service - Real-time on-chain monitoring
// Monitors PumpFun, Raydium, and other DEXs for new tokens and trades
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.heliusWebSocket = void 0;
const ws_1 = __importDefault(require("ws"));
const web3_js_1 = require("@solana/web3.js");
const events_1 = require("events");
const logger_1 = require("./logger");
// Program IDs
const PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const RAYDIUM_AMM_PROGRAM = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const RAYDIUM_CPMM_PROGRAM = 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
// Helius WebSocket URL
const getHeliusWsUrl = () => {
    // Try to get API key from various sources
    let apiKey = process.env.HELIUS_API_KEY;
    // If not found, try to extract from SOLANA_RPC_URL or RPC_URL
    if (!apiKey) {
        const rpcUrl = process.env.SOLANA_RPC_URL || process.env.RPC_URL;
        if (rpcUrl && rpcUrl.includes('helius-rpc.com')) {
            // Extract API key from URL: https://mainnet.helius-rpc.com/?api-key=KEY
            const match = rpcUrl.match(/api-key=([a-f0-9-]{36})/i);
            if (match && match[1]) {
                apiKey = match[1];
                logger_1.log.info('Extracted Helius API key from RPC_URL', { keyPrefix: apiKey.substring(0, 8) });
            }
        }
    }
    if (!apiKey) {
        logger_1.log.warn('No Helius API key found. WebSocket service will not start.');
        logger_1.log.warn('Set HELIUS_API_KEY environment variable to enable WebSocket features.');
        return null; // Return null instead of public RPC to prevent connection attempts
    }
    // Validate API key format (Helius keys are typically UUIDs, 36 chars)
    if (apiKey.length < 20 || apiKey === 'your-helius-api-key-here' || apiKey === '7b05747c-b100-4159-ba5f-c85e8c8d3997') {
        logger_1.log.error('Invalid or placeholder Helius API key detected');
        return null;
    }
    logger_1.log.info('Using Helius WebSocket with API key', { keyPrefix: apiKey.substring(0, 8) });
    return `wss://mainnet.helius-rpc.com/?api-key=${apiKey}`;
};
class HeliusWebSocketService extends events_1.EventEmitter {
    constructor() {
        super();
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;
        this.isConnected = false;
        this.subscriptionIds = [];
        this.heartbeatInterval = null;
        this.tokenCache = new Map();
        this.hasAuthError = false; // Track if we have authentication errors
        this.rpcCircuitBreakerOpen = false; // Circuit breaker for RPC rate limits
        this.rpc429Count = 0; // Count consecutive 429 errors
        this.rpc429ResetTime = 0; // Time when we can reset the counter
        this.lastRpcRequestTime = 0; // Track last RPC request time for rate limiting
        this.RPC_MIN_DELAY = 200; // Minimum delay between RPC requests (ms)
        this.MAX_429_ERRORS = 5; // Max consecutive 429 errors before opening circuit breaker
        this.CIRCUIT_BREAKER_RESET_TIME = 60000; // 1 minute before resetting circuit breaker
        // Get RPC URL, preferring SOLANA_RPC_URL or RPC_URL
        let rpcUrl = process.env.SOLANA_RPC_URL || process.env.RPC_URL;
        // If no RPC URL is set, try to construct from HELIUS_API_KEY
        if (!rpcUrl) {
            const heliusApiKey = process.env.HELIUS_API_KEY;
            if (heliusApiKey) {
                rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
            }
            else {
                rpcUrl = 'https://api.mainnet-beta.solana.com';
            }
        }
        this.connection = new web3_js_1.Connection(rpcUrl, 'confirmed');
    }
    /**
     * Start the WebSocket connection and subscriptions
     */
    async start() {
        logger_1.log.info('Starting Helius WebSocket service');
        await this.connect();
    }
    /**
     * Connect to Helius WebSocket
     */
    async connect() {
        // Don't try to connect if we have auth errors
        if (this.hasAuthError) {
            logger_1.log.warn('Skipping WebSocket connection due to previous authentication error');
            logger_1.log.warn('Please fix HELIUS_API_KEY and restart the server');
            return;
        }
        const wsUrl = getHeliusWsUrl();
        // If no valid API key, don't attempt connection
        if (!wsUrl) {
            logger_1.log.warn('WebSocket connection skipped: No valid Helius API key found');
            this.hasAuthError = true; // Mark as auth error to prevent retry attempts
            return;
        }
        // Validate API key before connecting
        if (wsUrl.includes('helius-rpc.com')) {
            const apiKeyMatch = wsUrl.match(/api-key=([^&]+)/);
            if (apiKeyMatch && apiKeyMatch[1]) {
                const apiKey = apiKeyMatch[1];
                // Helius API keys are typically UUIDs (36 chars) or similar format
                if (apiKey.length < 20) {
                    logger_1.log.error('Helius API key appears to be too short or invalid', { keyLength: apiKey.length });
                    this.hasAuthError = true;
                    return;
                }
                logger_1.log.info('Connecting to Helius WebSocket with API key', { keyPrefix: apiKey.substring(0, 8) });
            }
            else {
                logger_1.log.error('Could not extract API key from WebSocket URL');
                this.hasAuthError = true;
                return;
            }
        }
        try {
            this.ws = new ws_1.default(wsUrl);
            this.ws.on('open', () => {
                logger_1.log.info('Helius WebSocket connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.setupHeartbeat();
                this.subscribeToPrograms();
            });
            this.ws.on('message', (data) => {
                this.handleMessage(data);
            });
            this.ws.on('error', (error) => {
                const errorMsg = error.message || String(error);
                const errorStr = String(error);
                // Check if it's an authentication error (401) - check multiple formats
                const is401Error = errorMsg.includes('401') ||
                    errorMsg.includes('Unauthorized') ||
                    errorMsg.includes('Unexpected server response: 401') ||
                    errorStr.includes('401') ||
                    errorStr.includes('Unauthorized') ||
                    error?.code === 401 ||
                    error?.statusCode === 401;
                if (is401Error) {
                    logger_1.log.error('WebSocket authentication failed (401)', {
                        reasons: [
                            'The Helius API key is invalid or expired',
                            'The API key does not have WebSocket permissions',
                            'The API key format is incorrect',
                            'The API key was not properly extracted from RPC_URL'
                        ]
                    });
                    const apiKey = process.env.HELIUS_API_KEY;
                    if (apiKey) {
                        logger_1.log.error('HELIUS_API_KEY status', {
                            found: true,
                            keyPrefix: apiKey.substring(0, 8),
                            keySuffix: apiKey.substring(apiKey.length - 4),
                            keyLength: apiKey.length,
                            expectedLength: 36
                        });
                    }
                    else {
                        logger_1.log.error('HELIUS_API_KEY not set in environment variables');
                        const rpcUrl = process.env.SOLANA_RPC_URL || process.env.RPC_URL;
                        if (rpcUrl && rpcUrl.includes('helius-rpc.com')) {
                            const match = rpcUrl.match(/api-key=([a-f0-9-]{36})/i);
                            if (match && match[1]) {
                                logger_1.log.error('Extracted API key from RPC_URL', {
                                    keyPrefix: match[1].substring(0, 8),
                                    keySuffix: match[1].substring(match[1].length - 4)
                                });
                            }
                            else {
                                logger_1.log.error('Could not extract API key from RPC_URL');
                            }
                        }
                    }
                    logger_1.log.error('Solution: Get a valid API key from https://helius.dev, set HELIUS_API_KEY environment variable, ensure WebSocket permissions are enabled, and restart the server');
                    this.hasAuthError = true;
                    // Don't try to reconnect if we have auth errors
                    return;
                }
                // Log other errors
                logger_1.log.error('WebSocket error', { error: errorMsg });
            });
            this.ws.on('close', (code, reason) => {
                const reasonStr = reason.toString();
                logger_1.log.info('WebSocket disconnected', { code, reason: reasonStr });
                this.isConnected = false;
                this.clearHeartbeat();
                // Don't reconnect if we have auth errors or if close code indicates auth failure
                if (this.hasAuthError || code === 1008 || code === 4001 || reasonStr.includes('401') || reasonStr.includes('Unauthorized')) {
                    logger_1.log.error('Stopping reconnection attempts due to authentication error');
                    this.hasAuthError = true;
                    return;
                }
                this.scheduleReconnect();
            });
        }
        catch (error) {
            logger_1.log.error('Failed to connect', { error: error instanceof Error ? error.message : String(error) });
            this.scheduleReconnect();
        }
    }
    /**
     * Subscribe to PumpFun and Raydium programs
     */
    subscribeToPrograms() {
        if (!this.ws || !this.isConnected)
            return;
        // Subscribe to PumpFun program logs
        this.subscribeToProgramLogs(PUMP_FUN_PROGRAM, 'pumpfun');
        // Subscribe to Raydium AMM for graduations
        this.subscribeToProgramLogs(RAYDIUM_AMM_PROGRAM, 'raydium_amm');
        // Subscribe to Raydium CPMM
        this.subscribeToProgramLogs(RAYDIUM_CPMM_PROGRAM, 'raydium_cpmm');
        logger_1.log.info('Subscribed to on-chain programs');
    }
    /**
     * Subscribe to program logs
     */
    subscribeToProgramLogs(programId, label) {
        if (!this.ws)
            return;
        const subscribeMessage = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'logsSubscribe',
            params: [
                { mentions: [programId] },
                { commitment: 'confirmed' }
            ]
        };
        this.ws.send(JSON.stringify(subscribeMessage));
        logger_1.log.info('Subscribed to program', { label, programId: programId.slice(0, 8) });
    }
    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            // Handle subscription confirmations
            if (message.result !== undefined && typeof message.result === 'number') {
                this.subscriptionIds.push(message.result);
                return;
            }
            // Handle log notifications
            if (message.method === 'logsNotification') {
                this.processLogNotification(message.params);
            }
        }
        catch (error) {
            // Ignore parse errors for binary data
        }
    }
    /**
     * Process log notifications from subscribed programs
     */
    async processLogNotification(params) {
        const { result } = params;
        if (!result?.value)
            return;
        const { signature, logs, err } = result.value;
        if (err)
            return; // Skip failed transactions
        const logsStr = logs?.join(' ') || '';
        // Detect PumpFun events
        if (logsStr.includes(PUMP_FUN_PROGRAM)) {
            await this.processPumpFunTransaction(signature, logs);
        }
        // Detect Raydium events (graduations)
        if (logsStr.includes(RAYDIUM_AMM_PROGRAM) || logsStr.includes(RAYDIUM_CPMM_PROGRAM)) {
            await this.processRaydiumTransaction(signature, logs);
        }
    }
    /**
     * Process PumpFun transactions
     */
    async processPumpFunTransaction(signature, logs) {
        const logsStr = logs.join(' ');
        try {
            // Detect new token creation
            if (logsStr.includes('Program log: Instruction: Create') ||
                logsStr.includes('Program log: Instruction: Initialize')) {
                // Get transaction details
                const txDetails = await this.getTransactionDetails(signature);
                if (!txDetails)
                    return;
                const event = {
                    type: 'new_token',
                    mint: txDetails.mint || 'unknown',
                    name: txDetails.name,
                    symbol: txDetails.symbol,
                    creator: txDetails.creator || 'unknown',
                    signature,
                    timestamp: Date.now(),
                    source: 'pumpfun',
                    bondingCurve: txDetails.bondingCurve,
                };
                logger_1.log.info('New PumpFun token detected', { symbol: event.symbol, mint: event.mint.slice(0, 8) });
                this.emit('new_token', event);
                this.emit('event', event);
            }
            // Detect trades (buy/sell)
            if (logsStr.includes('Program log: Instruction: Buy') ||
                logsStr.includes('Program log: Instruction: Sell')) {
                const isBuy = logsStr.includes('Buy');
                const txDetails = await this.getTransactionDetails(signature);
                if (!txDetails)
                    return;
                const event = {
                    type: 'trade',
                    mint: txDetails.mint || 'unknown',
                    signature,
                    timestamp: Date.now(),
                    trader: txDetails.trader || 'unknown',
                    side: isBuy ? 'buy' : 'sell',
                    amountSol: txDetails.solAmount || 0,
                    amountTokens: txDetails.tokenAmount || 0,
                    price: txDetails.price,
                    source: 'pumpfun',
                };
                this.emit('trade', event);
                this.emit('event', event);
            }
        }
        catch (error) {
            logger_1.log.error('Error processing PumpFun transaction', { error: error instanceof Error ? error.message : String(error) });
        }
    }
    /**
     * Process Raydium transactions (detect graduations)
     */
    async processRaydiumTransaction(signature, logs) {
        const logsStr = logs.join(' ');
        try {
            // Detect new pool creation (potential graduation)
            if (logsStr.includes('Program log: ray_log') ||
                logsStr.includes('Program log: initialize2')) {
                const txDetails = await this.getTransactionDetails(signature);
                if (!txDetails)
                    return;
                // Check if this is a graduation from PumpFun
                const event = {
                    type: 'graduation',
                    mint: txDetails.mint || 'unknown',
                    name: txDetails.name,
                    symbol: txDetails.symbol,
                    signature,
                    timestamp: Date.now(),
                    raydiumPool: txDetails.poolAddress,
                    liquidity: txDetails.liquidity,
                };
                logger_1.log.info('Token graduated', { symbol: event.symbol, mint: event.mint.slice(0, 8) });
                this.emit('graduation', event);
                this.emit('event', event);
            }
        }
        catch (error) {
            logger_1.log.error('Error processing Raydium transaction', { error: error instanceof Error ? error.message : String(error) });
        }
    }
    /**
     * Get transaction details using Helius enhanced API
     */
    async getTransactionDetails(signature) {
        try {
            const apiKey = process.env.HELIUS_API_KEY;
            if (!apiKey) {
                // Fallback to basic RPC
                return this.getBasicTransactionDetails(signature);
            }
            const response = await fetch(`https://api.helius.xyz/v0/transactions/?api-key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactions: [signature] })
            });
            if (!response.ok) {
                return this.getBasicTransactionDetails(signature);
            }
            const data = await response.json();
            const tx = data[0];
            if (!tx)
                return null;
            // Parse Helius enhanced transaction
            return this.parseHeliusTransaction(tx);
        }
        catch (error) {
            logger_1.log.error('Error fetching transaction details', { error: error instanceof Error ? error.message : String(error) });
            return null;
        }
    }
    /**
     * Parse Helius enhanced transaction format
     */
    parseHeliusTransaction(tx) {
        const result = {
            signature: tx.signature,
            timestamp: tx.timestamp * 1000,
        };
        // Extract token info from token transfers
        if (tx.tokenTransfers?.length > 0) {
            const transfer = tx.tokenTransfers[0];
            result.mint = transfer.mint;
            result.tokenAmount = transfer.tokenAmount;
        }
        // Extract SOL amount from native transfers
        if (tx.nativeTransfers?.length > 0) {
            const totalSol = tx.nativeTransfers.reduce((sum, t) => sum + (t.amount || 0), 0);
            result.solAmount = totalSol / 1e9;
        }
        // Extract creator/trader from account data
        if (tx.feePayer) {
            result.creator = tx.feePayer;
            result.trader = tx.feePayer;
        }
        // Extract token metadata if available
        if (tx.events?.nft?.nfts?.[0]) {
            const nft = tx.events.nft.nfts[0];
            result.name = nft.name;
            result.symbol = nft.symbol;
        }
        // Try to get from description
        if (tx.description) {
            const symbolMatch = tx.description.match(/\$([A-Z0-9]+)/);
            if (symbolMatch) {
                result.symbol = symbolMatch[1];
            }
        }
        return result;
    }
    /**
     * Fallback: Get basic transaction details from RPC
     * Includes rate limiting and circuit breaker to prevent 429 errors
     */
    async getBasicTransactionDetails(signature) {
        // Check circuit breaker
        if (this.rpcCircuitBreakerOpen) {
            const now = Date.now();
            if (now < this.rpc429ResetTime) {
                // Circuit breaker still open, skip request
                return null;
            }
            else {
                // Reset circuit breaker
                this.rpcCircuitBreakerOpen = false;
                this.rpc429Count = 0;
            }
        }
        // Rate limiting: Ensure minimum delay between requests
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRpcRequestTime;
        if (timeSinceLastRequest < this.RPC_MIN_DELAY) {
            await new Promise(resolve => setTimeout(resolve, this.RPC_MIN_DELAY - timeSinceLastRequest));
        }
        try {
            this.lastRpcRequestTime = Date.now();
            const tx = await this.connection.getParsedTransaction(signature, {
                maxSupportedTransactionVersion: 0,
                commitment: 'confirmed'
            });
            // Reset 429 counter on success
            this.rpc429Count = 0;
            if (!tx)
                return null;
            const result = {
                signature,
                timestamp: (tx.blockTime || Math.floor(Date.now() / 1000)) * 1000,
            };
            // Extract account keys
            const accountKeys = tx.transaction.message.accountKeys;
            if (accountKeys.length > 0) {
                result.creator = accountKeys[0].pubkey.toBase58();
                result.trader = accountKeys[0].pubkey.toBase58();
            }
            // Look for token mint in instructions
            for (const ix of tx.transaction.message.instructions) {
                if ('parsed' in ix && ix.parsed?.info?.mint) {
                    result.mint = ix.parsed.info.mint;
                    break;
                }
            }
            // Look for token balance changes
            if (tx.meta?.postTokenBalances?.length) {
                const tokenBalance = tx.meta.postTokenBalances[0];
                result.mint = result.mint || tokenBalance.mint;
                result.tokenAmount = tokenBalance.uiTokenAmount?.uiAmount || 0;
            }
            // Calculate SOL change
            if (tx.meta?.preBalances && tx.meta?.postBalances) {
                const solChange = Math.abs(tx.meta.postBalances[0] - tx.meta.preBalances[0]);
                result.solAmount = solChange / 1e9;
            }
            return result;
        }
        catch (error) {
            // Check if it's a 429 error
            const is429Error = error?.message?.includes('429') ||
                error?.message?.includes('Too Many Requests') ||
                error?.code === 429;
            if (is429Error) {
                this.rpc429Count++;
                // Open circuit breaker if too many consecutive 429 errors
                if (this.rpc429Count >= this.MAX_429_ERRORS) {
                    this.rpcCircuitBreakerOpen = true;
                    this.rpc429ResetTime = Date.now() + this.CIRCUIT_BREAKER_RESET_TIME;
                    logger_1.log.warn('RPC Circuit breaker opened due to rate limiting', {
                        consecutiveErrors: this.rpc429Count,
                        retryAfterSeconds: this.CIRCUIT_BREAKER_RESET_TIME / 1000,
                        suggestion: 'Set HELIUS_API_KEY environment variable to avoid rate limits'
                    });
                }
                else {
                    // Log but don't spam - only log first error and every 5th error
                    if (this.rpc429Count === 1 || this.rpc429Count % 5 === 0) {
                        logger_1.log.warn('RPC rate limited (429)', {
                            count: this.rpc429Count,
                            maxErrors: this.MAX_429_ERRORS,
                            suggestion: 'Set HELIUS_API_KEY environment variable for better performance'
                        });
                    }
                }
                // Don't log the error message for 429 errors to reduce spam
                return null;
            }
            else {
                // Reset counter on non-429 errors
                this.rpc429Count = 0;
            }
            // Don't log every error to avoid spam - only log non-429 errors
            logger_1.log.error('Error getting basic transaction details', { error: error.message || String(error) });
            return null;
        }
    }
    /**
     * Setup heartbeat to keep connection alive
     */
    setupHeartbeat() {
        this.clearHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.isConnected) {
                this.ws.ping();
            }
        }, 30000);
    }
    /**
     * Clear heartbeat interval
     */
    clearHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    /**
     * Schedule reconnection with exponential backoff
     */
    scheduleReconnect() {
        // Don't reconnect if we have authentication errors
        if (this.hasAuthError) {
            logger_1.log.error('Skipping reconnection due to authentication error');
            return;
        }
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger_1.log.error('Max reconnection attempts reached', {
                attempts: this.maxReconnectAttempts,
                suggestion: 'If this is an authentication issue, please check your HELIUS_API_KEY'
            });
            return;
        }
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
        this.reconnectAttempts++;
        logger_1.log.info('Reconnecting WebSocket', {
            delayMs: delay,
            attempt: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts
        });
        setTimeout(() => {
            if (!this.hasAuthError) {
                this.connect();
            }
        }, delay);
    }
    /**
     * Get recent tokens from cache
     */
    getRecentTokens(limit = 50) {
        const tokens = [];
        const now = Date.now();
        const maxAge = 60 * 60 * 1000; // 1 hour
        for (const [mint, cached] of this.tokenCache) {
            if (now - cached.timestamp < maxAge) {
                tokens.push(cached.data);
            }
        }
        return tokens
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }
    /**
     * Check if connected
     */
    isActive() {
        return this.isConnected;
    }
    /**
     * Stop the WebSocket connection
     */
    stop() {
        logger_1.log.info('Stopping Helius WebSocket service');
        this.clearHeartbeat();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.subscriptionIds = [];
    }
}
// Singleton instance
exports.heliusWebSocket = new HeliusWebSocketService();
//# sourceMappingURL=helius-websocket.js.map