// Config Persistence Manager
// Saves and loads simulation mode to/from disk

import fs from 'fs';
import path from 'path';
import { log } from './logger';

const CONFIG_FILE = path.join(__dirname, '../config.json');

export interface PersistentConfig {
  simulationMode: boolean;
  rpcUrl: string;
  maxSolPerSwap: number;
  slippageBps: number;
}

export class ConfigPersistence {
  private defaultConfig: PersistentConfig = {
    simulationMode: false, // Always real mode - simulation removed
    rpcUrl: process.env.RPC_URL || `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY || ''}`,
    maxSolPerSwap: 0.05,
    slippageBps: 50,
  };

  loadConfig(): PersistentConfig {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const config = JSON.parse(data);
        log.info('📂 Config loaded from disk:', config);
        return { ...this.defaultConfig, ...config };
      }
    } catch (error) {
      log.error('Error loading config from disk:', error);
    }
    
    log.info('📂 Using default config (no file found)');
    return { ...this.defaultConfig };
  }

  saveConfig(config: Partial<PersistentConfig>): void {
    try {
      const currentConfig = this.loadConfig();
      const newConfig = { ...currentConfig, ...config };
      
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
      log.info('💾 Config saved to disk:', newConfig);
    } catch (error) {
      log.error('Error saving config to disk:', error);
    }
  }

  updateSimulationMode(enabled: boolean): void {
    this.saveConfig({ simulationMode: enabled });
  }
}

