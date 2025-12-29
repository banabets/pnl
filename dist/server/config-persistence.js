"use strict";
// Config Persistence Manager
// Saves and loads simulation mode to/from disk
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigPersistence = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const CONFIG_FILE = path_1.default.join(__dirname, '../config.json');
class ConfigPersistence {
    constructor() {
        this.defaultConfig = {
            simulationMode: false, // Always real mode - simulation removed
            rpcUrl: process.env.RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=7b05747c-b100-4159-ba5f-c85e8c8d3997',
            maxSolPerSwap: 0.05,
            slippageBps: 50,
        };
    }
    loadConfig() {
        try {
            if (fs_1.default.existsSync(CONFIG_FILE)) {
                const data = fs_1.default.readFileSync(CONFIG_FILE, 'utf-8');
                const config = JSON.parse(data);
                console.log('📂 Config loaded from disk:', config);
                return { ...this.defaultConfig, ...config };
            }
        }
        catch (error) {
            console.error('Error loading config from disk:', error);
        }
        console.log('📂 Using default config (no file found)');
        return { ...this.defaultConfig };
    }
    saveConfig(config) {
        try {
            const currentConfig = this.loadConfig();
            const newConfig = { ...currentConfig, ...config };
            fs_1.default.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
            console.log('💾 Config saved to disk:', newConfig);
        }
        catch (error) {
            console.error('Error saving config to disk:', error);
        }
    }
    updateSimulationMode(enabled) {
        this.saveConfig({ simulationMode: enabled });
    }
}
exports.ConfigPersistence = ConfigPersistence;
//# sourceMappingURL=config-persistence.js.map