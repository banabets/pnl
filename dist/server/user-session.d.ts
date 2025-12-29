export interface UserSession {
    userId: string;
    sessionName: string;
    createdAt: number;
    lastActive: number;
}
export declare class UserSessionManager {
    private sessionsDir;
    private sessionsFile;
    constructor();
    private ensureSessionsDir;
    private loadSessions;
    private saveSessions;
    createSession(sessionName: string): UserSession;
    getSession(userId: string): UserSession | null;
    getAllSessions(): UserSession[];
    updateLastActive(userId: string): void;
    deleteSession(userId: string): boolean;
    getSessionKeypairsDir(userId: string): string;
}
//# sourceMappingURL=user-session.d.ts.map