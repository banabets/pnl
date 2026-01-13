import { log } from './logger';

export interface PriceAlert {
  id: string;
  userId: string; // Added for user-specific alerts
  tokenMint: string;
  tokenName: string;
  tokenSymbol: string;
  alertType: 'price-above' | 'price-below' | 'volume-above' | 'market-cap-above';
  targetValue: number;
  currentValue?: number;
  status: 'active' | 'triggered' | 'cancelled';
  createdAt: number;
  triggeredAt?: number;
  notified: boolean;
}

// Token data from APIs
interface TokenData {
  price: number;
  volume24h: number;
  marketCap: number;
  priceChange24h: number;
}

class PriceAlertManager {
  private alerts: Map<string, PriceAlert>;
  private priceMonitors: Map<string, NodeJS.Timeout>;
  private broadcastCallback: ((event: string, data: any) => void) | null = null;

  constructor() {
    this.alerts = new Map();
    this.priceMonitors = new Map();
    this.startMonitoring();
  }

  // Set broadcast callback for notifications (Socket.IO)
  setBroadcastCallback(callback: (event: string, data: any) => void) {
    this.broadcastCallback = callback;
  }

  // Create a price alert
  createAlert(
    userId: string,
    tokenMint: string,
    tokenName: string,
    tokenSymbol: string,
    alertType: PriceAlert['alertType'],
    targetValue: number
  ): PriceAlert {
    const alert: PriceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      tokenMint,
      tokenName,
      tokenSymbol,
      alertType,
      targetValue,
      status: 'active',
      createdAt: Date.now() / 1000,
      notified: false,
    };

    this.alerts.set(alert.id, alert);
    this.startMonitoringToken(tokenMint);
    return alert;
  }

  // Cancel an alert
  cancelAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && alert.status === 'active') {
      alert.status = 'cancelled';
      return true;
    }
    return false;
  }

  // Get all active alerts
  getActiveAlerts(): PriceAlert[] {
    return Array.from(this.alerts.values())
      .filter(a => a.status === 'active');
  }

  // Get alerts by token
  getAlertsByToken(tokenMint: string): PriceAlert[] {
    return Array.from(this.alerts.values())
      .filter(a => a.tokenMint === tokenMint);
  }

  // Get alerts by user
  getAlertsByUser(userId: string): PriceAlert[] {
    return Array.from(this.alerts.values())
      .filter(a => a.userId === userId);
  }

  // Start monitoring token
  private startMonitoringToken(tokenMint: string) {
    if (this.priceMonitors.has(tokenMint)) {
      return;
    }

    const interval = setInterval(async () => {
      await this.checkAlerts(tokenMint);
    }, 10000); // Check every 10 seconds

    this.priceMonitors.set(tokenMint, interval);
  }

  // Start general monitoring
  private startMonitoring() {
    setInterval(async () => {
      const activeAlerts = this.getActiveAlerts();
      const tokenMints = new Set(activeAlerts.map(a => a.tokenMint));

      for (const tokenMint of tokenMints) {
        await this.checkAlerts(tokenMint);
      }
    }, 15000); // Check every 15 seconds
  }

  // Fetch token data from DexScreener API
  private async fetchTokenData(tokenMint: string): Promise<TokenData | null> {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`);

      if (!response.ok) {
        log.warn('DexScreener API error', { tokenMint, status: response.status });
        return null;
      }

      const data = await response.json();

      if (!data.pairs || data.pairs.length === 0) {
        log.warn('No pairs found for token', { tokenMint });
        return null;
      }

      // Get the first pair (usually the most liquid)
      const pair = data.pairs[0];

      return {
        price: parseFloat(pair.priceUsd) || 0,
        volume24h: parseFloat(pair.volume?.h24) || 0,
        marketCap: parseFloat(pair.fdv) || parseFloat(pair.marketCap) || 0,
        priceChange24h: parseFloat(pair.priceChange?.h24) || 0,
      };
    } catch (error: any) {
      log.error('Error fetching token data', { tokenMint, error: error.message });
      return null;
    }
  }

  // Check alerts for a token
  private async checkAlerts(tokenMint: string) {
    try {
      const alerts = this.getAlertsByToken(tokenMint).filter(a => a.status === 'active');
      if (alerts.length === 0) return;

      // Fetch current token data from DexScreener
      const tokenData = await this.fetchTokenData(tokenMint);
      if (!tokenData) {
        log.warn('Could not fetch token data, skipping alerts check', { tokenMint });
        return;
      }

      const currentPrice = tokenData.price;
      const currentVolume = tokenData.volume24h;
      const currentMarketCap = tokenData.marketCap;

      for (const alert of alerts) {
        if (alert.status !== 'active') continue;

        let shouldTrigger = false;
        let currentValue = 0;

        switch (alert.alertType) {
          case 'price-above':
            currentValue = currentPrice;
            shouldTrigger = currentPrice > 0 && currentPrice >= alert.targetValue;
            break;
          case 'price-below':
            currentValue = currentPrice;
            shouldTrigger = currentPrice > 0 && currentPrice <= alert.targetValue;
            break;
          case 'volume-above':
            currentValue = currentVolume;
            shouldTrigger = currentVolume >= alert.targetValue;
            break;
          case 'market-cap-above':
            currentValue = currentMarketCap;
            shouldTrigger = currentMarketCap >= alert.targetValue;
            break;
        }

        if (shouldTrigger && !alert.notified) {
          alert.status = 'triggered';
          alert.triggeredAt = Date.now() / 1000;
          alert.currentValue = currentValue;
          alert.notified = true;

          log.info('Price Alert triggered', {
            token: alert.tokenName,
            symbol: alert.tokenSymbol,
            alertType: alert.alertType,
            targetValue: alert.targetValue,
            currentValue,
            alertId: alert.id
          });

          // Send notification via WebSocket
          if (this.broadcastCallback) {
            this.broadcastCallback('price-alert:triggered', {
              alert: {
                ...alert,
                tokenData: {
                  price: currentPrice,
                  volume24h: currentVolume,
                  marketCap: currentMarketCap,
                  priceChange24h: tokenData.priceChange24h
                }
              }
            });
          }
        }
      }
    } catch (error: any) {
      log.error('Error checking alerts', { tokenMint, error: error.message });
    }
  }

  // Update alert with current values (called from external price updates)
  updateAlertPrice(tokenMint: string, price: number, volume?: number, marketCap?: number) {
    const alerts = this.getAlertsByToken(tokenMint);
    
    for (const alert of alerts) {
      if (alert.status !== 'active') continue;

      let shouldTrigger = false;

      switch (alert.alertType) {
        case 'price-above':
          alert.currentValue = price;
          shouldTrigger = price >= alert.targetValue;
          break;
        case 'price-below':
          alert.currentValue = price;
          shouldTrigger = price <= alert.targetValue;
          break;
        case 'volume-above':
          if (volume !== undefined) {
            alert.currentValue = volume;
            shouldTrigger = volume >= alert.targetValue;
          }
          break;
        case 'market-cap-above':
          if (marketCap !== undefined) {
            alert.currentValue = marketCap;
            shouldTrigger = marketCap >= alert.targetValue;
          }
          break;
      }

      if (shouldTrigger && !alert.notified) {
        alert.status = 'triggered';
        alert.triggeredAt = Date.now() / 1000;
        alert.notified = true;

        log.info('Alert triggered (external update)', {
          token: alert.tokenName,
          alertType: alert.alertType,
          currentValue: alert.currentValue,
          alertId: alert.id
        });
      }
    }
  }
}

export const priceAlertManager = new PriceAlertManager();



