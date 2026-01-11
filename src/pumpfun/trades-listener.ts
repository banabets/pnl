import {
  Connection,
  PublicKey,
  ParsedTransactionWithMeta,
} from '@solana/web3.js';

const PUMP_FUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6Px');

export interface Trade {
  signature: string;
  timestamp: number;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
  buyer: string;
  seller: string;
  solAmount: number;
  tokenAmount: number;
}

export class TradesListener {
  private connection: Connection;
  private subscriptionId: number | null = null;
  private tradeCallbacks: Set<(trade: Trade) => void> = new Set();
  private isListening: boolean = false;
  private recentTrades: Map<string, Trade> = new Map();
  private maxRecentTrades: number = 1000;

  constructor() {
    const rpcUrl = process.env.RPC_URL || `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY || ''}`;
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Start listening for trades for a specific token
   */
  public async startListening(tokenMint: string): Promise<void> {
    if (this.isListening) {
      await this.stopListening();
    }

    try {
      const mintPubkey = new PublicKey(tokenMint);
      console.log(`🔌 Starting trades listener for token: ${tokenMint.substring(0, 8)}...`);

      // Subscribe to account changes for the token mint
      // Note: This will trigger on any change to the mint account
      this.subscriptionId = this.connection.onAccountChange(
        mintPubkey,
        async (_accountInfo, _context) => {
          // When token account changes, fetch recent transactions
          // This helps catch new trades in real-time
          setTimeout(() => {
            this.fetchRecentTrades(tokenMint).catch(() => {});
          }, 1000);
        },
        'confirmed'
      );

      // Also subscribe to logs from pump.fun program to catch swaps
      this.connection.onLogs(
        PUMP_FUN_PROGRAM_ID,
        async (logs, _context) => {
          if (logs.err) return;
          
          // Check if this transaction involves our token
          setTimeout(async () => {
            try {
              const tx = await this.connection.getTransaction(logs.signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0,
              });
              
              if (tx?.meta) {
                await this.processTransaction(tx as any, logs.signature, tokenMint);
              }
            } catch (error) {
              // Ignore errors
            }
          }, 500);
        },
        'confirmed'
      );

      // Fetch initial trades
      await this.fetchRecentTrades(tokenMint);

      this.isListening = true;
      console.log('✅ Trades listener started');
    } catch (error) {
      console.error('Failed to start trades listener:', error);
      throw error;
    }
  }

  /**
   * Fetch recent trades from on-chain data
   */
  private async fetchRecentTrades(tokenMint: string): Promise<void> {
    try {
      const mintPubkey = new PublicKey(tokenMint);
      
      // Get recent signatures for the token mint (limit to avoid timeout)
      const signatures = await this.connection.getSignaturesForAddress(
        mintPubkey,
        { limit: 20 }, // Reduced from 50 to avoid timeout
        'confirmed'
      );

      console.log(`📊 Found ${signatures.length} recent transactions for token`);

      // Process transactions in batches (reduced to avoid timeout)
      for (let i = 0; i < Math.min(signatures.length, 10); i++) {
        try {
          const sig = signatures[i];
          const tx = await this.connection.getTransaction(sig.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          });

          if (tx?.meta) {
            await this.processTransaction(tx as any, sig.signature, tokenMint);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 50)); // Reduced delay
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      console.error('Error fetching recent trades:', error);
    }
  }

  /**
   * Process a transaction to extract trade information
   */
  private async processTransaction(
    tx: any, // Accept any transaction type to avoid type errors
    signature: string,
    tokenMint: string
  ): Promise<void> {
    try {
      if (!tx?.meta) return;
      
      // Get signer account from transaction
      let signerAccount = '';
      try {
        if (tx.transaction) {
          const message = tx.transaction.message;
          if (message.accountKeys && message.accountKeys.length > 0) {
            // Versioned transaction
            const firstKey = message.accountKeys[0];
            signerAccount = typeof firstKey === 'string' ? firstKey : (firstKey?.toString() || '');
          } else if (message.staticAccountKeys && message.staticAccountKeys.length > 0) {
            // Parsed transaction
            signerAccount = message.staticAccountKeys[0]?.toString() || '';
          } else if ((message as any).accountKeys && (message as any).accountKeys.length > 0) {
            // Alternative format
            const firstKey = (message as any).accountKeys[0];
            signerAccount = typeof firstKey === 'string' ? firstKey : (firstKey?.toString() || '');
          }
        }
      } catch (e) {
        // Ignore errors getting signer
      }
      
      // Get token balances from transaction
      const preTokenBalances = tx.meta.preTokenBalances || [];
      const postTokenBalances = tx.meta.postTokenBalances || [];
      const preBalances = tx.meta.preBalances || [];
      const postBalances = tx.meta.postBalances || [];

      // Find token balance changes
      let tokenBalanceChange = 0;
      let solBalanceChange = 0;
      let accountOwner = '';

      // Check token balance changes
      for (const preBalance of preTokenBalances) {
        if (preBalance.mint === tokenMint) {
          const postBalance = postTokenBalances.find(
            (pb: any) => pb.accountIndex === preBalance.accountIndex
          );
          
          if (postBalance) {
            const preAmount = parseFloat(preBalance.uiTokenAmount?.uiAmountString || '0');
            const postAmount = parseFloat(postBalance.uiTokenAmount?.uiAmountString || '0');
            tokenBalanceChange = postAmount - preAmount;
            accountOwner = preBalance.owner || '';
          }
        }
      }

      // Check SOL balance changes for ALL accounts to find buyer/seller
      let buyerSolChange = 0;
      let sellerSolChange = 0;
      
      if (preBalances.length > 0 && postBalances.length > 0) {
        // Analyze all accounts
        for (let i = 0; i < Math.min(preBalances.length, postBalances.length); i++) {
          const solChange = (postBalances[i] - preBalances[i]) / 1e9;
          
          // Check if this account has token changes
          const accountTokenChange = preTokenBalances
            .filter((tb: any) => tb.accountIndex === i && tb.mint === tokenMint)
            .reduce((sum: number, tb: any) => {
              const postTb = postTokenBalances.find(
                (ptb: any) => ptb.accountIndex === tb.accountIndex && ptb.mint === tokenMint
              );
              if (postTb) {
                const preAmt = parseFloat(tb.uiTokenAmount?.uiAmountString || '0');
                const postAmt = parseFloat(postTb.uiTokenAmount?.uiAmountString || '0');
                return sum + (postAmt - preAmt);
              }
              return sum;
            }, 0);
          
          // Buyer: loses SOL, gains tokens
          if (solChange < -0.0001 && accountTokenChange > 0.0001) {
            buyerSolChange = Math.abs(solChange);
          }
          
          // Seller: gains SOL, loses tokens
          if (solChange > 0.0001 && accountTokenChange < -0.0001) {
            sellerSolChange = solChange;
          }
        }
        
        // Use identified changes or fallback to signer
        if (buyerSolChange > 0 || sellerSolChange > 0) {
          solBalanceChange = buyerSolChange > sellerSolChange ? -buyerSolChange : sellerSolChange;
        } else {
          solBalanceChange = (postBalances[0] - preBalances[0]) / 1e9;
        }
      }

      // Determine if it's a buy or sell
      // CRITICAL: buyerSolChange is ABSOLUTE VALUE of SOL lost (positive)
      //           sellerSolChange is SOL gained (positive)
      //           tokenBalanceChange: positive = gained tokens, negative = lost tokens
      if (Math.abs(tokenBalanceChange) < 0.0001 && Math.abs(solBalanceChange) < 0.0001) {
        return; // Not a trade
      }

      let isBuy = false;
      let isSell = false;
      
      // Primary check: use identified buyer/seller
      if (buyerSolChange > 0 && tokenBalanceChange > 0.0001) {
        // Found buyer: lost SOL AND gained tokens
        isBuy = true;
      } else if (sellerSolChange > 0 && tokenBalanceChange < -0.0001) {
        // Found seller: gained SOL AND lost tokens
        isSell = true;
      } 
      // Fallback: use overall balance changes
      else if (solBalanceChange < -0.0001 && tokenBalanceChange > 0.0001) {
        // Signer lost SOL AND gained tokens = BUY
        isBuy = true;
      } else if (solBalanceChange > 0.0001 && tokenBalanceChange < -0.0001) {
        // Signer gained SOL AND lost tokens = SELL
        isSell = true;
      }

      if (!isBuy && !isSell) {
        return; // Not a clear trade
      }

      // Calculate price (SOL per token)
      const solAmount = Math.abs(solBalanceChange);
      const tokenAmount = Math.abs(tokenBalanceChange);
      const price = tokenAmount > 0 ? solAmount / tokenAmount : 0;

      if (price === 0 || solAmount < 0.0001) {
        return; // Too small to be a real trade
      }

      // Verify signature is real (not empty and looks like a Solana signature)
      if (!signature || signature.length < 80 || signature.startsWith('sample_')) {
        return; // Invalid or fake signature
      }

      // Get transaction accounts
      // CRITICAL: When isBuy=true, the trade is a BUY, so signer/accountOwner is the buyer
      //           When isSell=true, the trade is a SELL, so signer/accountOwner is the seller
      
      let finalBuyer = '';
      let finalSeller = '';
      let finalSolAmount = 0;
      
      if (isBuy) {
        // This is a BUY trade: user is buying tokens with SOL
        finalBuyer = signerAccount || accountOwner || '';
        finalSeller = accountOwner || signerAccount || ''; // Usually the bonding curve
        finalSolAmount = buyerSolChange || solAmount;
      } else if (isSell) {
        // This is a SELL trade: user is selling tokens for SOL
        finalBuyer = accountOwner || signerAccount || ''; // Usually the bonding curve
        finalSeller = signerAccount || accountOwner || '';
        finalSolAmount = sellerSolChange || solAmount;
      } else {
        // Should not happen
        return;
      }

      const trade: Trade = {
        signature, // REAL signature from blockchain transaction
        timestamp: tx.blockTime || Math.floor(Date.now() / 1000),
        price: price,
        amount: tokenAmount,
        side: isBuy ? 'buy' : 'sell', // This should be correct now
        buyer: finalBuyer,
        seller: finalSeller,
        solAmount: finalSolAmount,
        tokenAmount: tokenAmount,
      };

      // Avoid duplicates
      if (!this.recentTrades.has(signature)) {
        this.recentTrades.set(signature, trade);
        
        // Keep only recent trades (last 24 hours)
        const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
        for (const [sig, tradeData] of Array.from(this.recentTrades.entries())) {
          if (tradeData.timestamp < oneDayAgo) {
            this.recentTrades.delete(sig);
          }
        }

        // Limit total size
        if (this.recentTrades.size > this.maxRecentTrades) {
          const oldest = Array.from(this.recentTrades.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
          this.recentTrades.delete(oldest[0]);
        }

        // Notify subscribers
        this.notifyTrade(trade);
      }
    } catch (error) {
      // Ignore processing errors
    }
  }

  /**
   * Notify all subscribers about a new trade
   */
  private notifyTrade(trade: Trade): void {
    for (const callback of this.tradeCallbacks) {
      try {
        callback(trade);
      } catch (error) {
        console.error('Error in trade callback:', error);
      }
    }
  }

  /**
   * Subscribe to trade updates
   */
  public onTrade(callback: (trade: Trade) => void): () => void {
    this.tradeCallbacks.add(callback);
    
    return () => {
      this.tradeCallbacks.delete(callback);
    };
  }

  /**
   * Get recent trades
   */
  public getRecentTrades(limit: number = 50): Trade[] {
    return Array.from(this.recentTrades.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Stop listening
   */
  public async stopListening(): Promise<void> {
    if (!this.isListening) return;

    try {
      if (this.subscriptionId !== null) {
        await this.connection.removeAccountChangeListener(this.subscriptionId);
        this.subscriptionId = null;
      }
      this.isListening = false;
      console.log('Trades listener stopped');
    } catch (error) {
      console.error('Error stopping trades listener:', error);
    }
  }
}

