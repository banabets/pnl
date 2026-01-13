import { Keypair } from '@solana/web3.js';
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
    initialBuy?: number;
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
declare class LaunchpadService {
    private connection;
    constructor();
    /**
     * Launch a new token on Pump.fun
     */
    launchToken(config: LaunchConfig, creatorWallet: Keypair): Promise<LaunchResult>;
    /**
     * Upload metadata to IPFS via Pump.fun
     */
    private uploadMetadata;
    /**
     * Create token on Pump.fun via their API
     */
    private createTokenOnPumpFun;
    /**
     * Execute initial buy on token via Jupiter
     */
    private executeBuy;
    /**
     * Get token info from Pump.fun
     */
    getTokenInfo(mint: string): Promise<any>;
    /**
     * Validate token metadata
     */
    validateMetadata(metadata: TokenMetadata): {
        valid: boolean;
        errors: string[];
    };
}
export declare const launchpadService: LaunchpadService;
export {};
//# sourceMappingURL=launchpad-service.d.ts.map