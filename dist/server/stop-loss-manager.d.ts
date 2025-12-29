export interface StopLossOrder {
    id: string;
    positionId: string;
    tokenMint: string;
    tokenName: string;
    tokenSymbol: string;
    walletIndex: number;
    walletAddress: string;
    orderType: 'stop-loss' | 'take-profit';
    triggerPrice: number;
    amount: number;
    status: 'active' | 'triggered' | 'cancelled';
    createdAt: number;
    triggeredAt?: number;
    executedSignature?: string;
}
export interface TrailingStopOrder {
    id: string;
    positionId: string;
    tokenMint: string;
    tokenName: string;
    tokenSymbol: string;
    walletIndex: number;
    walletAddress: string;
    trailingPercent: number;
    currentStopPrice: number;
    highestPrice: number;
    status: 'active' | 'triggered' | 'cancelled';
    createdAt: number;
    triggeredAt?: number;
    executedSignature?: string;
}
declare class StopLossManager {
    private stopLossOrders;
    private trailingStopOrders;
    private priceMonitors;
    constructor();
    createStopLoss(positionId: string, tokenMint: string, tokenName: string, tokenSymbol: string, walletIndex: number, walletAddress: string, triggerPrice: number, amount?: number): StopLossOrder;
    createTakeProfit(positionId: string, tokenMint: string, tokenName: string, tokenSymbol: string, walletIndex: number, walletAddress: string, triggerPrice: number, amount?: number): StopLossOrder;
    createTrailingStop(positionId: string, tokenMint: string, tokenName: string, tokenSymbol: string, walletIndex: number, walletAddress: string, trailingPercent: number, currentPrice: number): TrailingStopOrder;
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