// Jupiter Aggregator Service - Best price swaps across Solana DEXs
import { Connection, PublicKey, VersionedTransaction, Keypair } from '@solana/web3.js';
import { log } from './logger';

const JUPITER_API = 'https://quote-api.jup.ag/v6';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
  slippageBps: number;
  routePlan: any[];
}

export interface SwapResult {
  success: boolean;
  signature?: string;
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  error?: string;
}

export class JupiterService {
  private connection: Connection;
  private tradingFeePercent: number;
  private feeWallet: string | null;

  constructor(rpcUrl: string, tradingFeePercent = 0.5, feeWallet?: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.tradingFeePercent = tradingFeePercent;
    this.feeWallet = feeWallet || null;
  }

  /**
   * Get quote for swap
   */
  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number = 100
  ): Promise<JupiterQuote | null> {
    try {
      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: amount.toString(),
        slippageBps: slippageBps.toString(),
        onlyDirectRoutes: 'false',
        asLegacyTransaction: 'false'
      });

      const response = await fetch(`${JUPITER_API}/quote?${params}`);

      if (!response.ok) {
        log.error('Jupiter quote error:', await response.text());
        return null;
      }

      const quote = await response.json();
      return {
        ...quote,
        slippageBps
      };
    } catch (error) {
      log.error('Error getting Jupiter quote:', error);
      return null;
    }
  }

  /**
   * Execute swap with Jupiter
   */
  async executeSwap(
    quote: JupiterQuote,
    userKeypair: Keypair,
    priorityFee?: number
  ): Promise<SwapResult> {
    try {
      // Get swap transaction
      const swapResponse = await fetch(`${JUPITER_API}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: userKeypair.publicKey.toBase58(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: priorityFee || 'auto'
        })
      });

      if (!swapResponse.ok) {
        const error = await swapResponse.text();
        return { success: false, error, inputAmount: 0, outputAmount: 0, priceImpact: 0 };
      }

      const { swapTransaction } = await swapResponse.json();

      // Deserialize and sign transaction
      const transactionBuffer = Buffer.from(swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBuffer);
      transaction.sign([userKeypair]);

      // Send transaction
      const signature = await this.connection.sendTransaction(transaction, {
        skipPreflight: false,
        maxRetries: 3
      });

      // Confirm transaction
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        return {
          success: false,
          error: 'Transaction failed',
          inputAmount: parseInt(quote.inAmount),
          outputAmount: 0,
          priceImpact: parseFloat(quote.priceImpactPct)
        };
      }

      return {
        success: true,
        signature,
        inputAmount: parseInt(quote.inAmount),
        outputAmount: parseInt(quote.outAmount),
        priceImpact: parseFloat(quote.priceImpactPct)
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || String(error),
        inputAmount: 0,
        outputAmount: 0,
        priceImpact: 0
      };
    }
  }

  /**
   * Buy token with SOL (includes trading fee)
   */
  async buyToken(
    tokenMint: string,
    solAmount: number,
    userKeypair: Keypair,
    slippageBps: number = 100
  ): Promise<SwapResult & { feePaid?: number }> {
    // Calculate fee
    const feeAmount = solAmount * (this.tradingFeePercent / 100);
    const netSolAmount = solAmount - feeAmount;
    const lamports = Math.floor(netSolAmount * 1e9);

    // Get quote
    const quote = await this.getQuote(SOL_MINT, tokenMint, lamports, slippageBps);
    if (!quote) {
      return { success: false, error: 'Failed to get quote', inputAmount: 0, outputAmount: 0, priceImpact: 0 };
    }

    // Execute swap
    const result = await this.executeSwap(quote, userKeypair);

    return {
      ...result,
      feePaid: feeAmount
    };
  }

  /**
   * Sell token for SOL (includes trading fee on output)
   */
  async sellToken(
    tokenMint: string,
    tokenAmount: number,
    userKeypair: Keypair,
    slippageBps: number = 100
  ): Promise<SwapResult & { feePaid?: number }> {
    // Get quote
    const quote = await this.getQuote(tokenMint, SOL_MINT, tokenAmount, slippageBps);
    if (!quote) {
      return { success: false, error: 'Failed to get quote', inputAmount: 0, outputAmount: 0, priceImpact: 0 };
    }

    // Execute swap
    const result = await this.executeSwap(quote, userKeypair);

    // Calculate fee on output
    const outputSol = result.outputAmount / 1e9;
    const feeAmount = outputSol * (this.tradingFeePercent / 100);

    return {
      ...result,
      outputAmount: result.outputAmount - Math.floor(feeAmount * 1e9),
      feePaid: feeAmount
    };
  }

  /**
   * Get token price in SOL
   */
  async getTokenPrice(tokenMint: string): Promise<number | null> {
    try {
      // Get quote for 1 SOL worth
      const quote = await this.getQuote(SOL_MINT, tokenMint, 1e9, 50);
      if (!quote) return null;

      // Price = SOL / tokens received
      return 1e9 / parseInt(quote.outAmount);
    } catch {
      return null;
    }
  }

  /**
   * Compare prices across routes
   */
  async getBestRoute(
    inputMint: string,
    outputMint: string,
    amount: number
  ): Promise<{ route: string; outputAmount: number; priceImpact: number } | null> {
    const quote = await this.getQuote(inputMint, outputMint, amount, 50);
    if (!quote) return null;

    const routeNames = quote.routePlan.map((r: any) =>
      r.swapInfo?.label || 'Unknown'
    ).join(' → ');

    return {
      route: routeNames,
      outputAmount: parseInt(quote.outAmount),
      priceImpact: parseFloat(quote.priceImpactPct)
    };
  }
}

// Singleton instance
let jupiterInstance: JupiterService | null = null;

export function getJupiterService(rpcUrl?: string, feePercent?: number, feeWallet?: string): JupiterService {
  if (!jupiterInstance && rpcUrl) {
    jupiterInstance = new JupiterService(rpcUrl, feePercent, feeWallet);
  }
  return jupiterInstance!;
}

export function initJupiterService(rpcUrl: string, feePercent = 0.5, feeWallet?: string): JupiterService {
  jupiterInstance = new JupiterService(rpcUrl, feePercent, feeWallet);
  return jupiterInstance;
}
