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
export declare class PumpFunTransactionParser {
    private connection;
    constructor(rpcUrl?: string);
    /**
     * Get trades from pump.fun program transactions
     */
    getTradesFromPumpFunProgram(tokenMint: string, limit?: number): Promise<PumpFunTrade[]>;
    /**
     * Parse a pump.fun transaction to extract trade information
     */
    private parsePumpFunTransaction;
    /**
     * Get trades by monitoring bonding curve account
     */
    getTradesFromBondingCurve(bondingCurveAddress: string, tokenMint: string, limit?: number): Promise<PumpFunTrade[]>;
}
//# sourceMappingURL=pumpfun-parser.d.ts.map