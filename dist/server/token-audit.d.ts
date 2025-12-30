export interface TokenAudit {
    mint: string;
    name?: string;
    symbol?: string;
    isSafe: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    checks: {
        mintAuthorityDisabled: boolean;
        freezeAuthorityDisabled: boolean;
        liquidityLocked: boolean;
        topHoldersConcentration: number;
        lpBurned: boolean;
        isRenounced: boolean;
        hasMetadata: boolean;
    };
    warnings: string[];
    stats: {
        holders: number;
        liquidity: number;
        marketCap: number;
        volume24h: number;
        createdAt?: string;
    };
}
export declare class TokenAuditService {
    private connection;
    private rugcheckApiKey?;
    constructor(rpcUrl: string, rugcheckApiKey?: string);
    /**
     * Full audit of a token
     */
    auditToken(mintAddress: string): Promise<TokenAudit>;
    /**
     * Quick safety check (faster, less detailed)
     */
    quickCheck(mintAddress: string): Promise<{
        safe: boolean;
        reason?: string;
    }>;
    /**
     * Get data from RugCheck API (if available)
     */
    private getRugcheckData;
    /**
     * Check if token is likely a honeypot
     */
    isHoneypot(mintAddress: string): Promise<{
        isHoneypot: boolean;
        reason?: string;
    }>;
}
export declare function getTokenAuditService(rpcUrl?: string): TokenAuditService;
export declare function initTokenAuditService(rpcUrl: string): TokenAuditService;
//# sourceMappingURL=token-audit.d.ts.map