export interface Position {
    id: string;
    tokenMint: string;
    tokenName: string;
    tokenSymbol: string;
    walletIndex: number;
    walletAddress: string;
    entryPrice: number;
    entryAmount: number;
    tokenAmount: number;
    currentPrice: number;
    currentValue: number;
    pnl: number;
    pnlPercent: number;
    entryTimestamp: number;
    lastUpdateTimestamp: number;
    status: 'open' | 'closed';
    exitPrice?: number;
    exitTimestamp?: number;
}
export interface Trade {
    id: string;
    positionId: string;
    tokenMint: string;
    tokenName: string;
    tokenSymbol: string;
    walletIndex: number;
    walletAddress: string;
    type: 'buy' | 'sell';
    price: number;
    amount: number;
    tokenAmount: number;
    timestamp: number;
    signature: string;
    fee: number;
}
declare class PortfolioTracker {
    private positionsFile;
    private tradesFile;
    private positions;
    private trades;
    constructor();
    private loadData;
    private saveData;
    recordBuy(tokenMint: string, tokenName: string, tokenSymbol: string, walletIndex: number, walletAddress: string, price: number, solAmount: number, tokenAmount: number, signature: string, fee?: number): Position;
    recordSell(tokenMint: string, walletIndex: number, price: number, solAmount: number, tokenAmount: number, signature: string, fee?: number): Position | null;
    updatePrice(tokenMint: string, currentPrice: number): void;
    getOpenPositions(): Position[];
    getAllPositions(): Position[];
    getPositionsByToken(tokenMint: string): Position[];
    getPositionsByWallet(walletIndex: number): Position[];
    getTrades(limit?: number): Trade[];
    getTradesByToken(tokenMint: string): Trade[];
    getPortfolioSummary(): {
        openPositions: number;
        totalInvested: number;
        totalValue: number;
        totalPnl: number;
        totalPnlPercent: number;
        realizedPnl: number;
    };
}
export declare const portfolioTracker: PortfolioTracker;
export {};
//# sourceMappingURL=portfolio-tracker.d.ts.map