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
  const apiKey = process.env.HELIUS_API_KEY || process.env.SOLANA_RPC_URL?.match(/helius.*?([a-f0-9-]{36})/)?.[1];
  if (!apiKey) {
    console.warn('No Helius API key found, using public RPC');
    return 'wss://api.mainnet-beta.solana.com';
  }
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

  constructor() {
    super();
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
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

      this.ws.on('error', (error: any) => {
        const errorMsg = error.message || String(error);
        console.error('❌ WebSocket error:', errorMsg);
        
        // Check if it's an authentication error (401)
        if (errorMsg.includes('401') || errorMsg.includes('Unauthorized') || errorMsg.includes('Unexpected server response: 401')) {
          console.error('🚫 WebSocket authentication failed (401). This usually means:');
          console.error('   1. The Helius API key is invalid or expired');
          console.error('   2. The API key does not have WebSocket permissions');
          console.error('   3. The API key format is incorrect');
          console.error('   Please check your HELIUS_API_KEY environment variable');
          this.hasAuthError = true;
          // Don't try to reconnect if we have auth errors
          return;
        }
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        const reasonStr = reason.toString();
        console.log(`🔌 WebSocket disconnected (code: ${code}, reason: ${reasonStr})`);
        this.isConnected = false;
        this.clearHeartbeat();
        
        // Don't reconnect if we have auth errors or if close code indicates auth failure
        if (this.hasAuthError || code === 1008 || code === 4001 || reasonStr.includes('401') || reasonStr.includes('Unauthorized')) {
          console.error('🚫 Stopping reconnection attempts due to authentication error');
          this.hasAuthError = true;
          return;
        }
        
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

        console.log(`🆕 New PumpFun token: ${event.symbol || event.mint.slice(0, 8)}`);
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
      console.error('Error processing PumpFun tx:', error);
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

        console.log(`🎓 Token graduated: ${event.symbol || event.mint.slice(0, 8)}`);
        this.emit('graduation', event);
        this.emit('event', event);
      }

    } catch (error) {
      console.error('Error processing Raydium tx:', error);
    }
  }

  /**
   * Get transaction details using Helius enhanced API
   */
  private async getTransactionDetails(signature: string): Promise<any> {
    try {
      const apiKey = process.env.HELIUS_API_KEY;
      if (!apiKey) {
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
   * Fallback: Get basic transaction details from RPC
   */
  private async getBasicTransactionDetails(signature: string): Promise<any> {
    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed'
      });

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

    } catch (error) {
      console.error('Error getting basic tx details:', error);
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
      console.error('🚫 Skipping reconnection due to authentication error');
      return;
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached. WebSocket will not reconnect automatically.');
      console.error('   If this is an authentication issue, please check your HELIUS_API_KEY');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

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
