export interface PriceAlert {
    id: string;
    userId: string;
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
declare class PriceAlertManager {
    private alerts;
    private priceMonitors;
    private broadcastCallback;
    constructor();
    setBroadcastCallback(callback: (event: string, data: any) => void): void;
    createAlert(userId: string, tokenMint: string, tokenName: string, tokenSymbol: string, alertType: PriceAlert['alertType'], targetValue: number): PriceAlert;
    cancelAlert(alertId: string): boolean;
    getActiveAlerts(): PriceAlert[];
    getAlertsByToken(tokenMint: string): PriceAlert[];
    getAlertsByUser(userId: string): PriceAlert[];
    private startMonitoringToken;
    private startMonitoring;
    private fetchTokenData;
    private checkAlerts;
    updateAlertPrice(tokenMint: string, price: number, volume?: number, marketCap?: number): void;
}
export declare const priceAlertManager: PriceAlertManager;
export {};
//# sourceMappingURL=price-alerts.d.ts.map