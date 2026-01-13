"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenAuditService = void 0;
exports.getTokenAuditService = getTokenAuditService;
exports.initTokenAuditService = initTokenAuditService;
// Token Audit Service - Detect honeypots, rugs, and security issues
const web3_js_1 = require("@solana/web3.js");
class TokenAuditService {
    constructor(rpcUrl, rugcheckApiKey) {
        this.connection = new web3_js_1.Connection(rpcUrl, 'confirmed');
        this.rugcheckApiKey = rugcheckApiKey;
    }
    /**
     * Full audit of a token
     */
    async auditToken(mintAddress) {
        const warnings = [];
        let riskScore = 0;
        try {
            const mint = new web3_js_1.PublicKey(mintAddress);
            // Get mint info
            const mintInfo = await this.connection.getParsedAccountInfo(mint);
            const mintData = mintInfo.value?.data?.parsed?.info;
            // Check mint authority
            const mintAuthorityDisabled = !mintData?.mintAuthority;
            if (!mintAuthorityDisabled) {
                warnings.push('⚠️ Mint authority is NOT disabled - tokens can be minted');
                riskScore += 30;
            }
            // Check freeze authority
            const freezeAuthorityDisabled = !mintData?.freezeAuthority;
            if (!freezeAuthorityDisabled) {
                warnings.push('⚠️ Freeze authority is NOT disabled - tokens can be frozen');
                riskScore += 20;
            }
            // Try to get additional data from RugCheck API
            let rugcheckData = null;
            try {
                rugcheckData = await this.getRugcheckData(mintAddress);
            }
            catch (e) {
                // RugCheck API optional
            }
            // Get holder concentration from on-chain or API
            let topHoldersConcentration = 0;
            let holders = 0;
            let liquidity = 0;
            let lpBurned = false;
            let marketCap = 0;
            let volume24h = 0;
            if (rugcheckData) {
                topHoldersConcentration = rugcheckData.topHoldersPercent || 0;
                holders = rugcheckData.holders || 0;
                liquidity = rugcheckData.liquidity || 0;
                lpBurned = rugcheckData.lpBurned || false;
                marketCap = rugcheckData.marketCap || 0;
                volume24h = rugcheckData.volume24h || 0;
                if (topHoldersConcentration > 50) {
                    warnings.push(`⚠️ Top 10 holders own ${topHoldersConcentration.toFixed(1)}% of supply`);
                    riskScore += 25;
                }
                if (!lpBurned && liquidity > 0) {
                    warnings.push('⚠️ LP tokens are NOT burned - liquidity can be removed');
                    riskScore += 25;
                }
                if (holders < 100) {
                    warnings.push(`⚠️ Low holder count: ${holders}`);
                    riskScore += 10;
                }
                if (liquidity < 10000) {
                    warnings.push(`⚠️ Low liquidity: $${liquidity.toLocaleString()}`);
                    riskScore += 15;
                }
            }
            // Determine risk level
            let riskLevel = 'low';
            if (riskScore >= 70)
                riskLevel = 'critical';
            else if (riskScore >= 50)
                riskLevel = 'high';
            else if (riskScore >= 25)
                riskLevel = 'medium';
            const isSafe = riskScore < 30 && mintAuthorityDisabled && freezeAuthorityDisabled;
            return {
                mint: mintAddress,
                name: rugcheckData?.name,
                symbol: rugcheckData?.symbol,
                isSafe,
                riskLevel,
                riskScore: Math.min(100, riskScore),
                checks: {
                    mintAuthorityDisabled,
                    freezeAuthorityDisabled,
                    liquidityLocked: lpBurned,
                    topHoldersConcentration,
                    lpBurned,
                    isRenounced: mintAuthorityDisabled && freezeAuthorityDisabled,
                    hasMetadata: !!rugcheckData?.name
                },
                warnings,
                stats: {
                    holders,
                    liquidity,
                    marketCap,
                    volume24h,
                    createdAt: rugcheckData?.createdAt
                }
            };
        }
        catch (error) {
            return {
                mint: mintAddress,
                isSafe: false,
                riskLevel: 'critical',
                riskScore: 100,
                checks: {
                    mintAuthorityDisabled: false,
                    freezeAuthorityDisabled: false,
                    liquidityLocked: false,
                    topHoldersConcentration: 0,
                    lpBurned: false,
                    isRenounced: false,
                    hasMetadata: false
                },
                warnings: [`❌ Failed to audit token: ${error.message}`],
                stats: { holders: 0, liquidity: 0, marketCap: 0, volume24h: 0 }
            };
        }
    }
    /**
     * Quick safety check (faster, less detailed)
     */
    async quickCheck(mintAddress) {
        try {
            const mint = new web3_js_1.PublicKey(mintAddress);
            const mintInfo = await this.connection.getParsedAccountInfo(mint);
            const mintData = mintInfo.value?.data?.parsed?.info;
            if (mintData?.mintAuthority) {
                return { safe: false, reason: 'Mint authority enabled' };
            }
            if (mintData?.freezeAuthority) {
                return { safe: false, reason: 'Freeze authority enabled' };
            }
            return { safe: true };
        }
        catch (error) {
            return { safe: false, reason: error.message };
        }
    }
    /**
     * Get data from RugCheck API (if available)
     */
    async getRugcheckData(mintAddress) {
        try {
            // Try RugCheck API
            const response = await fetch(`https://api.rugcheck.xyz/v1/tokens/${mintAddress}/report`);
            if (response.ok) {
                const data = await response.json();
                return {
                    name: data.tokenMeta?.name,
                    symbol: data.tokenMeta?.symbol,
                    topHoldersPercent: data.topHolders?.reduce((sum, h) => sum + (h.pct || 0), 0) || 0,
                    holders: data.markets?.[0]?.holders || 0,
                    liquidity: data.markets?.[0]?.lp?.usd || 0,
                    lpBurned: data.markets?.[0]?.lp?.lpBurned || false,
                    marketCap: data.markets?.[0]?.marketCap?.usd || 0,
                    volume24h: 0,
                    createdAt: data.createdAt
                };
            }
        }
        catch {
            // API not available
        }
        // Try DexScreener as fallback
        try {
            const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`);
            if (response.ok) {
                const data = await response.json();
                const pair = data.pairs?.[0];
                if (pair) {
                    return {
                        name: pair.baseToken?.name,
                        symbol: pair.baseToken?.symbol,
                        topHoldersPercent: 0,
                        holders: 0,
                        liquidity: pair.liquidity?.usd || 0,
                        lpBurned: false,
                        marketCap: pair.marketCap || 0,
                        volume24h: pair.volume?.h24 || 0,
                        createdAt: pair.pairCreatedAt
                    };
                }
            }
        }
        catch {
            // Fallback failed
        }
        return null;
    }
    /**
     * Check if token is likely a honeypot
     */
    async isHoneypot(mintAddress) {
        try {
            // Get token accounts to check if sells are possible
            const mint = new web3_js_1.PublicKey(mintAddress);
            const mintInfo = await this.connection.getParsedAccountInfo(mint);
            const mintData = mintInfo.value?.data?.parsed?.info;
            // If freeze authority exists, it could be a honeypot
            if (mintData?.freezeAuthority) {
                return { isHoneypot: true, reason: 'Freeze authority can block sells' };
            }
            // Check via RugCheck for more detailed analysis
            try {
                const response = await fetch(`https://api.rugcheck.xyz/v1/tokens/${mintAddress}/report`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.risks?.some((r) => r.name?.toLowerCase().includes('honeypot'))) {
                        return { isHoneypot: true, reason: 'RugCheck detected honeypot risk' };
                    }
                }
            }
            catch {
                // Continue without RugCheck
            }
            return { isHoneypot: false };
        }
        catch (error) {
            return { isHoneypot: true, reason: `Check failed: ${error.message}` };
        }
    }
}
exports.TokenAuditService = TokenAuditService;
// Singleton
let auditInstance = null;
function getTokenAuditService(rpcUrl) {
    if (!auditInstance && rpcUrl) {
        auditInstance = new TokenAuditService(rpcUrl);
    }
    return auditInstance;
}
function initTokenAuditService(rpcUrl) {
    auditInstance = new TokenAuditService(rpcUrl);
    return auditInstance;
}
//# sourceMappingURL=token-audit.js.map