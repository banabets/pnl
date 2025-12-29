"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLog = exports.PriceAlert = exports.StopLossOrder = exports.Trade = exports.Position = exports.MasterWallet = exports.Wallet = exports.Session = exports.User = void 0;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
exports.isConnected = isConnected;
// MongoDB Database Connection and Models
const mongoose_1 = __importDefault(require("mongoose"));
// Support both MONGODB_URI and MONGO_URL (Railway uses different names)
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/pnl-onl';
// Connect to MongoDB
async function connectDatabase() {
    try {
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
    }
    catch (error) {
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }
}
// Disconnect from MongoDB
async function disconnectDatabase() {
    try {
        await mongoose_1.default.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
    catch (error) {
        console.error('❌ MongoDB disconnection error:', error);
    }
}
// User Schema
const UserSchema = new mongoose_1.default.Schema({
    id: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastLogin: { type: Date },
    emailVerified: { type: Boolean, default: false },
    role: { type: String, enum: ['user', 'admin', 'premium'], default: 'user' },
    status: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
    profile: {
        displayName: String,
        bio: String,
        avatar: String,
        timezone: String,
        language: String
    },
    settings: {
        theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'dark' },
        notifications: {
            email: { type: Boolean, default: true },
            priceAlerts: { type: Boolean, default: true },
            tradeAlerts: { type: Boolean, default: true }
        },
        trading: {
            defaultSlippage: { type: Number, default: 1 },
            defaultWalletIndex: { type: Number, default: 0 }
        }
    },
    stats: {
        totalTrades: { type: Number, default: 0 },
        totalVolume: { type: Number, default: 0 },
        totalProfit: { type: Number, default: 0 },
        winRate: { type: Number, default: 0 }
    }
}, { timestamps: true });
// Session Schema
const SessionSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    createdAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    ipAddress: String,
    userAgent: String
});
// Wallet Schema (Aislado por usuario)
const WalletSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    index: { type: Number, required: true },
    publicKey: { type: String, required: true },
    encryptedPrivateKey: { type: String, required: true },
    balance: { type: Number, default: 0 },
    label: String,
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });
// Master Wallet Schema (Aislado por usuario)
const MasterWalletSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    publicKey: { type: String, required: true },
    encryptedPrivateKey: { type: String, required: true },
    balance: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });
// Position Schema (Portfolio)
const PositionSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenMint: { type: String, required: true },
    walletIndex: { type: Number, required: true },
    entryPrice: { type: Number, required: true },
    entryAmount: { type: Number, required: true },
    currentPrice: { type: Number, required: true },
    pnl: { type: Number, default: 0 },
    pnlPercent: { type: Number, default: 0 },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });
// Trade Schema (Historial)
const TradeSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenMint: { type: String, required: true },
    tokenName: String,
    walletIndex: { type: Number, required: true },
    tradeType: { type: String, enum: ['buy', 'sell'], required: true },
    solAmount: { type: Number, required: true },
    tokenAmount: { type: Number, required: true },
    price: { type: Number, required: true },
    signature: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending' }
}, { timestamps: true });
// Stop Loss Order Schema
const StopLossOrderSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenMint: { type: String, required: true },
    walletIndex: { type: Number, required: true },
    type: { type: String, enum: ['stop-loss', 'take-profit', 'trailing-stop'], required: true },
    triggerPrice: { type: Number, required: true },
    amount: Number,
    status: { type: String, enum: ['active', 'executed', 'cancelled'], default: 'active' },
    createdAt: { type: Date, default: Date.now },
    executedAt: Date
}, { timestamps: true });
// Price Alert Schema
const PriceAlertSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenMint: { type: String, required: true },
    type: { type: String, enum: ['price', 'volume', 'market-cap'], required: true },
    condition: { type: String, enum: ['above', 'below'], required: true },
    value: { type: Number, required: true },
    active: { type: Boolean, default: true },
    triggeredAt: Date,
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });
// Activity Log Schema
const ActivityLogSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true },
    details: mongoose_1.default.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String
}, { timestamps: true });
// Create indexes for performance
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
SessionSchema.index({ userId: 1 });
SessionSchema.index({ token: 1 });
WalletSchema.index({ userId: 1, index: 1 });
PositionSchema.index({ userId: 1, tokenMint: 1 });
TradeSchema.index({ userId: 1, timestamp: -1 });
StopLossOrderSchema.index({ userId: 1, status: 1 });
PriceAlertSchema.index({ userId: 1, active: 1 });
// Export Models
exports.User = mongoose_1.default.model('User', UserSchema);
exports.Session = mongoose_1.default.model('Session', SessionSchema);
exports.Wallet = mongoose_1.default.model('Wallet', WalletSchema);
exports.MasterWallet = mongoose_1.default.model('MasterWallet', MasterWalletSchema);
exports.Position = mongoose_1.default.model('Position', PositionSchema);
exports.Trade = mongoose_1.default.model('Trade', TradeSchema);
exports.StopLossOrder = mongoose_1.default.model('StopLossOrder', StopLossOrderSchema);
exports.PriceAlert = mongoose_1.default.model('PriceAlert', PriceAlertSchema);
exports.ActivityLog = mongoose_1.default.model('ActivityLog', ActivityLogSchema);
// Export connection status helper
function isConnected() {
    return mongoose_1.default.connection.readyState === 1;
}
//# sourceMappingURL=database.js.map