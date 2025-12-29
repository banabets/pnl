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
export declare class PumpFunOnChainSearch {
    private connection;
    private rpcUrl;
    constructor(rpcUrl?: string);
    /**
     * Search for recent tokens created on pump.fun
     */
    searchRecentTokens(limit?: number): Promise<TokenInfo[]>;
    /**
     * Search pump.fun program accounts for tokens
     */
    searchPumpFunProgramAccounts(limit?: number): Promise<TokenInfo[]>;
    /**
     * Get token information from mint address
     */
    private getTokenInfo;
    /**
     * Check if a token is a pump.fun token by checking for bonding curve
     */
    private isPumpFunToken;
}
//# sourceMappingURL=onchain-search.d.ts.map