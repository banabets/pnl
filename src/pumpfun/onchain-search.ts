import {
  Connection,
  PublicKey,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getMint } from '@solana/spl-token';

// Pump.fun Program ID
const PUMP_FUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6Px');

export interface TokenInfo {
  mint: string;
  name?: string;
  symbol?: string;
  createdTimestamp?: number;
  marketCap?: number;
  liquidity?: number;
  holders?: number;
  volume24h?: number;
}

export class PumpFunOnChainSearch {
  private connection: Connection;
  private rpcUrl: string;

  constructor(rpcUrl?: string) {
    this.rpcUrl = rpcUrl || process.env.RPC_URL || `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY || ''}`;
    this.connection = new Connection(this.rpcUrl, 'confirmed');
  }

  /**
   * Search for recent tokens created on pump.fun
   */
  public async searchRecentTokens(limit: number = 50): Promise<TokenInfo[]> {
    try {
      console.log(`🔍 Searching for recent pump.fun tokens (limit: ${limit})...`);

      // Get recent signatures from pump.fun program
      const signatures = await this.connection.getSignaturesForAddress(
        PUMP_FUN_PROGRAM_ID,
        { limit: Math.min(limit * 2, 100) }, // Get more to filter
        'confirmed'
      );

      const tokens: TokenInfo[] = [];
      const processedMints = new Set<string>();

      // Process transactions to extract token mints
      for (let i = 0; i < Math.min(signatures.length, limit * 2); i++) {
        try {
          const sig = signatures[i];
          const tx = await this.connection.getTransaction(sig.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          });

          if (tx?.meta?.postTokenBalances) {
            for (const balance of tx.meta.postTokenBalances) {
              if (balance.mint && !processedMints.has(balance.mint)) {
                processedMints.add(balance.mint);

                // Get token metadata
                const tokenInfo = await this.getTokenInfo(balance.mint, sig.blockTime || Date.now() / 1000);
                if (tokenInfo) {
                  tokens.push(tokenInfo);
                }

                if (tokens.length >= limit) {
                  break;
                }
              }
            }
          }

          if (tokens.length >= limit) {
            break;
          }

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          // Skip failed transactions
          continue;
        }
      }

      // Sort by creation timestamp (most recent first)
      tokens.sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0));

      console.log(`✅ Found ${tokens.length} recent tokens`);
      return tokens.slice(0, limit);
    } catch (error) {
      console.error('Error searching recent tokens:', error);
      return [];
    }
  }

  /**
   * Search pump.fun program accounts for tokens
   */
  public async searchPumpFunProgramAccounts(limit: number = 50): Promise<TokenInfo[]> {
    try {
      console.log(`🔍 Searching pump.fun program accounts (limit: ${limit})...`);

      // Get program accounts
      const accounts = await this.connection.getProgramAccounts(
        PUMP_FUN_PROGRAM_ID,
        {
          filters: [],
          dataSlice: { offset: 0, length: 0 }, // We only need account keys
        }
      );

      const tokens: TokenInfo[] = [];
      const processedMints = new Set<string>();

      // Process accounts to find token mints
      // Note: This is simplified - pump.fun account structure may vary
      for (let i = 0; i < Math.min(accounts.length, limit * 2); i++) {
        try {
          const account = accounts[i];
          
          // Try to extract token mint from account data
          // This is a simplified approach - actual implementation would need
          // to parse the account data structure according to pump.fun's program
          
          // For now, we'll skip this and rely on transaction-based search
          // A proper implementation would need pump.fun's account layout
          
        } catch (error) {
          continue;
        }
      }

      console.log(`✅ Found ${tokens.length} tokens from program accounts`);
      return tokens.slice(0, limit);
    } catch (error) {
      console.error('Error searching program accounts:', error);
      return [];
    }
  }

  /**
   * Get token information from mint address
   */
  private async getTokenInfo(mint: string, timestamp: number): Promise<TokenInfo | null> {
    try {
      const mintPubkey = new PublicKey(mint);
      
      // Get mint account info
      const mintInfo = await getMint(this.connection, mintPubkey).catch(() => null);
      if (!mintInfo) {
        return null;
      }

      // Check if this is likely a pump.fun token by checking for bonding curve
      const isPumpFunToken = await this.isPumpFunToken(mintPubkey);
      if (!isPumpFunToken) {
        return null;
      }

      const tokenInfo: TokenInfo = {
        mint,
        createdTimestamp: timestamp,
        // Additional metadata would be fetched from pump.fun API or on-chain
      };

      return tokenInfo;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a token is a pump.fun token by checking for bonding curve
   */
  private async isPumpFunToken(mint: PublicKey): Promise<boolean> {
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


