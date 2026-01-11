/**
 * Audit Service
 * Logs all important user actions for security and compliance
 */

import { logSecurity } from '../logger';
import { isConnected } from '../database';

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

class AuditService {
  private logs: AuditLog[] = [];
  private maxMemoryLogs = 1000;

  /**
   * Log an audit event
   */
  async log(
    userId: string,
    action: string,
    resource: string,
    details: any = {},
    options: {
      ip?: string;
      userAgent?: string;
      success?: boolean;
      error?: string;
    } = {}
  ): Promise<void> {
    const auditLog: AuditLog = {
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
    logSecurity(action, {
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
    if (isConnected()) {
      try {
        const { AuditLog } = require('../database');
        await AuditLog.create(auditLog);
      } catch (error) {
        // Database might not have AuditLog model yet
        // This is okay, we still have memory logs
      }
    }
  }

  /**
   * Get audit logs for a user
   */
  async getUserLogs(
    userId: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    if (isConnected()) {
      try {
        const { AuditLog } = require('../database');
        return await AuditLog.find({ userId })
          .sort({ timestamp: -1 })
          .limit(limit)
          .lean();
      } catch (error) {
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
  async getLogsByAction(
    action: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    if (isConnected()) {
      try {
        const { AuditLog } = require('../database');
        return await AuditLog.find({ action })
          .sort({ timestamp: -1 })
          .limit(limit)
          .lean();
      } catch (error) {
        // Fallback to memory logs
      }
    }

    return this.logs
      .filter(log => log.action === action)
      .slice(0, limit)
      .reverse();
  }
}

export const auditService = new AuditService();

