"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletService = exports.WalletService = void 0;
exports.encryptPrivateKey = encryptPrivateKey;
exports.decryptPrivateKey = decryptPrivateKey;
// Wallet Service - Gestión de wallets con MongoDB y encriptación
const database_1 = require("./database");
const web3_js_1 = require("@solana/web3.js");
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
// Encriptación de private keys usando AES-256
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto_1.default.randomBytes(32).toString('hex');
// Derive encryption key from user password (en producción, usar bcrypt)
function deriveKeyFromPassword(password, salt) {
    return crypto_1.default.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}
// Encriptar private key
function encryptPrivateKey(privateKey, userKey) {
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv(ENCRYPTION_ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(Buffer.from(privateKey));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Return: iv:authTag:encrypted (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}
// Desencriptar private key
function decryptPrivateKey(encryptedKey, userKey) {
    const [ivBase64, authTagBase64, encryptedBase64] = encryptedKey.split(':');
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const encrypted = Buffer.from(encryptedBase64, 'base64');
    const decipher = crypto_1.default.createDecipheriv(ENCRYPTION_ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return new Uint8Array(decrypted);
}
class WalletService {
    /**
     * Generar nuevas wallets para un usuario
     */
    async generateWallets(userId, count = 5) {
        const userObjectId = await this.getUserObjectId(userId);
        if (!userObjectId)
            throw new Error('User not found');
        // Obtener último índice
        const lastWallet = await database_1.Wallet.findOne({ userId: userObjectId })
            .sort({ index: -1 })
            .exec();
        const startIndex = lastWallet ? lastWallet.index + 1 : 1;
        const wallets = [];
        for (let i = 0; i < count; i++) {
            const keypair = web3_js_1.Keypair.generate();
            const index = startIndex + i;
            // Encriptar private key (en producción, usar clave derivada del password del usuario)
            const encryptedKey = encryptPrivateKey(keypair.secretKey, ENCRYPTION_KEY);
            const wallet = new database_1.Wallet({
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
    async getUserWallets(userId) {
        const userObjectId = await this.getUserObjectId(userId);
        if (!userObjectId)
            return [];
        const wallets = await database_1.Wallet.find({ userId: userObjectId })
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
    async getWalletWithKey(userId, index) {
        const userObjectId = await this.getUserObjectId(userId);
        if (!userObjectId)
            return null;
        const wallet = await database_1.Wallet.findOne({ userId: userObjectId, index }).exec();
        if (!wallet)
            return null;
        try {
            const privateKey = decryptPrivateKey(wallet.encryptedPrivateKey, ENCRYPTION_KEY);
            const keypair = web3_js_1.Keypair.fromSecretKey(privateKey);
            return {
                index: wallet.index,
                publicKey: wallet.publicKey,
                balance: wallet.balance,
                label: wallet.label,
                isActive: wallet.isActive,
                keypair
            };
        }
        catch (error) {
            console.error('Error decrypting wallet:', error);
            return null;
        }
    }
    /**
     * Obtener múltiples wallets con keys
     */
    async getWalletsWithKeys(userId, indices) {
        const wallets = [];
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
    async updateWalletBalance(userId, index, balance) {
        const userObjectId = await this.getUserObjectId(userId);
        if (!userObjectId)
            return;
        await database_1.Wallet.updateOne({ userId: userObjectId, index }, { balance, updatedAt: new Date() }).exec();
    }
    /**
     * Actualizar balances de múltiples wallets
     */
    async updateWalletsBalances(userId, balances) {
        const userObjectId = await this.getUserObjectId(userId);
        if (!userObjectId)
            return;
        const updates = Array.from(balances.entries()).map(([index, balance]) => ({
            updateOne: {
                filter: { userId: userObjectId, index },
                update: { balance, updatedAt: new Date() }
            }
        }));
        if (updates.length > 0) {
            await database_1.Wallet.bulkWrite(updates);
        }
    }
    /**
     * Eliminar wallets (solo si no tienen fondos)
     */
    async deleteWallets(userId, indices) {
        const userObjectId = await this.getUserObjectId(userId);
        if (!userObjectId)
            return { deleted: 0, errors: ['User not found'] };
        const errors = [];
        let deleted = 0;
        const query = { userId: userObjectId };
        if (indices && indices.length > 0) {
            query.index = { $in: indices };
        }
        const wallets = await database_1.Wallet.find(query).exec();
        for (const wallet of wallets) {
            if (wallet.balance > 0.001) {
                errors.push(`Wallet ${wallet.index} has funds (${wallet.balance} SOL)`);
                continue;
            }
            await database_1.Wallet.deleteOne({ _id: wallet._id }).exec();
            deleted++;
        }
        return { deleted, errors };
    }
    /**
     * Helper to get MongoDB ObjectId from user UUID or ObjectId string
     */
    async getUserObjectId(userId) {
        // Check if it's already a valid ObjectId
        if (mongoose_1.default.Types.ObjectId.isValid(userId) && userId.length === 24) {
            return new mongoose_1.default.Types.ObjectId(userId);
        }
        // Otherwise, it's a UUID - look up the user
        const user = await database_1.User.findOne({ id: userId }).exec();
        if (user) {
            return user._id;
        }
        return null;
    }
    /**
     * Crear master wallet para usuario
     */
    async createMasterWallet(userId) {
        const userObjectId = await this.getUserObjectId(userId);
        if (!userObjectId) {
            throw new Error('User not found');
        }
        // Verificar si ya existe
        const existing = await database_1.MasterWallet.findOne({ userId: userObjectId }).exec();
        if (existing) {
            return {
                publicKey: existing.publicKey,
                exists: true
            };
        }
        // Crear nueva master wallet
        const keypair = web3_js_1.Keypair.generate();
        const encryptedKey = encryptPrivateKey(keypair.secretKey, ENCRYPTION_KEY);
        const masterWallet = new database_1.MasterWallet({
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
    async getMasterWalletWithKey(userId) {
        const userObjectId = await this.getUserObjectId(userId);
        if (!userObjectId)
            return null;
        const masterWallet = await database_1.MasterWallet.findOne({ userId: userObjectId }).exec();
        if (!masterWallet)
            return null;
        try {
            const privateKey = decryptPrivateKey(masterWallet.encryptedPrivateKey, ENCRYPTION_KEY);
            const keypair = web3_js_1.Keypair.fromSecretKey(privateKey);
            return {
                keypair,
                balance: masterWallet.balance
            };
        }
        catch (error) {
            console.error('Error decrypting master wallet:', error);
            return null;
        }
    }
    /**
     * Obtener info de master wallet (sin key)
     */
    async getMasterWalletInfo(userId) {
        const userObjectId = await this.getUserObjectId(userId);
        if (!userObjectId)
            return { exists: false };
        const masterWallet = await database_1.MasterWallet.findOne({ userId: userObjectId }).exec();
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
    async updateMasterWalletBalance(userId, balance) {
        const userObjectId = await this.getUserObjectId(userId);
        if (!userObjectId)
            return;
        await database_1.MasterWallet.updateOne({ userId: userObjectId }, { balance, updatedAt: new Date() }).exec();
    }
    /**
     * Eliminar master wallet
     */
    async deleteMasterWallet(userId) {
        const userObjectId = await this.getUserObjectId(userId);
        if (!userObjectId)
            return false;
        const result = await database_1.MasterWallet.deleteOne({ userId: userObjectId }).exec();
        return result.deletedCount > 0;
    }
    /**
     * Obtener resumen de wallets de usuario
     */
    async getWalletSummary(userId) {
        const wallets = await this.getUserWallets(userId);
        const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
        return {
            totalWallets: wallets.length,
            totalBalance,
            wallets
        };
    }
}
exports.WalletService = WalletService;
exports.walletService = new WalletService();
//# sourceMappingURL=wallet-service.js.map