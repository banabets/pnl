export interface User {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    createdAt: string;
    updatedAt: string;
    lastLogin?: string;
    emailVerified: boolean;
    role: 'user' | 'admin' | 'premium';
    status: 'active' | 'suspended' | 'banned';
    profile?: {
        displayName?: string;
        bio?: string;
        avatar?: string;
        timezone?: string;
        language?: string;
    };
    settings?: {
        theme?: 'light' | 'dark' | 'auto';
        notifications?: {
            email?: boolean;
            priceAlerts?: boolean;
            tradeAlerts?: boolean;
        };
        trading?: {
            defaultSlippage?: number;
            defaultWalletIndex?: number;
        };
    };
    stats?: {
        totalTrades?: number;
        totalVolume?: number;
        totalProfit?: number;
        winRate?: number;
    };
}
export interface UserSession {
    userId: string;
    token: string;
    createdAt: string;
    lastActive: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: string;
}
export interface ActivityLog {
    id: string;
    userId: string;
    action: string;
    details?: any;
    timestamp: string;
    ipAddress?: string;
}
export declare class UserAuthManager {
    private users;
    private sessions;
    private activityLogs;
    constructor();
    private loadUsers;
    private saveUsers;
    private loadSessions;
    private saveSessions;
    private loadActivityLogs;
    private saveActivityLogs;
    private hashPassword;
    private verifyPassword;
    private generateToken;
    private logActivity;
    register(username: string, email: string, password: string, ipAddress?: string): {
        success: boolean;
        user?: User;
        token?: string;
        error?: string;
    };
    login(usernameOrEmail: string, password: string, ipAddress?: string, userAgent?: string): {
        success: boolean;
        user?: User;
        token?: string;
        error?: string;
    };
    logout(token: string): {
        success: boolean;
    };
    verifyToken(token: string): {
        success: boolean;
        userId?: string;
        error?: string;
    };
    private verifyTokenInternal;
    private createSession;
    getUserById(userId: string): User | null;
    getUserByToken(token: string): User | null;
    updateProfile(userId: string, updates: {
        username?: string;
        displayName?: string;
        bio?: string;
        avatar?: string;
        timezone?: string;
        language?: string;
    }): {
        success: boolean;
        user?: User;
        error?: string;
    };
    updateSettings(userId: string, settings: Partial<User['settings']>): {
        success: boolean;
        user?: User;
        error?: string;
    };
    changePassword(userId: string, currentPassword: string, newPassword: string): {
        success: boolean;
        error?: string;
    };
    requestPasswordReset(email: string): {
        success: boolean;
        resetToken?: string;
        error?: string;
    };
    resetPassword(resetToken: string, newPassword: string): {
        success: boolean;
        error?: string;
    };
    getUserSessions(userId: string): UserSession[];
    getActivityLogs(userId: string, limit?: number): ActivityLog[];
    updateUserStats(userId: string, stats: Partial<User['stats']>): {
        success: boolean;
        error?: string;
    };
    getAllUsers(): User[];
    deleteUser(userId: string): {
        success: boolean;
        error?: string;
    };
}
export declare const userAuthManager: UserAuthManager;
//# sourceMappingURL=user-auth.d.ts.map