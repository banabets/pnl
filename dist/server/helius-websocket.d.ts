import { EventEmitter } from 'events';
export interface NewTokenEvent {
    type: 'new_token';
    mint: string;
    name?: string;
    symbol?: string;
    creator: string;
    signature: string;
    timestamp: number;
    source: 'pumpfun' | 'raydium' | 'unknown';
    bondingCurve?: string;
    initialLiquidity?: number;
}
export interface GraduationEvent {
    type: 'graduation';
    mint: string;
    name?: string;
    symbol?: string;
    signature: string;
    timestamp: number;
    raydiumPool?: string;
    liquidity?: number;
}
export interface TradeEvent {
    type: 'trade';
    mint: string;
    signature: string;
    timestamp: number;
    trader: string;
    side: 'buy' | 'sell';
    amountSol: number;
    amountTokens: number;
    price?: number;
    source: 'pumpfun' | 'raydium' | 'jupiter' | 'unknown';
}
export interface TokenUpdateEvent {
    type: 'token_update';
    mint: string;
    marketCap?: number;
    liquidity?: number;
    holders?: number;
    price?: number;
    volume5m?: number;
}
declare class HeliusWebSocketService extends EventEmitter {
    private ws;
    private connection;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private isConnected;
    private subscriptionIds;
    private heartbeatInterval;
    private tokenCache;
    private hasAuthError;
    private rpcCircuitBreakerOpen;
    private rpc429Count;
    private rpc429ResetTime;
    private lastRpcRequestTime;
    private readonly RPC_MIN_DELAY;
    private readonly MAX_429_ERRORS;
    private readonly CIRCUIT_BREAKER_RESET_TIME;
    private txDetailsCache;
    private txDetailsInFlight;
    private txBatchQueue;
    private txBatchTimer;
    private readonly TX_CACHE_TTL;
    private readonly TX_BATCH_WINDOW_MS;
    private readonly TX_BATCH_MAX;
    constructor();
    /**
     * Start the WebSocket connection and subscriptions
     */
    start(): Promise<void>;
    /**
     * Connect to Helius WebSocket
     */
    private connect;
    /**
     * Subscribe to PumpFun and Raydium programs
     */
    private subscribeToPrograms;
    /**
     * Subscribe to program logs
     */
    private subscribeToProgramLogs;
    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage;
    /**
     * Process log notifications from subscribed programs
     */
    private processLogNotification;
    /**
     * Process PumpFun transactions
     */
    private processPumpFunTransaction;
    /**
     * Process Raydium transactions (detect graduations)
     */
    private processRaydiumTransaction;
    /**
     * Get transaction details using Helius enhanced API
     */
    private getTransactionDetails;
    /**
     * Flush a batch of queued signatures to Helius enhanced transactions endpoint.
     */
    private flushTxBatch;
    /**
     * Pick the most likely token mint from Helius tokenTransfers array.
     * Filters out wSOL and chooses the transfer with the largest absolute token amount.
     */
    private pickBestMintFromTransfers;
    /**
     * Parse Helius enhanced transaction format
     */
    private parseHeliusTransaction;
    /**
     * Fallback: Get basic transaction details from RPC
     * Includes rate limiting and circuit breaker to prevent 429 errors
     */
    private getBasicTransactionDetails;
    /**
     * Setup heartbeat to keep connection alive
     */
    private setupHeartbeat;
    /**
     * Clear heartbeat interval
     */
    private clearHeartbeat;
    /**
     * Schedule reconnection with exponential backoff
     */
    private scheduleReconnect;
    /**
     * Get recent tokens from cache
     */
    getRecentTokens(limit?: number): NewTokenEvent[];
    /**
     * Check if connected
     */
    isActive(): boolean;
    /**
     * Stop the WebSocket connection
     */
    stop(): void;
}
export declare const heliusWebSocket: HeliusWebSocketService;
export {};
//# sourceMappingURL=helius-websocket.d.ts.map