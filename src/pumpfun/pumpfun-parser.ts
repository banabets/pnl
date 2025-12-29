import {
  Connection,
  PublicKey,
  ParsedTransactionWithMeta,
} from '@solana/web3.js';

const PUMP_FUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6Px');

export interface PumpFunTrade {
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

/**
 * Parse pump.fun transactions to extract trade information
 * This specifically looks for pump.fun swap instructions
 */
export class PumpFunTransactionParser {
  private connection: Connection;

  constructor(rpcUrl?: string) {
    this.connection = new Connection(
      rpcUrl || process.env.RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=7b05747c-b100-4159-ba5f-c85e8c8d3997',
      'confirmed'
    );
  }

  /**
   * Get trades from pump.fun program transactions
   */
  public async getTradesFromPumpFunProgram(
    tokenMint: string,
    limit: number = 50
  ): Promise<PumpFunTrade[]> {
    try {
      const mintPubkey = new PublicKey(tokenMint);
      const programPubkey = PUMP_FUN_PROGRAM_ID;

      console.log(`🔍 Searching pump.fun program transactions for ${tokenMint.substring(0, 8)}...`);

      // Get recent signatures for the pump.fun program
      const signatures = await this.connection.getSignaturesForAddress(
        programPubkey,
        { limit: Math.min(limit * 2, 100) },
        'confirmed'
      );

      console.log(`Found ${signatures.length} pump.fun program transactions`);

      const trades: PumpFunTrade[] = [];

      for (let i = 0; i < Math.min(signatures.length, 50); i++) {
        try {
          const sig = signatures[i];
          const tx = await this.connection.getTransaction(sig.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          });

          if (!tx?.meta) continue;

          // Check if this transaction involves our token mint
          const accounts = tx.transaction.message.accountKeys;
          const mintInTx = accounts.some(
            (acc) => acc.pubkey?.toBase58() === tokenMint
          );

          if (!mintInTx) continue;

          // Parse the transaction
          const trade = await this.parsePumpFunTransaction(tx, sig.signature, tokenMint);
          if (trade) {
            trades.push(trade);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          continue;
        }
      }

      console.log(`✅ Parsed ${trades.length} trades from pump.fun program`);
      return trades;
    } catch (error) {
      console.error('Error getting trades from pump.fun program:', error);
      return [];
    }
  }

  /**
   * Parse a pump.fun transaction to extract trade information
   */
  private async parsePumpFunTransaction(
    tx: ParsedTransactionWithMeta,
    signature: string,
    tokenMint: string
  ): Promise<PumpFunTrade | null> {
    try {
      if (!tx.meta) return null;

      const preTokenBalances = tx.meta.preTokenBalances || [];
      const postTokenBalances = tx.meta.postTokenBalances || [];
      const preBalances = tx.meta.preBalances || [];
      const postBalances = tx.meta.postBalances || [];

      let tokenBalanceChange = 0;
      let solBalanceChange = 0;
      let accountOwner = '';
      let signerAccount = '';

      // Get signer (first account)
      const accounts = tx.transaction.message.accountKeys;
      if (accounts && accounts.length > 0) {
        signerAccount = accounts[0]?.pubkey?.toBase58() || '';
      }

      // Find token balance changes for our mint
      for (const preBalance of preTokenBalances) {
        if (preBalance.mint === tokenMint) {
          const postBalance = postTokenBalances.find(
            (pb) => pb.accountIndex === preBalance.accountIndex && pb.mint === tokenMint
          );
          
          if (postBalance) {
            const preAmount = parseFloat(preBalance.uiTokenAmount?.uiAmountString || '0');
            const postAmount = parseFloat(postBalance.uiTokenAmount?.uiAmountString || '0');
            const change = postAmount - preAmount;
            tokenBalanceChange += change;
            if (!accountOwner) accountOwner = preBalance.owner || signerAccount;
          }
        }
      }

      // Check for new token accounts
      for (const postBalance of postTokenBalances) {
        if (postBalance.mint === tokenMint) {
          const preBalance = preTokenBalances.find(
            (pb) => pb.accountIndex === postBalance.accountIndex
          );
          
          if (!preBalance) {
            const postAmount = parseFloat(postBalance.uiTokenAmount?.uiAmountString || '0');
            if (postAmount > 0) {
              tokenBalanceChange += postAmount;
              if (!accountOwner) accountOwner = postBalance.owner || signerAccount;
            }
          }
        }
      }

      // Calculate SOL balance changes for ALL accounts
      let buyerSolChange = 0;
      let sellerSolChange = 0;
      
      if (preBalances.length > 0 && postBalances.length > 0) {
        // Analyze all accounts to find buyer and seller
        for (let i = 0; i < Math.min(preBalances.length, postBalances.length); i++) {
          const solChange = (postBalances[i] - preBalances[i]) / 1e9;
          
          // Check if this account has token changes
          const accountTokenChange = preTokenBalances
            .filter(tb => tb.accountIndex === i && tb.mint === tokenMint)
            .reduce((sum, tb) => {
              const postTb = postTokenBalances.find(
                ptb => ptb.accountIndex === tb.accountIndex && ptb.mint === tokenMint
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

      if (!isBuy && !isSell) return null;

      // Calculate price and amounts
      const solAmount = Math.abs(solBalanceChange);
      const tokenAmount = Math.abs(tokenBalanceChange);
      const price = tokenAmount > 0 ? solAmount / tokenAmount : 0;

      if (price === 0 || solAmount < 0.0001) return null;

      // Verify signature is real
      if (!signature || signature.length < 80 || signature.startsWith('sample_')) {
        return null;
      }

      // CRITICAL FIX: When isBuy=true, side='buy', when isSell=true, side='sell'
      const buyer = isBuy ? signerAccount : accountOwner;
      const seller = isSell ? signerAccount : accountOwner;
      
      // Use appropriate SOL amount
      const finalSolAmount = isBuy 
        ? (buyerSolChange || solAmount)
        : (sellerSolChange || solAmount);

      return {
        signature,
        timestamp: tx.blockTime || Math.floor(Date.now() / 1000),
        price,
        amount: tokenAmount,
        side: isBuy ? 'buy' : (isSell ? 'sell' : 'buy'), // Use isBuy/isSell directly
        buyer,
        seller,
        solAmount: finalSolAmount,
        tokenAmount,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get trades by monitoring bonding curve account
   */
  public async getTradesFromBondingCurve(
    bondingCurveAddress: string,
    tokenMint: string,
    limit: number = 50
  ): Promise<PumpFunTrade[]> {
    try {
      const bondingCurvePubkey = new PublicKey(bondingCurveAddress);
      
      // Get recent signatures for the bonding curve account
      const signatures = await this.connection.getSignaturesForAddress(
        bondingCurvePubkey,
        { limit: Math.min(limit, 50) },
        'confirmed'
      );

      const trades: PumpFunTrade[] = [];

      for (const sig of signatures) {
        try {
          const tx = await this.connection.getTransaction(sig.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          });

          if (!tx?.meta) continue;

          const trade = await this.parsePumpFunTransaction(tx, sig.signature, tokenMint);
          if (trade) {
            trades.push(trade);
          }

          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          continue;
        }
      }

      return trades;
    } catch (error) {
      console.error('Error getting trades from bonding curve:', error);
      return [];
    }
  }
}

