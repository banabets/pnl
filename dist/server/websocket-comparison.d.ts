export interface WebSocketTestResult {
    api: string;
    connected: boolean;
    tokensReceived: number;
    latency: number;
    dataQuality: 'high' | 'medium' | 'low';
    errors: string[];
    sampleData: any;
    dataStructure: any;
}
export declare function testPumpPortalAPI(timeout?: number): Promise<WebSocketTestResult>;
export declare function testPumpFunSocketIO(timeout?: number): Promise<WebSocketTestResult>;
export declare function compareWebSocketAPIs(): Promise<{
    pumpPortal: WebSocketTestResult;
    pumpFun: WebSocketTestResult;
    winner: string;
    recommendation: string;
}>;
//# sourceMappingURL=websocket-comparison.d.ts.map