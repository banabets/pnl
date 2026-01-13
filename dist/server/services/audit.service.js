"use strict";
/**
 * Audit Service
 * Logs all important user actions for security and compliance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = void 0;
const logger_1 = require("../logger");
const database_1 = require("../database");
class AuditService {
    constructor() {
        this.logs = [];
        this.maxMemoryLogs = 1000;
    }
    /**
     * Log an audit event
     */
    async log(userId, action, resource, details = {}, options = {}) {
        const auditLog = {
            userId,
            action,
            resource,
            details,
            ip: options.ip,
            userAgent: options.userAgent,
            timestamp: new Date(),
            success: options.success !== false,
            error: options.error,
        };
        // Log to security logger
        (0, logger_1.logSecurity)(action, {
            userId,
            resource,
            ...details,
            success: auditLog.success,
        });
        // Store in memory (for quick access)
        this.logs.push(auditLog);
        if (this.logs.length > this.maxMemoryLogs) {
            this.logs.shift(); // Remove oldest
        }
        // Store in database if available
        if ((0, database_1.isConnected)()) {
            try {
                const { AuditLog } = require('../database');
                await AuditLog.create(auditLog);
            }
            catch (error) {
                // Database might not have AuditLog model yet
                // This is okay, we still have memory logs
            }
        }
    }
    /**
     * Get audit logs for a user
     */
    async getUserLogs(userId, limit = 100) {
        if ((0, database_1.isConnected)()) {
            try {
                const { AuditLog } = require('../database');
                return await AuditLog.find({ userId })
                    .sort({ timestamp: -1 })
                    .limit(limit)
                    .lean();
            }
            catch (error) {
                // Fallback to memory logs
            }
        }
        // Return memory logs
        return this.logs
            .filter(log => log.userId === userId)
            .slice(0, limit)
            .reverse();
    }
    /**
     * Get audit logs by action
     */
    async getLogsByAction(action, limit = 100) {
        if ((0, database_1.isConnected)()) {
            try {
                const { AuditLog } = require('../database');
                return await AuditLog.find({ action })
                    .sort({ timestamp: -1 })
                    .limit(limit)
                    .lean();
            }
            catch (error) {
                // Fallback to memory logs
            }
        }
        return this.logs
            .filter(log => log.action === action)
            .slice(0, limit)
            .reverse();
    }
}
exports.auditService = new AuditService();
//# sourceMappingURL=audit.service.js.map