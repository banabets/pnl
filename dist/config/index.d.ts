import { Connection } from '@solana/web3.js';
export interface BotConfig {
    rpcUrl: string;
    connection: Connection;
    slippageBps: number;
    minSolBalance: number;
    maxSolPerSwap: number;
    swapDelayMs: number;
    maxRetries: number;
    jitoTipLamports: number;
    useJito: boolean;
    simulationMode: boolean;
    maxDailyVolumeSol: number;
    keypairsDir: string;
}
declare class ConfigManager {
    private config;
    constructor();
    private loadConfig;
    private validateConfig;
    getConfig(): BotConfig;
    isMainnet(): boolean;
    getKeypairsPath(): string;
    updateSimulationMode(enabled: boolean): void;
    displayConfig(): void;
}
export declare const config: BotConfig;
export declare const configManager: ConfigManager;
export default configManager;
//# sourceMappingURL=index.d.ts.map