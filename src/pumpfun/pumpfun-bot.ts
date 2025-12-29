import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token';

// Pump.fun Program ID
const PUMP_FUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6Px');

export interface PumpFunBotConfig {
  tokenMint: string;
  tokenName?: string;
  totalBuyAmount: number; // Total SOL to spend
  selectedWalletIndices?: number[];
  tradeType: 'buy' | 'sell';
  slippageBps?: number;
  mode?: 'simultaneous' | 'sequential' | 'bundled';
  delay?: number; // Delay between transactions in sequential mode
  simulationMode?: boolean; // Always false in production
}

export interface PumpFunResult {
  success: boolean;
  transactions: string[];
  totalSpent: number;
  tokensReceived: number;
  averagePrice: number;
  errors?: string[];
}

export class PumpFunBot {
  private connection: Connection;
  private isRunning: boolean = false;
  private wallets: Keypair[] = [];
  private rpcUrl: string;

  constructor(rpcUrl?: string) {
    this.rpcUrl = rpcUrl || process.env.RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=7b05747c-b100-4159-ba5f-c85e8c8d3997';
    this.connection = new Connection(this.rpcUrl, 'confirmed');
  }

  /**
   * Initialize the bot
   * Loads wallets from keypairs directory
   */
  public async initialize(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Bot is already running');
    }

    try {
      // Load wallets from keypairs directory
      const fs = require('fs');
      const path = require('path');
      const keypairsDir = path.join(process.cwd(), 'keypairs');

      if (!fs.existsSync(keypairsDir)) {
        throw new Error('Keypairs directory not found');
      }

      const files = fs.readdirSync(keypairsDir)
        .filter((file: string) => file.startsWith('keypair_') && file.endsWith('.json'))
        .sort((a: string, b: string) => {
          const numA = parseInt(a.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.match(/\d+/)?.[0] || '0');
          return numA - numB;
        });

      this.wallets = [];
      for (const file of files) {
        try {
          const keypairData = JSON.parse(fs.readFileSync(path.join(keypairsDir, file), 'utf-8'));
          const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
          this.wallets.push(keypair);
        } catch (error) {
          console.warn(`Failed to load wallet from ${file}:`, error);
        }
      }

      if (this.wallets.length === 0) {
        throw new Error('No wallets found in keypairs directory');
      }

      console.log(`✅ Initialized PumpFunBot with ${this.wallets.length} wallets`);
    } catch (error) {
      console.error('Failed to initialize PumpFunBot:', error);
      throw error;
    }
  }

  /**
   * Execute pump operation
   */
  public async executePump(config: PumpFunBotConfig): Promise<PumpFunResult> {
    if (this.isRunning) {
      throw new Error('Bot is already running');
    }

    this.isRunning = true;

    try {
      const tokenMint = new PublicKey(config.tokenMint);
      const walletsToUse = this.getWalletsToUse(config.selectedWalletIndices);
      
      if (walletsToUse.length === 0) {
        throw new Error('No wallets available');
      }

      // Distribute amount across wallets
      const amountPerWallet = config.totalBuyAmount / walletsToUse.length;
      const transactions: string[] = [];
      const errors: string[] = [];

      console.log(`🚀 Starting pump: ${config.tradeType.toUpperCase()}`);
      console.log(`   Token: ${config.tokenMint}`);
      console.log(`   Total amount: ${config.totalBuyAmount} SOL`);
      console.log(`   Wallets: ${walletsToUse.length}`);
      console.log(`   Amount per wallet: ${amountPerWallet.toFixed(4)} SOL`);

      if (config.mode === 'simultaneous' || !config.mode) {
        // Execute all transactions simultaneously
        const promises = walletsToUse.map((wallet, index) =>
          this.executeTrade(wallet, tokenMint, amountPerWallet, config.tradeType, config.slippageBps || 100)
            .then(sig => {
              console.log(`✅ Wallet ${index + 1} transaction: ${sig}`);
              return sig;
            })
            .catch(error => {
              const errorMsg = `Wallet ${index + 1} failed: ${error.message}`;
              console.error(`❌ ${errorMsg}`);
              errors.push(errorMsg);
              return null;
            })
        );

        const results = await Promise.all(promises);
        transactions.push(...results.filter((sig): sig is string => sig !== null));
      } else if (config.mode === 'sequential') {
        // Execute transactions sequentially with delay
        const delay = config.delay || 1000;
        for (let i = 0; i < walletsToUse.length; i++) {
          try {
            const sig = await this.executeTrade(
              walletsToUse[i],
              tokenMint,
              amountPerWallet,
              config.tradeType,
              config.slippageBps || 100
            );
            console.log(`✅ Wallet ${i + 1} transaction: ${sig}`);
            transactions.push(sig);
            
            if (i < walletsToUse.length - 1) {
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          } catch (error: any) {
            const errorMsg = `Wallet ${i + 1} failed: ${error.message}`;
            console.error(`❌ ${errorMsg}`);
            errors.push(errorMsg);
          }
        }
      }

      // Calculate results
      let totalSpent = 0;
      let tokensReceived = 0;

      for (const sig of transactions) {
        try {
          const tx = await this.connection.getTransaction(sig, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          });

          if (tx?.meta) {
            // Calculate spent/received from transaction
            // This is simplified - you may need to parse token balances more carefully
            const preBalances = tx.meta.preBalances || [];
            const postBalances = tx.meta.postBalances || [];
            if (preBalances.length > 0 && postBalances.length > 0) {
              const solChange = (preBalances[0] - postBalances[0]) / 1e9;
              if (config.tradeType === 'buy') {
                totalSpent += Math.abs(solChange);
              }
            }
          }
        } catch (error) {
          // Ignore errors fetching transaction details
        }
      }

      const averagePrice = tokensReceived > 0 ? totalSpent / tokensReceived : 0;

      const result: PumpFunResult = {
        success: transactions.length > 0,
        transactions,
        totalSpent,
        tokensReceived,
        averagePrice,
        errors: errors.length > 0 ? errors : undefined,
      };

      this.isRunning = false;
      return result;
    } catch (error) {
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the pump operation
   */
  public stopPump(): void {
    this.isRunning = false;
    console.log('🛑 Pump stopped');
  }

  /**
   * Execute a single trade
   */
  private async executeTrade(
    wallet: Keypair,
    tokenMint: PublicKey,
    amount: number,
    tradeType: 'buy' | 'sell',
    slippageBps: number
  ): Promise<string> {
    try {
      // Get wallet balance
      const balance = await this.connection.getBalance(wallet.publicKey);
      const balanceInSol = balance / 1e9;

      if (balanceInSol < amount) {
        throw new Error(`Insufficient balance: ${balanceInSol.toFixed(4)} SOL < ${amount.toFixed(4)} SOL`);
      }

      if (tradeType === 'buy') {
        return await this.executeBuy(wallet, tokenMint, amount, slippageBps);
      } else {
        return await this.executeSell(wallet, tokenMint, amount, slippageBps);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute a buy order on pump.fun
   */
  private async executeBuy(
    wallet: Keypair,
    tokenMint: PublicKey,
    solAmount: number,
    slippageBps: number
  ): Promise<string> {
    try {
      // Derive bonding curve PDA
      const [bondingCurve] = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding-curve'), tokenMint.toBuffer()],
        PUMP_FUN_PROGRAM_ID
      );

      // Get associated token account for the wallet
      const associatedTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        wallet.publicKey
      );

      // Check if token account exists, create if not
      let createATAInstruction = null;
      try {
        await getAccount(this.connection, associatedTokenAccount);
      } catch {
        // Token account doesn't exist, create it
        createATAInstruction = createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          associatedTokenAccount,
          wallet.publicKey,
          tokenMint
        );
      }

      // Try to use pump.fun API first (simpler)
      try {
        const pumpFunApiUrl = `https://frontend-api.pump.fun/coins/${tokenMint.toBase58()}`;
        const tokenInfo = await fetch(pumpFunApiUrl).then(r => r.json()).catch(() => null);
        
        if (tokenInfo && !tokenInfo.complete) {
          // Token is still on bonding curve, use pump.fun swap
          return await this.swapOnBondingCurve(
            wallet,
            tokenMint,
            bondingCurve,
            associatedTokenAccount,
            solAmount,
            slippageBps,
            createATAInstruction
          );
        }
      } catch (apiError) {
        // Fallback to on-chain method
        console.log('Pump.fun API failed, using on-chain method');
      }

      // If token has graduated, use Raydium/Jupiter
      // For now, we'll use a simplified approach
      throw new Error('Token has graduated from bonding curve. Use Raydium/Jupiter swap instead.');
    } catch (error: any) {
      throw new Error(`Buy failed: ${error.message}`);
    }
  }

  /**
   * Swap SOL for tokens on pump.fun bonding curve
   */
  private async swapOnBondingCurve(
    wallet: Keypair,
    tokenMint: PublicKey,
    bondingCurve: PublicKey,
    associatedTokenAccount: PublicKey,
    solAmount: number,
    slippageBps: number,
    createATAInstruction: any
  ): Promise<string> {
    // This is a placeholder - actual implementation would need:
    // 1. Anchor IDL for pump.fun program
    // 2. Proper instruction building
    // 3. Calculation of expected tokens from bonding curve formula
    
    // For now, we'll use pump.fun's public API endpoint if available
    // or construct a basic transaction
    
    const lamports = Math.floor(solAmount * 1e9);
    
    const transaction = new Transaction().add(
      // Add instruction to swap SOL for tokens on bonding curve
      // This would need the actual pump.fun program instruction
      // For now, this is a placeholder
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: bondingCurve,
        lamports: lamports,
      })
    );

    if (createATAInstruction) {
      transaction.add(createATAInstruction);
    }

    // Sign and send transaction
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [wallet],
      { commitment: 'confirmed' }
    );

    return signature;
  }

  /**
   * Execute a sell order on pump.fun
   */
  private async executeSell(
    wallet: Keypair,
    tokenMint: PublicKey,
    solAmount: number,
    slippageBps: number
  ): Promise<string> {
    try {
      // Get associated token account
      const associatedTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        wallet.publicKey
      );

      // Check token balance
      let tokenBalance = 0;
      try {
        const tokenAccount = await getAccount(this.connection, associatedTokenAccount);
        const mintInfo = await getMint(this.connection, tokenMint);
        tokenBalance = Number(tokenAccount.amount) / Math.pow(10, mintInfo.decimals);
      } catch {
        throw new Error('Token account not found or has no balance');
      }

      // Check if token is still on bonding curve
      const [bondingCurve] = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding-curve'), tokenMint.toBuffer()],
        PUMP_FUN_PROGRAM_ID
      );

      const bondingCurveInfo = await this.connection.getAccountInfo(bondingCurve).catch(() => null);
      
      if (bondingCurveInfo) {
        // Token is still on bonding curve, use pump.fun swap
        return await this.swapTokensForSol(
          wallet,
          tokenMint,
          bondingCurve,
          associatedTokenAccount,
          solAmount,
          slippageBps
        );
      } else {
        // Token has graduated, use Raydium/Jupiter
        throw new Error('Token has graduated from bonding curve. Use Raydium/Jupiter swap instead.');
      }
    } catch (error: any) {
      throw new Error(`Sell failed: ${error.message}`);
    }
  }

  /**
   * Swap tokens for SOL on pump.fun bonding curve
   */
  private async swapTokensForSol(
    wallet: Keypair,
    tokenMint: PublicKey,
    bondingCurve: PublicKey,
    associatedTokenAccount: PublicKey,
    solAmount: number,
    slippageBps: number
  ): Promise<string> {
    // Similar to buy, this needs proper pump.fun program instruction
    // For now, this is a placeholder
    
    const transaction = new Transaction();
    
    // Add instruction to swap tokens for SOL on bonding curve
    // This would need the actual pump.fun program instruction
    
    // Sign and send transaction
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [wallet],
      { commitment: 'confirmed' }
    );

    return signature;
  }

  /**
   * Get wallets to use based on selected indices
   */
  private getWalletsToUse(selectedIndices?: number[]): Keypair[] {
    if (!selectedIndices || selectedIndices.length === 0) {
      return this.wallets;
    }
    return selectedIndices
      .filter(index => index >= 0 && index < this.wallets.length)
      .map(index => this.wallets[index]);
  }

  /**
   * Check if bot is running
   */
  public getIsRunning(): boolean {
    return this.isRunning;
  }
}

