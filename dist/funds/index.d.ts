export interface FundDistribution {
    totalAmount: number;
    perWallet: number;
    recipients: number;
}
export interface RecoveryResult {
    totalRecovered: number;
    successfulRecoveries: number;
    failedRecoveries: number;
    details: Array<{
        wallet: string;
        amount: number;
        success: boolean;
        error?: string;
    }>;
}
export declare class FundManager {
    private connection;
    private walletManager;
    private masterWalletManager;
    constructor();
    /**
     * Distribute SOL to multiple wallets
     * This method does NOT require your main wallet private key!
     * Instead, you send SOL to the generated wallets manually or via another method
     */
    distributeSol(): Promise<boolean>;
    /**
     * Check current distribution status
     */
    checkDistributionStatus(): Promise<void>;
    /**
     * Recover all SOL from generated wallets to a specified address
     */
    recoverAllFunds(destinationAddress?: string): Promise<RecoveryResult>;
    /**
     * Display recovery results
     */
    private displayRecoveryResults;
    /**
     * Estimate total gas costs for fund operations
     */
    estimateGasCosts(walletCount: number): Promise<number>;
    /**
     * Distribute SOL from master wallet to trading wallets
     * This uses the master wallet that the bot controls
     */
    distributeFromMaster(): Promise<boolean>;
    /**
     * Recover all funds from trading wallets back to master wallet
     */
    recoverToMaster(): Promise<RecoveryResult>;
}
//# sourceMappingURL=index.d.ts.map