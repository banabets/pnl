import { Keypair } from '@solana/web3.js';
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
export declare class JupiterService {
    private connection;
    private tradingFeePercent;
    private feeWallet;
    constructor(rpcUrl: string, tradingFeePercent?: number, feeWallet?: string);
    /**
     * Get quote for swap
     */
    getQuote(inputMint: string, outputMint: string, amount: number, slippageBps?: number): Promise<JupiterQuote | null>;
    /**
     * Execute swap with Jupiter
     */
    executeSwap(quote: JupiterQuote, userKeypair: Keypair, priorityFee?: number): Promise<SwapResult>;
    /**
     * Buy token with SOL (includes trading fee)
     */
    buyToken(tokenMint: string, solAmount: number, userKeypair: Keypair, slippageBps?: number): Promise<SwapResult & {
        feePaid?: number;
    }>;
    /**
     * Sell token for SOL (includes trading fee on output)
     */
    sellToken(tokenMint: string, tokenAmount: number, userKeypair: Keypair, slippageBps?: number): Promise<SwapResult & {
        feePaid?: number;
    }>;
    /**
     * Get token price in SOL
     */
    getTokenPrice(tokenMint: string): Promise<number | null>;
    /**
     * Compare prices across routes
     */
    getBestRoute(inputMint: string, outputMint: string, amount: number): Promise<{
        route: string;
        outputAmount: number;
        priceImpact: number;
    } | null>;
}
export declare function getJupiterService(rpcUrl?: string, feePercent?: number, feeWallet?: string): JupiterService;
export declare function initJupiterService(rpcUrl: string, feePercent?: number, feeWallet?: string): JupiterService;
//# sourceMappingURL=jupiter-service.d.ts.map