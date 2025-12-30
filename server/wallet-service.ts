// Wallet Service - Gestión de wallets con MongoDB y encriptación
import { Wallet, MasterWallet } from './database';
import { Keypair, PublicKey } from '@solana/web3.js';
import crypto from 'crypto';
import mongoose from 'mongoose';

// Encriptación de private keys usando AES-256
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// Derive encryption key from user password (en producción, usar bcrypt)
function deriveKeyFromPassword(password: string, salt: string): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

// Encriptar private key
export function encryptPrivateKey(privateKey: Uint8Array, userKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(Buffer.from(privateKey));
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const authTag = cipher.getAuthTag();
  
  // Return: iv:authTag:encrypted (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

// Desencriptar private key
export function decryptPrivateKey(encryptedKey: string, userKey: string): Uint8Array {
  const [ivBase64, authTagBase64, encryptedBase64] = encryptedKey.split(':');
  
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const encrypted = Buffer.from(encryptedBase64, 'base64');
  
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return new Uint8Array(decrypted);
}

export interface WalletInfo {
  index: number;
  publicKey: string;
  balance: number;
  label?: string;
  isActive: boolean;
}

export interface WalletWithKey extends WalletInfo {
  keypair: Keypair;
}

export class WalletService {
  /**
   * Generar nuevas wallets para un usuario
   */
  async generateWallets(
    userId: string,
    count: number = 5
  ): Promise<WalletInfo[]> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Obtener último índice
    const lastWallet = await Wallet.findOne({ userId: userObjectId })
      .sort({ index: -1 })
      .exec();
    
    const startIndex = lastWallet ? lastWallet.index + 1 : 1;
    const wallets: WalletInfo[] = [];
    
    for (let i = 0; i < count; i++) {
      const keypair = Keypair.generate();
      const index = startIndex + i;
      
      // Encriptar private key (en producción, usar clave derivada del password del usuario)
      const encryptedKey = encryptPrivateKey(keypair.secretKey, ENCRYPTION_KEY);
      
      const wallet = new Wallet({
        userId: userObjectId,
        index,
        publicKey: keypair.publicKey.toBase58(),
        encryptedPrivateKey: encryptedKey,
        balance: 0,
        isActive: true
      });
      
      await wallet.save();
      
      wallets.push({
        index,
        publicKey: keypair.publicKey.toBase58(),
        balance: 0,
        isActive: true
      });
    }
    
    return wallets;
  }
  
  /**
   * Obtener todas las wallets de un usuario
   */
  async getUserWallets(userId: string): Promise<WalletInfo[]> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const wallets = await Wallet.find({ userId: userObjectId })
      .sort({ index: 1 })
      .exec();
    
    return wallets.map(w => ({
      index: w.index,
      publicKey: w.publicKey,
      balance: w.balance,
      label: w.label,
      isActive: w.isActive
    }));
  }
  
  /**
   * Obtener wallet con private key (desencriptada)
   */
  async getWalletWithKey(userId: string, index: number): Promise<WalletWithKey | null> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const wallet = await Wallet.findOne({ userId: userObjectId, index }).exec();
    
    if (!wallet) return null;
    
    try {
      const privateKey = decryptPrivateKey(wallet.encryptedPrivateKey, ENCRYPTION_KEY);
      const keypair = Keypair.fromSecretKey(privateKey);
      
      return {
        index: wallet.index,
        publicKey: wallet.publicKey,
        balance: wallet.balance,
        label: wallet.label,
        isActive: wallet.isActive,
        keypair
      };
    } catch (error) {
      console.error('Error decrypting wallet:', error);
      return null;
    }
  }
  
  /**
   * Obtener múltiples wallets con keys
   */
  async getWalletsWithKeys(userId: string, indices: number[]): Promise<WalletWithKey[]> {
    const wallets: WalletWithKey[] = [];
    
    for (const index of indices) {
      const wallet = await this.getWalletWithKey(userId, index);
      if (wallet) {
        wallets.push(wallet);
      }
    }
    
    return wallets;
  }
  
  /**
   * Actualizar balance de wallet
   */
  async updateWalletBalance(userId: string, index: number, balance: number): Promise<void> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    await Wallet.updateOne(
      { userId: userObjectId, index },
      { balance, updatedAt: new Date() }
    ).exec();
  }
  
  /**
   * Actualizar balances de múltiples wallets
   */
  async updateWalletsBalances(userId: string, balances: Map<number, number>): Promise<void> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const updates = Array.from(balances.entries()).map(([index, balance]) => ({
      updateOne: {
        filter: { userId: userObjectId, index },
        update: { balance, updatedAt: new Date() }
      }
    }));
    
    if (updates.length > 0) {
      await Wallet.bulkWrite(updates);
    }
  }
  
  /**
   * Eliminar wallets (solo si no tienen fondos)
   */
  async deleteWallets(userId: string, indices?: number[]): Promise<{ deleted: number; errors: string[] }> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const errors: string[] = [];
    let deleted = 0;
    
    const query: any = { userId: userObjectId };
    if (indices && indices.length > 0) {
      query.index = { $in: indices };
    }
    
    const wallets = await Wallet.find(query).exec();
    
    for (const wallet of wallets) {
      if (wallet.balance > 0.001) {
        errors.push(`Wallet ${wallet.index} has funds (${wallet.balance} SOL)`);
        continue;
      }
      
      await Wallet.deleteOne({ _id: wallet._id }).exec();
      deleted++;
    }
    
    return { deleted, errors };
  }
  
  /**
   * Crear master wallet para usuario
   */
  async createMasterWallet(userId: string): Promise<{ publicKey: string; exists: boolean }> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Verificar si ya existe
    const existing = await MasterWallet.findOne({ userId: userObjectId }).exec();
    if (existing) {
      return {
        publicKey: existing.publicKey,
        exists: true
      };
    }
    
    // Crear nueva master wallet
    const keypair = Keypair.generate();
    const encryptedKey = encryptPrivateKey(keypair.secretKey, ENCRYPTION_KEY);
    
    const masterWallet = new MasterWallet({
      userId: userObjectId,
      publicKey: keypair.publicKey.toBase58(),
      encryptedPrivateKey: encryptedKey,
      balance: 0
    });
    
    await masterWallet.save();
    
    return {
      publicKey: keypair.publicKey.toBase58(),
      exists: false
    };
  }
  
  /**
   * Obtener master wallet con key
   */
  async getMasterWalletWithKey(userId: string): Promise<{ keypair: Keypair; balance: number } | null> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const masterWallet = await MasterWallet.findOne({ userId: userObjectId }).exec();
    
    if (!masterWallet) return null;
    
    try {
      const privateKey = decryptPrivateKey(masterWallet.encryptedPrivateKey, ENCRYPTION_KEY);
      const keypair = Keypair.fromSecretKey(privateKey);
      
      return {
        keypair,
        balance: masterWallet.balance
      };
    } catch (error) {
      console.error('Error decrypting master wallet:', error);
      return null;
    }
  }
  
  /**
   * Obtener info de master wallet (sin key)
   */
  async getMasterWalletInfo(userId: string): Promise<{ exists: boolean; publicKey?: string; balance?: number }> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const masterWallet = await MasterWallet.findOne({ userId: userObjectId }).exec();
    
    if (!masterWallet) {
      return { exists: false };
    }
    
    return {
      exists: true,
      publicKey: masterWallet.publicKey,
      balance: masterWallet.balance
    };
  }
  
  /**
   * Actualizar balance de master wallet
   */
  async updateMasterWalletBalance(userId: string, balance: number): Promise<void> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    await MasterWallet.updateOne(
      { userId: userObjectId },
      { balance, updatedAt: new Date() }
    ).exec();
  }
  
  /**
   * Eliminar master wallet
   */
  async deleteMasterWallet(userId: string): Promise<boolean> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const result = await MasterWallet.deleteOne({ userId: userObjectId }).exec();
    return result.deletedCount > 0;
  }
  
  /**
   * Obtener resumen de wallets de usuario
   */
  async getWalletSummary(userId: string): Promise<{
    totalWallets: number;
    totalBalance: number;
    wallets: WalletInfo[];
  }> {
    const wallets = await this.getUserWallets(userId);
    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
    
    return {
      totalWallets: wallets.length,
      totalBalance,
      wallets
    };
  }
}

export const walletService = new WalletService();


