// Complete User Authentication and Management System
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const USERS_FILE = path.join(__dirname, '../data/users.json');
const SESSIONS_FILE = path.join(__dirname, '../data/sessions.json');
const ACTIVITY_LOG_FILE = path.join(__dirname, '../data/user-activity.json');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY: string = process.env.JWT_EXPIRY || '7d';

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

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

export class UserAuthManager {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, UserSession> = new Map();
  private activityLogs: ActivityLog[] = [];
  
  constructor() {
    this.loadUsers();
    this.loadSessions();
    this.loadActivityLogs();
  }
  
  private loadUsers(): void {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const data = fs.readFileSync(USERS_FILE, 'utf-8');
        const usersArray = JSON.parse(data);
        this.users.clear();
        usersArray.forEach((user: User) => {
          this.users.set(user.id, user);
        });
        console.log(`📂 Loaded ${this.users.size} users from disk`);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }
  
  private saveUsers(): void {
    try {
      const usersArray = Array.from(this.users.values());
      fs.writeFileSync(USERS_FILE, JSON.stringify(usersArray, null, 2));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }

  private loadSessions(): void {
    try {
      if (fs.existsSync(SESSIONS_FILE)) {
        const data = fs.readFileSync(SESSIONS_FILE, 'utf-8');
        const sessionsArray = JSON.parse(data);
        this.sessions.clear();
        // Clean expired sessions
        const now = new Date();
        sessionsArray.forEach((session: UserSession) => {
          if (new Date(session.expiresAt) > now) {
            this.sessions.set(session.token, session);
          }
        });
        this.saveSessions(); // Save cleaned sessions
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }

  private saveSessions(): void {
    try {
      const sessionsArray = Array.from(this.sessions.values());
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsArray, null, 2));
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  }

  private loadActivityLogs(): void {
    try {
      if (fs.existsSync(ACTIVITY_LOG_FILE)) {
        const data = fs.readFileSync(ACTIVITY_LOG_FILE, 'utf-8');
        this.activityLogs = JSON.parse(data);
        // Keep only last 10000 logs
        if (this.activityLogs.length > 10000) {
          this.activityLogs = this.activityLogs.slice(-10000);
          this.saveActivityLogs();
        }
      }
    } catch (error) {
      console.error('Error loading activity logs:', error);
    }
  }

  private saveActivityLogs(): void {
    try {
      fs.writeFileSync(ACTIVITY_LOG_FILE, JSON.stringify(this.activityLogs, null, 2));
    } catch (error) {
      console.error('Error saving activity logs:', error);
    }
  }

  private hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const saltToUse = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, saltToUse, 10000, 64, 'sha512').toString('hex');
    return { hash, salt: saltToUse };
  }

  private verifyPassword(password: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hashPassword(password, salt);
    return computedHash === hash;
  }

  private generateToken(userId: string): string {
    return jwt.sign(
      { userId, iat: Math.floor(Date.now() / 1000) },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY } as any
    );
  }


  private logActivity(userId: string, action: string, details?: any, ipAddress?: string): void {
    const log: ActivityLog = {
      id: crypto.randomUUID(),
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
      ipAddress
    };
    this.activityLogs.push(log);
    if (this.activityLogs.length > 10000) {
      this.activityLogs = this.activityLogs.slice(-10000);
    }
    this.saveActivityLogs();
  }

  register(
    username: string,
    email: string,
    password: string,
    ipAddress?: string
  ): { success: boolean; user?: User; token?: string; error?: string } {
    // Validation
    if (!username || !email || !password) {
      return { success: false, error: 'Username, email, and password are required' };
    }

    if (username.length < 3 || username.length > 20) {
      return { success: false, error: 'Username must be between 3 and 20 characters' };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'Invalid email format' };
    }

    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }

    // Check if username or email already exists
    for (const user of this.users.values()) {
      if (user.username.toLowerCase() === username.toLowerCase()) {
        return { success: false, error: 'Username already exists' };
      }
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return { success: false, error: 'Email already exists' };
      }
    }

    const userId = crypto.randomUUID();
    const { hash, salt } = this.hashPassword(password);
    const now = new Date().toISOString();

    const newUser: User = {
      id: userId,
      username,
      email: email.toLowerCase(),
      passwordHash: `${salt}:${hash}`, // Store salt:hash
      createdAt: now,
      updatedAt: now,
      emailVerified: false,
      role: 'user',
      status: 'active',
      profile: {},
      settings: {
        theme: 'dark',
        notifications: {
          email: true,
          priceAlerts: true,
          tradeAlerts: true
        },
        trading: {
          defaultSlippage: 1,
          defaultWalletIndex: 0
        }
      },
      stats: {
        totalTrades: 0,
        totalVolume: 0,
        totalProfit: 0,
        winRate: 0
      }
    };

    this.users.set(userId, newUser);
    this.saveUsers();

    const token = this.generateToken(userId);
    this.createSession(userId, token, ipAddress);

    this.logActivity(userId, 'user_registered', { username, email }, ipAddress);

    console.log(`✅ New user registered: ${username} (${userId})`);
    return {
      success: true,
      user: { ...newUser, passwordHash: '' },
      token
    };
  }

  login(
    usernameOrEmail: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): { success: boolean; user?: User; token?: string; error?: string } {
    if (!usernameOrEmail || !password) {
      return { success: false, error: 'Username/email and password are required' };
    }

    // Find user
    let user: User | null = null;
    for (const u of this.users.values()) {
      if (
        u.username.toLowerCase() === usernameOrEmail.toLowerCase() ||
        u.email.toLowerCase() === usernameOrEmail.toLowerCase()
      ) {
        user = u;
        break;
      }
    }

    if (!user) {
      return { success: false, error: 'Invalid username/email or password' };
    }

    if (user.status !== 'active') {
      return { success: false, error: `Account is ${user.status}` };
    }

    // Verify password
    const [salt, hash] = user.passwordHash.split(':');
    if (!this.verifyPassword(password, hash, salt)) {
      this.logActivity(user.id, 'login_failed', { reason: 'invalid_password' }, ipAddress);
      return { success: false, error: 'Invalid username/email or password' };
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    this.saveUsers();

    // Generate token and create session
    const token = this.generateToken(user.id);
    this.createSession(user.id, token, ipAddress, userAgent);

    this.logActivity(user.id, 'user_logged_in', { username: user.username }, ipAddress);

    console.log(`✅ User logged in: ${user.username} (${user.id})`);
    return {
      success: true,
      user: { ...user, passwordHash: '' },
      token
    };
  }

  logout(token: string): { success: boolean } {
    this.sessions.delete(token);
    this.saveSessions();
    return { success: true };
  }

  verifyToken(token: string): { success: boolean; userId?: string; error?: string } {
    const decoded = this.verifyTokenInternal(token);
    if (!decoded) {
      return { success: false, error: 'Invalid or expired token' };
    }

    // Check if session exists
    const session = this.sessions.get(token);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    // Update last active
    session.lastActive = new Date().toISOString();
    this.saveSessions();

    return { success: true, userId: decoded.userId };
  }

  private verifyTokenInternal(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      return decoded;
    } catch (error) {
      return null;
    }
  }

  private createSession(userId: string, token: string, ipAddress?: string, userAgent?: string): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session: UserSession = {
      userId,
      token,
      createdAt: now.toISOString(),
      lastActive: now.toISOString(),
      ipAddress,
      userAgent,
      expiresAt: expiresAt.toISOString()
    };

    this.sessions.set(token, session);
    this.saveSessions();
  }

  getUserById(userId: string): User | null {
    const user = this.users.get(userId);
    if (user) {
      return { ...user, passwordHash: '' };
    }
    return null;
  }

  getUserByToken(token: string): User | null {
    const decoded = this.verifyToken(token);
    if (!decoded) return null;
    return this.getUserById(decoded.userId);
  }

  updateProfile(
    userId: string,
    updates: {
      username?: string;
      displayName?: string;
      bio?: string;
      avatar?: string;
      timezone?: string;
      language?: string;
    }
  ): { success: boolean; user?: User; error?: string } {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check if new username is taken
    if (updates.username && updates.username !== user.username) {
      for (const u of this.users.values()) {
        if (u.id !== userId && u.username.toLowerCase() === updates.username!.toLowerCase()) {
          return { success: false, error: 'Username already taken' };
        }
      }
      user.username = updates.username;
    }

    if (!user.profile) user.profile = {};
    if (updates.displayName !== undefined) user.profile.displayName = updates.displayName;
    if (updates.bio !== undefined) user.profile.bio = updates.bio;
    if (updates.avatar !== undefined) user.profile.avatar = updates.avatar;
    if (updates.timezone !== undefined) user.profile.timezone = updates.timezone;
    if (updates.language !== undefined) user.profile.language = updates.language;

    user.updatedAt = new Date().toISOString();
    this.saveUsers();

    this.logActivity(userId, 'profile_updated', { fields: Object.keys(updates) });

    return { success: true, user: { ...user, passwordHash: '' } };
  }

  updateSettings(
    userId: string,
    settings: Partial<User['settings']>
  ): { success: boolean; user?: User; error?: string } {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.settings) user.settings = {};
    if (settings.theme !== undefined) user.settings.theme = settings.theme;
    if (settings.notifications) {
      if (!user.settings.notifications) user.settings.notifications = {};
      Object.assign(user.settings.notifications, settings.notifications);
    }
    if (settings.trading) {
      if (!user.settings.trading) user.settings.trading = {};
      Object.assign(user.settings.trading, settings.trading);
    }

    user.updatedAt = new Date().toISOString();
    this.saveUsers();

    this.logActivity(userId, 'settings_updated', { fields: Object.keys(settings) });

    return { success: true, user: { ...user, passwordHash: '' } };
  }

  changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): { success: boolean; error?: string } {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Verify current password
    const [salt, hash] = user.passwordHash.split(':');
    if (!this.verifyPassword(currentPassword, hash, salt)) {
      return { success: false, error: 'Current password is incorrect' };
    }

    if (newPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters' };
    }

    // Update password
    const { hash: newHash, salt: newSalt } = this.hashPassword(newPassword);
    user.passwordHash = `${newSalt}:${newHash}`;
    user.updatedAt = new Date().toISOString();
    this.saveUsers();

    // Invalidate all sessions except current (optional - for security)
    // this.sessions.clear(); // Uncomment to force re-login

    this.logActivity(userId, 'password_changed');

    return { success: true };
  }

  requestPasswordReset(email: string): { success: boolean; resetToken?: string; error?: string } {
    const user = Array.from(this.users.values()).find(
      u => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      // Don't reveal if email exists for security
      return { success: true, resetToken: 'dummy-token' };
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    // In production, store this token with expiry and send email
    // For now, we'll return it (in production, send via email)

    this.logActivity(user.id, 'password_reset_requested');

    return { success: true, resetToken };
  }

  resetPassword(resetToken: string, newPassword: string): { success: boolean; error?: string } {
    // In production, verify resetToken from database
    // For now, this is a placeholder
    if (newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }

    // Find user by reset token (in production, use a reset tokens table)
    // This is simplified - implement proper reset token storage
    return { success: false, error: 'Reset token not implemented. Use change password instead.' };
  }

  getUserSessions(userId: string): UserSession[] {
    return Array.from(this.sessions.values()).filter(s => s.userId === userId);
  }

  getActivityLogs(userId: string, limit: number = 100): ActivityLog[] {
    return this.activityLogs
      .filter(log => log.userId === userId)
      .slice(-limit)
      .reverse();
  }

  updateUserStats(
    userId: string,
    stats: Partial<User['stats']>
  ): { success: boolean; error?: string } {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.stats) user.stats = {};
    Object.assign(user.stats, stats);
    user.updatedAt = new Date().toISOString();
    this.saveUsers();

    return { success: true };
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values()).map(u => ({ ...u, passwordHash: '' }));
  }

  deleteUser(userId: string): { success: boolean; error?: string } {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Delete all sessions
    for (const [token, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(token);
      }
    }
    this.saveSessions();

    // Delete user
    this.users.delete(userId);
    this.saveUsers();

    this.logActivity(userId, 'user_deleted', { username: user.username });

    return { success: true };
  }
}

export const userAuthManager = new UserAuthManager();
