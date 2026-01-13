// WebSocket API Comparison for Token Explorer
// Tests two APIs:
// 1. wss://pumpportal.fun/api/data
// 2. wss://frontend-api.pump.fun/socket.io/?EIO=4&transport=websocket

import WebSocket from 'ws';
import { io, Socket } from 'socket.io-client';
import { log } from './logger';

export interface WebSocketTestResult {
  api: string;
  connected: boolean;
  tokensReceived: number;
  latency: number;
  dataQuality: 'high' | 'medium' | 'low';
  errors: string[];
  sampleData: any;
  dataStructure: any;
}

export async function testPumpPortalAPI(timeout: number = 20000): Promise<WebSocketTestResult> {
  const result: WebSocketTestResult = {
    api: 'pumpportal.fun',
    connected: false,
    tokensReceived: 0,
    latency: 0,
    dataQuality: 'low',
    errors: [],
    sampleData: null,
    dataStructure: null,
  };

  return new Promise((resolve) => {
    const startTime = Date.now();
    let tokensCount = 0;
    const sampleData: any[] = [];
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket('wss://pumpportal.fun/api/data');

      ws.on('open', () => {
        log.info('✅ PumpPortal API: Connected');
        result.connected = true;
        result.latency = Date.now() - startTime;
        
        // Subscribe to new tokens (PumpPortal requires subscription)
        try {
          const subscribePayload = {
            method: 'subscribeNewToken',
          };
          if (ws) ws.send(JSON.stringify(subscribePayload));
          log.info('📤 PumpPortal: Sent subscription request');
        } catch (error: any) {
          result.errors.push(`Subscription error: ${error.message}`);
        }
      });

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          tokensCount++;
          
          if (sampleData.length < 3) {
            sampleData.push(message);
          }

          log.info(`📦 PumpPortal: Received token #${tokensCount}`, {
            mint: message.mint || message.address || message.token || 'N/A',
            name: message.name || 'N/A',
            symbol: message.symbol || 'N/A',
            timestamp: message.timestamp || message.created_at || message.createdAt || 'N/A',
          });
        } catch (error: any) {
          result.errors.push(`Parse error: ${error.message}`);
        }
      });

      ws.on('error', (error: Error) => {
        log.error('❌ PumpPortal API Error:', error);
        result.errors.push(`Connection error: ${error.message}`);
        result.connected = false;
        if (ws) ws.close();
        resolve(result);
      });

      ws.on('close', () => {
        log.info('🔌 PumpPortal API: Closed');
        result.tokensReceived = tokensCount;
        result.sampleData = sampleData[0] || null;
        result.dataStructure = sampleData.length > 0 ? Object.keys(sampleData[0] || {}) : [];
        
        // Determine data quality
        if (tokensCount > 10 && sampleData.length > 0) {
          result.dataQuality = 'high';
        } else if (tokensCount > 0) {
          result.dataQuality = 'medium';
        }
        
        resolve(result);
      });

      // Timeout
      setTimeout(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
        result.tokensReceived = tokensCount;
        result.sampleData = sampleData[0] || null;
        result.dataStructure = sampleData.length > 0 ? Object.keys(sampleData[0] || {}) : [];
        resolve(result);
      }, timeout);
    } catch (error: any) {
      result.errors.push(`Setup error: ${error.message}`);
      resolve(result);
    }
  });
}

export async function testPumpFunSocketIO(timeout: number = 20000): Promise<WebSocketTestResult> {
  const result: WebSocketTestResult = {
    api: 'frontend-api.pump.fun (Socket.IO)',
    connected: false,
    tokensReceived: 0,
    latency: 0,
    dataQuality: 'low',
    errors: [],
    sampleData: null,
    dataStructure: null,
  };

  return new Promise((resolve) => {
    const startTime = Date.now();
    let tokensCount = 0;
    const sampleData: any[] = [];
    let socket: Socket | null = null;

    try {
      socket = io('https://frontend-api.pump.fun', {
        transports: ['websocket'],
        upgrade: true,
        reconnection: false, // Disable auto-reconnect for testing
        timeout: 15000,
      });

      socket.on('connect', () => {
        log.info('✅ Pump.fun Socket.IO: Connected', socket?.id);
        result.connected = true;
        result.latency = Date.now() - startTime;

        // Try common Socket.IO events for pump.fun
        // Based on typical Socket.IO patterns
        socket?.emit('subscribe', 'tokens');
        socket?.emit('subscribe', 'new-tokens');
        socket?.emit('subscribe', 'coins');
        socket?.emit('subscribe', 'new-coins');
        socket?.emit('join', 'tokens');
        socket?.emit('join', 'coins');
        
        // Also try direct event subscriptions
        log.info('📤 Pump.fun Socket.IO: Sent subscription requests');
      });

      socket.on('connect_error', (error: Error) => {
        log.error('❌ Pump.fun Socket.IO Connection Error:', error);
        result.errors.push(`Connection error: ${error.message}`);
        result.connected = false;
        if (socket) socket.disconnect();
        resolve(result);
      });

      // Listen for various possible events
      const events = [
        'token',
        'tokens',
        'new-token',
        'new-tokens',
        'coin',
        'coins',
        'new-coin',
        'new-coins',
        'update',
        'data',
        'message',
        'coin-update',
        'token-update',
      ];

      events.forEach((event) => {
        socket?.on(event, (data: any) => {
          tokensCount++;
          
          if (sampleData.length < 3) {
            sampleData.push({ event, data });
          }

          const dataPreview = typeof data === 'object' 
            ? JSON.stringify(data).substring(0, 150)
            : String(data).substring(0, 150);
          
          log.info(`📦 Pump.fun Socket.IO [${event}]: Received data #${tokensCount}`, dataPreview);
        });
      });

      // Also listen to all events (for debugging - helps discover unknown events)
      socket?.onAny((event, ...args) => {
        log.info(`📦 Pump.fun Socket.IO [ANY]: Event "${event}" with ${args.length} args`);
        if (args.length > 0 && typeof args[0] === 'object') {
          log.info('   Data keys:', Object.keys(args[0]));
        }
      });

      socket.on('disconnect', () => {
        log.info('🔌 Pump.fun Socket.IO: Disconnected');
        result.tokensReceived = tokensCount;
        result.sampleData = sampleData[0] || null;
        result.dataStructure = sampleData.length > 0 ? Object.keys(sampleData[0]?.data || sampleData[0] || {}) : [];
        
        // Determine data quality
        if (tokensCount > 10 && sampleData.length > 0) {
          result.dataQuality = 'high';
        } else if (tokensCount > 0) {
          result.dataQuality = 'medium';
        }
        
        resolve(result);
      });

      // Timeout
      setTimeout(() => {
        if (socket) socket.disconnect();
        result.tokensReceived = tokensCount;
        result.sampleData = sampleData[0] || null;
        result.dataStructure = sampleData.length > 0 ? Object.keys(sampleData[0]?.data || sampleData[0] || {}) : [];
        resolve(result);
      }, timeout);
    } catch (error: any) {
      result.errors.push(`Setup error: ${error.message}`);
      resolve(result);
    }
  });
}

export async function compareWebSocketAPIs(): Promise<{
  pumpPortal: WebSocketTestResult;
  pumpFun: WebSocketTestResult;
  winner: string;
  recommendation: string;
}> {
  log.info('🔍 Starting WebSocket API Comparison...\n');

  // Test both APIs in parallel
  const [pumpPortalResult, pumpFunResult] = await Promise.all([
    testPumpPortalAPI(15000),
    testPumpFunSocketIO(15000),
  ]);

  // Determine winner
  let winner = 'none';
  let recommendation = '';

  if (pumpPortalResult.connected && pumpFunResult.connected) {
    // Both connected - compare by tokens received and data quality
    const portalScore = 
      (pumpPortalResult.tokensReceived * 10) +
      (pumpPortalResult.dataQuality === 'high' ? 50 : pumpPortalResult.dataQuality === 'medium' ? 25 : 0) -
      (pumpPortalResult.latency / 10) -
      (pumpPortalResult.errors.length * 20);

    const pumpFunScore = 
      (pumpFunResult.tokensReceived * 10) +
      (pumpFunResult.dataQuality === 'high' ? 50 : pumpFunResult.dataQuality === 'medium' ? 25 : 0) -
      (pumpFunResult.latency / 10) -
      (pumpFunResult.errors.length * 20);

    if (portalScore > pumpFunScore) {
      winner = 'pumpportal';
      recommendation = 'PumpPortal API provides better data quality and more tokens';
    } else {
      winner = 'pumpfun';
      recommendation = 'Pump.fun Socket.IO provides better data quality and more tokens';
    }
  } else if (pumpPortalResult.connected) {
    winner = 'pumpportal';
    recommendation = 'Only PumpPortal API connected successfully';
  } else if (pumpFunResult.connected) {
    winner = 'pumpfun';
    recommendation = 'Only Pump.fun Socket.IO connected successfully';
  } else {
    recommendation = 'Neither API connected. Consider using current Solana RPC method.';
  }

  return {
    pumpPortal: pumpPortalResult,
    pumpFun: pumpFunResult,
    winner,
    recommendation,
  };
}

