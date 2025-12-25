// User Session Manager
// Manages user sessions and wallet isolation

import fs from 'fs';
import path from 'path';

export interface UserSession {
  userId: string;
  sessionName: string;
  createdAt: number;
  lastActive: number;
}

export class UserSessionManager {
  private sessionsDir: string;
  private sessionsFile: string;

  constructor() {
    this.sessionsDir = path.join(__dirname, '../sessions');
    this.sessionsFile = path.join(this.sessionsDir, 'sessions.json');
    this.ensureSessionsDir();
  }

  private ensureSessionsDir() {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  private loadSessions(): UserSession[] {
    try {
      if (fs.existsSync(this.sessionsFile)) {
        const data = fs.readFileSync(this.sessionsFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
    return [];
  }

  private saveSessions(sessions: UserSession[]) {
    try {
      fs.writeFileSync(this.sessionsFile, JSON.stringify(sessions, null, 2));
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  }

  createSession(sessionName: string): UserSession {
    const sessions = this.loadSessions();
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: UserSession = {
      userId,
      sessionName,
      createdAt: Date.now(),
      lastActive: Date.now(),
    };

    sessions.push(session);
    this.saveSessions(sessions);

    // Create session directory for wallets
    const sessionKeypairsDir = path.join(__dirname, '../keypairs', userId);
    if (!fs.existsSync(sessionKeypairsDir)) {
      fs.mkdirSync(sessionKeypairsDir, { recursive: true });
    }

    return session;
  }

  getSession(userId: string): UserSession | null {
    const sessions = this.loadSessions();
    return sessions.find(s => s.userId === userId) || null;
  }

  getAllSessions(): UserSession[] {
    return this.loadSessions();
  }

  updateLastActive(userId: string) {
    const sessions = this.loadSessions();
    const session = sessions.find(s => s.userId === userId);
    if (session) {
      session.lastActive = Date.now();
      this.saveSessions(sessions);
    }
  }

  deleteSession(userId: string): boolean {
    const sessions = this.loadSessions();
    const index = sessions.findIndex(s => s.userId === userId);
    
    if (index === -1) return false;

    // Remove session directory
    const sessionKeypairsDir = path.join(__dirname, '../keypairs', userId);
    if (fs.existsSync(sessionKeypairsDir)) {
      fs.rmSync(sessionKeypairsDir, { recursive: true, force: true });
    }

    sessions.splice(index, 1);
    this.saveSessions(sessions);
    return true;
  }

  getSessionKeypairsDir(userId: string): string {
    return path.join(__dirname, '../keypairs', userId);
  }
}



