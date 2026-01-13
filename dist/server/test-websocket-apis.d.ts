interface TestResult {
    api: string;
    connected: boolean;
    tokensReceived: number;
    latency: number;
    dataQuality: 'high' | 'medium' | 'low';
    errors: string[];
    sampleData: any;
}
declare function testPumpPortalAPI(): Promise<TestResult>;
declare function testPumpFunSocketIO(): Promise<TestResult>;
declare function runComparison(): Promise<TestResult>;
export { testPumpPortalAPI, testPumpFunSocketIO, runComparison };
//# sourceMappingURL=test-websocket-apis.d.ts.map