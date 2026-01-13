import { Keypair, Connection } from '@solana/web3.js';
export interface MasterWalletInfo {
    publicKey: string;
    balance: number;
    exists: boolean;
}
export declare class MasterWalletManager {
    private keypairsDir;
    private masterWalletPath;
    constructor();
    /**
     * Ensure the keypairs directory exists
     */
    private ensureKeypairsDirectory;
    /**
     * Check if master wallet exists
     */
    masterWalletExists(): boolean;
    /**
     * Create a new master wallet
     * This is the central wallet that manages all funds
     */
    createMasterWallet(): Keypair;
    /**
     * Load the master wallet
     */
    loadMasterWallet(): Keypair;
    /**
     * Get master wallet info including balance
     */
    getMasterWalletInfo(connection: Connection): Promise<MasterWalletInfo>;
    /**
     * Display master wallet information
     */
    displayMasterWalletInfo(connection: Connection): Promise<void>;
    /**
     * Delete the master wallet
     * WARNING: This will permanently delete the master wallet!
     */
    deleteMasterWallet(): void;
    /**
     * Export master wallet private key
     * Use this to import the wallet into Phantom/Solflare
     */
    exportMasterWalletKey(): string;
    /**
     * Withdraw all funds from master wallet to a specified address
     */
    withdrawFromMaster(connection: Connection, destinationAddress: string, amount?: number): Promise<void>;
    /**
     * Get the master wallet's public key as a string
     */
    getMasterWalletAddress(): string | null;
}
//# sourceMappingURL=index.d.ts.map