"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JupiterService = void 0;
exports.getJupiterService = getJupiterService;
exports.initJupiterService = initJupiterService;
// Jupiter Aggregator Service - Best price swaps across Solana DEXs
const web3_js_1 = require("@solana/web3.js");
const JUPITER_API = 'https://quote-api.jup.ag/v6';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
class JupiterService {
    constructor(rpcUrl, tradingFeePercent = 0.5, feeWallet) {
        this.connection = new web3_js_1.Connection(rpcUrl, 'confirmed');
        this.tradingFeePercent = tradingFeePercent;
        this.feeWallet = feeWallet || null;
    }
    /**
     * Get quote for swap
     */
    async getQuote(inputMint, outputMint, amount, slippageBps = 100) {
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
                console.error('Jupiter quote error:', await response.text());
                return null;
            }
            const quote = await response.json();
            return {
                ...quote,
                slippageBps
            };
        }
        catch (error) {
            console.error('Error getting Jupiter quote:', error);
            return null;
        }
    }
    /**
     * Execute swap with Jupiter
     */
    async executeSwap(quote, userKeypair, priorityFee) {
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
            const transaction = web3_js_1.VersionedTransaction.deserialize(transactionBuffer);
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
        }
        catch (error) {
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
    async buyToken(tokenMint, solAmount, userKeypair, slippageBps = 100) {
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
    async sellToken(tokenMint, tokenAmount, userKeypair, slippageBps = 100) {
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
    async getTokenPrice(tokenMint) {
        try {
            // Get quote for 1 SOL worth
            const quote = await this.getQuote(SOL_MINT, tokenMint, 1e9, 50);
            if (!quote)
                return null;
            // Price = SOL / tokens received
            return 1e9 / parseInt(quote.outAmount);
        }
        catch {
            return null;
        }
    }
    /**
     * Compare prices across routes
     */
    async getBestRoute(inputMint, outputMint, amount) {
        const quote = await this.getQuote(inputMint, outputMint, amount, 50);
        if (!quote)
            return null;
        const routeNames = quote.routePlan.map((r) => r.swapInfo?.label || 'Unknown').join(' → ');
        return {
            route: routeNames,
            outputAmount: parseInt(quote.outAmount),
            priceImpact: parseFloat(quote.priceImpactPct)
        };
    }
}
exports.JupiterService = JupiterService;
// Singleton instance
let jupiterInstance = null;
function getJupiterService(rpcUrl, feePercent, feeWallet) {
    if (!jupiterInstance && rpcUrl) {
        jupiterInstance = new JupiterService(rpcUrl, feePercent, feeWallet);
    }
    return jupiterInstance;
}
function initJupiterService(rpcUrl, feePercent = 0.5, feeWallet) {
    jupiterInstance = new JupiterService(rpcUrl, feePercent, feeWallet);
    return jupiterInstance;
}
//# sourceMappingURL=jupiter-service.js.map