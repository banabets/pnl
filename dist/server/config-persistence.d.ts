export interface PersistentConfig {
    simulationMode: boolean;
    rpcUrl: string;
    maxSolPerSwap: number;
    slippageBps: number;
}
export declare class ConfigPersistence {
    private defaultConfig;
    loadConfig(): PersistentConfig;
    saveConfig(config: Partial<PersistentConfig>): void;
    updateSimulationMode(enabled: boolean): void;
}
//# sourceMappingURL=config-persistence.d.ts.map