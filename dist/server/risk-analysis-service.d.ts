interface RiskAnalysis {
    mint: string;
    overallScore: number;
    riskLevel: 'safe' | 'medium' | 'high';
    checks: {
        liquidityLocked: boolean | null;
        topHoldersPercent: number;
        mintAuthority: boolean | null;
        freezeAuthority: boolean | null;
        hasMetadata: boolean;
        isVerified: boolean;
        creatorHoldings: number;
    };
    warnings: string[];
    timestamp: number;
}
declare class RiskAnalysisService {
    /**
     * Analyze token risk using RugCheck API
     */
    analyzeToken(mint: string): Promise<RiskAnalysis>;
    /**
     * Parse RugCheck API data into our RiskAnalysis format
     */
    private parseRugCheckData;
    /**
     * Fallback analysis when RugCheck is unavailable or token not found
     */
    private fallbackAnalysis;
    /**
     * Calculate risk score (0-100, higher is safer)
     */
    private calculateRiskScore;
    /**
     * Get risk level from score
     */
    private getRiskLevel;
    /**
     * Batch analyze multiple tokens (with rate limiting)
     */
    analyzeTokensBatch(mints: string[]): Promise<Map<string, RiskAnalysis>>;
    /**
     * Clear cache for a specific token or all tokens
     */
    clearCache(mint?: string): void;
    /**
     * Get cache stats
     */
    getCacheStats(): {
        size: number;
        oldestEntry: number | null;
    };
}
export declare const riskAnalysisService: RiskAnalysisService;
export type { RiskAnalysis };
//# sourceMappingURL=risk-analysis-service.d.ts.map