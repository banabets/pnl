import { Keypair, PublicKey } from '@solana/web3.js';
export interface WalletInfo {
    publicKey: string;
    balance: number;
    index: number;
}
export interface WalletSummary {
    totalWallets: number;
    totalBalance: number;
    wallets: WalletInfo[];
}
export declare class WalletManager {
    private keypairsDir;
    constructor();
    /**
     * Ensure the keypairs directory exists
     */
    private ensureKeypairsDirectory;
    /**
     * Generate a specified number of new keypairs
     * NOTE: This does not require or store your main wallet private key!
     */
    generateKeypairs(count: number): Keypair[];
    /**
     * Save a keypair to an encrypted file
     */
    private saveKeypairToFile;
    /**
     * Load all existing keypairs from the directory
     */
    loadKeypairs(): Keypair[];
    /**
     * Get wallet information including balances
     */
    getWalletSummary(): Promise<WalletSummary>;
    /**
     * Display wallet summary in a nice format
     */
    displayWalletSummary(): Promise<void>;
    /**
     * Clean up - remove all keypair files
     * WARNING: This will permanently delete all generated wallets!
     */
    cleanupKeypairs(): void;
    /**
     * Get public keys only (for airdrops, fund distribution, etc.)
     */
    getPublicKeys(): PublicKey[];
    /**
     * Check if any wallets exist
     */
    hasWallets(): boolean;
    /**
     * Get the number of existing wallets
     */
    getWalletCount(): number;
}
//# sourceMappingURL=index.d.ts.map