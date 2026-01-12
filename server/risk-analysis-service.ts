// Risk Analysis Service - Token security and rug detection
// Integrates with RugCheck API and performs on-chain analysis

import { log } from './logger';
import { rateLimiter } from './rate-limiter';

interface RiskAnalysis {
  mint: string;
  overallScore: number; // 0-100 (0 = highest risk, 100 = safest)
  riskLevel: 'safe' | 'medium' | 'high';
  checks: {
    liquidityLocked: boolean | null;
    topHoldersPercent: number;
    mintAuthority: boolean | null; // true = can mint more tokens (bad)
    freezeAuthority: boolean | null; // true = can freeze accounts (bad)
    hasMetadata: boolean;
    isVerified: boolean;
    creatorHoldings: number;
  };
  warnings: string[];
  timestamp: number;
}

// Cache for risk analysis results (5 minutes)
const riskCache = new Map<string, { data: RiskAnalysis; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class RiskAnalysisService {
  /**
   * Analyze token risk using RugCheck API
   */
  async analyzeToken(mint: string): Promise<RiskAnalysis> {
    // Check cache first
    const cached = riskCache.get(mint);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      log.info('Returning cached risk analysis', { mint, age: Math.floor((Date.now() - cached.timestamp) / 1000) + 's' });
      return cached.data;
    }

    try {
      // Wait for rate limiter (RugCheck has limits)
      await rateLimiter.waitIfNeeded('dexscreener', 10000); // Use dexscreener limiter for external APIs
      rateLimiter.recordRequest('dexscreener');

      // Fetch from RugCheck API
      log.info('Fetching risk analysis from RugCheck', { mint });
      const response = await fetch(`https://api.rugcheck.xyz/v1/tokens/${mint}/report/summary`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          log.warn('Token not found in RugCheck, using fallback analysis', { mint });
          return this.fallbackAnalysis(mint);
        }
        throw new Error(`RugCheck API error: ${response.status}`);
      }

      const data = await response.json();
      log.info('RugCheck API response received', { mint, hasData: !!data });

      // Parse RugCheck response and calculate risk
      const analysis = this.parseRugCheckData(mint, data);

      // Cache the result
      riskCache.set(mint, { data: analysis, timestamp: Date.now() });

      return analysis;
    } catch (error: any) {
      log.error('Error analyzing token risk', { mint, error: error.message });
      // Return fallback analysis on error
      return this.fallbackAnalysis(mint);
    }
  }

  /**
   * Parse RugCheck API data into our RiskAnalysis format
   */
  private parseRugCheckData(mint: string, data: any): RiskAnalysis {
    const warnings: string[] = [];
    const checks = {
      liquidityLocked: null as boolean | null,
      topHoldersPercent: 0,
      mintAuthority: null as boolean | null,
      freezeAuthority: null as boolean | null,
      hasMetadata: false,
      isVerified: false,
      creatorHoldings: 0,
    };

    // Extract checks from RugCheck data
    if (data.risks) {
      // Mint authority check
      if (data.risks.find((r: any) => r.name === 'MINT_AUTHORITY')) {
        checks.mintAuthority = true;
        warnings.push('⚠️ Mint authority enabled - new tokens can be minted');
      } else {
        checks.mintAuthority = false;
      }

      // Freeze authority check
      if (data.risks.find((r: any) => r.name === 'FREEZE_AUTHORITY')) {
        checks.freezeAuthority = true;
        warnings.push('⚠️ Freeze authority enabled - accounts can be frozen');
      } else {
        checks.freezeAuthority = false;
      }

      // Top holders concentration
      const topHolderRisk = data.risks.find((r: any) => r.name === 'TOP_HOLDER_CONCENTRATION');
      if (topHolderRisk) {
        const percent = topHolderRisk.value || 0;
        checks.topHoldersPercent = percent;
        if (percent > 50) {
          warnings.push(`⚠️ Top holders own ${percent.toFixed(1)}% of supply`);
        }
      }

      // Liquidity checks
      const liquidityRisk = data.risks.find((r: any) => r.name === 'UNLOCKED_LIQUIDITY');
      if (liquidityRisk) {
        checks.liquidityLocked = false;
        warnings.push('⚠️ Liquidity is not locked');
      } else {
        checks.liquidityLocked = true;
      }

      // Creator holdings
      const creatorRisk = data.risks.find((r: any) => r.name === 'CREATOR_HOLDINGS');
      if (creatorRisk) {
        checks.creatorHoldings = creatorRisk.value || 0;
        if (checks.creatorHoldings > 20) {
          warnings.push(`⚠️ Creator holds ${checks.creatorHoldings.toFixed(1)}% of supply`);
        }
      }
    }

    // Metadata check
    if (data.token?.metadata) {
      checks.hasMetadata = true;
    }

    // Verified check (verified on RugCheck)
    if (data.verified || data.score > 80) {
      checks.isVerified = true;
    }

    // Calculate overall score
    const score = this.calculateRiskScore(checks, warnings);
    const riskLevel = this.getRiskLevel(score);

    return {
      mint,
      overallScore: score,
      riskLevel,
      checks,
      warnings,
      timestamp: Date.now(),
    };
  }

  /**
   * Fallback analysis when RugCheck is unavailable or token not found
   */
  private fallbackAnalysis(mint: string): RiskAnalysis {
    log.info('Using fallback risk analysis', { mint });

    return {
      mint,
      overallScore: 50, // Unknown = medium risk
      riskLevel: 'medium',
      checks: {
        liquidityLocked: null,
        topHoldersPercent: 0,
        mintAuthority: null,
        freezeAuthority: null,
        hasMetadata: false,
        isVerified: false,
        creatorHoldings: 0,
      },
      warnings: ['⚠️ Unable to verify token security - trade with caution'],
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate risk score (0-100, higher is safer)
   */
  private calculateRiskScore(checks: RiskAnalysis['checks'], warnings: string[]): number {
    let score = 100;

    // Deduct points for risks
    if (checks.mintAuthority === true) score -= 30; // Very bad
    if (checks.freezeAuthority === true) score -= 30; // Very bad
    if (checks.liquidityLocked === false) score -= 20; // Bad
    if (checks.topHoldersPercent > 50) score -= 15; // Concentrated ownership
    if (checks.topHoldersPercent > 70) score -= 10; // Extra deduction
    if (checks.creatorHoldings > 20) score -= 10; // Creator dumping risk
    if (!checks.hasMetadata) score -= 5; // Minor issue

    // Bonus for good signs
    if (checks.isVerified) score += 10;
    if (checks.liquidityLocked === true) score += 5;

    // Ensure score is in 0-100 range
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get risk level from score
   */
  private getRiskLevel(score: number): 'safe' | 'medium' | 'high' {
    if (score >= 70) return 'safe';
    if (score >= 40) return 'medium';
    return 'high';
  }

  /**
   * Batch analyze multiple tokens (with rate limiting)
   */
  async analyzeTokensBatch(mints: string[]): Promise<Map<string, RiskAnalysis>> {
    const results = new Map<string, RiskAnalysis>();

    log.info('Batch analyzing tokens', { count: mints.length });

    // Process in batches of 5 to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < mints.length; i += batchSize) {
      const batch = mints.slice(i, i + batchSize);

      const analyses = await Promise.all(
        batch.map(mint => this.analyzeToken(mint))
      );

      analyses.forEach(analysis => {
        results.set(analysis.mint, analysis);
      });

      // Wait 2 seconds between batches to respect rate limits
      if (i + batchSize < mints.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    log.info('Batch analysis complete', { count: results.size });
    return results;
  }

  /**
   * Clear cache for a specific token or all tokens
   */
  clearCache(mint?: string): void {
    if (mint) {
      riskCache.delete(mint);
      log.info('Cleared risk cache for token', { mint });
    } else {
      riskCache.clear();
      log.info('Cleared all risk cache');
    }
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; oldestEntry: number | null } {
    let oldestTimestamp: number | null = null;

    for (const { timestamp } of riskCache.values()) {
      if (oldestTimestamp === null || timestamp < oldestTimestamp) {
        oldestTimestamp = timestamp;
      }
    }

    return {
      size: riskCache.size,
      oldestEntry: oldestTimestamp ? Date.now() - oldestTimestamp : null,
    };
  }
}

// Singleton instance
export const riskAnalysisService = new RiskAnalysisService();

// Auto-cleanup old cache entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [mint, { timestamp }] of riskCache.entries()) {
    if (now - timestamp > CACHE_DURATION) {
      riskCache.delete(mint);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    log.info('Cleaned up old risk analysis cache entries', { cleaned });
  }
}, 10 * 60 * 1000);

export type { RiskAnalysis };
