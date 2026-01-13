"use strict";
// User Session Manager
// Manages user sessions and wallet isolation
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSessionManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("./logger");
class UserSessionManager {
    constructor() {
        this.sessionsDir = path_1.default.join(__dirname, '../sessions');
        this.sessionsFile = path_1.default.join(this.sessionsDir, 'sessions.json');
        this.ensureSessionsDir();
    }
    ensureSessionsDir() {
        if (!fs_1.default.existsSync(this.sessionsDir)) {
            fs_1.default.mkdirSync(this.sessionsDir, { recursive: true });
        }
    }
    loadSessions() {
        try {
            if (fs_1.default.existsSync(this.sessionsFile)) {
                const data = fs_1.default.readFileSync(this.sessionsFile, 'utf-8');
                return JSON.parse(data);
            }
        }
        catch (error) {
            logger_1.log.error('Error loading sessions:', error);
        }
        return [];
    }
    saveSessions(sessions) {
        try {
            fs_1.default.writeFileSync(this.sessionsFile, JSON.stringify(sessions, null, 2));
        }
        catch (error) {
            logger_1.log.error('Error saving sessions:', error);
        }
    }
    createSession(sessionName) {
        const sessions = this.loadSessions();
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const session = {
            userId,
            sessionName,
            createdAt: Date.now(),
            lastActive: Date.now(),
        };
        sessions.push(session);
        this.saveSessions(sessions);
        // Create session directory for wallets
        const sessionKeypairsDir = path_1.default.join(__dirname, '../keypairs', userId);
        if (!fs_1.default.existsSync(sessionKeypairsDir)) {
            fs_1.default.mkdirSync(sessionKeypairsDir, { recursive: true });
        }
        return session;
    }
    getSession(userId) {
        const sessions = this.loadSessions();
        return sessions.find(s => s.userId === userId) || null;
    }
    getAllSessions() {
        return this.loadSessions();
    }
    updateLastActive(userId) {
        const sessions = this.loadSessions();
        const session = sessions.find(s => s.userId === userId);
        if (session) {
            session.lastActive = Date.now();
            this.saveSessions(sessions);
        }
    }
    deleteSession(userId) {
        const sessions = this.loadSessions();
        const index = sessions.findIndex(s => s.userId === userId);
        if (index === -1)
            return false;
        // Remove session directory
        const sessionKeypairsDir = path_1.default.join(__dirname, '../keypairs', userId);
        if (fs_1.default.existsSync(sessionKeypairsDir)) {
            fs_1.default.rmSync(sessionKeypairsDir, { recursive: true, force: true });
        }
        sessions.splice(index, 1);
        this.saveSessions(sessions);
        return true;
    }
    getSessionKeypairsDir(userId) {
        return path_1.default.join(__dirname, '../keypairs', userId);
    }
}
exports.UserSessionManager = UserSessionManager;
//# sourceMappingURL=user-session.js.map