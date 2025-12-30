// Helius WebSocket Service - Real-time on-chain monitoring
// Monitors PumpFun, Raydium, and other DEXs for new tokens and trades

import WebSocket from 'ws';
import { Connection, PublicKey } from '@solana/web3.js';
import { EventEmitter } from 'events';

// Program IDs
const PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const RAYDIUM_AMM_PROGRAM = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const RAYDIUM_CPMM_PROGRAM = 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

// Helius WebSocket URL
const getHeliusWsUrl = () => {
  // Check if SOLANA_RPC_URL is a complete Helius URL
  const rpcUrl = process.env.SOLANA_RPC_URL;
  
  if (rpcUrl && rpcUrl.includes('helius-rpc.com')) {
    // Extract API key from complete URL and convert to WebSocket URL
    const apiKeyMatch = rpcUrl.match(/api-key=([a-f0-9-]{36})/);
    if (apiKeyMatch) {
      const apiKey = apiKeyMatch[1];
      console.log(`✅ Using Helius WebSocket from SOLANA_RPC_URL, API key: ${apiKey.substring(0, 8)}...`);
      return `wss://mainnet.helius-rpc.com/?api-key=${apiKey}`;
    }
  }
  
  // Try to get API key from env or extract from RPC URL
  const apiKey = process.env.HELIUS_API_KEY || 
                 rpcUrl?.match(/helius.*?([a-f0-9-]{36})/)?.[1] ||
                 '7b05747c-b100-4159-ba5f-c85e8c8d3997'; // Default Helius API key
  
  if (!apiKey) {
    console.warn('⚠️ No Helius API key found, using public RPC (may have rate limits)');
    return 'wss://api.mainnet-beta.solana.com';
  }
  
  console.log(`✅ Using Helius WebSocket with API key: ${apiKey.substring(0, 8)}...`);
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
  // Rate limiting for RPC calls
  private rpcCallQueue: Array<{ resolve: (value: any) => void; reject: (error: any) => void; fn: () => Promise<any> }> = [];
  private rpcCallInProgress = false;
  private lastRpcCallTime = 0;
  private minRpcCallInterval = 200; // Minimum 200ms between RPC calls
  private consecutive429Errors = 0;
  private max429Errors = 5;
  private rpcCircuitBreakerOpen = false;
  private rpcCircuitBreakerResetTime = 0;
  private readonly CIRCUIT_BREAKER_RESET_DELAY = 60000; // 1 minute

  constructor() {
    super();
    // Use SOLANA_RPC_URL if it's a complete Helius URL, otherwise construct it
    let rpcUrl = process.env.SOLANA_RPC_URL;
    
    // If SOLANA_RPC_URL is a complete Helius URL, use it directly
    if (rpcUrl && rpcUrl.includes('helius-rpc.com')) {
      // Already a complete Helius URL, use as-is
    } else {
      // Try to extract API key or use default
      const heliusApiKey = process.env.HELIUS_API_KEY || 
                          rpcUrl?.match(/helius.*?([a-f0-9-]{36})/)?.[1] ||
                          '7b05747c-b100-4159-ba5f-c85e8c8d3997';
      
      if (heliusApiKey) {
        rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
      } else {
        rpcUrl = rpcUrl || 'https://api.mainnet-beta.solana.com';
      }
    }
    
    this.connection = new Connection(rpcUrl, 'confirmed');
    const isHelius = rpcUrl.includes('helius-rpc.com');
    console.log(`🔗 Helius WebSocket: Using ${isHelius ? 'Helius RPC (with API key)' : 'Public Solana RPC'}`);
    if (isHelius) {
      const apiKeyMatch = rpcUrl.match(/api-key=([a-f0-9-]{36})/);
      if (apiKeyMatch) {
        console.log(`   API Key: ${apiKeyMatch[1].substring(0, 8)}...`);
      }
    }
  }

  /**
   * Start the WebSocket connection and subscriptions
   */
  async start(): Promise<void> {
    console.log('🔌 Starting Helius WebSocket service...');
    await this.connect();
  }

  /**
   * Connect to Helius WebSocket
   */
  private async connect(): Promise<void> {
    const wsUrl = getHeliusWsUrl();
    console.log('📡 Connecting to:', wsUrl.replace(/api-key=.*/, 'api-key=***'));

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('✅ Helius WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.setupHeartbeat();
        this.subscribeToPrograms();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
      });

      this.ws.on('close', () => {
        console.log('🔌 WebSocket disconnected');
        this.isConnected = false;
        this.clearHeartbeat();
        this.scheduleReconnect();
      });

    } catch (error) {
      console.error('Failed to connect:', error);
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

    // Subscribe to Raydium AMM for graduations
    this.subscribeToProgramLogs(RAYDIUM_AMM_PROGRAM, 'raydium_amm');

    // Subscribe to Raydium CPMM
    this.subscribeToProgramLogs(RAYDIUM_CPMM_PROGRAM, 'raydium_cpmm');

    console.log('📊 Subscribed to on-chain programs');
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
    console.log(`📡 Subscribed to ${label} (${programId.slice(0, 8)}...)`);
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

    // Detect Raydium events (graduations)
    if (logsStr.includes(RAYDIUM_AMM_PROGRAM) || logsStr.includes(RAYDIUM_CPMM_PROGRAM)) {
      await this.processRaydiumTransaction(signature, logs);
    }
  }

  /**
   * Process PumpFun transactions (with rate limiting)
   */
  private async processPumpFunTransaction(signature: string, logs: string[]): Promise<void> {
    const logsStr = logs.join(' ');

    // Skip if circuit breaker is open
    if (this.rpcCircuitBreakerOpen) {
      return; // Silently skip to avoid more rate limit errors
    }

    try {
      // Detect new token creation
      if (logsStr.includes('Program log: Instruction: Create') ||
          logsStr.includes('Program log: Instruction: Initialize')) {

        // Get transaction details (with rate limiting)
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

        console.log(`🆕 New PumpFun token: ${event.symbol || event.mint.slice(0, 8)}`);
        this.emit('new_token', event);
        this.emit('event', event);
      }

      // Detect trades (buy/sell) - Skip if circuit breaker is open to reduce load
      if (!this.rpcCircuitBreakerOpen && 
          (logsStr.includes('Program log: Instruction: Buy') ||
           logsStr.includes('Program log: Instruction: Sell'))) {

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

    } catch (error: any) {
      // Don't log if it's a circuit breaker or rate limit error
      if (!error?.message?.includes('circuit breaker') && !error?.message?.includes('429')) {
        console.error('Error processing PumpFun tx:', error.message);
      }
    }
  }

  /**
   * Process Raydium transactions (detect graduations) - with rate limiting
   */
  private async processRaydiumTransaction(signature: string, logs: string[]): Promise<void> {
    const logsStr = logs.join(' ');

    // Skip if circuit breaker is open
    if (this.rpcCircuitBreakerOpen) {
      return;
    }

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

        console.log(`🎓 Token graduated: ${event.symbol || event.mint.slice(0, 8)}`);
        this.emit('graduation', event);
        this.emit('event', event);
      }

    } catch (error: any) {
      // Don't log if it's a circuit breaker or rate limit error
      if (!error?.message?.includes('circuit breaker') && !error?.message?.includes('429')) {
        console.error('Error processing Raydium tx:', error.message);
      }
    }
  }

  /**
   * Get transaction details using Helius enhanced API
   */
  private async getTransactionDetails(signature: string): Promise<any> {
    try {
      // Try to get API key from env or extract from RPC URL
      const rpcUrl = process.env.SOLANA_RPC_URL;
      let apiKey = process.env.HELIUS_API_KEY;
      
      // If SOLANA_RPC_URL is a complete Helius URL, extract API key from it
      if (!apiKey && rpcUrl && rpcUrl.includes('helius-rpc.com')) {
        const apiKeyMatch = rpcUrl.match(/api-key=([a-f0-9-]{36})/);
        if (apiKeyMatch) {
          apiKey = apiKeyMatch[1];
        }
      }
      
      // Fallback to default key if nothing found
      if (!apiKey) {
        apiKey = '7b05747c-b100-4159-ba5f-c85e8c8d3997';
      }
      
      if (!apiKey || apiKey === '') {
        // Fallback to basic RPC
        return this.getBasicTransactionDetails(signature);
      }

      const response = await fetch(
        `https://api.helius.xyz/v0/transactions/?api-key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactions: [signature] })
        }
      );

      if (!response.ok) {
        return this.getBasicTransactionDetails(signature);
      }

      const data = await response.json();
      const tx = data[0];
      if (!tx) return null;

      // Parse Helius enhanced transaction
      return this.parseHeliusTransaction(tx);

    } catch (error) {
      console.error('Error fetching tx details:', error);
      return null;
    }
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
      const transfer = tx.tokenTransfers[0];
      result.mint = transfer.mint;
      result.tokenAmount = transfer.tokenAmount;
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
   * Throttled RPC call with rate limiting and circuit breaker
   */
  private async throttledRpcCall<T>(fn: () => Promise<T>): Promise<T> {
    // Check circuit breaker
    if (this.rpcCircuitBreakerOpen) {
      const now = Date.now();
      if (now < this.rpcCircuitBreakerResetTime) {
        // Circuit breaker still open, reject immediately
        throw new Error('RPC circuit breaker is open due to rate limiting');
      } else {
        // Reset circuit breaker
        this.rpcCircuitBreakerOpen = false;
        this.consecutive429Errors = 0;
        console.log('🔄 RPC circuit breaker reset');
      }
    }

    return new Promise((resolve, reject) => {
      this.rpcCallQueue.push({ resolve, reject, fn });
      this.processRpcQueue();
    });
  }

  /**
   * Process RPC call queue with rate limiting
   */
  private async processRpcQueue(): Promise<void> {
    if (this.rpcCallInProgress || this.rpcCallQueue.length === 0) {
      return;
    }

    this.rpcCallInProgress = true;

    while (this.rpcCallQueue.length > 0) {
      const item = this.rpcCallQueue.shift();
      if (!item) break;

      // Rate limiting: wait if needed
      const now = Date.now();
      const timeSinceLastCall = now - this.lastRpcCallTime;
      if (timeSinceLastCall < this.minRpcCallInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minRpcCallInterval - timeSinceLastCall));
      }

      try {
        this.lastRpcCallTime = Date.now();
        const result = await item.fn();
        this.consecutive429Errors = 0; // Reset on success
        item.resolve(result);
      } catch (error: any) {
        // Handle 429 errors
        if (error?.message?.includes('429') || error?.message?.includes('Too Many Requests')) {
          this.consecutive429Errors++;
          console.error(`❌ RPC 429 error (${this.consecutive429Errors}/${this.max429Errors}):`, error.message);

          // Open circuit breaker if too many 429 errors
          if (this.consecutive429Errors >= this.max429Errors) {
            this.rpcCircuitBreakerOpen = true;
            this.rpcCircuitBreakerResetTime = Date.now() + this.CIRCUIT_BREAKER_RESET_DELAY;
            console.error(`🚨 RPC circuit breaker opened due to ${this.consecutive429Errors} consecutive 429 errors. Will reset in ${this.CIRCUIT_BREAKER_RESET_DELAY / 1000}s`);
            // Reject remaining items in queue
            while (this.rpcCallQueue.length > 0) {
              const queuedItem = this.rpcCallQueue.shift();
              if (queuedItem) {
                queuedItem.reject(new Error('RPC circuit breaker is open'));
              }
            }
            item.reject(error);
            break;
          }

          // Exponential backoff for 429 errors
          const backoffDelay = Math.min(1000 * Math.pow(2, this.consecutive429Errors - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          item.reject(error);
        } else {
          // Other errors, reject immediately
          item.reject(error);
        }
      }
    }

    this.rpcCallInProgress = false;
  }

  /**
   * Fallback: Get basic transaction details from RPC (with rate limiting)
   */
  private async getBasicTransactionDetails(signature: string): Promise<any> {
    try {
      // Use throttled RPC call
      const tx = await this.throttledRpcCall(() =>
        this.connection.getParsedTransaction(signature, {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed'
        })
      );

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
      // Don't log 429 errors here, already logged in throttledRpcCall
      if (!error?.message?.includes('429') && !error?.message?.includes('Too Many Requests') && !error?.message?.includes('circuit breaker')) {
        console.error('Error getting basic tx details:', error.message);
      }
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
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
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
    console.log('🛑 Stopping Helius WebSocket service...');
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
