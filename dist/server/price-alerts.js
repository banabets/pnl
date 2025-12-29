"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.priceAlertManager = void 0;
class PriceAlertManager {
    constructor() {
        this.alerts = new Map();
        this.priceMonitors = new Map();
        this.startMonitoring();
    }
    // Create a price alert
    createAlert(tokenMint, tokenName, tokenSymbol, alertType, targetValue) {
        const alert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
    cancelAlert(alertId) {
        const alert = this.alerts.get(alertId);
        if (alert && alert.status === 'active') {
            alert.status = 'cancelled';
            return true;
        }
        return false;
    }
    // Get all active alerts
    getActiveAlerts() {
        return Array.from(this.alerts.values())
            .filter(a => a.status === 'active');
    }
    // Get alerts by token
    getAlertsByToken(tokenMint) {
        return Array.from(this.alerts.values())
            .filter(a => a.tokenMint === tokenMint);
    }
    // Start monitoring token
    startMonitoringToken(tokenMint) {
        if (this.priceMonitors.has(tokenMint)) {
            return;
        }
        const interval = setInterval(async () => {
            await this.checkAlerts(tokenMint);
        }, 10000); // Check every 10 seconds
        this.priceMonitors.set(tokenMint, interval);
    }
    // Start general monitoring
    startMonitoring() {
        setInterval(async () => {
            const activeAlerts = this.getActiveAlerts();
            const tokenMints = new Set(activeAlerts.map(a => a.tokenMint));
            for (const tokenMint of tokenMints) {
                await this.checkAlerts(tokenMint);
            }
        }, 15000); // Check every 15 seconds
    }
    // Check alerts for a token
    async checkAlerts(tokenMint) {
        try {
            const alerts = this.getAlertsByToken(tokenMint);
            if (alerts.length === 0)
                return;
            // Fetch current token data (this would come from an API)
            // For now, we'll use placeholder - in production, fetch from DexScreener or pump.fun API
            const currentPrice = 0; // TODO: Fetch from API
            const currentVolume = 0; // TODO: Fetch from API
            const currentMarketCap = 0; // TODO: Fetch from API
            for (const alert of alerts) {
                if (alert.status !== 'active')
                    continue;
                let shouldTrigger = false;
                let currentValue = 0;
                switch (alert.alertType) {
                    case 'price-above':
                        currentValue = currentPrice;
                        shouldTrigger = currentPrice >= alert.targetValue;
                        break;
                    case 'price-below':
                        currentValue = currentPrice;
                        shouldTrigger = currentPrice <= alert.targetValue;
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
                    console.log(`🔔 Alert triggered: ${alert.tokenName} - ${alert.alertType} - ${currentValue}`);
                    // TODO: Send notification (WebSocket, email, push, etc.)
                }
            }
        }
        catch (error) {
            console.error(`Error checking alerts for ${tokenMint}:`, error);
        }
    }
    // Update alert with current values (called from external price updates)
    updateAlertPrice(tokenMint, price, volume, marketCap) {
        const alerts = this.getAlertsByToken(tokenMint);
        for (const alert of alerts) {
            if (alert.status !== 'active')
                continue;
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
                console.log(`🔔 Alert triggered: ${alert.tokenName} - ${alert.alertType} - ${alert.currentValue}`);
            }
        }
    }
}
exports.priceAlertManager = new PriceAlertManager();
//# sourceMappingURL=price-alerts.js.map