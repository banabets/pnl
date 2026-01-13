// Launchpad Service - Launch tokens on Pump.fun
// Integrates with Pump.fun API to create and deploy new tokens

import { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { log } from './logger';
import { rateLimiter } from './rate-limiter';
import { getJupiterService } from './jupiter-service';
import FormData from 'form-data';

// Pump.fun program ID on Solana mainnet
const PUMPFUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');

interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

interface LaunchConfig {
  metadata: TokenMetadata;
  initialBuy?: number; // Initial buy amount in SOL
}

interface LaunchResult {
  success: boolean;
  mint?: string;
  signature?: string;
  error?: string;
  metadata?: {
    name: string;
    symbol: string;
    description: string;
    imageUri?: string;
  };
}

class LaunchpadService {
  private connection: Connection;

  constructor() {
    const rpcUrl = process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Launch a new token on Pump.fun
   */
  async launchToken(config: LaunchConfig, creatorWallet: Keypair): Promise<LaunchResult> {
    try {
      log.info('Launching token on Pump.fun', {
        name: config.metadata.name,
        symbol: config.metadata.symbol,
        creator: creatorWallet.publicKey.toBase58()
      });

      // Rate limiting
      await rateLimiter.waitIfNeeded('pumpfun', 10000);
      rateLimiter.recordRequest('pumpfun');

      // Step 1: Upload metadata to IPFS (via Pump.fun API)
      const ipfsUri = await this.uploadMetadata(config.metadata);

      // Step 2: Create token on Pump.fun
      const createResult = await this.createTokenOnPumpFun(
        config.metadata,
        ipfsUri,
        creatorWallet
      );

      if (!createResult.success) {
        return createResult;
      }

      // Step 3: Optional initial buy
      if (config.initialBuy && config.initialBuy > 0) {
        log.info('Executing initial buy', {
          mint: createResult.mint,
          amount: config.initialBuy
        });

        await this.executeBuy(
          createResult.mint!,
          config.initialBuy,
          creatorWallet
        );
      }

      log.info('Token launched successfully', {
        mint: createResult.mint,
        name: config.metadata.name
      });

      return {
        success: true,
        mint: createResult.mint,
        signature: createResult.signature,
        metadata: {
          name: config.metadata.name,
          symbol: config.metadata.symbol,
          description: config.metadata.description,
          imageUri: ipfsUri
        }
      };

    } catch (error: any) {
      log.error('Token launch error', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload metadata to IPFS via Pump.fun
   */
  private async uploadMetadata(metadata: TokenMetadata): Promise<string> {
    try {
      log.info('Uploading metadata to IPFS via Pump.fun');

      // Create metadata JSON
      const metadataJson = {
        name: metadata.name,
        symbol: metadata.symbol,
        description: metadata.description,
        image: '', // Will be updated if image is uploaded
        showName: true,
        createdOn: 'https://pump.fun',
        twitter: metadata.twitter || '',
        telegram: metadata.telegram || '',
        website: metadata.website || ''
      };

      // Upload to IPFS via Pump.fun's IPFS endpoint
      const response = await fetch('https://pump.fun/api/ipfs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: Buffer.from(JSON.stringify(metadataJson)).toString('base64'),
          name: `${metadata.symbol}.json`
        })
      });

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      const ipfsUri = data.ipfsUri || data.metadataUri || `https://ipfs.io/ipfs/${data.Hash}`;

      log.info('Metadata uploaded to IPFS', { uri: ipfsUri });
      return ipfsUri;

    } catch (error: any) {
      log.error('Metadata upload error', { error: error.message });
      // Fallback to a basic metadata URI
      const fallbackUri = `data:application/json;base64,${Buffer.from(JSON.stringify({
        name: metadata.name,
        symbol: metadata.symbol,
        description: metadata.description
      })).toString('base64')}`;
      return fallbackUri;
    }
  }

  /**
   * Create token on Pump.fun via their API
   */
  private async createTokenOnPumpFun(
    metadata: TokenMetadata,
    ipfsUri: string,
    creator: Keypair
  ): Promise<LaunchResult> {
    try {
      log.info('Creating token on Pump.fun', { name: metadata.name });

      // Call Pump.fun create API
      const formData = new FormData();
      formData.append('name', metadata.name);
      formData.append('symbol', metadata.symbol);
      formData.append('description', metadata.description);
      formData.append('metadataUri', ipfsUri);
      if (metadata.twitter) formData.append('twitter', metadata.twitter);
      if (metadata.telegram) formData.append('telegram', metadata.telegram);
      if (metadata.website) formData.append('website', metadata.website);
      formData.append('creator', creator.publicKey.toBase58());

      const response = await fetch('https://pump.fun/api/create', {
        method: 'POST',
        body: formData as any
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pump.fun create failed: ${errorText}`);
      }

      const data = await response.json();

      if (!data.success || !data.mint) {
        throw new Error(data.error || 'Token creation failed');
      }

      log.info('Token created on Pump.fun', {
        mint: data.mint,
        signature: data.signature
      });

      return {
        success: true,
        mint: data.mint,
        signature: data.signature
      };

    } catch (error: any) {
      log.error('Token creation error', { error: error.message });

      // For now, if the real API fails, we can't create the token
      return {
        success: false,
        error: `Failed to create token on Pump.fun: ${error.message}. Please ensure you have sufficient SOL for creation fees (~0.02 SOL)`
      };
    }
  }

  /**
   * Execute initial buy on token via Jupiter
   */
  private async executeBuy(
    mint: string,
    amount: number,
    buyer: Keypair
  ): Promise<void> {
    try {
      log.info('Executing initial buy via Jupiter', { mint, amount });

      // Rate limiting
      await rateLimiter.waitIfNeeded('pumpfun', 10000);
      rateLimiter.recordRequest('pumpfun');

      // Use Jupiter to buy tokens
      const jupiterService = getJupiterService();
      if (!jupiterService) {
        throw new Error('Jupiter service not initialized');
      }

      const result = await jupiterService.buyToken(
        mint,
        amount,
        buyer,
        300 // 3% slippage for new tokens
      );

      if (!result.success) {
        throw new Error(result.error || 'Initial buy failed');
      }

      log.info('Initial buy executed successfully', {
        signature: result.signature,
        inputAmount: result.inputAmount,
        outputAmount: result.outputAmount,
        priceImpact: result.priceImpact
      });

    } catch (error: any) {
      log.error('Buy execution error', { error: error.message });
      // Don't throw - initial buy is optional
      log.warn('Initial buy failed but token was created successfully', { mint });
    }
  }

  /**
   * Get token info from Pump.fun
   */
  async getTokenInfo(mint: string): Promise<any> {
    try {
      log.info('Fetching token info', { mint });

      // Rate limiting
      await rateLimiter.waitIfNeeded('pumpfun', 10000);
      rateLimiter.recordRequest('pumpfun');

      // Fetch from Pump.fun API
      const response = await fetch(`https://frontend-api.pump.fun/coins/${mint}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data;

    } catch (error: any) {
      log.error('Token info fetch error', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate token metadata
   */
  validateMetadata(metadata: TokenMetadata): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!metadata.name || metadata.name.trim().length === 0) {
      errors.push('Name is required');
    } else if (metadata.name.length > 32) {
      errors.push('Name must be 32 characters or less');
    }

    if (!metadata.symbol || metadata.symbol.trim().length === 0) {
      errors.push('Symbol is required');
    } else if (metadata.symbol.length > 10) {
      errors.push('Symbol must be 10 characters or less');
    }

    if (!metadata.description || metadata.description.trim().length === 0) {
      errors.push('Description is required');
    } else if (metadata.description.length > 1000) {
      errors.push('Description must be 1000 characters or less');
    }

    if (metadata.twitter && !metadata.twitter.match(/^https?:\/\/(twitter\.com|x\.com)\/.+/)) {
      errors.push('Invalid Twitter URL');
    }

    if (metadata.telegram && !metadata.telegram.match(/^https?:\/\/t\.me\/.+/)) {
      errors.push('Invalid Telegram URL');
    }

    if (metadata.website && !metadata.website.match(/^https?:\/\/.+/)) {
      errors.push('Invalid website URL');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Singleton instance
export const launchpadService = new LaunchpadService();
