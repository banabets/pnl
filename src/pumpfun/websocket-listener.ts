import {
  Connection,
  PublicKey,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getMint } from '@solana/spl-token';

// Pump.fun Program ID
const PUMP_FUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6Px');

export interface TokenUpdate {
  mint: string;
  timestamp: number;
  signature: string;
}

export class PumpFunWebSocketListener {
  private connection: Connection;
  private subscriptionId: number | null = null;
  private tokenCallbacks: Set<(token: TokenUpdate) => void> = new Set();
  private isListening: boolean = false;
  private recentTokens: Map<string, TokenUpdate> = new Map();
  private maxRecentTokens: number = 100;

  constructor() {
    // Use Helius WebSocket endpoint for real-time listening
    // Convert wss:// to https:// for Connection (it handles WebSocket internally)
    const wsRpcUrl = process.env.WS_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=b8baac5d-2270-45ba-8324-9d7024c3f828';
    this.connection = new Connection(wsRpcUrl, 'confirmed');
  }

  /**
   * Start listening to pump.fun program transactions via WebSocket
   */
  public async startListening(): Promise<void> {
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
      this.subscriptionId = this.connection.onProgramAccountChange(
        PUMP_FUN_PROGRAM_ID,
        async (accountInfo, context) => {
          try {
            // Extract token mint from account data if possible
            // Pump.fun accounts typically store token mints
            await this.processAccountChange(accountInfo.accountId.toBuffer(), context.slot);
          } catch (error) {
            console.error('Error processing account change:', error);
          }
        },
        'confirmed'
      );

      // Subscribe to logs to catch transaction signatures
      // This is the most reliable method for catching new token creations
      this.connection.onLogs(
        PUMP_FUN_PROGRAM_ID,
        async (logs, context) => {
          try {
            if (logs.err) return; // Skip failed transactions
            
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
              } catch (error) {
                // Transaction may not be available yet, ignore
              }
            }, 500);
          } catch (error) {
            // Ignore errors
          }
        },
        'confirmed'
      );

      this.isListening = true;
      console.log('✅ WebSocket listener started for pump.fun');

    } catch (error) {
      console.error('Failed to start WebSocket listener:', error);
      throw error;
    }
  }

  /**
   * Fetch recent historical transactions to populate initial token list
   */
  private async fetchRecentHistoricalTransactions(): Promise<void> {
    try {
      console.log('📡 Fetching recent historical transactions...');
      
      // Try with current connection first (with timeout and error handling)
      let recentSignatures: any[] = [];
      try {
        recentSignatures = await Promise.race([
          this.connection.getSignaturesForAddress(
            PUMP_FUN_PROGRAM_ID,
            { limit: 20 }, // Reduced from 50 to avoid rate limits
            'confirmed'
          ),
          new Promise<any[]>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 10000)
          )
        ]).catch(() => []);
      } catch (error: any) {
        // If we get rate limited or timeout, just skip historical fetch
        if (error?.message?.includes('429') || error?.message?.includes('Too Many Requests') || error?.message?.includes('Timeout')) {
          console.log('⚠️ Rate limited or timeout fetching historical transactions, skipping...');
          return; // Exit early to avoid more rate limits
        }
      }

      // If no results, try alternative methods (but limit attempts to avoid rate limits)
      if (recentSignatures.length === 0) {
        console.log('⚠️ No transactions from pump.fun program, trying SPL Token program...');
        try {
          // Try searching SPL Token program for recent token mints
          // Use a timeout to avoid hanging
          const publicRpc = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
          
          let tokenSignatures: any[] = [];
          try {
            tokenSignatures = await Promise.race([
              publicRpc.getSignaturesForAddress(
                TOKEN_PROGRAM_ID,
                { limit: 20 }, // Reduced from 50
                'confirmed'
              ),
              new Promise<any[]>((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 10000)
              )
            ]).catch(() => []);
          } catch (error: any) {
            if (error?.message?.includes('429') || error?.message?.includes('Too Many Requests') || error?.message?.includes('Timeout')) {
              console.log('⚠️ Rate limited fetching SPL token transactions, skipping historical fetch...');
              return; // Exit early
            }
            throw error;
          }
          
          if (tokenSignatures.length === 0) {
            console.log('⚠️ No SPL token transactions found, will rely on real-time WebSocket only');
            return;
          }
          
          console.log(`Found ${tokenSignatures.length} recent SPL token transactions`);
          
          // Process token program transactions to find new mints
          // Only process very recent transactions (last 24 hours)
          const oneDayAgo = Date.now() / 1000 - (24 * 60 * 60);
          
          // Reduce processing to avoid rate limits
          const maxToProcess = Math.min(tokenSignatures.length, 10); // Reduced from 30
          
          for (let i = 0; i < maxToProcess; i++) {
            try {
              const sig = tokenSignatures[i];
              const txTimestamp = sig.blockTime || Date.now() / 1000;
              
              // Skip transactions older than 24 hours
              if (txTimestamp < oneDayAgo) {
                continue;
              }
              
              // Add retry logic with exponential backoff for 429 errors
              let tx = null;
              let retries = 0;
              const maxRetries = 3;
              
              while (retries < maxRetries && !tx) {
                try {
                  tx = await publicRpc.getTransaction(sig.signature, {
                    commitment: 'confirmed',
                    maxSupportedTransactionVersion: 0,
                  });
                } catch (error: any) {
                  if (error?.message?.includes('429') || error?.message?.includes('Too Many Requests')) {
                    retries++;
                    if (retries >= maxRetries) {
                      console.log(`⚠️ Rate limited after ${maxRetries} retries, skipping remaining transactions...`);
                      return; // Exit early to avoid more rate limits
                    }
                    const delay = Math.min(1000 * Math.pow(2, retries), 8000); // Max 8 seconds
                    console.log(`Server responded with 429 Too Many Requests. Retrying after ${delay}ms delay...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                  } else {
                    // Other error, skip this transaction
                    break;
                  }
                }
              }
              
              if (!tx) {
                continue; // Skip if we couldn't get the transaction
              }

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
                      // Skip verification to reduce RPC calls and avoid rate limits
                      // Just add the token if it's recent enough
                      try {
                        // Skip expensive verification calls to avoid rate limits
                        // Just trust the transaction timestamp for recent transactions
                        const isVeryRecent = txTimestamp >= (Date.now() / 1000 - (2 * 60 * 60)); // Last 2 hours
                        
                        if (isVeryRecent) {
                          await this.notifyTokenUpdate({
                            mint: balance.mint,
                            timestamp: txTimestamp,
                            signature: sig.signature,
                          });
                        }
                      } catch (error) {
                        // Skip verification errors
                        continue;
                      }
                      
                      // OLD CODE - Commented out to avoid rate limits
                      /*
                      try {
                        const mintPubkey = new PublicKey(balance.mint);
                        const mintAccount = await publicRpc.getAccountInfo(mintPubkey).catch(() => null);
                        
                        if (mintAccount) {
                          // Check if this is a new token (recently created)
                          // We'll use transaction timestamp as proxy for creation
                          // But also verify the token is actually new
                          const mintInfo = await getMint(publicRpc, mintPubkey).catch(() => null);
                          
                          if (mintInfo) {
                            // Only add if supply is relatively small (new tokens) or transaction is very recent
                            const supply = Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals);
                            const isVeryRecent = txTimestamp >= (Date.now() / 1000 - (2 * 60 * 60)); // Last 2 hours
                            
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
                      } catch (error) {
                        // If verification fails, skip this token
                        continue;
                      }
                      */
                    }
                  }
                }
              }
              
              // Increased delay to avoid rate limits
              await new Promise(resolve => setTimeout(resolve, 1000)); // Increased from 150ms to 1000ms
            } catch (error) {
              continue;
            }
          }
          
          console.log(`✅ Found ${this.recentTokens.size} tokens from SPL Token program`);
          return; // Exit early since we processed token program
        } catch (error) {
          console.log('Alternative search also failed, will rely on real-time WebSocket only');
          return;
        }
      }

      console.log(`Found ${recentSignatures.length} recent pump.fun transactions to process`);

      // Process transactions in batches (reduced to avoid rate limits)
      const batchSize = 3; // Reduced from 5
      const maxToProcess = Math.min(recentSignatures.length, 15); // Reduced from 30
      
      for (let i = 0; i < maxToProcess; i += batchSize) {
        const batch = recentSignatures.slice(i, i + batchSize);
        
        // Use the connection that worked (or try both)
        const rpcToUse = recentSignatures.length > 0 ? this.connection : new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        
        await Promise.all(batch.map(async (sig) => {
          try {
            // Add retry logic with exponential backoff
            let tx = null;
            let retries = 0;
            const maxRetries = 2;
            
            while (retries < maxRetries && !tx) {
              try {
                tx = await rpcToUse.getTransaction(sig.signature, {
                  commitment: 'confirmed',
                  maxSupportedTransactionVersion: 0,
                });
              } catch (error: any) {
                if (error?.message?.includes('429') || error?.message?.includes('Too Many Requests')) {
                  retries++;
                  if (retries >= maxRetries) {
                    return; // Skip this transaction
                  }
                  const delay = Math.min(1000 * Math.pow(2, retries), 4000);
                  await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                  return; // Skip on other errors
                }
              }
            }

            if (tx?.meta) {
              const timestamp = sig.blockTime || Date.now() / 1000;
              await this.extractTokensFromTransaction(tx, sig.signature, timestamp);
            }
          } catch (error) {
            // Skip failed transactions
          }
        }));

        // Increased delay between batches to avoid rate limits
        if (i + batchSize < maxToProcess) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Increased from 200ms to 2000ms
        }
      }

      console.log(`✅ Processed historical transactions, found ${this.recentTokens.size} tokens`);
    } catch (error) {
      console.error('Error fetching historical transactions:', error);
    }
  }

  /**
   * Stop listening to transactions
   */
  public async stopListening(): Promise<void> {
    if (!this.isListening) return;

    try {
      if (this.subscriptionId !== null) {
        await this.connection.removeProgramAccountChangeListener(this.subscriptionId);
        this.subscriptionId = null;
      }
      this.isListening = false;
      console.log('🛑 WebSocket listener stopped');
    } catch (error) {
      console.error('Error stopping WebSocket listener:', error);
    }
  }

  /**
   * Subscribe to token updates
   */
  public onTokenUpdate(callback: (token: TokenUpdate) => void): () => void {
    this.tokenCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.tokenCallbacks.delete(callback);
    };
  }

  /**
   * Get recent tokens found via WebSocket
   * Only returns tokens from the last 2 hours (very recent)
   */
  public getRecentTokens(limit: number = 50): TokenUpdate[] {
    const twoHoursAgo = Date.now() / 1000 - (2 * 60 * 60); // Last 2 hours only
    const thirtyMinutesAgo = Date.now() / 1000 - (30 * 60); // Last 30 minutes (prioritize)
    
    const allRecent = Array.from(this.recentTokens.values())
      .filter(token => token.timestamp >= twoHoursAgo);
    
    // Prioritize very recent tokens (last 30 minutes)
    const veryRecent = allRecent.filter(t => t.timestamp >= thirtyMinutesAgo);
    const olderRecent = allRecent.filter(t => t.timestamp < thirtyMinutesAgo);
    
    // Combine: very recent first, then older recent
    const sorted = [...veryRecent, ...olderRecent]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
    
    return sorted;
  }

  /**
   * Process account change and extract token mints
   */
  private async processAccountChange(accountData: Buffer, slot: number): Promise<void> {
    try {
      // Try to extract token mint from account data
      // Pump.fun account structure may vary, so we try multiple approaches
      if (accountData.length >= 32) {
        try {
          const potentialMint = new PublicKey(accountData.slice(0, 32));
          
          // Verify it's a valid token mint
          const mintInfo = await getMint(this.connection, potentialMint).catch(() => null);
          if (mintInfo) {
            await this.notifyTokenUpdate({
              mint: potentialMint.toBase58(),
              timestamp: Date.now() / 1000,
              signature: '', // Account changes don't have signatures
            });
          }
        } catch {
          // Not a valid mint
        }
      }
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Extract token mints from a transaction
   */
  private async extractTokensFromTransaction(tx: any, signature: string, timestamp?: number): Promise<void> {
    try {
      const txTimestamp = timestamp || Date.now() / 1000;
      const tokenMints = new Set<string>();

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
              const accountInfo = await this.connection.getAccountInfo(
                new PublicKey(keyStr)
              ).catch(() => null);
              
              if (accountInfo && accountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
                tokenMints.add(keyStr);
              }
            } catch {
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
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Notify all subscribers about a new token
   */
  private async notifyTokenUpdate(token: TokenUpdate): Promise<void> {
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
      } catch (error) {
        console.error('Error in token update callback:', error);
      }
    }
  }

  /**
   * Check if currently listening
   */
  public getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Check if a token is likely a pump.fun token by checking for bonding curve
   */
  private async isLikelyPumpFunToken(mint: PublicKey): Promise<boolean> {
    try {
      // Derive potential bonding curve PDA
      const [bondingCurve] = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding-curve'), mint.toBuffer()],
        PUMP_FUN_PROGRAM_ID
      );

      // Check if bonding curve account exists
      const bondingCurveInfo = await this.connection.getAccountInfo(bondingCurve).catch(() => null);
      return bondingCurveInfo !== null;
    } catch (error) {
      return false;
    }
  }
}

