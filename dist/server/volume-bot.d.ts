import { Keypair } from '@solana/web3.js';
export interface VolumeBotConfig {
    tokenMint: string;
    tokenName?: string;
    totalSolAmount: number;
    targetVolumeUSD: number;
    maxTransactions?: number;
    minTransactionSize?: number;
    maxTransactionSize?: number;
    delayBetweenTrades?: number;
    useMultipleWallets?: boolean;
    slippageBps?: number;
}
export interface VolumeBotResult {
    success: boolean;
    totalVolumeUSD: number;
    totalTransactions: number;
    buyTransactions: number;
    sellTransactions: number;
    totalSolUsed: number;
    transactions: Array<{
        type: 'buy' | 'sell';
        signature: string;
        solAmount: number;
        volumeUSD: number;
        timestamp: number;
    }>;
    errors?: string[];
    strategy?: {
        transactionsPerWallet: number;
        solPerTransaction: number;
        estimatedVolumeUSD: number;
    };
}
export declare class VolumeBot {
    private connection;
    private isRunning;
    private wallets;
    private rpcUrl;
    private program;
    private globalState;
    private currentSolPriceUSD;
    constructor(rpcUrl?: string);
    /**
     * Inicializar el bot
     * Carga wallets desde keypairs o wallet-service
     */
    initialize(wallets?: Keypair[]): Promise<void>;
    /**
     * Calcular estrategia óptima para generar volumen objetivo
     */
    calculateStrategy(config: VolumeBotConfig): {
        transactionsPerWallet: number;
        solPerTransaction: number;
        estimatedVolumeUSD: number;
        totalTransactions: number;
        strategy: 'rapid' | 'distributed' | 'mixed';
    };
    /**
     * Ejecutar bot de volumen
     */
    executeVolumeBot(config: VolumeBotConfig): Promise<VolumeBotResult>;
    /**
     * Detener el bot
     */
    stop(): void;
    /**
     * Obtener precio actual de SOL en USD
     */
    private updateSolPrice;
    /**
     * Inicializar Anchor program
     */
    private initializeProgram;
    /**
     * Obtener global state
     */
    private getGlobalState;
    /**
     * Obtener fee recipient
     */
    private getFeeRecipient;
    /**
     * Ejecutar compra
     */
    private executeBuy;
    /**
     * Ejecutar venta
     */
    private executeSell;
    /**
     * Obtener tokens de una transacción
     */
    private getTokensFromTransaction;
    /**
     * Obtener SOL de una transacción
     */
    private getSolFromTransaction;
    /**
     * Sleep utility
     */
    private sleep;
}
//# sourceMappingURL=volume-bot.d.ts.map