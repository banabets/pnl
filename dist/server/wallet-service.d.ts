import { Keypair } from '@solana/web3.js';
export declare function encryptPrivateKey(privateKey: Uint8Array, userKey: string): string;
export declare function decryptPrivateKey(encryptedKey: string, userKey: string): Uint8Array;
export interface WalletInfo {
    index: number;
    publicKey: string;
    balance: number;
    label?: string;
    isActive: boolean;
}
export interface WalletWithKey extends WalletInfo {
    keypair: Keypair;
}
export declare class WalletService {
    /**
     * Generar nuevas wallets para un usuario
     */
    generateWallets(userId: string, count?: number): Promise<WalletInfo[]>;
    /**
     * Obtener todas las wallets de un usuario
     */
    getUserWallets(userId: string): Promise<WalletInfo[]>;
    /**
     * Obtener wallet con private key (desencriptada)
     */
    getWalletWithKey(userId: string, index: number): Promise<WalletWithKey | null>;
    /**
     * Obtener múltiples wallets con keys
     */
    getWalletsWithKeys(userId: string, indices: number[]): Promise<WalletWithKey[]>;
    /**
     * Actualizar balance de wallet
     */
    updateWalletBalance(userId: string, index: number, balance: number): Promise<void>;
    /**
     * Actualizar balances de múltiples wallets
     */
    updateWalletsBalances(userId: string, balances: Map<number, number>): Promise<void>;
    /**
     * Eliminar wallets (solo si no tienen fondos)
     */
    deleteWallets(userId: string, indices?: number[]): Promise<{
        deleted: number;
        errors: string[];
    }>;
    /**
     * Helper to get MongoDB ObjectId from user UUID or ObjectId string
     */
    private getUserObjectId;
    /**
     * Crear master wallet para usuario
     */
    createMasterWallet(userId: string): Promise<{
        publicKey: string;
        exists: boolean;
    }>;
    /**
     * Obtener master wallet con key
     */
    getMasterWalletWithKey(userId: string): Promise<{
        keypair: Keypair;
        balance: number;
    } | null>;
    /**
     * Obtener info de master wallet (sin key)
     */
    getMasterWalletInfo(userId: string): Promise<{
        exists: boolean;
        publicKey?: string;
        balance?: number;
    }>;
    /**
     * Actualizar balance de master wallet
     */
    updateMasterWalletBalance(userId: string, balance: number): Promise<void>;
    /**
     * Eliminar master wallet
     */
    deleteMasterWallet(userId: string): Promise<boolean>;
    /**
     * Obtener resumen de wallets de usuario
     */
    getWalletSummary(userId: string): Promise<{
        totalWallets: number;
        totalBalance: number;
        wallets: WalletInfo[];
    }>;
}
export declare const walletService: WalletService;
//# sourceMappingURL=wallet-service.d.ts.map