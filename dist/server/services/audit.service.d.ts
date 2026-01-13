/**
 * Audit Service
 * Logs all important user actions for security and compliance
 */
interface AuditLog {
    userId: string;
    action: string;
    resource: string;
    details: any;
    ip?: string;
    userAgent?: string;
    timestamp: Date;
    success: boolean;
    error?: string;
}
declare class AuditService {
    private logs;
    private maxMemoryLogs;
    /**
     * Log an audit event
     */
    log(userId: string, action: string, resource: string, details?: any, options?: {
        ip?: string;
        userAgent?: string;
        success?: boolean;
        error?: string;
    }): Promise<void>;
    /**
     * Get audit logs for a user
     */
    getUserLogs(userId: string, limit?: number): Promise<AuditLog[]>;
    /**
     * Get audit logs by action
     */
    getLogsByAction(action: string, limit?: number): Promise<AuditLog[]>;
}
export declare const auditService: AuditService;
export {};
//# sourceMappingURL=audit.service.d.ts.map