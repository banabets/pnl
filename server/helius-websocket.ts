// Helius WebSocket Service - Real-time on-chain monitoring
// Monitors PumpFun, Raydium, and other DEXs for new tokens and trades

import WebSocket from 'ws';
import { Connection, PublicKey } from '@solana/web3.js';
import { EventEmitter } from 'events';
import { log } from './logger';

// Program IDs
// NOTE: Must be the full 44-char program id. (Some older copies of this file were missing the trailing "x")
const PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6Px';
// Pump.fun -> Raydium migration program (used to detect graduations)
const PUMP_MIGRATION_PROGRAM = '39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg';
const RAYDIUM_AMM_PROGRAM = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const RAYDIUM_CPMM_PROGRAM = 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

// Helius WebSocket URL
const getHeliusWsUrl = (): string | null => {
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
        log.info('Extracted Helius API key from RPC_URL', { keyPrefix: apiKey.substring(0, 8) });
      }
    }
  }

  if (!apiKey) {
    log.warn('No Helius API key found. WebSocket service will not start.');
    log.warn('Set HELIUS_API_KEY environment variable to enable WebSocket features.');
    return null; // Return null instead of public RPC to prevent connection attempts
  }

  // Validate API key format (Helius keys are typically UUIDs, 36 chars)
  if (apiKey.length < 20 || apiKey === 'your-helius-api-key-here' || apiKey === '7b05747c-b100-4159-ba5f-c85e8c8d3997') {
    log.error('Invalid or placeholder Helius API key detected');
    return null;
  }

  log.info('Using Helius WebSocket with API key', { keyPrefix: apiKey.substring(0, 8) });
  return `wss://mainnet.helius-rpc.com/?api-key=${apiKey}`;
};

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

type OnChainEvent = NewTokenEvent | GraduationEvent | TradeEvent | TokenUpdateEvent;

class HeliusWebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private connection: Connection;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private isConnected = false;
  private subscriptionIds: number[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private tokenCache: Map<string, { data: any; timestamp: number }> = new Map();
  private hasAuthError = false; // Track if we have authentication errors
  private rpcCircuitBreakerOpen = false; // Circuit breaker for RPC rate limits
  private rpc429Count = 0; // Count consecutive 429 errors
  private rpc429ResetTime = 0; // Time when we can reset the counter
  private lastRpcRequestTime = 0; // Track last RPC request time for rate limiting
  private readonly RPC_MIN_DELAY = 200; // Minimum delay between RPC requests (ms)
  private readonly MAX_429_ERRORS = 5; // Max consecutive 429 errors before opening circuit breaker
  private readonly CIRCUIT_BREAKER_RESET_TIME = 60000; // 1 minute before resetting circuit breaker

  // =============================
  // Tx details optimization
  // =============================
  // Cache parsed tx details by signature to avoid refetching
  private txDetailsCache: Map<string, { data: any; expires: number }> = new Map();
  // Deduplicate concurrent requests for the same signature
  private txDetailsInFlight: Map<string, Promise<any>> = new Map();
  // Batch queue for Helius enhanced transactions endpoint
  private txBatchQueue: Array<{ sig: string; resolve: (v: any) => void; reject: (e: any) => void }> = [];
  private txBatchTimer: NodeJS.Timeout | null = null;
  private readonly TX_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly TX_BATCH_WINDOW_MS = 200; // collect signatures for 200ms
  private readonly TX_BATCH_MAX = 100; // max per request (Helius supports batching)

  constructor() {
    super();
    // Get RPC URL, preferring SOLANA_RPC_URL or RPC_URL
    let rpcUrl = process.env.SOLANA_RPC_URL || process.env.RPC_URL;
    
    // If no RPC URL is set, try to construct from HELIUS_API_KEY
    if (!rpcUrl) {
      const heliusApiKey = process.env.HELIUS_API_KEY;
      if (heliusApiKey) {
        rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
      } else {
        rpcUrl = 'https://api.mainnet-beta.solana.com';
      }
    }
    
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Start the WebSocket connection and subscriptions
   */
  async start(): Promise<void> {
    log.info('Starting Helius WebSocket service');
    await this.connect();
  }

  /**
   * Connect to Helius WebSocket
   */
  private async connect(): Promise<void> {
    // Don't try to connect if we have auth errors
    if (this.hasAuthError) {
      log.warn('Skipping WebSocket connection due to previous authentication error');
      log.warn('Please fix HELIUS_API_KEY and restart the server');
      return;
    }
    
    const wsUrl = getHeliusWsUrl();
    
    // If no valid API key, don't attempt connection
    if (!wsUrl) {
      log.warn('WebSocket connection skipped: No valid Helius API key found');
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
          log.error('Helius API key appears to be too short or invalid', { keyLength: apiKey.length });
          this.hasAuthError = true;
          return;
        }
        log.info('Connecting to Helius WebSocket with API key', { keyPrefix: apiKey.substring(0, 8) });
      } else {
        log.error('Could not extract API key from WebSocket URL');
        this.hasAuthError = true;
        return;
      }
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        log.info('Helius WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.setupHeartbeat();
        this.subscribeToPrograms();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error: any) => {
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
          log.error('WebSocket authentication failed (401)', {
            reasons: [
              'The Helius API key is invalid or expired',
              'The API key does not have WebSocket permissions',
              'The API key format is incorrect',
              'The API key was not properly extracted from RPC_URL'
            ]
          });

          const apiKey = process.env.HELIUS_API_KEY;
          if (apiKey) {
            log.error('HELIUS_API_KEY status', {
              found: true,
              keyPrefix: apiKey.substring(0, 8),
              keySuffix: apiKey.substring(apiKey.length - 4),
              keyLength: apiKey.length,
              expectedLength: 36
            });
          } else {
            log.error('HELIUS_API_KEY not set in environment variables');
            const rpcUrl = process.env.SOLANA_RPC_URL || process.env.RPC_URL;
            if (rpcUrl && rpcUrl.includes('helius-rpc.com')) {
              const match = rpcUrl.match(/api-key=([a-f0-9-]{36})/i);
              if (match && match[1]) {
                log.error('Extracted API key from RPC_URL', {
                  keyPrefix: match[1].substring(0, 8),
                  keySuffix: match[1].substring(match[1].length - 4)
                });
              } else {
                log.error('Could not extract API key from RPC_URL');
              }
            }
          }

          log.error('Solution: Get a valid API key from https://helius.dev, set HELIUS_API_KEY environment variable, ensure WebSocket permissions are enabled, and restart the server');

          this.hasAuthError = true;
          // Don't try to reconnect if we have auth errors
          return;
        }

        // Log other errors
        log.error('WebSocket error', { error: errorMsg });
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        const reasonStr = reason.toString();
        log.info('WebSocket disconnected', { code, reason: reasonStr });
        this.isConnected = false;
        this.clearHeartbeat();

        // Don't reconnect if we have auth errors or if close code indicates auth failure
        if (this.hasAuthError || code === 1008 || code === 4001 || reasonStr.includes('401') || reasonStr.includes('Unauthorized')) {
          log.error('Stopping reconnection attempts due to authentication error');
          this.hasAuthError = true;
          return;
        }

        this.scheduleReconnect();
      });

    } catch (error) {
      log.error('Failed to connect', { error: error instanceof Error ? error.message : String(error) });
      this.scheduleReconnect();
    }
  }

  /**
   * Subscribe to PumpFun and Raydium programs
   */
  private subscribeToPrograms(): void {
    if (!this.ws || !this.isConnected) return;

    // Subscribe to PumpFun program logs
    this.subscribeToProgramLogs(PUMP_FUN_PROGRAM, 'pumpfun');

    // Subscribe to Pump.fun migration program (graduations to Raydium)
    this.subscribeToProgramLogs(PUMP_MIGRATION_PROGRAM, 'pump_migration');

    // Subscribe to Raydium AMM for graduations
    this.subscribeToProgramLogs(RAYDIUM_AMM_PROGRAM, 'raydium_amm');

    // Subscribe to Raydium CPMM
    this.subscribeToProgramLogs(RAYDIUM_CPMM_PROGRAM, 'raydium_cpmm');

    log.info('Subscribed to on-chain programs');
  }

  /**
   * Subscribe to program logs
   */
  private subscribeToProgramLogs(programId: string, label: string): void {
    if (!this.ws) return;

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
    log.info('Subscribed to program', { label, programId: programId.slice(0, 8) });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: WebSocket.Data): void {
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

    } catch (error) {
      // Ignore parse errors for binary data
    }
  }

  /**
   * Process log notifications from subscribed programs
   */
  private async processLogNotification(params: any): Promise<void> {
    const { result } = params;
    if (!result?.value) return;

    const { signature, logs, err } = result.value;
    if (err) return; // Skip failed transactions

    const logsStr = logs?.join(' ') || '';

    // Detect PumpFun events
    if (logsStr.includes(PUMP_FUN_PROGRAM)) {
      await this.processPumpFunTransaction(signature, logs);
    }

    // Detect Pump.fun migration events (graduations to Raydium)
    if (logsStr.includes(PUMP_MIGRATION_PROGRAM)) {
      await this.processPumpMigrationTransaction(signature, logs);
    }

    // Detect Raydium events (pool creation, swaps)
    if (logsStr.includes(RAYDIUM_AMM_PROGRAM) || logsStr.includes(RAYDIUM_CPMM_PROGRAM)) {
      await this.processRaydiumTransaction(signature, logs);
    }
  }

  /**
   * Process PumpFun transactions
   */
  private async processPumpFunTransaction(signature: string, logs: string[]): Promise<void> {
    const logsStr = logs.join(' ');

    try {
      // Detect new token creation
      if (logsStr.includes('Program log: Instruction: Create') ||
          logsStr.includes('Program log: Instruction: Initialize')) {

        // Get transaction details
        const txDetails = await this.getTransactionDetails(signature);
        if (!txDetails) return;

        const event: NewTokenEvent = {
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

        log.info('New PumpFun token detected', { symbol: event.symbol, mint: event.mint.slice(0, 8) });
        this.emit('new_token', event);
        this.emit('event', event);
      }

      // Detect trades (buy/sell)
      if (logsStr.includes('Program log: Instruction: Buy') ||
          logsStr.includes('Program log: Instruction: Sell')) {

        const isBuy = logsStr.includes('Buy');
        const txDetails = await this.getTransactionDetails(signature);
        if (!txDetails) return;

        const event: TradeEvent = {
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

    } catch (error) {
      log.error('Error processing PumpFun transaction', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Process Raydium transactions (detect graduations)
   */
  private async processRaydiumTransaction(signature: string, logs: string[]): Promise<void> {
    const logsStr = logs.join(' ');

    try {
      // Detect new pool creation (potential graduation)
      if (logsStr.includes('Program log: ray_log') ||
          logsStr.includes('Program log: initialize2')) {

        const txDetails = await this.getTransactionDetails(signature);
        if (!txDetails) return;

        // Check if this is a graduation from PumpFun
        const event: GraduationEvent = {
          type: 'graduation',
          mint: txDetails.mint || 'unknown',
          name: txDetails.name,
          symbol: txDetails.symbol,
          signature,
          timestamp: Date.now(),
          raydiumPool: txDetails.poolAddress,
          liquidity: txDetails.liquidity,
        };

        log.info('Token graduated', { symbol: event.symbol, mint: event.mint.slice(0, 8) });
        this.emit('graduation', event);
        this.emit('event', event);
      }

    } catch (error) {
      log.error('Error processing Raydium transaction', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Get transaction details using Helius enhanced API
   */
  private async getTransactionDetails(signature: string): Promise<any> {
    const now = Date.now();

    // 0) Cache hit
    const cached = this.txDetailsCache.get(signature);
    if (cached && now < cached.expires) {
      return cached.data;
    }

    // 1) In-flight dedupe
    const inflight = this.txDetailsInFlight.get(signature);
    if (inflight) {
      return inflight;
    }

    const apiKey = process.env.HELIUS_API_KEY;

    // 2) If no API key, fallback to basic RPC (already rate-limited)
    if (!apiKey) {
      const p = this.getBasicTransactionDetails(signature);
      this.txDetailsInFlight.set(signature, p);
      try {
        const res = await p;
        if (res) this.txDetailsCache.set(signature, { data: res, expires: now + this.TX_CACHE_TTL });
        return res;
      } finally {
        this.txDetailsInFlight.delete(signature);
      }
    }

    // 3) Use batching against Helius enhanced endpoint to reduce credits
    const p = new Promise<any>((resolve, reject) => {
      this.txBatchQueue.push({ sig: signature, resolve, reject });
      if (!this.txBatchTimer) {
        this.txBatchTimer = setTimeout(() => {
          this.flushTxBatch(apiKey).catch(() => {});
        }, this.TX_BATCH_WINDOW_MS);
      }
      // If queue is big, flush immediately
      if (this.txBatchQueue.length >= this.TX_BATCH_MAX) {
        this.flushTxBatch(apiKey).catch(() => {});
      }
    });

    this.txDetailsInFlight.set(signature, p);
    try {
      const res = await p;
      if (res) this.txDetailsCache.set(signature, { data: res, expires: now + this.TX_CACHE_TTL });
      return res;
    } finally {
      this.txDetailsInFlight.delete(signature);
    }
  }

  /**
   * Flush a batch of queued signatures to Helius enhanced transactions endpoint.
   */
  private async flushTxBatch(apiKey: string): Promise<void> {
    if (this.txBatchTimer) {
      clearTimeout(this.txBatchTimer);
      this.txBatchTimer = null;
    }
    if (this.txBatchQueue.length === 0) return;

    const batch = this.txBatchQueue.splice(0, this.TX_BATCH_MAX);
    const sigs = batch.map(b => b.sig);

    try {
      const response = await fetch(
        `https://api.helius.xyz/v0/transactions/?api-key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactions: sigs })
        }
      );

      if (!response.ok) {
        // Fallback: resolve each via basic RPC (rate-limited/circuit-breaker protected)
        for (const item of batch) {
          this.getBasicTransactionDetails(item.sig)
            .then(res => item.resolve(res))
            .catch(err => item.resolve(null));
        }
        return;
      }

      const data = await response.json();
      // data is an array aligned with the sigs order
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        const tx = Array.isArray(data) ? data[i] : null;
        if (!tx) {
          item.resolve(null);
          continue;
        }
        const parsed = this.parseHeliusTransaction(tx);
        item.resolve(parsed);
      }
    } catch (error: any) {
      // On error: resolve null to avoid blocking the event pipeline
      log.error('Error flushing Helius tx batch', { error: error?.message || String(error) });
      for (const item of batch) {
        item.resolve(null);
      }
    }
  }



/**
 * Pick the most likely token mint from Helius tokenTransfers array.
 * Filters out wSOL and chooses the transfer with the largest absolute token amount.
 */
private pickBestMintFromTransfers(tokenTransfers: any[]): { mint?: string; tokenAmount?: number } {
  if (!Array.isArray(tokenTransfers) || tokenTransfers.length === 0) return {};
  const WSOL = 'So11111111111111111111111111111111111111112';
  const candidates = tokenTransfers
    .filter(t => t && typeof t.mint === 'string' && t.mint !== WSOL)
    .map(t => ({ mint: t.mint as string, tokenAmount: Number(t.tokenAmount || 0) }))
    .filter(t => t.mint && !Number.isNaN(t.tokenAmount));
  if (candidates.length === 0) return {};
  candidates.sort((a, b) => Math.abs(b.tokenAmount) - Math.abs(a.tokenAmount));
  return candidates[0];
}

  /**
   * Parse Helius enhanced transaction format
   */
  private parseHeliusTransaction(tx: any): any {
    const result: any = {
      signature: tx.signature,
      timestamp: tx.timestamp * 1000,
    };

    // Extract token info from token transfers
    if (tx.tokenTransfers?.length > 0) {
      const best = this.pickBestMintFromTransfers(tx.tokenTransfers);
      if (best.mint) {
        result.mint = best.mint;
        result.tokenAmount = best.tokenAmount;
      }
    }

    // Extract SOL amount from native transfers
    if (tx.nativeTransfers?.length > 0) {
      const totalSol = tx.nativeTransfers.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
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
  private async getBasicTransactionDetails(signature: string): Promise<any> {
    // Check circuit breaker
    if (this.rpcCircuitBreakerOpen) {
      const now = Date.now();
      if (now < this.rpc429ResetTime) {
        // Circuit breaker still open, skip request
        return null;
      } else {
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

      if (!tx) return null;

      const result: any = {
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

    } catch (error: any) {
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
          log.warn('RPC Circuit breaker opened due to rate limiting', {
            consecutiveErrors: this.rpc429Count,
            retryAfterSeconds: this.CIRCUIT_BREAKER_RESET_TIME / 1000,
            suggestion: 'Set HELIUS_API_KEY environment variable to avoid rate limits'
          });
        } else {
          // Log but don't spam - only log first error and every 5th error
          if (this.rpc429Count === 1 || this.rpc429Count % 5 === 0) {
            log.warn('RPC rate limited (429)', {
              count: this.rpc429Count,
              maxErrors: this.MAX_429_ERRORS,
              suggestion: 'Set HELIUS_API_KEY environment variable for better performance'
            });
          }
        }
        
        // Don't log the error message for 429 errors to reduce spam
        return null;
      } else {
        // Reset counter on non-429 errors
        this.rpc429Count = 0;
      }

      // Don't log every error to avoid spam - only log non-429 errors
      log.error('Error getting basic transaction details', { error: error.message || String(error) });
      
      return null;
    }
  }

  /**
   * Setup heartbeat to keep connection alive
   */
  private setupHeartbeat(): void {
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
  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    // Don't reconnect if we have authentication errors
    if (this.hasAuthError) {
      log.error('Skipping reconnection due to authentication error');
      return;
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      log.error('Max reconnection attempts reached', {
        attempts: this.maxReconnectAttempts,
        suggestion: 'If this is an authentication issue, please check your HELIUS_API_KEY'
      });
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    log.info('Reconnecting WebSocket', {
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
  getRecentTokens(limit = 50): NewTokenEvent[] {
    const tokens: NewTokenEvent[] = [];
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
  isActive(): boolean {
    return this.isConnected;
  }

  /**
   * Stop the WebSocket connection
   */
  stop(): void {
    log.info('Stopping Helius WebSocket service');
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
export const heliusWebSocket = new HeliusWebSocketService();
