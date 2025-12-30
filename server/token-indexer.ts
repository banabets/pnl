// Token Indexer Service - Persist tokens discovered on-chain to MongoDB
import { TokenIndex, isConnected } from './database';
import mongoose from 'mongoose';

export interface TokenIndexData {
  mint: string;
  name?: string;
  symbol?: string;
  imageUrl?: string;
  createdAt: number; // timestamp
  creator?: string;
  bondingCurve?: string;
  source?: 'pumpfun' | 'raydium' | 'unknown';
  price?: number;
  marketCap?: number;
  liquidity?: number;
  volume24h?: number;
  volume1h?: number;
  volume5m?: number;
  holders?: number;
  supply?: number;
  priceChange5m?: number;
  priceChange1h?: number;
  priceChange24h?: number;
  txns5m?: { buys: number; sells: number };
  txns1h?: { buys: number; sells: number };
  txns24h?: { buys: number; sells: number };
  lastEnrichedAt?: number;
  enrichmentSource?: string;
  isNew?: boolean;
  isGraduating?: boolean;
  isTrending?: boolean;
  riskScore?: number;
  pairAddress?: string;
  dexId?: string;
  age?: number;
}

class TokenIndexerService {
  private isEnabled: boolean = false;

  /**
   * Initialize the indexer (check if MongoDB is available)
   */
  async initialize(): Promise<void> {
    this.isEnabled = isConnected();
    if (this.isEnabled) {
      console.log('✅ Token Indexer initialized (MongoDB connected)');
    } else {
      console.log('⚠️ Token Indexer disabled (MongoDB not connected)');
    }
  }

  /**
   * Index or update a token in MongoDB
   */
  async indexToken(data: TokenIndexData): Promise<void> {
    if (!this.isEnabled) {
      return; // Silently skip if MongoDB not available
    }

    // Get TokenIndex model - try exported one first, then from mongoose.models
    const TokenModel = TokenIndex || (mongoose.models.TokenIndex as typeof TokenIndex);
    if (!TokenModel || !isConnected()) {
      // Silently skip - MongoDB might not be fully initialized yet
      return;
    }

    try {
      const tokenDoc = {
        mint: data.mint,
        name: data.name,
        symbol: data.symbol,
        imageUrl: data.imageUrl,
        createdAt: new Date(data.createdAt),
        creator: data.creator,
        bondingCurve: data.bondingCurve,
        source: data.source || 'unknown',
        price: data.price,
        marketCap: data.marketCap,
        liquidity: data.liquidity,
        volume24h: data.volume24h,
        volume1h: data.volume1h,
        volume5m: data.volume5m,
        holders: data.holders,
        supply: data.supply,
        priceChange5m: data.priceChange5m,
        priceChange1h: data.priceChange1h,
        priceChange24h: data.priceChange24h,
        txns5m: data.txns5m,
        txns1h: data.txns1h,
        txns24h: data.txns24h,
        lastEnrichedAt: data.lastEnrichedAt ? new Date(data.lastEnrichedAt) : undefined,
        enrichmentSource: data.enrichmentSource,
        isNew: data.isNew,
        isGraduating: data.isGraduating,
        isTrending: data.isTrending,
        riskScore: data.riskScore,
        pairAddress: data.pairAddress,
        dexId: data.dexId,
        age: data.age,
      };

      // Use upsert to update if exists, create if not
      const TokenModel = TokenIndex || (mongoose.models.TokenIndex as typeof TokenIndex);
      if (!TokenModel) return;
      
      await TokenModel.findOneAndUpdate(
        { mint: data.mint },
        { $set: tokenDoc },
        { upsert: true, new: true }
      );

    } catch (error: any) {
      // Log but don't throw - indexing failures shouldn't break the app
      // Only log if it's not a connection error (to avoid spam)
      if (!error.message?.includes('connection') && !error.message?.includes('undefined')) {
        console.error(`Failed to index token ${data.mint?.substring(0, 8) || 'unknown'}:`, error.message);
      }
    }
  }

  /**
   * Batch index multiple tokens
   */
  async indexTokens(tokens: TokenIndexData[]): Promise<void> {
    if (!this.isEnabled || tokens.length === 0) {
      return;
    }

    try {
      const operations = tokens.map(token => ({
        updateOne: {
          filter: { mint: token.mint },
          update: {
            $set: {
              mint: token.mint,
              name: token.name,
              symbol: token.symbol,
              imageUrl: token.imageUrl,
              createdAt: new Date(token.createdAt),
              creator: token.creator,
              bondingCurve: token.bondingCurve,
              source: token.source || 'unknown',
              price: token.price,
              marketCap: token.marketCap,
              liquidity: token.liquidity,
              volume24h: token.volume24h,
              volume1h: token.volume1h,
              volume5m: token.volume5m,
              holders: token.holders,
              supply: token.supply,
              priceChange5m: token.priceChange5m,
              priceChange1h: token.priceChange1h,
              priceChange24h: token.priceChange24h,
              txns5m: token.txns5m ? { buys: token.txns5m.buys || 0, sells: token.txns5m.sells || 0 } : { buys: 0, sells: 0 },
              txns1h: token.txns1h ? { buys: token.txns1h.buys || 0, sells: token.txns1h.sells || 0 } : { buys: 0, sells: 0 },
              txns24h: token.txns24h ? { buys: token.txns24h.buys || 0, sells: token.txns24h.sells || 0 } : { buys: 0, sells: 0 },
              lastEnrichedAt: token.lastEnrichedAt ? new Date(token.lastEnrichedAt) : undefined,
              enrichmentSource: token.enrichmentSource,
              isNew: token.isNew,
              isGraduating: token.isGraduating,
              isTrending: token.isTrending,
              riskScore: token.riskScore,
              pairAddress: token.pairAddress,
              dexId: token.dexId,
              age: token.age,
            }
          },
          upsert: true
        }
      }));

      await TokenIndex.bulkWrite(operations);
      console.log(`✅ Indexed ${tokens.length} tokens to MongoDB`);

    } catch (error: any) {
      console.error(`Failed to batch index tokens:`, error.message);
    }
  }

  /**
   * Get tokens from MongoDB
   */
  async getTokens(options: {
    filter?: 'all' | 'new' | 'graduating' | 'trending';
    minLiquidity?: number;
    maxAge?: number; // in minutes
    limit?: number;
  }): Promise<TokenIndexData[]> {
    if (!this.isEnabled) {
      return [];
    }

    try {
      const {
        filter = 'all',
        minLiquidity = 0,
        maxAge = 1440, // 24 hours
        limit = 50
      } = options;

      const now = Date.now();
      const maxAgeMs = maxAge * 60 * 1000;
      const minCreatedAt = new Date(now - maxAgeMs);

      // Build query
      const query: any = {
        createdAt: { $gte: minCreatedAt }
      };

      // Apply liquidity filter (except for new tokens)
      if (filter !== 'new' && minLiquidity > 0) {
        query.liquidity = { $gte: minLiquidity };
      }

      // Apply specific filters
      switch (filter) {
        case 'new':
          query.isNew = true;
          break;
        case 'graduating':
          query.isGraduating = true;
          break;
        case 'trending':
          query.isTrending = true;
          break;
      }

      // Get TokenIndex model - try exported one first, then from mongoose.models
      const TokenModel = TokenIndex || (mongoose.models.TokenIndex as typeof TokenIndex);
      if (!TokenModel || !isConnected()) {
        return [];
      }

      const tokens = await TokenModel.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      // Convert to TokenIndexData format
      return tokens.map(token => ({
        mint: token.mint,
        name: token.name,
        symbol: token.symbol,
        imageUrl: token.imageUrl,
        createdAt: token.createdAt.getTime(),
        creator: token.creator,
        bondingCurve: token.bondingCurve,
        source: token.source as any,
        price: token.price,
        marketCap: token.marketCap,
        liquidity: token.liquidity,
        volume24h: token.volume24h,
        volume1h: token.volume1h,
        volume5m: token.volume5m,
        holders: token.holders,
        supply: token.supply,
        priceChange5m: token.priceChange5m,
        priceChange1h: token.priceChange1h,
        priceChange24h: token.priceChange24h,
        txns5m: token.txns5m ? { buys: token.txns5m.buys || 0, sells: token.txns5m.sells || 0 } : { buys: 0, sells: 0 },
        txns1h: token.txns1h ? { buys: token.txns1h.buys || 0, sells: token.txns1h.sells || 0 } : { buys: 0, sells: 0 },
        txns24h: token.txns24h ? { buys: token.txns24h.buys || 0, sells: token.txns24h.sells || 0 } : { buys: 0, sells: 0 },
        lastEnrichedAt: token.lastEnrichedAt?.getTime(),
        enrichmentSource: token.enrichmentSource,
        isNew: token.isNew,
        isGraduating: token.isGraduating,
        isTrending: token.isTrending,
        riskScore: token.riskScore,
        pairAddress: token.pairAddress,
        dexId: token.dexId,
        age: token.age,
      }));

    } catch (error: any) {
      console.error('Failed to get tokens from MongoDB:', error.message);
      return [];
    }
  }

  /**
   * Get a single token by mint
   */
  async getToken(mint: string): Promise<TokenIndexData | null> {
    if (!this.isEnabled) {
      return null;
    }

    try {
      const TokenModel = TokenIndex || (mongoose.models.TokenIndex as typeof TokenIndex);
      if (!TokenModel || !isConnected()) {
        return null;
      }
      const token = await TokenModel.findOne({ mint }).lean();
      if (!token) {
        return null;
      }

      return {
        mint: token.mint,
        name: token.name,
        symbol: token.symbol,
        imageUrl: token.imageUrl,
        createdAt: token.createdAt.getTime(),
        creator: token.creator,
        bondingCurve: token.bondingCurve,
        source: token.source as any,
        price: token.price,
        marketCap: token.marketCap,
        liquidity: token.liquidity,
        volume24h: token.volume24h,
        volume1h: token.volume1h,
        volume5m: token.volume5m,
        holders: token.holders,
        supply: token.supply,
        priceChange5m: token.priceChange5m,
        priceChange1h: token.priceChange1h,
        priceChange24h: token.priceChange24h,
        txns5m: token.txns5m ? { buys: token.txns5m.buys || 0, sells: token.txns5m.sells || 0 } : { buys: 0, sells: 0 },
        txns1h: token.txns1h ? { buys: token.txns1h.buys || 0, sells: token.txns1h.sells || 0 } : { buys: 0, sells: 0 },
        txns24h: token.txns24h ? { buys: token.txns24h.buys || 0, sells: token.txns24h.sells || 0 } : { buys: 0, sells: 0 },
        lastEnrichedAt: token.lastEnrichedAt?.getTime(),
        enrichmentSource: token.enrichmentSource,
        isNew: token.isNew,
        isGraduating: token.isGraduating,
        isTrending: token.isTrending,
        riskScore: token.riskScore,
        pairAddress: token.pairAddress,
        dexId: token.dexId,
        age: token.age,
      };

    } catch (error: any) {
      console.error(`Failed to get token ${mint} from MongoDB:`, error.message);
      return null;
    }
  }

  /**
   * Update token enrichment data
   */
  async updateEnrichment(mint: string, data: Partial<TokenIndexData>, source: string): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    // Get TokenIndex model - try exported one first, then from mongoose.models
    const TokenModel = TokenIndex || (mongoose.models.TokenIndex as typeof TokenIndex);
    if (!TokenModel || !isConnected()) {
      return; // Silently skip if model not available or not connected
    }

    try {
      await TokenModel.findOneAndUpdate(
        { mint },
        {
          $set: {
            ...data,
            lastEnrichedAt: new Date(),
            enrichmentSource: source
          }
        }
      );
    } catch (error: any) {
      console.error(`Failed to update enrichment for ${mint}:`, error.message);
    }
  }

  /**
   * Get tokens that need enrichment (for background worker)
   */
  async getTokensNeedingEnrichment(limit: number = 50): Promise<string[]> {
    if (!this.isEnabled) {
      return [];
    }

    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      // Get TokenIndex model
      const TokenModel = TokenIndex || (mongoose.models.TokenIndex as typeof TokenIndex);
      if (!TokenModel || !isConnected()) {
        return [];
      }
      
      // Priority: tokens created in last hour without enrichment, or with old enrichment
      const tokens = await TokenModel.find({
        $or: [
          { lastEnrichedAt: { $exists: false } },
          { lastEnrichedAt: { $lt: oneHourAgo } }
        ],
        createdAt: { $gte: oneHourAgo }
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('mint')
        .lean();

      return tokens.map(t => t.mint);

    } catch (error: any) {
      console.error('Failed to get tokens needing enrichment:', error.message);
      return [];
    }
  }

  /**
   * Check if indexer is enabled
   */
  isActive(): boolean {
    return this.isEnabled;
  }
}

// Singleton instance
export const tokenIndexer = new TokenIndexerService();

