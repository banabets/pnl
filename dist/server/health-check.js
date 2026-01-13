"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performHealthCheck = performHealthCheck;
exports.healthCheckHandler = healthCheckHandler;
exports.livenessProbe = livenessProbe;
exports.readinessProbe = readinessProbe;
exports.startupProbe = startupProbe;
const mongoose_1 = __importDefault(require("mongoose"));
const web3_js_1 = require("@solana/web3.js");
const env_validator_1 = require("./env-validator");
/**
 * Check MongoDB connection
 */
async function checkMongoDB() {
    const startTime = Date.now();
    try {
        if (mongoose_1.default.connection.readyState !== 1) {
            return {
                status: 'fail',
                message: 'MongoDB disconnected',
                responseTime: Date.now() - startTime,
            };
        }
        // Ping the database
        if (!mongoose_1.default.connection.db) {
            throw new Error('MongoDB not connected');
        }
        await mongoose_1.default.connection.db.admin().ping();
        return {
            status: 'pass',
            message: 'MongoDB connected',
            responseTime: Date.now() - startTime,
            details: {
                host: mongoose_1.default.connection.host,
                database: mongoose_1.default.connection.name,
            },
        };
    }
    catch (error) {
        return {
            status: 'fail',
            message: `MongoDB error: ${error.message}`,
            responseTime: Date.now() - startTime,
        };
    }
}
/**
 * Check Solana RPC connection
 */
async function checkSolanaRPC() {
    const startTime = Date.now();
    try {
        const rpcUrl = (0, env_validator_1.getValidatedRpcUrl)();
        const connection = new web3_js_1.Connection(rpcUrl, 'confirmed');
        // Get latest blockhash to verify connection
        const { blockhash } = await connection.getLatestBlockhash();
        if (!blockhash) {
            return {
                status: 'fail',
                message: 'Unable to get blockhash from Solana RPC',
                responseTime: Date.now() - startTime,
            };
        }
        return {
            status: 'pass',
            message: 'Solana RPC connected',
            responseTime: Date.now() - startTime,
            details: {
                endpoint: rpcUrl.includes('api-key') ? rpcUrl.split('?')[0] : rpcUrl,
            },
        };
    }
    catch (error) {
        return {
            status: 'fail',
            message: `Solana RPC error: ${error.message}`,
            responseTime: Date.now() - startTime,
        };
    }
}
/**
 * Check memory usage
 */
function checkMemory() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    const heapPercent = (heapUsedMB / heapTotalMB) * 100;
    let status = 'pass';
    let message = 'Memory usage normal';
    if (heapPercent > 90) {
        status = 'fail';
        message = 'Critical memory usage';
    }
    else if (heapPercent > 75) {
        status = 'warn';
        message = 'High memory usage';
    }
    return {
        status,
        message,
        details: {
            heapUsed: `${heapUsedMB}MB`,
            heapTotal: `${heapTotalMB}MB`,
            heapPercent: `${heapPercent.toFixed(1)}%`,
            rss: `${rssMB}MB`,
        },
    };
}
/**
 * Check process health
 */
function checkProcess() {
    const uptime = process.uptime();
    const uptimeHours = uptime / 3600;
    return {
        status: 'pass',
        message: 'Process running',
        details: {
            uptime: `${uptimeHours.toFixed(2)} hours`,
            pid: process.pid,
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
        },
    };
}
/**
 * Perform all health checks
 */
async function performHealthCheck() {
    const _startTime = Date.now();
    // Run all checks in parallel
    const [mongodb, solana_rpc, memory, processCheck] = await Promise.all([
        checkMongoDB(),
        checkSolanaRPC(),
        Promise.resolve(checkMemory()),
        Promise.resolve(checkProcess()),
    ]);
    const checks = {
        mongodb,
        solana_rpc,
        memory,
        process: processCheck,
    };
    // Determine overall status
    const failedChecks = Object.values(checks).filter(c => c.status === 'fail').length;
    const warnChecks = Object.values(checks).filter(c => c.status === 'warn').length;
    let overallStatus = 'healthy';
    if (failedChecks > 0) {
        overallStatus = failedChecks >= 2 ? 'unhealthy' : 'degraded';
    }
    else if (warnChecks > 0) {
        overallStatus = 'degraded';
    }
    const health = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
    };
    return health;
}
/**
 * Health check endpoint handler
 */
async function healthCheckHandler(_req, res) {
    try {
        const health = await performHealthCheck();
        const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
        res.status(statusCode).json(health);
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
        });
    }
}
/**
 * Liveness probe (Kubernetes-style)
 * Returns 200 if the process is alive
 */
function livenessProbe(_req, res) {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
    });
}
/**
 * Readiness probe (Kubernetes-style)
 * Returns 200 if the service is ready to accept traffic
 */
async function readinessProbe(_req, res) {
    try {
        // Check critical dependencies
        const mongoCheck = await checkMongoDB();
        if (mongoCheck.status === 'fail') {
            res.status(503).json({
                status: 'not_ready',
                reason: 'MongoDB not connected',
                timestamp: new Date().toISOString(),
            });
            return;
        }
        res.status(200).json({
            status: 'ready',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'not_ready',
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
}
/**
 * Startup probe (Kubernetes-style)
 * Returns 200 when the application has started successfully
 */
async function startupProbe(_req, res) {
    try {
        const health = await performHealthCheck();
        if (health.status === 'unhealthy') {
            res.status(503).json({
                status: 'not_started',
                checks: health.checks,
                timestamp: new Date().toISOString(),
            });
            return;
        }
        res.status(200).json({
            status: 'started',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'not_started',
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
}
//# sourceMappingURL=health-check.js.map