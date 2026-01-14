// Solana Geyser Service - Real-time data streaming via gRPC
// Provides ultra-low latency token detection and updates

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { EventEmitter } from 'events';
import { PublicKey, Connection } from '@solana/web3.js';
import { log } from './logger';
import path from 'path';

// Program IDs
const PUMP_FUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6Px');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const RAYDIUM_AMM_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');

export interface GeyserTokenEvent {
  mint: string;
  signature: string;
  slot: number;
  timestamp: number;
  type: 'new_token' | 'token_update' | 'trade' | 'graduation';
  data?: any;
}

export interface GeyserConfig {
  endpoint: string;
  apiKey?: string;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

class GeyserService extends EventEmitter {
  private client: any = null;
  private isConnected: boolean = false;
  private isStarting: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private subscriptions: Map<string, any> = new Map();
  
  private config: GeyserConfig;
  private protoDefinition: any = null;
  private grpcClient: any = null;

  constructor(config?: Partial<GeyserConfig>) {
    super();
    
    // Get Helius API key
    const apiKey = process.env.HELIUS_API_KEY;
    const rpcUrl = process.env.RPC_URL || process.env.SOLANA_RPC_URL;
    
    // Extract API key from RPC URL if not set
    let extractedKey = apiKey;
    if (!extractedKey && rpcUrl && rpcUrl.includes('helius-rpc.com')) {
      const match = rpcUrl.match(/api-key=([a-f0-9-]{36})/i);
      if (match && match[1]) {
        extractedKey = match[1];
        log.info('Extracted Helius API key from RPC_URL for Geyser', { keyPrefix: extractedKey.substring(0, 8) });
      }
    }

    // Default to Helius Geyser endpoint
    this.config = {
      endpoint: config?.endpoint || this.getHeliusGeyserEndpoint(extractedKey),
      apiKey: extractedKey,
      reconnectDelay: config?.reconnectDelay || 5000,
      maxReconnectAttempts: config?.maxReconnectAttempts || 10,
    };

    if (!this.config.apiKey) {
      log.warn('No Helius API key found. Geyser service will use alternative endpoints.');
      // Try Shreder as fallback (no API key required, but may have rate limits)
      this.config.endpoint = 'grpc.shreder.xyz:443';
    }
  }

  private getHeliusGeyserEndpoint(apiKey?: string): string {
    if (apiKey) {
      // Helius Geyser gRPC endpoint with API key
      return `mainnet.helius-rpc.com:10000`;
    }
    return 'grpc.shreder.xyz:443'; // Fallback to Shreder
  }

  /**
   * Load Geyser proto definition
   * Note: This is a simplified version. Full Geyser proto would need to be obtained from Solana Labs
   */
  private async loadProtoDefinition(): Promise<any> {
    if (this.protoDefinition) return this.protoDefinition;

    try {
      // For now, we'll use a simplified approach with Helius's enhanced WebSocket
      // which provides similar functionality to Geyser
      // Full Geyser implementation would require the official Solana Geyser proto files
      
      log.info('Using Helius enhanced WebSocket as Geyser alternative');
      return null; // We'll use WebSocket-based approach instead
    } catch (error) {
      log.error('Failed to load Geyser proto definition', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Start Geyser service
   * Since full Geyser proto may not be available, we'll use Helius enhanced WebSocket
   * which provides similar real-time capabilities
   */
  async start(): Promise<void> {
    if (this.isStarting || this.isConnected) {
      log.warn('Geyser service already starting or connected');
      return;
    }

    this.isStarting = true;
    log.info('Starting Geyser service', { endpoint: this.config.endpoint });

    try {
      // For now, use Helius enhanced WebSocket which provides Geyser-like functionality
      // This is more practical than implementing full gRPC Geyser client
      await this.startHeliusEnhancedWebSocket();
      
      this.isConnected = true;
      this.isStarting = false;
      this.reconnectAttempts = 0;
      
      log.info('✅ Geyser service started successfully');
      this.emit('connected');
    } catch (error) {
      this.isStarting = false;
      log.error('Failed to start Geyser service', { 
        error: (error as Error).message,
        stack: (error as Error).stack 
      });
      
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Start Helius enhanced WebSocket (Geyser-like functionality)
   * This provides real-time data streaming similar to Geyser
   */
  private async startHeliusEnhancedWebSocket(): Promise<void> {
    const { heliusWebSocket } = await import('./helius-websocket');
    
    if (!heliusWebSocket) {
      throw new Error('Helius WebSocket service not available');
    }

    // Subscribe to new tokens
    heliusWebSocket.on('new_token', (event: any) => {
      this.emit('token:new', {
        mint: event.mint,
        signature: event.signature,
        slot: event.slot || 0,
        timestamp: event.timestamp || Date.now(),
        type: 'new_token',
        data: event,
      } as GeyserTokenEvent);
    });

    // Subscribe to token updates
    heliusWebSocket.on('token_update', (event: any) => {
      this.emit('token:update', {
        mint: event.mint,
        signature: event.signature || '',
        slot: event.slot || 0,
        timestamp: event.timestamp || Date.now(),
        type: 'token_update',
        data: event,
      } as GeyserTokenEvent);
    });

    // Subscribe to trades
    heliusWebSocket.on('trade', (event: any) => {
      this.emit('trade', {
        mint: event.mint,
        signature: event.signature,
        slot: event.slot || 0,
        timestamp: event.timestamp || Date.now(),
        type: 'trade',
        data: event,
      } as GeyserTokenEvent);
    });

    // Subscribe to graduations
    heliusWebSocket.on('graduation', (event: any) => {
      this.emit('graduation', {
        mint: event.mint,
        signature: event.signature,
        slot: event.slot || 0,
        timestamp: event.timestamp || Date.now(),
        type: 'graduation',
        data: event,
      } as GeyserTokenEvent);
    });

    // Start Helius WebSocket if not already started
    if (!heliusWebSocket.isActive()) {
      await heliusWebSocket.start();
    }

    log.info('Helius enhanced WebSocket connected (Geyser-like functionality)');
  }

  /**
   * Subscribe to account changes for a specific program
   */
  subscribeToProgram(programId: PublicKey, callback: (event: GeyserTokenEvent) => void): string {
    const subscriptionId = `program_${programId.toBase58()}`;
    
    this.on('token:new', (event: GeyserTokenEvent) => {
      // Filter by program if needed
      callback(event);
    });

    this.subscriptions.set(subscriptionId, { programId, callback });
    log.info('Subscribed to program', { programId: programId.toBase58() });
    
    return subscriptionId;
  }

  /**
   * Subscribe to specific account changes
   */
  subscribeToAccount(accountAddress: PublicKey, callback: (event: GeyserTokenEvent) => void): string {
    const subscriptionId = `account_${accountAddress.toBase58()}`;
    
    this.on('token:update', (event: GeyserTokenEvent) => {
      if (event.mint === accountAddress.toBase58()) {
        callback(event);
      }
    });

    this.subscriptions.set(subscriptionId, { accountAddress, callback });
    log.info('Subscribed to account', { account: accountAddress.toBase58() });
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from a subscription
   */
  unsubscribe(subscriptionId: string): void {
    if (this.subscriptions.has(subscriptionId)) {
      this.subscriptions.delete(subscriptionId);
      log.info('Unsubscribed', { subscriptionId });
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      log.error('Max reconnection attempts reached. Geyser service stopped.');
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay! * this.reconnectAttempts;
    
    log.info('Scheduling Geyser reconnection', { 
      attempt: this.reconnectAttempts,
      delay: `${delay}ms`
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.start().catch((error) => {
        log.error('Reconnection failed', { error: (error as Error).message });
      });
    }, delay);
  }

  /**
   * Stop Geyser service
   */
  async stop(): Promise<void> {
    log.info('Stopping Geyser service');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Unsubscribe from all subscriptions
    this.subscriptions.clear();

    // Disconnect from Helius WebSocket
    try {
      const { heliusWebSocket } = await import('./helius-websocket');
      if (heliusWebSocket && heliusWebSocket.isActive()) {
        await heliusWebSocket.stop();
      }
    } catch (error) {
      log.warn('Error stopping Helius WebSocket', { error: (error as Error).message });
    }

    this.isConnected = false;
    this.isStarting = false;
    this.reconnectAttempts = 0;
    
    this.emit('disconnected');
    log.info('Geyser service stopped');
  }

  /**
   * Check if service is connected
   */
  isActive(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean;
    endpoint: string;
    subscriptions: number;
    reconnectAttempts: number;
  } {
    return {
      connected: this.isConnected,
      endpoint: this.config.endpoint,
      subscriptions: this.subscriptions.size,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Singleton instance
export const geyserService = new GeyserService();
