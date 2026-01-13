import { Request, Response } from 'express';
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    checks: {
        mongodb: CheckResult;
        solana_rpc: CheckResult;
        memory: CheckResult;
        process: CheckResult;
    };
    version: string;
    environment: string;
}
export interface CheckResult {
    status: 'pass' | 'warn' | 'fail';
    message: string;
    responseTime?: number;
    details?: any;
}
/**
 * Perform all health checks
 */
export declare function performHealthCheck(): Promise<HealthStatus>;
/**
 * Health check endpoint handler
 */
export declare function healthCheckHandler(_req: Request, res: Response): Promise<void>;
/**
 * Liveness probe (Kubernetes-style)
 * Returns 200 if the process is alive
 */
export declare function livenessProbe(_req: Request, res: Response): void;
/**
 * Readiness probe (Kubernetes-style)
 * Returns 200 if the service is ready to accept traffic
 */
export declare function readinessProbe(_req: Request, res: Response): Promise<void>;
/**
 * Startup probe (Kubernetes-style)
 * Returns 200 when the application has started successfully
 */
export declare function startupProbe(_req: Request, res: Response): Promise<void>;
//# sourceMappingURL=health-check.d.ts.map