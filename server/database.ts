// MongoDB Database Connection and Models
import mongoose from 'mongoose';
import { log } from './logger';

// Support both MONGODB_URI and MONGO_URL (Railway uses different names)
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/pnl-onl';

// Connect to MongoDB
export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
    });
    log.info('✅ Connected to MongoDB');
    
    // Create indexes after connection
    await createIndexes();
  } catch (error) {
    log.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

// Create optimized indexes
async function createIndexes(): Promise<void> {
  try {
    // User indexes
    await User.collection.createIndex({ username: 1 }, { unique: true });
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ 'stats.totalProfit': -1 });
    
    // Wallet indexes
    await Wallet.collection.createIndex({ userId: 1, index: 1 }, { unique: true });
    await Wallet.collection.createIndex({ publicKey: 1 });
    
    // Master Wallet indexes
    await MasterWallet.collection.createIndex({ userId: 1 }, { unique: true });
    
    // Position indexes
    await Position.collection.createIndex({ userId: 1, tokenMint: 1 });
    await Position.collection.createIndex({ userId: 1, status: 1 });
    await Position.collection.createIndex({ createdAt: -1 });
    
    // Trade indexes
    await Trade.collection.createIndex({ userId: 1, timestamp: -1 });
    await Trade.collection.createIndex({ tokenMint: 1, timestamp: -1 });
    await Trade.collection.createIndex({ signature: 1 }, { unique: true });
    
    // Stop Loss indexes
    await StopLossOrder.collection.createIndex({ userId: 1, status: 1 });
    await StopLossOrder.collection.createIndex({ tokenMint: 1, status: 1 });
    
    // Price Alert indexes
    await PriceAlert.collection.createIndex({ userId: 1, enabled: 1 });
    await PriceAlert.collection.createIndex({ tokenMint: 1 });
    
    // Token Index indexes
    await TokenIndex.collection.createIndex({ mint: 1 }, { unique: true });
    await TokenIndex.collection.createIndex({ createdAt: -1 });
    await TokenIndex.collection.createIndex({ marketCap: -1 });
    await TokenIndex.collection.createIndex({ 'priceChange24h': -1 });
    await TokenIndex.collection.createIndex({ isNew: 1, createdAt: -1 });
    await TokenIndex.collection.createIndex({ isGraduating: 1 });
    await TokenIndex.collection.createIndex({ isTrending: 1 });
    
    // Copy Trade indexes (if models exist)
    try {
      const { CopyTrade, WalletStats } = require('./copy-trading');
      await CopyTrade.collection.createIndex({ userId: 1, timestamp: -1 });
      await CopyTrade.collection.createIndex({ followedWalletId: 1 });
      await WalletStats.collection.createIndex({ walletAddress: 1, date: -1 });
    } catch (error) {
      // Models may not be available, skip
    }
    
    // Audit Log indexes
    await AuditLog.collection.createIndex({ userId: 1, timestamp: -1 });
    await AuditLog.collection.createIndex({ action: 1, timestamp: -1 });
    
    log.info('✅ Database indexes created');
  } catch (error) {
    log.error('⚠️ Error creating indexes:', error);
    // Don't throw - indexes are optional
  }
}

// Disconnect from MongoDB
export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    log.info('✅ Disconnected from MongoDB');
  } catch (error) {
    log.error('❌ MongoDB disconnection error:', error);
  }
}

// User Schema
const UserSchema = new mongoose.Schema({
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
const SessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token: { type: String, required: true, unique: true, index: true },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  ipAddress: String,
  userAgent: String
});

// Wallet Schema (Aislado por usuario)
const WalletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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
const MasterWalletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  publicKey: { type: String, required: true },
  encryptedPrivateKey: { type: String, required: true },
  balance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Position Schema (Portfolio)
const PositionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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
const TradeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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
const StopLossOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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
const PriceAlertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenMint: { type: String, required: true },
  type: { type: String, enum: ['price', 'volume', 'market-cap'], required: true },
  condition: { type: String, enum: ['above', 'below'], required: true },
  value: { type: Number, required: true },
  active: { type: Boolean, default: true },
  triggeredAt: Date,
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Activity Log Schema
const ActivityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true },
  details: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
  ipAddress: String,
  userAgent: String
}, { timestamps: true });

// Audit Log Schema - Security and compliance logging
const AuditLogSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  action: { type: String, required: true, index: true },
  resource: { type: String, required: true },
  details: mongoose.Schema.Types.Mixed,
  ip: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now, index: true },
  success: { type: Boolean, default: true },
  error: String
}, { timestamps: true });

// Create indexes for AuditLog
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1 });

// Trading Fee Schema - Track all fees collected
const TradingFeeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tradeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trade' },
  tokenMint: { type: String, required: true },
  tradeType: { type: String, enum: ['buy', 'sell'], required: true },
  tradeAmount: { type: Number, required: true }, // SOL amount of trade
  feePercent: { type: Number, required: true },
  feeAmount: { type: Number, required: true }, // Fee in SOL
  feeCollected: { type: Boolean, default: false },
  signature: String,
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Subscription Schema - Premium plans
const SubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  plan: { type: String, enum: ['free', 'basic', 'premium', 'whale'], default: 'free' },
  feeDiscount: { type: Number, default: 0 }, // % discount on trading fees
  maxWallets: { type: Number, default: 5 },
  features: {
    copyTrading: { type: Boolean, default: false },
    sniperBot: { type: Boolean, default: false },
    dcaBot: { type: Boolean, default: false },
    advancedAnalytics: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false }
  },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  autoRenew: { type: Boolean, default: false },
  paymentMethod: String
}, { timestamps: true });

// Referral Schema
const ReferralSchema = new mongoose.Schema({
  referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  referredId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, required: true },
  status: { type: String, enum: ['pending', 'active', 'paid'], default: 'pending' },
  commissionPercent: { type: Number, default: 10 }, // % of referred user's fees
  totalEarned: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Token Index Schema - Persist tokens discovered on-chain
const TokenIndexSchema = new mongoose.Schema({
  mint: { type: String, required: true, unique: true, index: true },
  name: String,
  symbol: String,
  imageUrl: String,
  // Datos on-chain (siempre disponibles)
  createdAt: { type: Date, required: true, index: true },
  creator: String,
  bondingCurve: String,
  source: { type: String, enum: ['pumpfun', 'raydium', 'unknown'], default: 'unknown' },
  // Datos de APIs (pueden estar desactualizados)
  price: Number,
  marketCap: Number,
  liquidity: Number,
  volume24h: Number,
  volume1h: Number,
  volume5m: Number,
  holders: Number,
  supply: Number,
  // Price changes
  priceChange5m: Number,
  priceChange1h: Number,
  priceChange24h: Number,
  // Transaction counts
  txns5m: { buys: Number, sells: Number },
  txns1h: { buys: Number, sells: Number },
  txns24h: { buys: Number, sells: Number },
  // Metadata de enriquecimiento
  lastEnrichedAt: Date,
  enrichmentSource: String, // 'dexscreener', 'onchain', 'pumpfun'
  // Flags calculados
  isNew: { type: Boolean, index: true, default: false },
  isGraduating: { type: Boolean, index: true, default: false },
  isTrending: { type: Boolean, index: true, default: false },
  riskScore: Number,
  // Pair info
  pairAddress: String,
  dexId: String,
  // Calculated age in minutes
  age: Number,
}, { timestamps: true });

// Compound indexes for performance
TokenIndexSchema.index({ createdAt: -1, isNew: 1 }); // For new tokens query
TokenIndexSchema.index({ isTrending: 1, createdAt: -1 }); // For trending query
TokenIndexSchema.index({ isGraduating: 1, createdAt: -1 }); // For graduating query
TokenIndexSchema.index({ liquidity: -1 }); // For liquidity sorting
TokenIndexSchema.index({ lastEnrichedAt: 1 }); // For enrichment priority

// Create compound indexes for performance (simple indexes already defined in schema)
WalletSchema.index({ userId: 1, index: 1 });
TradingFeeSchema.index({ userId: 1, timestamp: -1 });
TradingFeeSchema.index({ feeCollected: 1 });
PositionSchema.index({ userId: 1, tokenMint: 1 });
TradeSchema.index({ userId: 1, timestamp: -1 });
StopLossOrderSchema.index({ userId: 1, status: 1 });
PriceAlertSchema.index({ userId: 1, active: 1 });

// Export Models
export const User = mongoose.model('User', UserSchema);
export const Session = mongoose.model('Session', SessionSchema);
export const Wallet = mongoose.model('Wallet', WalletSchema);
export const MasterWallet = mongoose.model('MasterWallet', MasterWalletSchema);
export const Position = mongoose.model('Position', PositionSchema);
export const Trade = mongoose.model('Trade', TradeSchema);
export const StopLossOrder = mongoose.model('StopLossOrder', StopLossOrderSchema);
export const PriceAlert = mongoose.model('PriceAlert', PriceAlertSchema);
export const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);
export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
export const TradingFee = mongoose.model('TradingFee', TradingFeeSchema);
export const Subscription = mongoose.model('Subscription', SubscriptionSchema);
export const Referral = mongoose.model('Referral', ReferralSchema);
export const TokenIndex = mongoose.model('TokenIndex', TokenIndexSchema);

// Export connection status helper
export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

