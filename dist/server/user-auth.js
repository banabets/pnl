"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userAuthManager = exports.UserAuthManager = void 0;
// User Authentication and Management System
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const USERS_FILE = path_1.default.join(__dirname, '../users.json');
class UserAuthManager {
    constructor() {
        this.users = new Map();
        this.loadUsers();
    }
    loadUsers() {
        try {
            if (fs_1.default.existsSync(USERS_FILE)) {
                const data = fs_1.default.readFileSync(USERS_FILE, 'utf-8');
                const usersArray = JSON.parse(data);
                this.users.clear();
                usersArray.forEach((user) => {
                    this.users.set(user.id, user);
                });
                console.log(`📂 Loaded ${this.users.size} users from disk`);
            }
        }
        catch (error) {
            console.error('Error loading users:', error);
        }
    }
    saveUsers() {
        try {
            const usersArray = Array.from(this.users.values());
            fs_1.default.writeFileSync(USERS_FILE, JSON.stringify(usersArray, null, 2));
        }
        catch (error) {
            console.error('Error saving users:', error);
        }
    }
    hashPassword(password) {
        // Simple hash for now - in production use bcrypt
        return crypto_1.default.createHash('sha256').update(password).digest('hex');
    }
    register(username, email, password) {
        // Check if username or email already exists
        for (const user of this.users.values()) {
            if (user.username === username) {
                return { success: false, error: 'Username already exists' };
            }
            if (user.email === email) {
                return { success: false, error: 'Email already exists' };
            }
        }
        const userId = crypto_1.default.randomUUID();
        const newUser = {
            id: userId,
            username,
            email,
            passwordHash: this.hashPassword(password),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            profile: {}
        };
        this.users.set(userId, newUser);
        this.saveUsers();
        console.log(`✅ New user registered: ${username} (${userId})`);
        return { success: true, user: { ...newUser, passwordHash: '' } }; // Don't return password hash
    }
    login(usernameOrEmail, password) {
        const passwordHash = this.hashPassword(password);
        for (const user of this.users.values()) {
            if ((user.username === usernameOrEmail || user.email === usernameOrEmail) &&
                user.passwordHash === passwordHash) {
                // Generate simple token (in production use JWT)
                const token = crypto_1.default.randomBytes(32).toString('hex');
                console.log(`✅ User logged in: ${user.username} (${user.id})`);
                return {
                    success: true,
                    user: { ...user, passwordHash: '' }, // Don't return password hash
                    token
                };
            }
        }
        return { success: false, error: 'Invalid username/email or password' };
    }
    getUserById(userId) {
        const user = this.users.get(userId);
        if (user) {
            return { ...user, passwordHash: '' }; // Don't return password hash
        }
        return null;
    }
    updateProfile(userId, updates) {
        const user = this.users.get(userId);
        if (!user) {
            return { success: false, error: 'User not found' };
        }
        // Check if new username is taken
        if (updates.username && updates.username !== user.username) {
            for (const u of this.users.values()) {
                if (u.id !== userId && u.username === updates.username) {
                    return { success: false, error: 'Username already taken' };
                }
            }
        }
        if (updates.username)
            user.username = updates.username;
        if (updates.displayName !== undefined) {
            if (!user.profile)
                user.profile = {};
            user.profile.displayName = updates.displayName;
        }
        if (updates.bio !== undefined) {
            if (!user.profile)
                user.profile = {};
            user.profile.bio = updates.bio;
        }
        user.updatedAt = new Date().toISOString();
        this.saveUsers();
        console.log(`✅ Profile updated for user: ${user.username} (${userId})`);
        return { success: true, user: { ...user, passwordHash: '' } };
    }
    getAllUsers() {
        return Array.from(this.users.values()).map(u => ({ ...u, passwordHash: '' }));
    }
}
exports.UserAuthManager = UserAuthManager;
exports.userAuthManager = new UserAuthManager();
//# sourceMappingURL=user-auth.js.map