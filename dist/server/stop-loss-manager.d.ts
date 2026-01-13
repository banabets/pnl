export interface StopLossOrder {
    id: string;
    userId: string;
    positionId: string;
    tokenMint: string;
    tokenName: string;
    tokenSymbol: string;
    walletIndex: number;
    walletAddress: string;
    orderType: 'stop-loss' | 'take-profit';
    triggerPrice: number;
    amount: number;
    status: 'active' | 'triggered' | 'cancelled' | 'executed' | 'failed';
    createdAt: number;
    triggeredAt?: number;
    executedSignature?: string;
    error?: string;
}
export interface TrailingStopOrder {
    id: string;
    userId: string;
    positionId: string;
    tokenMint: string;
    tokenName: string;
    tokenSymbol: string;
    walletIndex: number;
    walletAddress: string;
    trailingPercent: number;
    currentStopPrice: number;
    highestPrice: number;
    status: 'active' | 'triggered' | 'cancelled' | 'executed' | 'failed';
    createdAt: number;
    triggeredAt?: number;
    executedSignature?: string;
    error?: string;
}
declare class StopLossManager {
    private stopLossOrders;
    private trailingStopOrders;
    private priceMonitors;
    constructor();
    createStopLoss(userId: string, positionId: string, tokenMint: string, tokenName: string, tokenSymbol: string, walletIndex: number, walletAddress: string, triggerPrice: number, amount?: number): StopLossOrder;
    createTakeProfit(userId: string, positionId: string, tokenMint: string, tokenName: string, tokenSymbol: string, walletIndex: number, walletAddress: string, triggerPrice: number, amount?: number): StopLossOrder;
    createTrailingStop(userId: string, positionId: string, tokenMint: string, tokenName: string, tokenSymbol: string, walletIndex: number, walletAddress: string, trailingPercent: number, currentPrice: number): TrailingStopOrder;
    cancelOrder(orderId: string): boolean;
    getActiveOrders(): {
        stopLoss: StopLossOrder[];
        trailingStop: TrailingStopOrder[];
    };
    getOrdersByToken(tokenMint: string): {
        stopLoss: StopLossOrder[];
        trailingStop: TrailingStopOrder[];
    };
    private startMonitoringToken;
    private startPriceMonitoring;
    private checkOrders;
    private executeStopLoss;
    private executeTakeProfit;
    private executeTrailingStop;
}
export declare const stopLossManager: StopLossManager;
export {};
//# sourceMappingURL=stop-loss-manager.d.ts.map