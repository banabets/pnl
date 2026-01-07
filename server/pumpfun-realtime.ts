// Pump.fun Real-time Listener - Suscripción directa al programa sin indexadores pagos
// Usa connection.onLogs() para obtener tokens en tiempo real GRATIS

import { Connection, PublicKey } from '@solana/web3.js';
import { EventEmitter } from 'events';

const PUMP_FUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6Px');

export interface PumpFunTokenEvent {
  type: 'new_token' | 'trade' | 'update';
  mint: string;
  name?: string;
  symbol?: string;
  signature: string;
  timestamp: number;
  creator?: string;
  bondingCurve?: string;
  price?: number;
  volume?: number;
  liquidity?: number;
  marketCap?: number;
  holders?: number;
}

export class PumpFunRealtimeListener extends EventEmitter {
  private connection: Connection;
  private isListening: boolean = false;
  private logSubscriptionId: number | null = null;
  private accountSubscriptionId: number | null = null;
  private recentTokens: Map<string, number> = new Map(); // Para evitar duplicados
  private readonly DEDUP_WINDOW = 10000; // 10 segundos

  constructor(rpcUrl?: string) {
    super();
    const url = rpcUrl || process.env.SOLANA_RPC_URL || process.env.RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=7b05747c-b100-4159-ba5f-c85e8c8d3997';
    this.connection = new Connection(url, {
      commitment: 'confirmed',
      wsEndpoint: url.replace('https://', 'wss://').replace('http://', 'ws://'),
    });
  }

  /**
   * Iniciar suscripción en tiempo real al programa de pump.fun
   */
  public async start(): Promise<void> {
    if (this.isListening) {
      console.log('⚠️ PumpFun Realtime Listener ya está escuchando');
      return;
    }

    try {
      console.log('🚀 Iniciando PumpFun Realtime Listener...');
      console.log(`📡 Programa: ${PUMP_FUN_PROGRAM_ID.toBase58()}`);

      // Método 1: Suscribirse a logs del programa (GRATIS, sin indexadores)
      // Esto captura todas las transacciones del programa pump.fun
      this.logSubscriptionId = this.connection.onLogs(
        PUMP_FUN_PROGRAM_ID,
        async (logs, context) => {
          try {
            if (logs.err) {
              return; // Ignorar transacciones fallidas
            }

            const signature = logs.signature;
            const logMessages = logs.logs || [];

            // Verificar si ya procesamos este token recientemente (deduplicación)
            const now = Date.now();
            if (this.recentTokens.has(signature)) {
              const lastSeen = this.recentTokens.get(signature)!;
              if (now - lastSeen < this.DEDUP_WINDOW) {
                return; // Ya procesado recientemente
              }
            }
            this.recentTokens.set(signature, now);

            // Limpiar tokens antiguos del mapa de deduplicación
            if (this.recentTokens.size > 1000) {
              const cutoff = now - this.DEDUP_WINDOW;
              for (const [sig, timestamp] of this.recentTokens.entries()) {
                if (timestamp < cutoff) {
                  this.recentTokens.delete(sig);
                }
              }
            }

            // Analizar logs para detectar eventos
            const logsStr = logMessages.join(' ');
            
            // Detectar creación de nuevo token
            if (logsStr.includes('Program log: Instruction: Create') ||
                logsStr.includes('Program log: Instruction: Initialize') ||
                logsStr.includes('Program log: Create') ||
                logsStr.includes('Program log: Initialize')) {
              
              console.log(`🆕 Nueva transacción pump.fun detectada: ${signature.substring(0, 16)}...`);
              
              // Obtener detalles de la transacción (con delay para asegurar que esté disponible)
              setTimeout(async () => {
                try {
                  await this.processTransaction(signature, 'new_token');
                } catch (error) {
                  console.warn(`Error procesando transacción ${signature.substring(0, 16)}...:`, error);
                }
              }, 1000); // Delay de 1 segundo para asegurar que la transacción esté disponible
            }

            // Detectar trades (buy/sell)
            if (logsStr.includes('Program log: Instruction: Buy') ||
                logsStr.includes('Program log: Instruction: Sell') ||
                logsStr.includes('Program log: Buy') ||
                logsStr.includes('Program log: Sell')) {
              
              setTimeout(async () => {
                try {
                  await this.processTransaction(signature, 'trade');
                } catch (error) {
                  // Ignorar errores silenciosamente
                }
              }, 500);
            }

          } catch (error) {
            console.error('Error procesando logs:', error);
          }
        },
        'confirmed'
      );

      console.log(`✅ Suscrito a logs del programa pump.fun (Subscription ID: ${this.logSubscriptionId})`);

      // Método 2: También suscribirse a cambios de cuenta para detectar nuevos tokens
      // Esto es más específico pero puede ser más costoso en términos de recursos
      // Por ahora lo dejamos comentado y usamos solo logs

      this.isListening = true;
      console.log('✅ PumpFun Realtime Listener iniciado correctamente');
      console.log('📊 Escuchando tokens nuevos en tiempo real...');

    } catch (error) {
      console.error('❌ Error iniciando PumpFun Realtime Listener:', error);
      throw error;
    }
  }

  /**
   * Procesar una transacción para extraer información del token
   */
  private async processTransaction(signature: string, eventType: 'new_token' | 'trade'): Promise<void> {
    try {
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || !tx.meta) {
        return;
      }

      // Extraer información de la transacción
      const accountKeys = tx.transaction.message instanceof Object && 'accountKeys' in tx.transaction.message
        ? tx.transaction.message.accountKeys
        : tx.transaction.message.getAccountKeys().staticAccountKeys;

      // Buscar el mint del token (generalmente está en las cuentas de la transacción)
      let tokenMint: string | null = null;
      let creator: string | null = null;
      let bondingCurve: string | null = null;

      // El mint del token generalmente está en las cuentas
      // Para pump.fun, el mint suele estar en las primeras cuentas
      for (let i = 0; i < Math.min(accountKeys.length, 10); i++) {
        const account = accountKeys[i];
        const pubkey = account instanceof PublicKey ? account : new PublicKey(account);
        
        // Verificar si es un token mint (tiene metadata de token)
        try {
          const accountInfo = await this.connection.getAccountInfo(pubkey);
          if (accountInfo && accountInfo.data.length > 0) {
            // Verificar si es un mint de token SPL
            // Los mints de token tienen una estructura específica
            if (accountInfo.owner.equals(new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'))) {
              // Es un token mint
              tokenMint = pubkey.toBase58();
              break;
            }
          }
        } catch {
          // Continuar buscando
        }
      }

      // Si no encontramos el mint de la forma anterior, intentar extraerlo de los logs
      if (!tokenMint) {
        const logs = tx.meta.logMessages || [];
        for (const log of logs) {
          // Buscar patrones en los logs que indiquen el mint
          const mintMatch = log.match(/mint[:\s]+([A-Za-z0-9]{32,44})/i);
          if (mintMatch) {
            tokenMint = mintMatch[1];
            break;
          }
        }
      }

      // Extraer creator (el signer de la transacción)
      if (tx.transaction.message instanceof Object && 'accountKeys' in tx.transaction.message) {
        const staticKeys = tx.transaction.message.accountKeys;
        if (staticKeys.length > 0) {
          const signer = staticKeys[0];
          creator = signer instanceof PublicKey ? signer.toBase58() : new PublicKey(signer).toBase58();
        }
      } else {
        const signers = tx.transaction.message.getAccountKeys().staticAccountKeys;
        if (signers.length > 0) {
          creator = signers[0].toBase58();
        }
      }

      // Buscar bonding curve (PDA de pump.fun)
      for (const account of accountKeys.slice(0, 20)) {
        const pubkey = account instanceof PublicKey ? account : new PublicKey(account);
        const pubkeyStr = pubkey.toBase58();
        // El bonding curve es un PDA, podemos intentar derivarlo
        // Por ahora, lo marcamos si encontramos una cuenta relacionada
        if (pubkeyStr.length === 44) {
          bondingCurve = pubkeyStr;
          break;
        }
      }

      if (eventType === 'new_token' && tokenMint) {
        const event: PumpFunTokenEvent = {
          type: 'new_token',
          mint: tokenMint,
          signature,
          timestamp: Date.now(),
          creator: creator || undefined,
          bondingCurve: bondingCurve || undefined,
        };

        console.log(`🆕 Nuevo token detectado: ${tokenMint.substring(0, 8)}...`);
        
        // Emitir evento
        this.emit('new_token', event);
        this.emit('token_event', event);

        // Intentar obtener más información del token (nombre, símbolo, etc.)
        // Esto se puede hacer de forma asíncrona sin bloquear
        this.enrichTokenInfo(tokenMint, event).catch(() => {
          // Ignorar errores de enriquecimiento
        });
      } else if (eventType === 'trade' && tokenMint) {
        const event: PumpFunTokenEvent = {
          type: 'trade',
          mint: tokenMint,
          signature,
          timestamp: Date.now(),
        };

        this.emit('trade', event);
        this.emit('token_event', event);
      }

    } catch (error) {
      // Ignorar errores silenciosamente para no saturar los logs
      // console.warn(`Error procesando transacción ${signature.substring(0, 16)}...:`, error);
    }
  }

  /**
   * Enriquecer información del token (nombre, símbolo, precio, etc.)
   */
  private async enrichTokenInfo(mint: string, event: PumpFunTokenEvent): Promise<void> {
    try {
      // Intentar obtener información de pump.fun API
      const pumpApiUrl = `https://frontend-api.pump.fun/coins/${mint}`;
      const response = await fetch(pumpApiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Actualizar evento con información enriquecida
        event.name = data.name || data.token_name || event.name;
        event.symbol = data.symbol || data.token_symbol || event.symbol;
        event.price = data.usd_market_cap ? data.usd_market_cap / (data.market_cap || 1) : undefined;
        event.volume = data.volume_24h || data.volume || undefined;
        event.liquidity = data.liquidity || undefined;
        event.marketCap = data.usd_market_cap || data.market_cap || undefined;
        event.holders = data.holders || undefined;

        // Emitir evento actualizado
        this.emit('token_updated', event);
        this.emit('token_event', event);
      }
    } catch (error) {
      // Ignorar errores de enriquecimiento
    }
  }

  /**
   * Detener la suscripción
   */
  public async stop(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      if (this.logSubscriptionId !== null) {
        await this.connection.removeOnLogsListener(this.logSubscriptionId);
        this.logSubscriptionId = null;
      }

      if (this.accountSubscriptionId !== null) {
        await this.connection.removeAccountChangeListener(this.accountSubscriptionId);
        this.accountSubscriptionId = null;
      }

      this.isListening = false;
      this.recentTokens.clear();
      console.log('🛑 PumpFun Realtime Listener detenido');
    } catch (error) {
      console.error('Error deteniendo listener:', error);
    }
  }

  /**
   * Verificar si está escuchando
   */
  public getIsListening(): boolean {
    return this.isListening;
  }
}

