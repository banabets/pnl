declare const logger: any;
export declare const httpLoggerStream: {
    write: (message: string) => void;
};
export declare const log: {
    error: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    info: (message: string, meta?: any) => void;
    http: (message: string, meta?: any) => void;
    debug: (message: string, meta?: any) => void;
};
export default logger;
/**
 * Log API request
 */
export declare function logApiRequest(req: any): void;
/**
 * Log API response
 */
export declare function logApiResponse(req: any, res: any, responseTime: number): void;
/**
 * Log trading operation
 */
export declare function logTrade(operation: string, details: any): void;
/**
 * Log wallet operation
 */
export declare function logWallet(operation: string, details: any): void;
/**
 * Log security event
 */
export declare function logSecurity(event: string, details: any): void;
/**
 * Log database operation
 */
export declare function logDatabase(operation: string, details: any): void;
/**
 * Log external API call
 */
export declare function logExternalApi(service: string, endpoint: string, details?: any): void;
/**
 * Log alert trigger
 */
export declare function logAlert(type: string, details: any): void;
/**
 * Log stop-loss execution
 */
export declare function logStopLoss(operation: string, details: any): void;
//# sourceMappingURL=logger.d.ts.map