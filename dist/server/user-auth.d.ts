export interface User {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    createdAt: string;
    updatedAt: string;
    profile?: {
        displayName?: string;
        bio?: string;
    };
}
export declare class UserAuthManager {
    private users;
    constructor();
    private loadUsers;
    private saveUsers;
    private hashPassword;
    register(username: string, email: string, password: string): {
        success: boolean;
        user?: User;
        error?: string;
    };
    login(usernameOrEmail: string, password: string): {
        success: boolean;
        user?: User;
        token?: string;
        error?: string;
    };
    getUserById(userId: string): User | null;
    updateProfile(userId: string, updates: {
        username?: string;
        displayName?: string;
        bio?: string;
    }): {
        success: boolean;
        user?: User;
        error?: string;
    };
    getAllUsers(): User[];
}
export declare const userAuthManager: UserAuthManager;
//# sourceMappingURL=user-auth.d.ts.map