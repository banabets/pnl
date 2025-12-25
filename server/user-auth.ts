// User Authentication and Management System
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const USERS_FILE = path.join(__dirname, '../users.json');

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string; // bcrypt hash
  createdAt: string;
  updatedAt: string;
  profile?: {
    displayName?: string;
    bio?: string;
  };
}

export class UserAuthManager {
  private users: Map<string, User> = new Map();
  
  constructor() {
    this.loadUsers();
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
  
  private hashPassword(password: string): string {
    // Simple hash for now - in production use bcrypt
    return crypto.createHash('sha256').update(password).digest('hex');
  }
  
  register(username: string, email: string, password: string): { success: boolean; user?: User; error?: string } {
    // Check if username or email already exists
    for (const user of this.users.values()) {
      if (user.username === username) {
        return { success: false, error: 'Username already exists' };
      }
      if (user.email === email) {
        return { success: false, error: 'Email already exists' };
      }
    }
    
    const userId = crypto.randomUUID();
    const newUser: User = {
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
  
  login(usernameOrEmail: string, password: string): { success: boolean; user?: User; token?: string; error?: string } {
    const passwordHash = this.hashPassword(password);
    
    for (const user of this.users.values()) {
      if ((user.username === usernameOrEmail || user.email === usernameOrEmail) && 
          user.passwordHash === passwordHash) {
        // Generate simple token (in production use JWT)
        const token = crypto.randomBytes(32).toString('hex');
        
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
  
  getUserById(userId: string): User | null {
    const user = this.users.get(userId);
    if (user) {
      return { ...user, passwordHash: '' }; // Don't return password hash
    }
    return null;
  }
  
  updateProfile(userId: string, updates: { username?: string; displayName?: string; bio?: string }): { success: boolean; user?: User; error?: string } {
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
    
    if (updates.username) user.username = updates.username;
    if (updates.displayName !== undefined) {
      if (!user.profile) user.profile = {};
      user.profile.displayName = updates.displayName;
    }
    if (updates.bio !== undefined) {
      if (!user.profile) user.profile = {};
      user.profile.bio = updates.bio;
    }
    user.updatedAt = new Date().toISOString();
    
    this.saveUsers();
    
    console.log(`✅ Profile updated for user: ${user.username} (${userId})`);
    return { success: true, user: { ...user, passwordHash: '' } };
  }
  
  getAllUsers(): User[] {
    return Array.from(this.users.values()).map(u => ({ ...u, passwordHash: '' }));
  }
}

export const userAuthManager = new UserAuthManager();



