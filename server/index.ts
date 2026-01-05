import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import path from 'path';

// Resolve paths - detect if running from dist/ or source
const isRunningFromDist = __dirname.includes('dist');
const projectRoot = isRunningFromDist
  ? path.resolve(__dirname, '../..') // dist/server -> project root
  : path.resolve(__dirname, '..');    // server -> project root
const distPath = path.join(projectRoot, 'dist');

// Import from compiled dist/ (source files were removed)
// Note: Some modules may not exist - we'll handle gracefully
let WalletManager: any;
let FundManager: any;
let VolumeBot: any;
let MasterWalletManager: any;
// PumpFunBot and PumpFunOnChainSearch modules don't exist - removed
let configManager: any;

try {
  WalletManager = require(path.join(distPath, 'wallet')).WalletManager;
} catch (e) {
  console.warn('WalletManager not found');
}

try {
  FundManager = require(path.join(distPath, 'funds')).FundManager;
} catch (e) {
  console.warn('FundManager not found');
}

try {
  VolumeBot = require(path.join(distPath, 'bot')).VolumeBot;
} catch (e) {
  console.warn('VolumeBot not found');
}

try {
  MasterWalletManager = require(path.join(distPath, 'master-wallet')).MasterWalletManager;
} catch (e) {
  console.warn('MasterWalletManager not found');
}

// Load PumpFunBot and PumpFunOnChainSearch from source
let PumpFunBot: any;
let PumpFunOnChainSearch: any;

try {
  PumpFunBot = require(path.join(projectRoot, 'src/pumpfun/pumpfun-bot')).PumpFunBot;
} catch (e) {
  console.warn('PumpFunBot not found');
}

try {
  PumpFunOnChainSearch = require(path.join(projectRoot, 'src/pumpfun/onchain-search')).PumpFunOnChainSearch;
} catch (e) {
  console.warn('PumpFunOnChainSearch not found');
}

// Config Persistence (must be imported before use)
import { ConfigPersistence } from './config-persistence';
const configPersistence = new ConfigPersistence();

try {
  configManager = require(path.join(distPath, 'config')).configManager;
} catch (e) {
  console.warn('configManager not found, using in-memory config with persistence');
  
  // Load config from disk (persistent)
  const persistentConfig = configPersistence.loadConfig();
  
  let rpcUrl = persistentConfig.rpcUrl || 'https://mainnet.helius-rpc.com/?api-key=7b05747c-b100-4159-ba5f-c85e8c8d3997';
  let maxSolPerSwap = persistentConfig.maxSolPerSwap;
  let slippageBps = persistentConfig.slippageBps;
  
  console.log(`🔧 Initializing config manager. All operations are REAL (simulation mode removed)`);
  console.log(`🔗 Using RPC: ${rpcUrl.substring(0, 50)}...`);
  
  configManager = {
    getConfig: () => {
      const config = {
        simulationMode: false, // Always false - simulation removed
        rpcUrl,
        maxSolPerSwap,
        slippageBps,
        connection: null, // Will be created when needed
      };
      return config;
    },
    updateSimulationMode: (enabled: boolean) => {
      // Simulation mode removed - this function does nothing
      console.log(`⚠️ Simulation mode toggle ignored - all operations are always REAL`);
    },
  };
}

// WebSocket listener (should exist)
import { PumpFunWebSocketListener } from '../src/pumpfun/websocket-listener';
import { TradesListener } from '../src/pumpfun/trades-listener';
// PumpFunTransactionParser will be loaded dynamically from dist/ if available

// User Session Manager
import { UserSessionManager } from './user-session';
const userSessionManager = new UserSessionManager();

// User Auth Manager
import { UserAuthManager } from './user-auth';
const userAuthManager = new UserAuthManager();

// Auth Middleware
import { authenticateToken, optionalAuth, requireRole, AuthenticatedRequest } from './auth-middleware';
import { walletService } from './wallet-service';
import { isConnected as isMongoConnected } from './database';

// Rate limiting for auth endpoints
// Use dynamic require for Railway compatibility
const rateLimitModule = require('express-rate-limit');
const rateLimit = rateLimitModule.default || rateLimitModule;

// Rate limiter for login/register (more restrictive)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window (increased from 5)
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for auth verification endpoints (more permissive - for checking auth status)
const authVerifyRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute (for checking auth status)
  message: 'Too many requests, please wait a moment',
  standardHeaders: true,
  legacyHeaders: false,
});

// WebSocket API Comparison (optional - only if dependencies available)
let compareWebSocketAPIs: any = null;
try {
  const wsComparison = require('./websocket-comparison');
  compareWebSocketAPIs = wsComparison.compareWebSocketAPIs;
} catch (e) {
  console.warn('WebSocket comparison module not available (install ws and socket.io-client)');
}


// Portfolio Tracker, Stop Loss, and Price Alerts
import { portfolioTracker } from './portfolio-tracker';
import { stopLossManager } from './stop-loss-manager';
import { priceAlertManager } from './price-alerts';

// Jupiter Aggregator & Token Audit
import { JupiterService, initJupiterService, getJupiterService } from './jupiter-service';
import { TokenAuditService, initTokenAuditService, getTokenAuditService } from './token-audit';
import { TradingFee, Subscription, Referral } from './database';

// Trading Bots
import { SniperBot, initSniperBot, getSniperBot, SnipeHistory } from './sniper-bot';
import { DCABot, initDCABot, getDCABot, DCAOrder, DCAExecution } from './dca-bot';
import { CopyTradingService, initCopyTrading, getCopyTrading, FollowedWallet, CopyTrade, WalletStats } from './copy-trading';

// Token Feed Service
import { tokenFeed } from './token-feed';
import { tokenEnricherWorker } from './token-enricher-worker';
import { tokenIndexer } from './token-indexer';

// Discord Interactions
import { handleDiscordInteraction } from './discord-interactions';

// MongoDB Connection
import { connectDatabase, isConnected } from './database';

// Connect to MongoDB
connectDatabase().then(() => {
  // Initialize token feed after MongoDB connection
  tokenFeed.start().then(() => {
    // Start enricher worker after token feed is ready
    tokenEnricherWorker.start().catch((error) => {
      console.error('❌ Failed to start token enricher worker:', error);
    });
  }).catch((error) => {
    console.error('❌ Failed to start token feed:', error);
  });
}).catch((error) => {
  console.error('❌ Failed to connect to MongoDB:', error);
  console.warn('⚠️ Continuing without MongoDB - some features may not work');
  // Still try to start token feed even without MongoDB
  tokenFeed.start().then(() => {
    // Start enricher worker even without MongoDB
    tokenEnricherWorker.start().catch((error) => {
      console.error('❌ Failed to start token enricher worker:', error);
    });
  }).catch((error) => {
    console.error('❌ Failed to start token feed:', error);
  });
});

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Railway, Heroku, etc.)
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());

// Discord Interactions endpoint - MUST be BEFORE express.json() to get raw body
// This endpoint needs the raw body for signature verification
app.post('/api/discord/interactions', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Get raw body string BEFORE parsing
    const rawBody = req.body.toString();
    
    // Get signature headers
    const signature = req.headers['x-signature-ed25519'] as string;
    const timestamp = req.headers['x-signature-timestamp'] as string;

    // Parse JSON for processing
    const body = JSON.parse(rawBody);
    
    // Handle PING immediately (Discord verification) - respond before signature check in dev
    if (body.type === 1) {
      // For PING, we can respond immediately if signature verification is optional in dev
      // But we should still verify if public key is set
      if (process.env.DISCORD_PUBLIC_KEY) {
        const { verifyDiscordSignature } = await import('./discord-interactions');
        if (!verifyDiscordSignature(rawBody, signature || '', timestamp || '')) {
          return res.status(401).json({ error: 'Invalid signature' });
        }
      }
      return res.json({ type: 1 }); // PONG
    }

    // For other interactions, verify signature and handle
    req.body = body;
    const { handleDiscordInteraction } = await import('./discord-interactions');
    await handleDiscordInteraction(req, res, tokenFeed, rawBody);
  } catch (error: any) {
    console.error('Error handling Discord interaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Now apply express.json() for all other routes
app.use(express.json());

// Serve static files from React app
const buildPath = path.join(__dirname, '../web/build');
app.use(express.static(buildPath));

// Initialize bot managers (only if they exist)
const walletManager = WalletManager ? new WalletManager() : null;
const fundManager = FundManager ? new FundManager() : null;
const volumeBot = VolumeBot ? new VolumeBot() : null;
const masterWalletManager = MasterWalletManager ? new MasterWalletManager() : null;
// Initialize PumpFunBot and PumpFunOnChainSearch if available
const pumpFunBot = PumpFunBot ? new PumpFunBot() : null;
const onChainSearch = PumpFunOnChainSearch ? new PumpFunOnChainSearch() : null;
const wsListener = new PumpFunWebSocketListener();
const tradesListener = new TradesListener();

// Initialize Jupiter & Token Audit services
const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=7b05747c-b100-4159-ba5f-c85e8c8d3997';
const TRADING_FEE_PERCENT = 0.5; // 0.5% trading fee
const jupiterService = initJupiterService(HELIUS_RPC, TRADING_FEE_PERCENT);
const tokenAuditService = initTokenAuditService(HELIUS_RPC);
console.log('✅ Jupiter Aggregator initialized (0.5% trading fee)');

// Initialize Trading Bots
const sniperBot = initSniperBot(HELIUS_RPC);
const dcaBot = initDCABot();
const copyTradingService = initCopyTrading(HELIUS_RPC);

// Set DCA keypair getter (uses wallet service)
dcaBot.setKeypairGetter(async (userId: string, walletIndex?: number) => {
  if (!isMongoConnected()) return null;
  const wallet = walletIndex
    ? await walletService.getWalletWithKey(userId, walletIndex)
    : await walletService.getMasterWalletWithKey(userId);
  return wallet?.keypair || null;
});

// Start DCA scheduler
dcaBot.start(60000); // Check every minute
console.log('✅ Trading Bots initialized (Sniper, DCA, Copy Trading)');

// Store active trades listeners by token mint
const activeTradesListeners = new Map<string, TradesListener>();

// Start WebSocket listener for real-time token discovery
wsListener.startListening().catch((err) => {
  console.error('Failed to start WebSocket listener:', err);
});

// Broadcast token updates to connected clients
wsListener.onTokenUpdate((token) => {
  broadcast('token:new', token);
});

// Broadcast helper
const broadcast = (event: string, data: any) => {
  io.emit(event, data);
};

// ==================== API ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// User Sessions
app.get('/api/sessions', (req, res) => {
  try {
    const sessions = userSessionManager.getAllSessions();
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/api/sessions/create', (req, res) => {
  try {
    const { sessionName } = req.body;
    const session = userSessionManager.createSession(sessionName || `Session ${new Date().toLocaleString()}`);
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.delete('/api/sessions/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const deleted = userSessionManager.deleteSession(userId);
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get('/api/sessions/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const session = userSessionManager.getSession(userId);
    if (session) {
      res.json({ session });
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Config
app.get('/api/config', (req, res) => {
  const config = configManager.getConfig();
  res.json({
      simulationMode: false, // Always false - simulation removed
    rpcUrl: config.rpcUrl,
    maxSolPerSwap: config.maxSolPerSwap,
    slippageBps: config.slippageBps,
  });
});

// Simulation mode endpoint removed - all operations are always REAL

// Transaction History
app.get('/api/transactions', async (req, res) => {
  try {
    const transactionHistory = (global as any).transactionHistory || [];
    res.json({ transactions: transactionHistory });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ============================================
// USER AUTHENTICATION & MANAGEMENT ENDPOINTS
// ============================================

// Register (with rate limiting)
app.post('/api/auth/register', authRateLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    const result = await userAuthManager.register(username, email, password, ipAddress as string);
    
    if (result.success) {
      res.json({ success: true, user: result.user, token: result.token });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Login (with rate limiting)
app.post('/api/auth/login', authRateLimiter, async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    const result = await userAuthManager.login(usernameOrEmail, password, ipAddress as string, userAgent);
    
    if (result.success) {
      res.json({ success: true, user: result.user, token: result.token });
    } else {
      res.status(401).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Logout
app.post('/api/auth/logout', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      userAuthManager.logout(token);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Verify token / Get current user (with more permissive rate limiting)
app.get('/api/auth/me', authVerifyRateLimiter, authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    res.json({ success: true, user: req.user });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get user by ID (public info only)
app.get('/api/auth/user/:userId', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    const user = await userAuthManager.getUserById(userId);
    
    if (user) {
      // If requesting own profile or authenticated, return full info
      if (req.userId === userId || req.user) {
        res.json({ success: true, user });
      } else {
        // Return public info only
        const publicUser = {
          id: user.id,
          username: user.username,
          profile: user.profile,
          stats: user.stats,
          createdAt: user.createdAt
        };
        res.json({ success: true, user: publicUser });
      }
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Update profile (authenticated)
app.put('/api/auth/user/:userId/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    
    // Users can only update their own profile (unless admin)
    if (req.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }
    
    const { username, displayName, bio, avatar, timezone, language } = req.body;
    
    const result = userAuthManager.updateProfile(userId, {
      username,
      displayName,
      bio,
      avatar,
      timezone,
      language
    });
    
    if (result.success) {
      res.json({ success: true, user: result.user });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Update settings (authenticated)
app.put('/api/auth/user/:userId/settings', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    
    if (req.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'You can only update your own settings' });
    }
    
    const result = userAuthManager.updateSettings(userId, req.body);
    
    if (result.success) {
      res.json({ success: true, user: result.user });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Change password (authenticated)
app.post('/api/auth/user/:userId/change-password', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'You can only change your own password' });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    const result = userAuthManager.changePassword(userId, currentPassword, newPassword);
    
    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Request password reset
app.post('/api/auth/forgot-password', authRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const result = userAuthManager.requestPasswordReset(email);
    
    // Always return success for security (don't reveal if email exists)
    res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get user sessions (authenticated)
app.get('/api/auth/user/:userId/sessions', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    
    if (req.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'You can only view your own sessions' });
    }
    
    const sessions = userAuthManager.getUserSessions(userId);
    res.json({ success: true, sessions });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get activity logs (authenticated)
app.get('/api/auth/user/:userId/activity', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    
    if (req.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'You can only view your own activity' });
    }
    
    const logs = userAuthManager.getActivityLogs(userId, limit);
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get user stats (authenticated)
app.get('/api/auth/user/:userId/stats', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    const user = await userAuthManager.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (req.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'You can only view your own stats' });
    }
    
    res.json({ success: true, stats: user.stats || {} });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Emergency recovery endpoint - recover from wallets with private keys
app.post('/api/funds/emergency-recover', async (req, res) => {
  try {
    const { walletAddresses, privateKeys } = req.body;
    
    if (!walletAddresses || !Array.isArray(walletAddresses) || walletAddresses.length === 0) {
      return res.status(400).json({ error: 'walletAddresses array is required' });
    }
    
    if (!privateKeys || !Array.isArray(privateKeys) || privateKeys.length === 0) {
      return res.status(400).json({ error: 'privateKeys array is required (base64 encoded)' });
    }
    
    if (walletAddresses.length !== privateKeys.length) {
      return res.status(400).json({ error: 'Number of wallet addresses must match number of private keys' });
    }
    
    if (!masterWalletManager || !masterWalletManager.masterWalletExists()) {
      return res.status(400).json({ error: 'Master wallet not found' });
    }
    
    const config = configManager.getConfig();
    if (!config.connection) {
      const { Connection } = require('@solana/web3.js');
      const rpcUrl = config.rpcUrl || 'https://mainnet.helius-rpc.com/?api-key=7b05747c-b100-4159-ba5f-c85e8c8d3997';
      config.connection = new Connection(rpcUrl, 'confirmed');
    }
    
    const masterWallet = masterWalletManager.loadMasterWallet();
    const masterPublicKey = masterWallet.publicKey;
    
    const { Keypair, SystemProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL, Transaction } = require('@solana/web3.js');
    
    const results: any[] = [];
    let totalRecovered = 0;
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < walletAddresses.length; i++) {
      try {
        const walletAddress = walletAddresses[i];
        const privateKeyBase64 = privateKeys[i];
        
        // Decode private key from base64
        const privateKeyBytes = Buffer.from(privateKeyBase64, 'base64');
        const keypair = Keypair.fromSecretKey(privateKeyBytes);
        
        // Verify public key matches
        if (keypair.publicKey.toBase58() !== walletAddress) {
          throw new Error(`Private key does not match wallet address`);
        }
        
        // Get balance
        const balance = await config.connection.getBalance(keypair.publicKey);
        const balanceInSol = balance / LAMPORTS_PER_SOL;
        
        if (balanceInSol <= 0.000005) {
          results.push({
            walletAddress,
            amount: 0,
            success: false,
            error: 'Insufficient balance'
          });
          failCount++;
          continue;
        }
        
        // Leave small amount for fees
        const amountToRecover = balanceInSol - 0.000005;
        const lamportsToRecover = Math.floor(amountToRecover * LAMPORTS_PER_SOL);
        
        if (lamportsToRecover <= 0) {
          results.push({
            walletAddress,
            amount: 0,
            success: false,
            error: 'Insufficient balance after fees'
          });
          failCount++;
          continue;
        }
        
        // Create transaction
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: masterPublicKey,
            lamports: lamportsToRecover
          })
        );
        
        console.log(`💸 Emergency recovery: ${amountToRecover.toFixed(4)} SOL from ${walletAddress.substring(0, 8)}...`);
        const signature = await sendAndConfirmTransaction(
          config.connection,
          transaction,
          [keypair],
          { commitment: 'confirmed' }
        );
        
        console.log(`✅ Emergency recovery successful: ${signature}`);
        totalRecovered += amountToRecover;
        successCount++;
        
        results.push({
          walletAddress,
          amount: amountToRecover,
          signature,
          success: true
        });
        
      } catch (error: any) {
        console.error(`❌ Emergency recovery failed for ${walletAddresses[i]}:`, error.message);
        results.push({
          walletAddress: walletAddresses[i],
          amount: 0,
          success: false,
          error: error.message
        });
        failCount++;
      }
    }
    
    res.json({
      success: successCount > 0,
      totalRecovered,
      successCount,
      failCount,
      results
    });
    
  } catch (error: any) {
    res.status(500).json({ error: error.message || String(error) });
  }
});

// Master Wallet - Per-user isolated wallets
app.get('/api/master-wallet', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;

    // If MongoDB is connected, use per-user wallet service
    if (isMongoConnected() && userId) {
      const walletInfo = await walletService.getMasterWalletInfo(userId);

      if (!walletInfo.exists) {
        return res.json({ exists: false, balance: 0 });
      }

      // Get REAL balance from blockchain
      let realBalance = walletInfo.balance || 0;
      try {
        const { Connection, PublicKey } = require('@solana/web3.js');
        const config = configManager.getConfig();
        const rpcUrl = config.rpcUrl || 'https://mainnet.helius-rpc.com/?api-key=7b05747c-b100-4159-ba5f-c85e8c8d3997';
        const connection = new Connection(rpcUrl, 'confirmed');
        const publicKey = new PublicKey(walletInfo.publicKey);
        const balanceLamports = await connection.getBalance(publicKey);
        realBalance = balanceLamports / 1e9;

        // Update stored balance
        await walletService.updateMasterWalletBalance(userId, realBalance);
        console.log(`📊 User ${userId} master wallet balance: ${realBalance.toFixed(4)} SOL`);
      } catch (balanceError) {
        console.error('Error fetching real balance:', balanceError);
      }

      return res.json({
        exists: true,
        publicKey: walletInfo.publicKey,
        balance: realBalance
      });
    }

    // Fallback to legacy global wallet if MongoDB not connected
    if (!masterWalletManager || !masterWalletManager.masterWalletExists()) {
      return res.json({ exists: false, balance: 0 });
    }

    const config = configManager.getConfig();
    const info = await masterWalletManager.getMasterWalletInfo(config.connection);

    // Get REAL balance from blockchain (not simulated)
    let realBalance = 0;
    try {
      const { Connection, PublicKey } = require('@solana/web3.js');
      const rpcUrl = config.rpcUrl || 'https://mainnet.helius-rpc.com/?api-key=7b05747c-b100-4159-ba5f-c85e8c8d3997';
      const connection = new Connection(rpcUrl, 'confirmed');
      const publicKey = new PublicKey(info.publicKey);
      const balanceLamports = await connection.getBalance(publicKey);
      realBalance = balanceLamports / 1e9; // Convert lamports to SOL

      console.log(`📊 Master wallet REAL balance from blockchain: ${realBalance.toFixed(4)} SOL`);
    } catch (balanceError) {
      console.error('Error fetching real balance:', balanceError);
      // Fallback to info.balance if real fetch fails
      realBalance = info.balance !== undefined && info.balance !== null
        ? parseFloat(info.balance.toString())
        : 0;
    }

    return res.json({
      ...info,
      exists: true,
      balance: realBalance, // Always use real balance from blockchain
      publicKey: info.publicKey
    });
  } catch (error) {
    console.error('Error getting master wallet info:', error);
    return res.status(500).json({ error: String(error) });
  }
});

app.post('/api/master-wallet/create', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;

    // If MongoDB is connected, use per-user wallet service
    if (isMongoConnected() && userId) {
      const result = await walletService.createMasterWallet(userId);
      broadcast('master-wallet:created', {
        publicKey: result.publicKey,
        userId
      });
      res.json({ success: true, publicKey: result.publicKey, alreadyExisted: result.exists });
      return;
    }

    // Fallback to legacy global wallet if MongoDB not connected
    if (!masterWalletManager) {
      return res.status(503).json({ error: 'MasterWalletManager not available. Please rebuild the project.' });
    }
    const keypair = masterWalletManager.createMasterWallet();
    broadcast('master-wallet:created', {
      publicKey: keypair.publicKey.toBase58(),
    });
    res.json({ success: true, publicKey: keypair.publicKey.toBase58() });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get('/api/master-wallet/export-key', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;

    // If MongoDB is connected, use per-user wallet service
    if (isMongoConnected() && userId) {
      const walletWithKey = await walletService.getMasterWalletWithKey(userId);
      if (!walletWithKey) {
        return res.status(400).json({ error: 'Master wallet not found' });
      }

      const secretKey = walletWithKey.keypair.secretKey;
      const secretKeyBase64 = Buffer.from(secretKey).toString('base64');

      res.json({
        success: true,
        publicKey: walletWithKey.keypair.publicKey.toBase58(),
        secretKey: Array.from(secretKey),
        secretKeyBase64: secretKeyBase64,
        exportDate: new Date().toISOString(),
        warning: '⚠️ CRITICAL: Keep this private key secure. Anyone with access to it can control your master wallet and all funds.'
      });
      return;
    }

    // Fallback to legacy global wallet if MongoDB not connected
    if (!masterWalletManager || !masterWalletManager.masterWalletExists()) {
      return res.status(400).json({ error: 'Master wallet not found' });
    }

    const masterWallet = masterWalletManager.loadMasterWallet();
    const secretKey = masterWallet.secretKey;
    const secretKeyBase64 = Buffer.from(secretKey).toString('base64');

    res.json({
      success: true,
      publicKey: masterWallet.publicKey.toBase58(),
      secretKey: Array.from(secretKey),
      secretKeyBase64: secretKeyBase64,
      exportDate: new Date().toISOString(),
      warning: '⚠️ CRITICAL: Keep this private key secure. Anyone with access to it can control your master wallet and all funds.'
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/api/master-wallet/withdraw', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;
    const { destination, amount } = req.body;

    if (!destination) {
      return res.status(400).json({ error: 'Destination address is required' });
    }

    // Validate Solana address format
    const { PublicKey, Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } = require('@solana/web3.js');
    try {
      new PublicKey(destination);
    } catch (addressError) {
      return res.status(400).json({ error: 'Invalid Solana address format' });
    }

    const config = configManager.getConfig();
    const rpcUrl = config.rpcUrl || 'https://mainnet.helius-rpc.com/?api-key=7b05747c-b100-4159-ba5f-c85e8c8d3997';

    console.log(`💸 Withdraw request: ${amount || 'ALL'} SOL to ${destination.substring(0, 8)}...`);

    // If MongoDB is connected, use per-user wallet service
    if (isMongoConnected() && userId) {
      const walletWithKey = await walletService.getMasterWalletWithKey(userId);
      if (!walletWithKey) {
        return res.status(400).json({ error: 'Master wallet not found. Please create a master wallet first.' });
      }

      try {
        const connection = new Connection(rpcUrl, 'confirmed');
        const fromKeypair = walletWithKey.keypair;
        const toPublicKey = new PublicKey(destination);

        // Get current balance
        const balanceLamports = await connection.getBalance(fromKeypair.publicKey);
        const balance = balanceLamports / LAMPORTS_PER_SOL;

        // Calculate amount to send
        let lamportsToSend: number;
        if (amount) {
          lamportsToSend = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
        } else {
          // Send all minus fee (0.000005 SOL)
          lamportsToSend = balanceLamports - 5000;
        }

        if (lamportsToSend <= 0) {
          return res.status(400).json({ error: 'Insufficient balance for withdrawal' });
        }

        // Create transaction
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: fromKeypair.publicKey,
            toPubkey: toPublicKey,
            lamports: lamportsToSend,
          })
        );

        // Send transaction
        const signature = await sendAndConfirmTransaction(connection, transaction, [fromKeypair]);

        // Update stored balance
        const newBalance = (balanceLamports - lamportsToSend - 5000) / LAMPORTS_PER_SOL;
        await walletService.updateMasterWalletBalance(userId, Math.max(0, newBalance));

        console.log(`✅ Withdraw successful for user ${userId}: ${lamportsToSend / LAMPORTS_PER_SOL} SOL`);

        broadcast('master-wallet:withdrawn', {
          destination,
          amount: lamportsToSend / LAMPORTS_PER_SOL,
          userId,
          transaction: {
            type: 'withdrawal',
            timestamp: new Date().toISOString(),
            destination,
            amount: lamportsToSend / LAMPORTS_PER_SOL,
            signature
          }
        });

        res.json({ success: true, signature, message: `Successfully withdrew ${(lamportsToSend / LAMPORTS_PER_SOL).toFixed(4)} SOL` });
        return;
      } catch (withdrawError) {
        const errorMsg = withdrawError instanceof Error ? withdrawError.message : String(withdrawError);
        console.error('❌ Withdraw execution error:', errorMsg);
        return res.status(500).json({ error: errorMsg });
      }
    }

    // Fallback to legacy global wallet if MongoDB not connected
    if (!masterWalletManager) {
      return res.status(503).json({ error: 'MasterWalletManager not available. Please rebuild the project.' });
    }

    if (!masterWalletManager.masterWalletExists()) {
      return res.status(400).json({ error: 'Master wallet not found. Please create a master wallet first.' });
    }

    console.log(`💸 Executing REAL withdraw (simulation mode removed - always real)`);

    try {
      // Create connection if not exists
      if (!config.connection) {
        config.connection = new Connection(rpcUrl, 'confirmed');
      }

      console.log(`🔗 Connection: ${config.connection ? 'OK' : 'MISSING'}`);

      // Execute the withdrawal (always real - simulation removed)
      const result = await masterWalletManager.withdrawFromMaster(
        config.connection,
        destination,
        amount ? parseFloat(amount) : undefined
      );

      console.log(`✅ Withdraw result:`, result);
      console.log(`✅ Withdraw successful: ${amount || 'ALL'} SOL sent to ${destination.substring(0, 8)}...`);

      // Wait a moment to ensure transaction is confirmed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Reload master wallet balance to get updated value
      let balanceAfter = 0;
      try {
        const updatedInfo = await masterWalletManager.getMasterWalletInfo(config.connection);
        balanceAfter = updatedInfo.balance;
        console.log(`📊 Updated master wallet balance: ${updatedInfo.balance.toFixed(4)} SOL`);
      } catch (balanceError) {
        console.error('⚠️ Could not fetch updated balance:', balanceError);
      }

      broadcast('master-wallet:withdrawn', {
        destination,
        amount,
        transaction: {
          type: 'withdrawal',
          timestamp: new Date().toISOString(),
          destination,
          amount: amount || 'ALL'
        }
      });
      res.json({ success: true, message: `Successfully withdrew ${amount || 'all'} SOL to ${destination.substring(0, 8)}...` });
    } catch (withdrawError) {
      const errorMsg = withdrawError instanceof Error ? withdrawError.message : String(withdrawError);
      console.error('❌ Withdraw execution error:', errorMsg);
      throw withdrawError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Withdraw error:', errorMsg);
    res.status(500).json({ error: errorMsg });
  }
});

// Trading Wallets - Per-user isolated wallets
// Export wallet private key
app.get('/api/wallets/:index/export-key', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;
    const index = parseInt(req.params.index);

    if (isNaN(index) || index < 1) {
      return res.status(400).json({ error: 'Invalid wallet index' });
    }

    // If MongoDB is connected, use per-user wallet service
    if (isMongoConnected() && userId) {
      const walletWithKey = await walletService.getWalletWithKey(userId, index);
      if (!walletWithKey) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const secretKeyArray = Array.from(walletWithKey.keypair.secretKey);
      const secretKeyBase64 = Buffer.from(walletWithKey.keypair.secretKey).toString('base64');

      res.json({
        success: true,
        walletIndex: index,
        publicKey: walletWithKey.publicKey,
        secretKey: secretKeyArray,
        secretKeyBase64: secretKeyBase64,
        message: '⚠️ IMPORTANT: Keep this private key secure. Anyone with access to it can control your wallet.'
      });
      return;
    }

    // Fallback to legacy global wallet if MongoDB not connected
    if (!walletManager) {
      return res.status(503).json({ error: 'WalletManager not available. Please rebuild the project.' });
    }

    const keypairs = walletManager.loadKeypairs();
    if (index > keypairs.length) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const keypair = keypairs[index - 1];
    const secretKeyArray = Array.from(keypair.secretKey);
    const secretKeyBase64 = Buffer.from(keypair.secretKey).toString('base64');

    res.json({
      success: true,
      walletIndex: index,
      publicKey: keypair.publicKey.toBase58(),
      secretKey: secretKeyArray,
      secretKeyBase64: secretKeyBase64,
      message: '⚠️ IMPORTANT: Keep this private key secure. Anyone with access to it can control your wallet.'
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Export all wallets as backup
app.get('/api/wallets/export-all', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;

    // If MongoDB is connected, use per-user wallet service
    if (isMongoConnected() && userId) {
      const userWallets = await walletService.getUserWallets(userId);
      const wallets = [];

      for (const wallet of userWallets) {
        const walletWithKey = await walletService.getWalletWithKey(userId, wallet.index);
        if (walletWithKey) {
          wallets.push({
            index: wallet.index,
            publicKey: walletWithKey.publicKey,
            secretKey: Array.from(walletWithKey.keypair.secretKey),
            secretKeyBase64: Buffer.from(walletWithKey.keypair.secretKey).toString('base64')
          });
        }
      }

      res.json({
        success: true,
        count: wallets.length,
        wallets: wallets,
        exportDate: new Date().toISOString(),
        message: '⚠️ CRITICAL: Keep this backup secure. Store it in a safe place. Anyone with access to these private keys can control your wallets.'
      });
      return;
    }

    // Fallback to legacy global wallet if MongoDB not connected
    if (!walletManager) {
      return res.status(503).json({ error: 'WalletManager not available. Please rebuild the project.' });
    }

    const keypairs = walletManager.loadKeypairs();
    const wallets = [];

    for (let i = 0; i < keypairs.length; i++) {
      const keypair = keypairs[i];
      wallets.push({
        index: i + 1,
        publicKey: keypair.publicKey.toBase58(),
        secretKey: Array.from(keypair.secretKey),
        secretKeyBase64: Buffer.from(keypair.secretKey).toString('base64')
      });
    }

    res.json({
      success: true,
      count: wallets.length,
      wallets: wallets,
      exportDate: new Date().toISOString(),
      message: '⚠️ CRITICAL: Keep this backup secure. Store it in a safe place. Anyone with access to these private keys can control your wallets.'
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get('/api/wallets', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;

    // If MongoDB is connected, use per-user wallet service
    if (isMongoConnected() && userId) {
      const cacheKey = `wallet-summary-${userId}`;
      const cache = (global as any).walletCache || {};
      const now = Date.now();

      if (cache[cacheKey] && (now - cache[cacheKey].timestamp) < 5000) {
        console.log(`📦 Using cached wallet summary for user ${userId}`);
        return res.json(cache[cacheKey].data);
      }

      const summary = await walletService.getWalletSummary(userId);

      // Store in cache
      if (!(global as any).walletCache) {
        (global as any).walletCache = {};
      }
      (global as any).walletCache[cacheKey] = {
        data: summary,
        timestamp: now
      };

      res.json(summary);
      return;
    }

    // Fallback to legacy global wallet if MongoDB not connected
    if (!WalletManager || !walletManager) {
      return res.json({
        totalWallets: 0,
        totalBalance: 0,
        wallets: []
      });
    }

    // Add rate limiting protection - cache for 5 seconds
    const cacheKey = 'wallet-summary';
    const cache = (global as any).walletCache || {};
    const now = Date.now();

    if (cache[cacheKey] && (now - cache[cacheKey].timestamp) < 5000) {
      console.log('📦 Using cached wallet summary');
      return res.json(cache[cacheKey].data);
    }

    const summary = await walletManager.getWalletSummary();

    // Store in cache
    if (!(global as any).walletCache) {
      (global as any).walletCache = {};
    }
    (global as any).walletCache[cacheKey] = {
      data: summary,
      timestamp: now
    };

    res.json(summary);
  } catch (error: any) {
    // Handle rate limit errors gracefully
    if (error.message && error.message.includes('429')) {
      console.warn('⚠️ Rate limit hit, using cached data if available');
      const cache = (global as any).walletCache || {};
      if (cache['wallet-summary']) {
        return res.json(cache['wallet-summary'].data);
      }
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again in a moment.' });
    }
    res.status(500).json({ error: String(error) });
  }
});

app.post('/api/wallets/generate', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;
    const { count } = req.body;

    // If MongoDB is connected, use per-user wallet service
    if (isMongoConnected() && userId) {
      const wallets = await walletService.generateWallets(userId, count || 5);
      broadcast('wallets:generated', { count: wallets.length, userId });
      res.json({ success: true, count: wallets.length, wallets });
      return;
    }

    // Fallback to legacy global wallet if MongoDB not connected
    if (!walletManager) {
      return res.status(503).json({ error: 'WalletManager not available. Please rebuild the project.' });
    }

    // CRITICAL SAFETY CHECK: Before generating new wallets, check if existing ones have funds
    const existingSummary = await walletManager.getWalletSummary();
    const existingWallets = existingSummary.wallets || [];
    const walletsWithFunds = existingWallets.filter((w: any) => (w.balance || 0) > 0.001);

    if (walletsWithFunds.length > 0) {
      const totalFunds = walletsWithFunds.reduce((sum: number, w: any) => sum + (w.balance || 0), 0);
      return res.status(400).json({
        error: `Cannot generate new wallets: ${walletsWithFunds.length} existing wallets have funds (${totalFunds.toFixed(4)} SOL total). Please recover funds first using the "Recover" button.`,
        hasFunds: true,
        walletsWithFunds: walletsWithFunds.length,
        totalFunds
      });
    }

    const keypairs = walletManager.generateKeypairs(count || 5);
    broadcast('wallets:generated', { count: keypairs.length });
    res.json({ success: true, count: keypairs.length });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/api/wallets/cleanup', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;

    // If MongoDB is connected, use per-user wallet service
    if (isMongoConnected() && userId) {
      const result = await walletService.deleteWallets(userId);
      if (result.errors.length > 0) {
        return res.status(400).json({
          error: result.errors.join(', '),
          deleted: result.deleted,
          errors: result.errors,
          requiresRecovery: true
        });
      }
      broadcast('wallets:cleaned', { userId });
      res.json({ success: true, deleted: result.deleted });
      return;
    }

    // Fallback to legacy global wallet if MongoDB not connected
    if (!walletManager) {
      return res.status(503).json({ error: 'WalletManager not available. Please rebuild the project.' });
    }

    // SECURITY: Check for funds before cleanup
    const summary = await walletManager.getWalletSummary();
    const totalBalance = summary.totalBalance || 0;

    if (totalBalance > 0.001) { // More than 0.001 SOL
      return res.status(400).json({
        error: `Cannot cleanup wallets with funds. Total balance: ${totalBalance.toFixed(4)} SOL. Please recover funds first.`,
        totalBalance,
        requiresRecovery: true
      });
    }

    walletManager.cleanupKeypairs();
    broadcast('wallets:cleaned', {});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Safe cleanup: Recover funds first, then cleanup
app.post('/api/wallets/safe-cleanup', async (req, res) => {
  try {
    if (!walletManager || !fundManager) {
      return res.status(503).json({ error: 'WalletManager or FundManager not available. Please rebuild the project.' });
    }
    
    // Step 1: Check if master wallet exists
    if (!masterWalletManager.masterWalletExists()) {
      return res.status(400).json({ 
        error: 'Master wallet not found. Cannot safely recover funds. Please create a master wallet first or manually withdraw funds.',
        requiresMasterWallet: true
      });
    }
    
    // Step 2: Get current balances
    const summary = await walletManager.getWalletSummary();
    const totalBalance = summary.totalBalance || 0;
    
    if (totalBalance > 0.001) {
      // Step 3: Recover funds to master
      try {
        const recoverResult = await fundManager.recoverToMaster();
        broadcast('funds:recovered', recoverResult);
        
        // Step 4: Wait a moment for transactions to settle
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 5: Verify funds were recovered
        const summaryAfter = await walletManager.getWalletSummary();
        const remainingBalance = summaryAfter.totalBalance || 0;
        
        if (remainingBalance > 0.001) {
          return res.status(400).json({ 
            error: `Some funds could not be recovered. Remaining balance: ${remainingBalance.toFixed(4)} SOL. Please check manually.`,
            remainingBalance,
            recovered: recoverResult
          });
        }
      } catch (recoverError) {
        return res.status(500).json({ 
          error: `Failed to recover funds: ${String(recoverError)}. Cleanup cancelled to prevent fund loss.`,
          recoverError: String(recoverError)
        });
      }
    }
    
    // Step 6: Safe to cleanup
    walletManager.cleanupKeypairs();
    broadcast('wallets:cleaned', {});
    res.json({ 
      success: true, 
      message: 'Wallets cleaned safely. All funds were recovered to master wallet.',
      recoveredAmount: totalBalance
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Fund Management
app.post('/api/funds/distribute-from-master', async (req, res) => {
  try {
    if (!fundManager) {
      return res.status(503).json({ error: 'FundManager not available. Please rebuild the project.' });
    }
    
    if (!masterWalletManager) {
      return res.status(503).json({ error: 'MasterWalletManager not available. Please rebuild the project.' });
    }
    
    if (!masterWalletManager.masterWalletExists()) {
      return res.status(400).json({ error: 'Master wallet not found. Please create a master wallet first.' });
    }
    
    if (!walletManager) {
      return res.status(503).json({ error: 'WalletManager not available. Please rebuild the project.' });
    }
    
    console.log('💰 Distributing funds from master wallet...');
    
    // Get master wallet info
    const config = configManager.getConfig();
    if (!config.connection) {
      const { Connection } = require('@solana/web3.js');
      // Use premium Helius RPC if available
      const rpcUrl = config.rpcUrl || 'https://mainnet.helius-rpc.com/?api-key=7b05747c-b100-4159-ba5f-c85e8c8d3997';
      config.connection = new Connection(rpcUrl, 'confirmed');
    }
    
    const masterInfo = await masterWalletManager.getMasterWalletInfo(config.connection);
    if (!masterInfo.exists) {
      return res.status(400).json({ error: 'Master wallet not found.' });
    }
    
    if (masterInfo.balance <= 0.001) {
      return res.status(400).json({ error: `Master wallet has insufficient balance: ${masterInfo.balance.toFixed(4)} SOL. Minimum 0.001 SOL required.` });
    }
    
    // Get trading wallets
    const walletSummary = await walletManager.getWalletSummary();
    const tradingWallets = walletSummary.wallets || [];
    
    if (tradingWallets.length === 0) {
      return res.status(400).json({ error: 'No trading wallets found. Please generate wallets first.' });
    }
    
    // Load all keypairs
    const keypairs = walletManager.loadKeypairs();
    if (keypairs.length === 0) {
      return res.status(400).json({ error: 'No keypairs found. Please generate wallets first.' });
    }
    
    // Calculate distribution amount (leave some for fees)
    const txFee = 0.000005; // Per transaction
    const totalFees = txFee * tradingWallets.length;
    const availableBalance = masterInfo.balance - totalFees - 0.001; // Leave 0.001 SOL in master
    
    if (availableBalance <= 0) {
      return res.status(400).json({ error: `Insufficient balance after fees. Need at least ${(totalFees + 0.001).toFixed(4)} SOL.` });
    }
    
    const amountPerWallet = availableBalance / tradingWallets.length;
    
    console.log(`📊 Distributing ${availableBalance.toFixed(4)} SOL across ${tradingWallets.length} wallets (${amountPerWallet.toFixed(4)} SOL each)`);
    
    // Distribute funds
    const { SystemProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL, Transaction } = require('@solana/web3.js');
    const masterWallet = masterWalletManager.loadMasterWallet();
    const masterPublicKey = masterWallet.publicKey;
    
    let successCount = 0;
    let failCount = 0;
    const results: any[] = [];
    
    for (const wallet of tradingWallets) {
      try {
        // wallet.index is 1-based (from getWalletSummary), but keypairs array is 0-based
        const keypairIndex = wallet.index - 1;
        const walletKeypair = keypairs[keypairIndex];
        if (!walletKeypair) {
          throw new Error(`Keypair not found for wallet index ${wallet.index} (array index ${keypairIndex})`);
        }
        const destinationPublicKey = walletKeypair.publicKey;
        
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: masterPublicKey,
            toPubkey: destinationPublicKey,
            lamports: Math.floor(amountPerWallet * LAMPORTS_PER_SOL)
          })
        );
        
        console.log(`💸 Sending ${amountPerWallet.toFixed(4)} SOL to wallet ${wallet.index} (${destinationPublicKey.toBase58().substring(0, 8)}...)...`);
        const signature = await sendAndConfirmTransaction(
          config.connection,
          transaction,
          [masterWallet],
          { commitment: 'confirmed' }
        );
        
        console.log(`✅ Wallet ${wallet.index} funded: ${signature}`);
        successCount++;
        results.push({
          walletIndex: wallet.index,
          walletAddress: destinationPublicKey.toBase58(),
          amount: amountPerWallet,
          signature,
          success: true
        });
      } catch (error: any) {
        console.error(`❌ Failed to fund wallet ${wallet.index}:`, error.message);
        failCount++;
        results.push({
          walletIndex: wallet.index,
          amount: amountPerWallet,
          success: false,
          error: error.message
        });
      }
    }
    
    console.log(`✅ Distribution complete: ${successCount} successful, ${failCount} failed`);
    
    // Reload master wallet balance
    const updatedMasterInfo = await masterWalletManager.getMasterWalletInfo(config.connection);
    
    // Store transaction in history (also save to file for persistence)
    const transactionHistory = (global as any).transactionHistory || [];
    const transactionRecord = {
      type: 'distribution',
      timestamp: new Date().toISOString(),
      successCount,
      failCount,
      totalDistributed: amountPerWallet * successCount,
      amountPerWallet,
      results,
      masterBalanceBefore: masterInfo.balance,
      masterBalanceAfter: updatedMasterInfo.balance
    };
    transactionHistory.unshift(transactionRecord);
    // Keep only last 100 transactions
    if (transactionHistory.length > 100) {
      transactionHistory.splice(100);
    }
    (global as any).transactionHistory = transactionHistory;
    
    // Also save to file for persistence
    try {
      const fs = require('fs');
      const path = require('path');
      const historyFile = path.join(process.cwd(), 'transaction-history.json');
      let fileHistory = [];
      if (fs.existsSync(historyFile)) {
        fileHistory = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
      }
      fileHistory.unshift(transactionRecord);
      if (fileHistory.length > 1000) {
        fileHistory.splice(1000);
      }
      fs.writeFileSync(historyFile, JSON.stringify(fileHistory, null, 2));
      console.log(`💾 Transaction history saved to ${historyFile}`);
    } catch (fileError) {
      console.warn('⚠️ Could not save transaction history to file:', fileError);
    }
    
    broadcast('funds:distributed', { 
      success: successCount > 0,
      successCount,
      failCount,
      totalDistributed: amountPerWallet * successCount,
      results,
      transaction: {
        type: 'distribution',
        timestamp: new Date().toISOString(),
        results
      }
    });
    
    res.json({ 
      success: successCount > 0,
      successCount,
      failCount,
      totalDistributed: amountPerWallet * successCount,
      amountPerWallet,
      results,
      masterBalance: updatedMasterInfo.balance
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Distribution error:', errorMsg);
    res.status(500).json({ error: errorMsg });
  }
});

app.post('/api/funds/recover-to-master', async (req, res) => {
  try {
    if (!fundManager) {
      return res.status(503).json({ error: 'FundManager not available. Please rebuild the project.' });
    }
    
    // Check if master wallet exists
    if (!masterWalletManager.masterWalletExists()) {
      return res.status(400).json({ 
        error: 'Master wallet not found. Please create a master wallet first.',
        requiresMasterWallet: true
      });
    }
    
    const { specificWallets } = req.body; // Optional: array of wallet addresses to recover from
    
    let result;
    
    if (specificWallets && Array.isArray(specificWallets) && specificWallets.length > 0) {
      // Recover from specific wallets that are in the system
      console.log(`🔄 Recovering funds from specific wallets: ${specificWallets.join(', ')}`);
      result = await recoverFromSpecificWallets(specificWallets);
    } else {
      // Recover from all trading wallets (default behavior)
      result = await fundManager.recoverToMaster();
    }
    
    // Store transaction in history
    const transactionHistory = (global as any).transactionHistory || [];
    transactionHistory.unshift({
      type: 'recovery',
      timestamp: new Date().toISOString(),
      ...result
    });
    // Keep only last 100 transactions
    if (transactionHistory.length > 100) {
      transactionHistory.splice(100);
    }
    (global as any).transactionHistory = transactionHistory;
    
    broadcast('funds:recovered', {
      ...result,
      transaction: {
        type: 'recovery',
        timestamp: new Date().toISOString(),
        ...result
      }
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Helper function to recover from specific wallet addresses (only if they're in the system)
async function recoverFromSpecificWallets(walletAddresses: string[]) {
  const config = configManager.getConfig();
  if (!config.connection) {
    const { Connection } = require('@solana/web3.js');
    const rpcUrl = config.rpcUrl || 'https://mainnet.helius-rpc.com/?api-key=7b05747c-b100-4159-ba5f-c85e8c8d3997';
    config.connection = new Connection(rpcUrl, 'confirmed');
  }
  
  const { PublicKey, SystemProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL, Transaction } = require('@solana/web3.js');
  const masterWallet = masterWalletManager.loadMasterWallet();
  const masterPublicKey = masterWallet.publicKey;
  
  // Get all keypairs from the system
  const keypairs = walletManager.loadKeypairs();
  const keypairMap = new Map();
  keypairs.forEach((kp: any) => {
    const pubkeyStr = kp.publicKey.toBase58();
    keypairMap.set(pubkeyStr, kp);
    console.log(`📋 System wallet: ${pubkeyStr.substring(0, 8)}...${pubkeyStr.substring(pubkeyStr.length - 4)}`);
  });
  
  console.log(`📊 Total wallets in system: ${keypairs.length}`);
  
  let totalRecovered = 0;
  let successCount = 0;
  let failCount = 0;
  const results: any[] = [];
  
  for (const walletAddress of walletAddresses) {
    try {
      const sourcePublicKey = new PublicKey(walletAddress);
      const balance = await config.connection.getBalance(sourcePublicKey);
      const balanceInSol = balance / LAMPORTS_PER_SOL;
      
      if (balanceInSol <= 0.000005) {
        console.log(`⚠️ Wallet ${walletAddress.substring(0, 8)}... has insufficient balance: ${balanceInSol.toFixed(6)} SOL`);
        results.push({
          walletAddress,
          amount: 0,
          success: false,
          error: 'Insufficient balance'
        });
        failCount++;
        continue;
      }
      
      // Check if wallet is in the system
      const keypair = keypairMap.get(walletAddress);
      if (!keypair) {
        console.log(`⚠️ Wallet ${walletAddress.substring(0, 8)}... is NOT in the system - cannot recover without private key`);
        results.push({
          walletAddress,
          amount: balanceInSol,
          success: false,
          error: 'Wallet not controlled by system - cannot sign transactions. You need the private key to recover funds from this wallet.'
        });
        failCount++;
        continue;
      }
      
      // Leave a small amount for fees
      const amountToRecover = balanceInSol - 0.000005;
      const lamportsToRecover = Math.floor(amountToRecover * LAMPORTS_PER_SOL);
      
      if (lamportsToRecover <= 0) {
        console.log(`⚠️ Wallet ${walletAddress.substring(0, 8)}... has insufficient balance after fees`);
        results.push({
          walletAddress,
          amount: 0,
          success: false,
          error: 'Insufficient balance after fees'
        });
        failCount++;
        continue;
      }
      
      // Create and send transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: sourcePublicKey,
          toPubkey: masterPublicKey,
          lamports: lamportsToRecover
        })
      );
      
      console.log(`💸 Recovering ${amountToRecover.toFixed(4)} SOL from ${walletAddress.substring(0, 8)}...`);
      const signature = await sendAndConfirmTransaction(
        config.connection,
        transaction,
        [keypair],
        { commitment: 'confirmed' }
      );
      
      console.log(`✅ Recovered from ${walletAddress.substring(0, 8)}...: ${signature}`);
      totalRecovered += amountToRecover;
      successCount++;
      results.push({
        walletAddress,
        amount: amountToRecover,
        signature,
        success: true
      });
      
    } catch (error: any) {
      console.error(`❌ Failed to recover from ${walletAddress.substring(0, 8)}...:`, error.message);
      results.push({
        walletAddress,
        amount: 0,
        success: false,
        error: error.message
      });
      failCount++;
    }
  }
  
  return {
    success: successCount > 0,
    totalRecovered,
    successCount,
    failCount,
    results,
    message: `Recovery attempt completed: ${successCount} successful, ${failCount} failed. ${failCount > 0 ? 'Note: Can only recover from wallets controlled by the system.' : ''}`
  };
}

// Check wallet balances before operations
app.get('/api/wallets/check-balances', async (req, res) => {
  try {
    if (!walletManager) {
      return res.status(503).json({ error: 'WalletManager not available. Please rebuild the project.' });
    }
    
    const summary = await walletManager.getWalletSummary();
    const wallets = summary.wallets || [];
    
    // Check each wallet for funds
    const walletsWithFunds = wallets.filter((w: any) => (w.balance || 0) > 0.001);
    const totalBalance = summary.totalBalance || 0;
    
    res.json({
      totalWallets: wallets.length,
      walletsWithFunds: walletsWithFunds.length,
      totalBalance,
      canCleanup: totalBalance < 0.001,
      walletsWithFundsList: walletsWithFunds.map((w: any) => ({
        index: w.index,
        publicKey: w.publicKey,
        balance: w.balance
      }))
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Pump.fun Bot
app.post('/api/pumpfun/execute', async (req, res) => {
  try {
    if (!pumpFunBot) {
      return res.status(503).json({ error: 'PumpFunBot not available. Please rebuild the project with: npm run build' });
    }
    
    console.log(`🚀 Pump.fun execute requested. All operations are REAL (simulation removed)`);
    console.log('⚠️ LIVE MODE: Real trades will be executed with real funds!');
    
    const config = req.body;
    
    // Pass simulation mode as false (always real)
    const botConfig = {
      ...config,
      simulationMode: false, // Always false - simulation removed
    };
    
    // Initialize bot
    await pumpFunBot.initialize();
    
    // Execute pump
    const result = await pumpFunBot.executePump(botConfig);
    
    broadcast('pumpfun:completed', result);
    res.json({ success: true, result, simulationMode: false }); // Always false - simulation removed
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    broadcast('pumpfun:error', { error: errorMsg });
    res.status(500).json({ error: errorMsg });
  }
});

app.post('/api/pumpfun/stop', async (req, res) => {
  try {
    if (!pumpFunBot) {
      return res.status(503).json({ error: 'PumpFunBot not available. Please rebuild the project.' });
    }
    pumpFunBot.stopPump();
    broadcast('pumpfun:stopped', {});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Volume Bot
app.post('/api/volume/start', async (req, res) => {
  try {
    const config = req.body;
    await volumeBot.initialize();
    // Start volume session in background
    volumeBot?.startVolumeSession().catch((err: any) => {
      broadcast('volume:error', { error: String(err) });
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/api/volume/stop', async (req, res) => {
  try {
    volumeBot.stopSession();
    broadcast('volume:stopped', {});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get('/api/volume/status', async (req, res) => {
  try {
    const session = volumeBot.getCurrentSession();
    res.json({ 
      isActive: volumeBot.isActive(),
      session,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Pump.fun Tokens - Try WebSocket recent tokens first, then API, then on-chain
app.get('/api/pumpfun/tokens', async (req, res) => {
  try {
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = parseInt(req.query.limit as string) || 50;
    const sort = req.query.sort as string || 'created_timestamp';
    const order = req.query.order as string || 'DESC';
    
    console.log('🔍 Fetching tokens from pump.fun...');
    
    // Method 1: Try pump.fun API first (fastest and most reliable) ⭐
    try {
      console.log('🔍 Trying pump.fun API (fastest method)...');
      const pumpUrl = `https://frontend-api.pump.fun/coins?offset=${offset}&limit=${limit}&sort=${sort}&order=${order}`;
      const pumpResponse = await fetch(pumpUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });

      if (pumpResponse.ok) {
        const pumpData = await pumpResponse.json();
        if (pumpData && Array.isArray(pumpData) && pumpData.length > 0) {
          // Filter and prioritize: last 6 hours, prioritize last 2 hours
          const now = Date.now() / 1000;
          const sixHoursAgo = now - (6 * 60 * 60);
          const twoHoursAgo = now - (2 * 60 * 60);
          const oneHourAgo = now - (60 * 60);
          const thirtyMinutesAgo = now - (30 * 60);
          
          // Get tokens from last 6 hours (more flexible)
          const recentTokens = pumpData.filter((token: any) => {
            const tokenTime = token.created_timestamp || 0;
            // Include if timestamp is valid and within last 6 hours
            return tokenTime > 0 && tokenTime >= sixHoursAgo;
          });

          if (recentTokens.length > 0) {
            // Separate by recency - prioritize very recent
            const last30min = recentTokens.filter((token: any) => (token.created_timestamp || 0) >= thirtyMinutesAgo);
            const lastHour = recentTokens.filter((token: any) => {
              const t = token.created_timestamp || 0;
              return t >= oneHourAgo && t < thirtyMinutesAgo;
            });
            const lastTwoHours = recentTokens.filter((token: any) => {
              const t = token.created_timestamp || 0;
              return t >= twoHoursAgo && t < oneHourAgo;
            });
            const lastSixHours = recentTokens.filter((token: any) => {
              const t = token.created_timestamp || 0;
              return t >= sixHoursAgo && t < twoHoursAgo;
            });
            
            // Prioritize: last 30min first, then last 1h, then last 2h, then last 6h
            const sortedTokens = [...last30min, ...lastHour, ...lastTwoHours, ...lastSixHours]
              .sort((a: any, b: any) => (b.created_timestamp || 0) - (a.created_timestamp || 0))
              .slice(0, limit);
            
            // Filter out generic pump.fun tokens and ensure all required fields are present
            const enrichedTokens = sortedTokens
              .filter((token: any) => {
                // Filter out only truly generic pump.fun placeholder tokens
                const name = (token.name || '').toLowerCase().trim();
                const symbol = (token.symbol || '').toLowerCase().trim();
                const isGeneric =
                  name === 'pump.fun' ||
                  name === 'pump fun' ||
                  name === 'pumpfun' ||
                  symbol === 'pump.fun' ||
                  symbol === 'pumpfun';
                if (isGeneric) {
                  console.log(`🚫 Filtered out generic token: ${token.name} (${token.symbol})`);
                }
                return !isGeneric;
              })
              .map((token: any) => {
                // Ensure all required fields are present
                const enriched = {
                  ...token,
                  // Ensure name is not "pump fun" or generic (fallback)
                  name: (token.name && token.name.toLowerCase() !== 'pump fun' && token.name.toLowerCase() !== 'pump.fun' && token.name.length > 2) 
                    ? token.name 
                    : (token.symbol || `Token ${token.mint?.substring(0, 8) || 'Unknown'}`),
                  // Add missing fields with defaults - ALWAYS include these fields
                  liquidity: typeof token.liquidity === 'number' ? token.liquidity : 0,
                  holders: typeof token.holders === 'number' ? token.holders : 0,
                  volume_24h: typeof token.volume_24h === 'number' ? token.volume_24h : 0,
                  dev_holdings: typeof token.dev_holdings === 'number' ? token.dev_holdings : 0,
                  dev_holdings_percent: typeof token.dev_holdings_percent === 'number' ? token.dev_holdings_percent : 0,
                  sniper_holdings: typeof token.sniper_holdings === 'number' ? token.sniper_holdings : 0,
                  sniper_holdings_percent: typeof token.sniper_holdings_percent === 'number' ? token.sniper_holdings_percent : 0,
                  insider_holdings: typeof token.insider_holdings === 'number' ? token.insider_holdings : 0,
                  insider_holdings_percent: typeof token.insider_holdings_percent === 'number' ? token.insider_holdings_percent : 0,
                  dex_is_paid: typeof token.dex_is_paid === 'boolean' ? token.dex_is_paid : false,
                };
                return enriched;
              });
            
            console.log(`✅ Found ${enrichedTokens.length} tokens from pump.fun API (${last30min.length} last 30min, ${lastHour.length} last 1h, ${lastTwoHours.length} last 2h, ${lastSixHours.length} last 6h)`);
            // Log token ages for debugging
            const nowSeconds = Date.now() / 1000;
            enrichedTokens.slice(0, 10).forEach((token: any) => {
              const ageMinutes = ((nowSeconds - (token.created_timestamp || 0)) / 60).toFixed(0);
              const ageHours = ((nowSeconds - (token.created_timestamp || 0)) / 3600).toFixed(1);
              console.log(`   • ${token.name || 'Token'} - ${ageMinutes}min / ${ageHours}h ago (ts: ${token.created_timestamp})`);
            });
            return res.json(enrichedTokens);
          } else {
            // If no tokens in last 6h, show newest available (up to 24h)
            const oneDayAgo = now - (24 * 60 * 60);
            const fallbackTokens = pumpData.filter((token: any) => {
              const tokenTime = token.created_timestamp || 0;
              return tokenTime > 0 && tokenTime >= oneDayAgo;
            });
            if (fallbackTokens.length > 0) {
              const sorted = fallbackTokens
                .sort((a: any, b: any) => (b.created_timestamp || 0) - (a.created_timestamp || 0))
                .slice(0, limit);
              
              // Ensure all required fields are present
              const enrichedFallback = sorted.map((token: any) => ({
                ...token,
                name: (token.name && token.name.toLowerCase() !== 'pump fun' && token.name.toLowerCase() !== 'pump.fun' && token.name.length > 2) 
                  ? token.name 
                  : (token.symbol || `Token ${token.mint?.substring(0, 8) || 'Unknown'}`),
                liquidity: token.liquidity || 0,
                holders: token.holders || 0,
                volume_24h: token.volume_24h || 0,
                dev_holdings: token.dev_holdings || 0,
                dev_holdings_percent: token.dev_holdings_percent || 0,
                sniper_holdings: token.sniper_holdings || 0,
                sniper_holdings_percent: token.sniper_holdings_percent || 0,
                insider_holdings: token.insider_holdings || 0,
                insider_holdings_percent: token.insider_holdings_percent || 0,
                dex_is_paid: token.dex_is_paid || false,
              }));
              
              console.log(`⚠️ No tokens in last 6h, showing ${enrichedFallback.length} newest from last 24h`);
              return res.json(enrichedFallback);
            }
            console.log(`⚠️ No tokens found in last 24 hours from pump.fun API`);
            // Continue to next method
          }
        }
      }
    } catch (pumpError: any) {
      console.log('pump.fun API failed:', pumpError.message);
    }
    
    // Method 2: Try DexScreener API (not blocked by Cloudflare, very fast) ⭐
    console.log('🔍 Trying DexScreener API (no Cloudflare blocking, fast)...');
    try {
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      // Strategy: Get recent Solana pairs and filter for pump.fun
      let allPairs: any[] = [];
      
      // Get all Solana pairs - try multiple endpoints
      try {
        // Endpoint 1: Latest Solana pairs
        const recentPairsUrl = `https://api.dexscreener.com/latest/dex/pairs/solana`;
        const dexResponse = await fetch(recentPairsUrl, {
          headers: { 'Accept': 'application/json' },
        });

        if (dexResponse.ok) {
          const dexData = await dexResponse.json();
          if (dexData.pairs && Array.isArray(dexData.pairs)) {
            allPairs = dexData.pairs;
            console.log(`DexScreener returned ${allPairs.length} Solana pairs`);
          }
        }
      } catch (err) {
        console.log('DexScreener pairs endpoint failed:', err);
      }
      
      // Endpoint 2: Search for pump.fun specifically
      try {
        const searchUrl = `https://api.dexscreener.com/latest/dex/search?q=pump.fun`;
        const searchResponse = await fetch(searchUrl, {
          headers: { 'Accept': 'application/json' },
        });
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.pairs && Array.isArray(searchData.pairs)) {
            const searchPairs = searchData.pairs.filter((p: any) => p.chainId === 'solana');
            const existingAddresses = new Set(allPairs.map((p: any) => p.pairAddress));
            for (const pair of searchPairs) {
              if (!existingAddresses.has(pair.pairAddress)) {
                allPairs.push(pair);
              }
            }
            console.log(`Added ${searchPairs.length} pairs from pump.fun search (total: ${allPairs.length})`);
          }
        }
      } catch (err) {
        console.log('DexScreener search endpoint failed:', err);
      }
      
      // Endpoint 3: Try trending tokens
      try {
        const trendingUrl = `https://api.dexscreener.com/latest/dex/tokens/solana`;
        const trendingResponse = await fetch(trendingUrl, {
          headers: { 'Accept': 'application/json' },
        });
        
        if (trendingResponse.ok) {
          const trendingData = await trendingResponse.json();
          if (trendingData.pairs && Array.isArray(trendingData.pairs)) {
            const trendingPairs = trendingData.pairs.filter((p: any) => p.chainId === 'solana');
            const existingAddresses = new Set(allPairs.map((p: any) => p.pairAddress));
            for (const pair of trendingPairs) {
              if (!existingAddresses.has(pair.pairAddress)) {
                allPairs.push(pair);
              }
            }
            console.log(`Added ${trendingPairs.length} pairs from trending (total: ${allPairs.length})`);
          }
        }
      } catch (err) {
        console.log('DexScreener trending endpoint failed:', err);
      }
      
      if (allPairs.length > 0) {
        // Filter for pump.fun tokens - prioritize URL and DEX ID over name
        // FIRST: Filter out generic pump.fun tokens aggressively
        const solanaPairs = allPairs.filter((pair: any) => {
          if (pair.chainId !== 'solana') return false;
          
          const tokenName = (pair.baseToken?.name || '').toLowerCase().trim();
          const tokenSymbol = (pair.baseToken?.symbol || '').toLowerCase().trim();

          // Filter only truly generic pump.fun placeholder tokens (be specific, not aggressive)
          const isGenericPumpName =
            tokenName === 'pump.fun' ||
            tokenName === 'pump fun' ||
            tokenName === 'pumpfun';

          const isGenericPumpSymbol =
            tokenSymbol === 'pump.fun' ||
            tokenSymbol === 'pumpfun';

          // REJECT only truly generic placeholder tokens
          if (isGenericPumpName || isGenericPumpSymbol) {
            console.log(`🚫 REJECTED generic token: ${pair.baseToken?.name} (${pair.baseToken?.symbol})`);
            return false;
          }
          
          // Only accept tokens with pump.fun URL or DEX ID
          const urlHasPumpFun = pair.url?.includes('pump.fun');
          const isPumpDex = pair.dexId === 'pump' || pair.dexId === 'pumpswap';
          
          if (urlHasPumpFun || isPumpDex) {
            // Double check - exclude official platform token
            const isOfficialPlatform = (tokenName === 'pump.fun' && tokenSymbol === 'pump');
            return !isOfficialPlatform;
          }
          
          // Don't accept tokens without pump.fun URL/DEX ID
          return false;
        });
        
        solanaPairs.sort((a, b) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0));
        console.log(`Filtered to ${solanaPairs.length} recent Solana pump.fun pairs`);
        
        // Remove duplicates by token address, keep most recent
        const uniqueTokens = new Map<string, any>();
        
        for (const pair of solanaPairs) {
          const tokenAddress = pair.baseToken?.address;
          if (tokenAddress) {
            // pairCreatedAt is in milliseconds, convert to seconds
            // Only use pairCreatedAt if it exists and is valid, otherwise skip (don't use current time as fallback)
            const pairCreatedAtMs = pair.pairCreatedAt || 0;
            if (pairCreatedAtMs === 0) {
              // Skip tokens without creation timestamp
              continue;
            }
            const createdAt = pairCreatedAtMs / 1000; // Convert ms to seconds
            const existing = uniqueTokens.get(tokenAddress);
            
            // Only keep if timestamp is valid and more recent than existing
            if (!existing || createdAt > existing.created_timestamp) {
              // Get token name - avoid "pump fun" or generic names
              let tokenName = pair.baseToken?.name || '';
              const tokenNameLower = tokenName.toLowerCase();
              // If name is too generic or contains "pump fun" as the actual name, use symbol or mint
              if (!tokenName || 
                  tokenNameLower === 'pump fun' || 
                  tokenNameLower === 'pump.fun' ||
                  tokenNameLower.includes('pump.fun clone') ||
                  tokenNameLower.includes('pumpfun clone') ||
                  (tokenNameLower.includes('pump') && (tokenNameLower.includes('clone') || tokenNameLower.includes('copy'))) ||
                  tokenName.length < 2) {
                // Use symbol if it's not generic, otherwise use mint
                const symbol = pair.baseToken?.symbol || '';
                const symbolLower = symbol.toLowerCase();
                if (symbol && symbolLower !== 'pump' && symbolLower !== 'pump.fun' && symbolLower !== 'clone' && symbol.length > 1) {
                  tokenName = symbol;
                } else {
                  tokenName = `Token ${tokenAddress.substring(0, 8)}`;
                }
              }
              
              uniqueTokens.set(tokenAddress, {
                mint: tokenAddress,
                name: tokenName,
                symbol: pair.baseToken?.symbol || 'TKN',
                created_timestamp: createdAt,
                complete: pair.liquidity?.usd ? pair.liquidity.usd > 100000 : false,
                market_cap: pair.fdv || 0,
                usd_market_cap: pair.marketCap || pair.fdv || 0,
                image_uri: pair.baseToken?.logoURI,
                description: '',
                creator: '',
                pumpfun: {
                  bonding_curve: '',
                  associated_bonding_curve: '',
                  associated_market: pair.url || '',
                },
                price_usd: pair.priceUsd || 0,
                price_change_24h: pair.priceChange?.h24 || 0,
                // Add missing fields from DexScreener
                liquidity: parseFloat(pair.liquidity?.usd || 0),
                holders: parseInt(pair.holders || 0),
                volume_24h: parseFloat(pair.volume?.h24 || 0),
                dex_is_paid: !!(pair.liquidity?.usd && pair.volume?.h24),
                // Holdings analysis (if available from DexScreener)
                dev_holdings: 0, // Will be enriched later if available
                dev_holdings_percent: 0,
                sniper_holdings: 0,
                sniper_holdings_percent: 0,
                insider_holdings: 0,
                insider_holdings_percent: 0,
              });
            }
          }
        }

        // Filter and prioritize: last 6 hours, prioritize last 2 hours
        const now = Date.now() / 1000;
        const sixHoursAgoSeconds = now - (6 * 60 * 60);
        const twoHoursAgoSeconds = now - (2 * 60 * 60);
        const oneHourAgoSeconds = now - (60 * 60);
        const thirtyMinutesAgoSeconds = now - (30 * 60);
        
        const allTokens = Array.from(uniqueTokens.values());
        
        // Filter for last 6 hours (more flexible)
        const tokensLast6h = allTokens.filter((t: any) => {
          const ts = t.created_timestamp || 0;
          return ts > 0 && ts >= sixHoursAgoSeconds;
        });
        
        if (tokensLast6h.length > 0) {
          // Separate by recency - prioritize very recent
          const last30min = tokensLast6h.filter((t: any) => t.created_timestamp >= thirtyMinutesAgoSeconds);
          const lastHour = tokensLast6h.filter((t: any) => {
            const ts = t.created_timestamp || 0;
            return ts >= oneHourAgoSeconds && ts < thirtyMinutesAgoSeconds;
          });
          const lastTwoHours = tokensLast6h.filter((t: any) => {
            const ts = t.created_timestamp || 0;
            return ts >= twoHoursAgoSeconds && ts < oneHourAgoSeconds;
          });
          const lastSixHours = tokensLast6h.filter((t: any) => {
            const ts = t.created_timestamp || 0;
            return ts >= sixHoursAgoSeconds && ts < twoHoursAgoSeconds;
          });
          
          // Combine: last 30min first, then last 1h, then last 2h, then last 6h
          const pumpFunTokens = [...last30min, ...lastHour, ...lastTwoHours, ...lastSixHours]
            .sort((a: any, b: any) => {
              if (a.created_timestamp === 0 && b.created_timestamp > 0) return 1;
              if (b.created_timestamp === 0 && a.created_timestamp > 0) return -1;
              return b.created_timestamp - a.created_timestamp;
            })
            // Filter only truly generic pump.fun placeholder tokens
            .filter((token: any) => {
              const name = (token.name || '').toLowerCase().trim();
              const symbol = (token.symbol || '').toLowerCase().trim();
              const isGeneric =
                name === 'pump.fun' ||
                name === 'pump fun' ||
                name === 'pumpfun' ||
                symbol === 'pump.fun' ||
                symbol === 'pumpfun';

              if (isGeneric) {
                console.log(`🚫 FINAL FILTER: Rejected generic token: ${token.name} (${token.symbol})`);
                return false;
              }
              return true;
            })
            .slice(0, limit);
          
          console.log(`✅ Found ${pumpFunTokens.length} tokens from DexScreener (${last30min.length} last 30min, ${lastHour.length} last 1h, ${lastTwoHours.length} last 2h, ${lastSixHours.length} last 6h)`);
          // Log token ages for debugging
          const nowSeconds = Date.now() / 1000;
          pumpFunTokens.slice(0, 10).forEach((token: any) => {
            const ageMinutes = ((nowSeconds - token.created_timestamp) / 60).toFixed(0);
            const ageHours = ((nowSeconds - token.created_timestamp) / 3600).toFixed(1);
            console.log(`   • ${token.name} - ${ageMinutes}min / ${ageHours}h ago (ts: ${token.created_timestamp})`);
          });
          return res.json(pumpFunTokens);
        } else {
          // If no tokens in last 6h, show newest available (up to 24h)
          const oneDayAgoSeconds = now - (24 * 60 * 60);
          const fallbackTokens = allTokens.filter((t: any) => {
            const ts = t.created_timestamp || 0;
            return ts > 0 && ts >= oneDayAgoSeconds;
          });
          if (fallbackTokens.length > 0) {
            const sorted = fallbackTokens
              .sort((a: any, b: any) => b.created_timestamp - a.created_timestamp)
              .slice(0, limit);
            console.log(`⚠️ No tokens in last 6h from DexScreener, showing ${sorted.length} newest from last 24h`);
            return res.json(sorted);
          }
          console.log(`⚠️ No tokens found in last 24 hours from DexScreener`);
        }
      }
    } catch (dexError) {
      console.log('DexScreener API failed:', dexError);
    }
    
    // Method 2.5: Try on-chain search for recent pump.fun tokens (slower, as fallback)
    console.log('🔍 Trying on-chain search for recent pump.fun tokens (fallback)...');
    try {
      const { Connection, PublicKey } = require('@solana/web3.js');
      const config = configManager.getConfig();
      const connection = new Connection(config.rpcUrl || 'https://mainnet.helius-rpc.com/?api-key=7b05747c-b100-4159-ba5f-c85e8c8d3997', 'confirmed');
      const PUMP_FUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6Px');
      
      // Get recent transactions from pump.fun program - get more for better coverage
      const signatures = await connection.getSignaturesForAddress(
        PUMP_FUN_PROGRAM_ID,
        { limit: 200 }, // Increased from 100 to 200
        'confirmed'
      );
      
      if (signatures.length > 0) {
        console.log(`📝 Found ${signatures.length} recent pump.fun transactions`);
        
        // Filter for very recent transactions (last 2 hours for fresher tokens)
        const now = Date.now() / 1000;
        const twoHoursAgo = now - (2 * 60 * 60);
        const recentSignatures = signatures.filter(sig => {
          const sigTime = sig.blockTime || 0;
          return sigTime >= twoHoursAgo;
        });
        
        console.log(`📝 Filtered to ${recentSignatures.length} transactions from last 2 hours`);
        
        // Process transactions to extract token mints (process more for better results)
        const tokensFound = new Map<string, number>();
        const processLimit = Math.min(50, recentSignatures.length); // Increased from 20 to 50
        
        for (let i = 0; i < processLimit; i++) {
          try {
            const sig = recentSignatures[i];
            const tx = await connection.getTransaction(sig.signature, {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0,
            });
            
            if (tx?.meta && !tx.meta.err) {
              // Extract token mints from transaction
              const postTokenBalances = tx.meta.postTokenBalances || [];
              for (const balance of postTokenBalances) {
                if (balance.mint && balance.mint.length > 30) {
                  const timestamp = sig.blockTime ? sig.blockTime * 1000 : Date.now();
                  const existing = tokensFound.get(balance.mint);
                  if (!existing || timestamp > existing) {
                    tokensFound.set(balance.mint, timestamp);
                  }
                }
              }
            }
            
            // Delay after every request to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 150));
          } catch (err) {
            // Skip failed transactions
          }
        }
        
        if (tokensFound.size > 0) {
          // Filter tokens by timestamp (last 2 hours for fresher tokens)
          const nowMs = Date.now();
          const twoHoursAgoMs = nowMs - (2 * 60 * 60 * 1000);
          
          const onChainTokens = Array.from(tokensFound.entries())
            .filter(([_, timestamp]) => timestamp >= twoHoursAgoMs)
            .map(([mint, timestamp]) => ({
              mint,
              name: `Token ${mint.substring(0, 8)}`,
              symbol: 'TKN',
              created_timestamp: timestamp / 1000,
              complete: false,
              market_cap: 0,
              usd_market_cap: 0,
              image_uri: '',
              description: '',
              creator: '',
              pumpfun: {
                bonding_curve: '',
                associated_bonding_curve: '',
                associated_market: '',
              },
              price_usd: 0,
              price_change_24h: 0,
              // Add missing fields with defaults
              liquidity: 0,
              holders: 0,
              volume_24h: 0,
              dev_holdings: 0,
              dev_holdings_percent: 0,
              sniper_holdings: 0,
              sniper_holdings_percent: 0,
              insider_holdings: 0,
              insider_holdings_percent: 0,
              dex_is_paid: false,
            }))
            .sort((a, b) => b.created_timestamp - a.created_timestamp)
            .slice(0, limit);
          
          if (onChainTokens.length > 0) {
            console.log(`✅ Found ${onChainTokens.length} recent tokens from on-chain search (last 2h)`);
            return res.json(onChainTokens);
          }
        }
      }
    } catch (onChainError) {
      console.log('On-chain direct search failed:', onChainError);
    }
    
    // Method 3: Try WebSocket listener for real-time tokens
    console.log('🔍 Trying WebSocket listener for real-time tokens...');
    const wsTokens = wsListener.getRecentTokens(limit * 2);
    if (wsTokens.length > 0) {
      console.log(`✅ Found ${wsTokens.length} tokens from WebSocket listener`);
      // Filter for recent tokens (last 6 hours)
      const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
      const recentWsTokens = wsTokens.filter(token => token.timestamp >= sixHoursAgo);
      
      if (recentWsTokens.length > 0) {
        // Convert to expected format
        const formattedTokens = recentWsTokens
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit)
          .map(token => ({
            mint: token.mint,
            name: `Token ${token.mint.substring(0, 8)}`,
            symbol: 'TKN',
            created_timestamp: token.timestamp / 1000,
            complete: false,
            market_cap: 0,
            usd_market_cap: 0,
            image_uri: '',
            description: '',
            creator: '',
            pumpfun: {
              bonding_curve: '',
              associated_bonding_curve: '',
              associated_market: '',
            },
            price_usd: 0,
            price_change_24h: 0,
            // Add missing fields with defaults
            liquidity: 0,
            holders: 0,
            volume_24h: 0,
            dev_holdings: 0,
            dev_holdings_percent: 0,
            sniper_holdings: 0,
            sniper_holdings_percent: 0,
            insider_holdings: 0,
            insider_holdings_percent: 0,
            dex_is_paid: false,
          }));
        console.log(`✅ Returning ${formattedTokens.length} recent tokens from WebSocket (last 6h)`);
        return res.json(formattedTokens);
      }
    }

    // Method 4: Try using public Solana RPC directly (bypass Helius restrictions)
    console.log('⚠️ All APIs failed, trying public Solana RPC...');
    try {
      const publicRpc = new (require('@solana/web3.js').Connection)(
        'https://mainnet.helius-rpc.com/?api-key=7b05747c-b100-4159-ba5f-c85e8c8d3997',
        'confirmed'
      );
      
      // Get recent signatures from pump.fun program using public RPC
      const recentSignatures = await publicRpc.getSignaturesForAddress(
        new (require('@solana/web3.js').PublicKey)('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6Px'),
        { limit: Math.min(limit * 2, 20) }, // Limit to avoid rate limiting
        'confirmed'
      );

      console.log(`Found ${recentSignatures.length} recent pump.fun transactions`);

      const tokenMints = new Set<string>();
      
      // Process a few transactions to extract token mints
      for (let i = 0; i < Math.min(recentSignatures.length, 10); i++) {
        try {
          const tx = await publicRpc.getTransaction(recentSignatures[i].signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          });

          if (tx?.meta?.postTokenBalances) {
            for (const balance of tx.meta.postTokenBalances) {
              if (balance.mint) {
                tokenMints.add(balance.mint);
              }
            }
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          continue;
        }
      }

      if (tokenMints.size > 0) {
        console.log(`✅ Found ${tokenMints.size} token mints from public RPC`);
        
        // Convert to token format
        const tokens = Array.from(tokenMints).slice(0, limit).map((mint, idx) => ({
          mint,
          name: `Token ${mint.substring(0, 8)}`,
          symbol: 'TKN',
          created_timestamp: Date.now() / 1000 - (idx * 60),
          complete: false,
          market_cap: 0,
          usd_market_cap: 0,
        }));
        
        return res.json(tokens);
      }
    } catch (publicRpcError) {
      console.error('Public RPC search failed:', publicRpcError);
    }

    // Method 3: Fallback to on-chain search with Helius (may fail due to permissions)
    if (onChainSearch) {
      console.log('⚠️ Trying on-chain search with configured RPC...');
      try {
        const [pumpFunTokens, programTokens] = await Promise.allSettled([
          onChainSearch.searchRecentTokens(limit),
          onChainSearch.searchPumpFunProgramAccounts(limit),
        ]);

        const allTokens: any[] = [];
        
        if (pumpFunTokens.status === 'fulfilled' && pumpFunTokens.value.length > 0) {
          console.log(`✅ Found ${pumpFunTokens.value.length} tokens from on-chain search`);
          allTokens.push(...pumpFunTokens.value);
        }
        
        if (programTokens.status === 'fulfilled' && programTokens.value.length > 0) {
          console.log(`✅ Found ${programTokens.value.length} tokens from program accounts`);
          allTokens.push(...programTokens.value);
        }

        if (allTokens.length > 0) {
          // Remove duplicates
          const uniqueTokens = Array.from(
            new Map(allTokens.map(token => [token.mint, token])).values()
          );
          
          uniqueTokens.sort((a, b) => {
            const timeA = a.createdTimestamp || 0;
            const timeB = b.createdTimestamp || 0;
            return timeB - timeA;
          });
          
          console.log(`✅ Returning ${uniqueTokens.length} unique tokens from on-chain`);
          return res.json(uniqueTokens.slice(0, limit));
        }
      } catch (onChainError) {
        console.error('On-chain search also failed:', onChainError);
      }
    }

    // If all methods fail, return helpful message with example tokens
    console.warn('⚠️ No tokens found via any method');
    console.log('💡 Tip: Users can manually enter token mint addresses in the Pump.fun tab');
    
    // Return empty array - the UI will show helpful instructions
    // Note: The WebSocket listener will detect new tokens in real-time when they're created
    return res.json([]);

  } catch (error) {
    console.error('Token search error:', error);
    return res.status(500).json({ error: String(error) });
  }
});

// Test WebSocket APIs for Token Explorer
app.get('/api/pumpfun/test-websockets', async (req, res) => {
  try {
    if (!compareWebSocketAPIs) {
      return res.status(503).json({
        success: false,
        error: 'WebSocket comparison not available. Install dependencies: npm install ws socket.io-client @types/ws',
      });
    }

    console.log('🔍 Testing WebSocket APIs for Token Explorer...');
    const comparison = await compareWebSocketAPIs();
    
    res.json({
      success: true,
      comparison,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error testing WebSocket APIs:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Test WebSocket APIs for Token Explorer
app.get('/api/pumpfun/test-websockets', async (req, res) => {
  try {
    console.log('🔍 Testing WebSocket APIs for Token Explorer...');
    
    // Import comparison function dynamically to avoid issues if dependencies aren't available
    let comparison: any;
    try {
      const { compareWebSocketAPIs } = require('./websocket-comparison');
      comparison = await compareWebSocketAPIs();
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: `Failed to load WebSocket comparison: ${error.message}. Make sure ws and socket.io-client are installed.`,
      });
    }
    
    res.json({
      success: true,
      comparison,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error testing WebSocket APIs:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Legacy API Proxy (kept for fallback)
app.get('/api/pumpfun/tokens-api', async (req, res) => {
  try {
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = parseInt(req.query.limit as string) || 50;
    const sort = req.query.sort as string || 'created_timestamp';
    const order = req.query.order as string || 'DESC';

    // Try multiple API endpoints
    const endpoints = [
      `https://frontend-api.pump.fun/coins?offset=${offset}&limit=${limit}&sort=${sort}&order=${order}`,
      `https://api.pump.fun/coins?offset=${offset}&limit=${limit}`,
    ];

    let lastError: Error | null = null;

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://pump.fun/',
            'Origin': 'https://pump.fun',
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Handle different response formats
          if (Array.isArray(data)) {
            return res.json(data);
          } else if (data.coins && Array.isArray(data.coins)) {
            return res.json(data.coins);
          } else if (data.data && Array.isArray(data.data)) {
            return res.json(data.data);
          }
          return res.json(data);
        }
      } catch (err) {
        lastError = err as Error;
        continue;
      }
    }

    // If all endpoints fail, return empty array
    console.warn('Pump.fun API unavailable');
    return res.json([]);
  } catch (error) {
    console.error('Pump.fun API error:', error);
    return res.json([]);
  }
});

// Generate realistic sample tokens for demonstration
function generateRealisticSampleTokens(count: number): any[] {
  const tokens = [];
  const now = Math.floor(Date.now() / 1000);
  const names = ['ApeCoin', 'DogeKing', 'MoonToken', 'RocketCoin', 'DiamondHands', 'ToTheMoon', 'Lambo', 'Hodl', 'WenMoon', 'SafeMoon'];
  const symbols = ['APE', 'DOGEK', 'MOON', 'ROCKET', 'DIAMOND', 'TTM', 'LAMBO', 'HODL', 'WEN', 'SAFE'];
  
  for (let i = 0; i < count; i++) {
    const nameIndex = i % names.length;
    const marketCap = Math.floor(Math.random() * 50000000) + 10000;
    const usdMarketCap = marketCap * (150 + Math.random() * 50); // SOL price simulation
    
    tokens.push({
      mint: generateRandomSolanaAddress(),
      name: `${names[nameIndex]} ${i > 9 ? Math.floor(i / 10) : ''}`.trim(),
      symbol: `${symbols[nameIndex]}${i > 9 ? Math.floor(i / 10) : ''}`.trim(),
      description: `Sample token ${i + 1} for demonstration purposes`,
      image_uri: '',
      market_cap: marketCap * 1000000000, // In lamports
      usd_market_cap: usdMarketCap,
      creator: generateRandomSolanaAddress(),
      created_timestamp: now - (i * 1800), // 30 min intervals
      complete: Math.random() > 0.85, // 15% graduated
      pumpfun: {
        bonding_curve: generateRandomSolanaAddress(),
        associated_bonding_curve: generateRandomSolanaAddress(),
        associated_market: generateRandomSolanaAddress(),
      },
    });
  }
  
  return tokens;
}

// Generate random Solana address format
function generateRandomSolanaAddress(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let address = '';
  for (let i = 0; i < 44; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
}

// Get OHLCV chart data from Birdeye or DexScreener
app.get('/api/pumpfun/token/:mint/chart', async (req, res) => {
  try {
    const { mint } = req.params;
    const type = (req.query.type as string) || '1D'; // 1H, 4H, 1D, 1W
    console.log(`📊 Fetching OHLCV chart for: ${mint} (${type})`);
    
    // Method 1: Try Birdeye API
    try {
      const birdeyeApiKey = process.env.BIRDEYE_API_KEY || '';
      if (birdeyeApiKey) {
        const birdeyeUrl = `https://public-api.birdeye.so/v1/token/kline?address=${mint}&type=${type}&time_from=${Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60)}&time_to=${Math.floor(Date.now() / 1000)}`;
        const birdeyeResponse = await fetch(birdeyeUrl, {
          headers: {
            'X-API-KEY': birdeyeApiKey,
            'Accept': 'application/json',
          },
        });

        if (birdeyeResponse.ok) {
          const birdeyeData = await birdeyeResponse.json();
          if (birdeyeData.data && birdeyeData.data.items) {
            console.log(`✅ Found OHLCV data from Birdeye`);
            const ohlcv = birdeyeData.data.items.map((item: any) => ({
              time: new Date(item.unixTime * 1000).toISOString(),
              open: parseFloat(item.o || 0),
              high: parseFloat(item.h || 0),
              low: parseFloat(item.l || 0),
              close: parseFloat(item.c || 0),
              volume: parseFloat(item.v || 0),
            }));
            return res.json(ohlcv);
          }
        }
      }
    } catch (birdeyeError) {
      console.log('Birdeye API failed:', birdeyeError);
    }

    // Method 2: Try DexScreener (doesn't have OHLCV directly, but we can get price history)
    // For now, return empty array - we'll generate sample data if needed
    return res.json([]);

  } catch (error) {
    console.error('Get chart error:', error);
    return res.status(500).json({ error: String(error) });
  }
});

// Start real-time trades listener for a token
app.post('/api/pumpfun/token/:mint/trades/start', async (req, res) => {
  try {
    const { mint } = req.params;
    console.log(`🚀 Starting real-time trades listener for: ${mint}`);

    // Respond immediately to avoid timeout
    res.json({ success: true, message: 'Real-time trades listener starting...' });

    // Create new listener for this token if not exists (async, don't wait)
    if (!activeTradesListeners.has(mint)) {
      const listener = new TradesListener();
      
      // Start listening in background (don't await to avoid timeout)
      listener.startListening(mint).then(() => {
        activeTradesListeners.set(mint, listener);
        console.log(`✅ Real-time trades listener started for: ${mint}`);
        
        // Broadcast trades to connected clients
        listener.onTrade((trade) => {
          broadcast('trade:new', { mint, trade });
        });
      }).catch((error) => {
        console.error('Error starting trades listener:', error);
      });
    } else {
      console.log(`⚠️ Listener already exists for: ${mint}`);
    }
  } catch (error) {
    console.error('Error starting trades listener:', error);
    // Still respond even if there's an error
    if (!res.headersSent) {
      res.status(500).json({ error: String(error) });
    }
  }
});

// Get recent trades from on-chain (100% blockchain data)
app.get('/api/pumpfun/token/:mint/trades', async (req, res) => {
  try {
    const { mint } = req.params;
    const limit = parseInt(req.query.limit as string) || 30;
    console.log(`📊 Fetching trades for: ${mint}`);

    // Method 1: Try pump.fun API first (most reliable for pump.fun tokens)
    try {
      console.log('🔍 Trying pump.fun API for trades...');
      const pumpTradesUrl = `https://frontend-api.pump.fun/trades/latest/${mint}?limit=${limit}`;
      const pumpResponse = await fetch(pumpTradesUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });

      if (pumpResponse.ok) {
        const pumpTrades = await pumpResponse.json();
        if (pumpTrades && Array.isArray(pumpTrades) && pumpTrades.length > 0) {
          console.log(`✅ Found ${pumpTrades.length} trades from pump.fun API`);

          const trades = pumpTrades.map((trade: any) => ({
            signature: trade.signature || trade.tx_hash || '',
            timestamp: trade.timestamp || Math.floor(Date.now() / 1000),
            price: parseFloat(trade.sol_amount || 0) / parseFloat(trade.token_amount || 1),
            amount: parseFloat(trade.token_amount || 0),
            tokenAmount: parseFloat(trade.token_amount || 0),
            side: trade.is_buy ? 'buy' : 'sell',
            buyer: trade.is_buy ? (trade.user || trade.wallet || '') : '',
            seller: trade.is_buy ? '' : (trade.user || trade.wallet || ''),
            solAmount: parseFloat(trade.sol_amount || 0) / 1e9, // Convert lamports to SOL
          }));

          return res.json(trades);
        }
      }
    } catch (pumpError: any) {
      console.log('pump.fun trades API failed:', pumpError.message);
    }

    // Method 2: Try alternative pump.fun endpoint
    try {
      console.log('🔍 Trying alternative pump.fun trades endpoint...');
      const pumpTradesUrl2 = `https://frontend-api.pump.fun/trades/${mint}?limit=${limit}&offset=0`;
      const pumpResponse2 = await fetch(pumpTradesUrl2, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });

      if (pumpResponse2.ok) {
        const pumpTrades2 = await pumpResponse2.json();
        if (pumpTrades2 && Array.isArray(pumpTrades2) && pumpTrades2.length > 0) {
          console.log(`✅ Found ${pumpTrades2.length} trades from pump.fun API (alt)`);

          const trades = pumpTrades2.map((trade: any) => {
            const solAmountLamports = parseFloat(trade.sol_amount || 0);
            const solAmount = solAmountLamports > 1000 ? solAmountLamports / 1e9 : solAmountLamports;
            const tokenAmount = parseFloat(trade.token_amount || 0);

            return {
              signature: trade.signature || trade.tx_hash || '',
              timestamp: trade.timestamp || Math.floor(Date.now() / 1000),
              price: tokenAmount > 0 ? solAmount / tokenAmount : 0,
              amount: tokenAmount,
              tokenAmount: tokenAmount,
              side: trade.is_buy ? 'buy' : 'sell',
              buyer: trade.is_buy ? (trade.user || trade.wallet || '') : '',
              seller: trade.is_buy ? '' : (trade.user || trade.wallet || ''),
              solAmount: solAmount,
            };
          });

          return res.json(trades);
        }
      }
    } catch (pumpError2: any) {
      console.log('pump.fun alt trades API failed:', pumpError2.message);
    }

    // Method 3: Try Helius API for transactions (if API key available)
    try {
      const heliusApiKey = process.env.HELIUS_API_KEY || 'b8baac5d-2270-45ba-8324-9d7024c3f828';
      if (heliusApiKey) {
        console.log('🔍 Trying Helius API for transactions...');
        const heliusUrl = `https://api.helius.xyz/v0/addresses/${mint}/transactions?api-key=${heliusApiKey}&limit=${limit}`;
        const heliusResponse = await fetch(heliusUrl, {
          headers: { 'Accept': 'application/json' },
        });

        if (heliusResponse.ok) {
          const heliusData = await heliusResponse.json();
          if (heliusData && Array.isArray(heliusData) && heliusData.length > 0) {
            console.log(`✅ Found ${heliusData.length} transactions from Helius`);
            
            const trades: any[] = [];
            for (const tx of heliusData.slice(0, limit)) {
              try {
                if (tx.type === 'SWAP' || tx.type === 'TRANSFER') {
                  const timestamp = tx.timestamp || tx.blockTime || Math.floor(Date.now() / 1000);
                  const signature = tx.signature || '';

                  let tokenAmount = 0;
                  let solAmount = 0;
                  let isBuy = false;

                  const solTransfers: any[] = [];
                  if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
                    for (const transfer of tx.nativeTransfers) {
                      const amount = Math.abs(transfer.amount) / 1e9;
                      if (amount > 0.0001) {
                        solTransfers.push({
                          from: transfer.fromUserAccount,
                          to: transfer.toUserAccount,
                          amount: amount
                        });
                      }
                    }
                  }

                  if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
                    const tokenTransfer = tx.tokenTransfers.find((tt: any) => tt.mint === mint);
                    if (tokenTransfer) {
                      tokenAmount = Math.abs(tokenTransfer.tokenAmount || 0);
                      const tokenTo = tokenTransfer.toUserAccount || '';
                      const tokenFrom = tokenTransfer.fromUserAccount || '';

                      for (const solTransfer of solTransfers) {
                        if (solTransfer.from === tokenTo && tokenTo.length > 30) {
                          isBuy = true;
                          solAmount = solTransfer.amount;
                          break;
                        }
                        if (solTransfer.to === tokenFrom && tokenFrom.length > 30) {
                          isBuy = false;
                          solAmount = solTransfer.amount;
                          break;
                        }
                      }

                      if (solAmount === 0 && solTransfers.length > 0) {
                        const largestSolTransfer = solTransfers.reduce((a, b) => a.amount > b.amount ? a : b);
                        solAmount = largestSolTransfer.amount;
                        isBuy = tokenTo && tokenTo.length > 30;
                      }
                    }
                  }

                  if (solAmount === 0 && solTransfers.length > 0) {
                    solAmount = Math.max(...solTransfers.map(t => t.amount));
                  }

                  const price = tokenAmount > 0 && solAmount > 0 ? solAmount / tokenAmount : 0;

                  if (solAmount > 0.0001 && tokenAmount > 0) {
                    trades.push({
                      signature: signature,
                      timestamp: timestamp,
                      price: price,
                      amount: tokenAmount,
                      tokenAmount: tokenAmount,
                      side: isBuy ? 'buy' : 'sell',
                      buyer: isBuy ? 'trader' : '',
                      seller: isBuy ? '' : 'trader',
                      solAmount: solAmount,
                    });
                  }
                }
              } catch (parseError) {
                continue;
              }
            }

            if (trades.length > 0) {
              console.log(`✅ Parsed ${trades.length} trades from Helius`);
              return res.json(trades);
            }
          }
        }
      }
    } catch (heliusError: any) {
      console.log('Helius API failed:', heliusError.message);
    }

    // Method 4: Get trades from real-time listener (if active)
    const activeListener = activeTradesListeners.get(mint);
    if (activeListener) {
      const realTimeTrades = activeListener.getRecentTrades(limit);
      if (realTimeTrades.length > 0) {
        console.log(`✅ Found ${realTimeTrades.length} trades from real-time listener`);
        return res.json(realTimeTrades.map(trade => ({
          signature: trade.signature,
          timestamp: trade.timestamp,
          price: trade.price,
          amount: trade.tokenAmount || trade.amount || 0,
          tokenAmount: trade.tokenAmount || trade.amount || 0,
          side: trade.side,
          buyer: trade.buyer,
          seller: trade.seller,
          solAmount: trade.solAmount || 0,
        })));
      }
    }

    // Method 5: Use PumpFunTransactionParser
    try {
      console.log('🔍 Using PumpFunTransactionParser for pump.fun specific trades...');
      let PumpFunParser: any = null;
      try {
        PumpFunParser = require(path.join(distPath, 'pumpfun/pumpfun-parser')).PumpFunTransactionParser;
      } catch (e) {
        try {
          PumpFunParser = require(path.join(projectRoot, 'src/pumpfun/pumpfun-parser')).PumpFunTransactionParser;
        } catch (e2) {
          // Parser not available, skip
        }
      }

      if (PumpFunParser) {
        const parser = new PumpFunParser();
        const pumpFunTrades = await parser.getTradesFromPumpFunProgram(mint, limit);
        
        if (pumpFunTrades && pumpFunTrades.length > 0) {
          console.log(`✅ Found ${pumpFunTrades.length} trades from pump.fun program`);
          return res.json(pumpFunTrades.map((trade: any) => ({
            signature: trade.signature,
            timestamp: trade.timestamp,
            price: trade.price || 0,
            amount: trade.tokenAmount || trade.amount || 0,
            tokenAmount: trade.tokenAmount || trade.amount || 0,
            side: trade.side,
            buyer: trade.buyer,
            seller: trade.seller,
            solAmount: trade.solAmount || 0,
          })));
        }
      }
    } catch (parserError: any) {
      console.log('PumpFunTransactionParser failed:', parserError.message);
    }

    // Method 6: Try to get trades from bonding curve (on-chain)
    const { Connection, PublicKey } = require('@solana/web3.js');
    const rpcUrl = process.env.RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=7b05747c-b100-4159-ba5f-c85e8c8d3997';
    const connection = new Connection(rpcUrl, 'confirmed');
    const mintPubkey = new PublicKey(mint);
    const PUMP_FUN_PROGRAM = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6Px');

    let signatures: any[] = [];
    
    try {
      // Find bonding curve account
      const [bondingCurve] = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding-curve'), mintPubkey.toBuffer()],
        PUMP_FUN_PROGRAM
      );
      
      // Get signatures for bonding curve (where trades happen)
      const bondingCurveSigs = await connection.getSignaturesForAddress(bondingCurve, { limit: limit * 3 });
      console.log(`Found ${bondingCurveSigs.length} transactions on bonding curve`);
      signatures = bondingCurveSigs;
    } catch (bondingError) {
      console.log('Could not get bonding curve, trying mint address:', bondingError);
      // Fallback to mint address
      try {
        const mintSigs = await connection.getSignaturesForAddress(mintPubkey, { limit: limit * 2 });
        console.log(`Found ${mintSigs.length} transactions on mint address`);
        signatures = mintSigs;
      } catch (mintError) {
        console.log('Could not get mint signatures:', mintError);
      }
    }

    console.log(`Using ${signatures.length} transactions to parse trades`);

    if (signatures.length === 0) {
      console.log('⚠️ No transactions found after trying all methods');
      return res.json([]);
    }

    const trades: any[] = [];

    for (const sig of signatures) {
      if (trades.length >= limit) break;

      try {
        const tx = await connection.getTransaction(sig.signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        });

        if (!tx?.meta || tx.meta.err) continue;

        const preBalances = tx.meta.preBalances || [];
        const postBalances = tx.meta.postBalances || [];
        const preTokenBalances = tx.meta.preTokenBalances || [];
        const postTokenBalances = tx.meta.postTokenBalances || [];

        // SIMPLE APPROACH: Use SOL changes to determine BUY vs SELL
        // In pump.fun, the SIGNER (first account) is the trader
        // - BUY: Signer spends SOL (negative change) to get tokens
        // - SELL: Signer receives SOL (positive change) for selling tokens

        // 1. Get token amount traded (ignore bonding curve with huge balances)
        let tokenAmount = 0;
        for (const post of postTokenBalances) {
          if (post.mint !== mint) continue;
          const pre = preTokenBalances.find((p: any) =>
            p.mint === mint && p.accountIndex === post.accountIndex
          );
          const preAmt = pre ? parseFloat(pre.uiTokenAmount?.uiAmountString || '0') : 0;
          const postAmt = parseFloat(post.uiTokenAmount?.uiAmountString || '0');

          // Skip bonding curve (has billions of tokens)
          if (preAmt > 500000000 || postAmt > 500000000) continue;

          const change = Math.abs(postAmt - preAmt);
          if (change > tokenAmount) {
            tokenAmount = change;
          }
        }

        // Check for new token accounts (first time buyers)
        if (tokenAmount === 0) {
          for (const post of postTokenBalances) {
            if (post.mint !== mint) continue;
            const postAmt = parseFloat(post.uiTokenAmount?.uiAmountString || '0');
            if (postAmt > 500000000) continue; // Skip bonding curve
            const pre = preTokenBalances.find((p: any) =>
              p.mint === mint && p.accountIndex === post.accountIndex
            );
            if (!pre && postAmt > 0) {
              tokenAmount = postAmt;
              break;
            }
          }
        }

        if (tokenAmount < 1) continue; // Skip if no significant token change

        // 2. Analyze SOL changes to determine direction
        // Account 0 is typically the signer/fee payer/trader
        const signerSolChange = (postBalances[0] - preBalances[0]) / 1e9;

        // Find ALL significant SOL changes
        let totalSolSpent = 0;   // Negative changes (someone buying)
        let totalSolReceived = 0; // Positive changes (someone selling)

        for (let i = 0; i < Math.min(preBalances.length, postBalances.length, 10); i++) {
          const change = (postBalances[i] - preBalances[i]) / 1e9;
          // Ignore tiny changes (fees, rent) - only count > 0.0005 SOL
          if (change < -0.0005) {
            totalSolSpent += Math.abs(change);
          } else if (change > 0.0005) {
            totalSolReceived += change;
          }
        }

        // 3. Determine BUY or SELL
        let side: 'buy' | 'sell';
        let solAmount: number;

        // Use signer's change as primary indicator
        if (signerSolChange < -0.0005) {
          // Signer LOST SOL = they are BUYING tokens
          side = 'buy';
          solAmount = Math.abs(signerSolChange);
        } else if (signerSolChange > 0.0005) {
          // Signer GAINED SOL = they are SELLING tokens
          side = 'sell';
          solAmount = signerSolChange;
        } else {
          // Signer change unclear, use total flow
          if (totalSolSpent > totalSolReceived + 0.001) {
            side = 'buy';
            solAmount = totalSolSpent;
          } else if (totalSolReceived > totalSolSpent + 0.001) {
            side = 'sell';
            solAmount = totalSolReceived;
          } else {
            continue; // Can't determine direction
          }
        }

        // Use better SOL amount if available
        if (solAmount < 0.0001) {
          solAmount = Math.max(totalSolSpent, totalSolReceived);
        }

        console.log(`🔍 Trade: signer=${signerSolChange.toFixed(6)} SOL, spent=${totalSolSpent.toFixed(4)}, rcvd=${totalSolReceived.toFixed(4)} => ${side.toUpperCase()} | ${solAmount.toFixed(4)} SOL | ${tokenAmount.toFixed(0)} tokens`);

        // Skip if values don't make sense
        if (solAmount < 0.0001 || tokenAmount < 0.0001) continue;

        const price = tokenAmount > 0 ? solAmount / tokenAmount : 0;

        console.log(`✅ Trade: ${side.toUpperCase()} | ${solAmount.toFixed(4)} SOL | ${tokenAmount.toFixed(2)} tokens`);

        trades.push({
          signature: sig.signature,
          timestamp: sig.blockTime || Math.floor(Date.now() / 1000),
          price,
          amount: tokenAmount,
          tokenAmount,
          side,
          buyer: side === 'buy' ? 'trader' : '',
          seller: side === 'sell' ? 'trader' : '',
          solAmount,
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (txError) {
        continue;
      }
    }

    console.log(`📊 Returning ${trades.length} trades`);
    
    // If no trades found, return empty array with a message
    if (trades.length === 0) {
      console.log(`⚠️ No trades found after trying all methods for ${mint}`);
      return res.json([]);
    }
    
    return res.json(trades);

  } catch (error) {
    console.error('Get trades error:', error);
    return res.status(500).json({ error: String(error) });
  }
});

// OLD METHOD - keeping for reference but not used
app.get('/api/pumpfun/token/:mint/trades-old', async (req, res) => {
  try {
    const { mint } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    console.log(`📊 OLD: Fetching recent trades for: ${mint}`);

    // Method 1: Try pump.fun API for trades (most accurate for pump.fun tokens)
    try {
      console.log('🔍 Trying pump.fun API for trades...');
      const pumpTradesUrl = `https://frontend-api.pump.fun/trades/latest/${mint}?limit=${limit}`;
      const pumpResponse = await fetch(pumpTradesUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });

      if (pumpResponse.ok) {
        const pumpTrades = await pumpResponse.json();
        if (pumpTrades && Array.isArray(pumpTrades) && pumpTrades.length > 0) {
          console.log(`✅ Found ${pumpTrades.length} trades from pump.fun API`);

          const trades = pumpTrades.map((trade: any) => ({
            signature: trade.signature || trade.tx_hash || '',
            timestamp: trade.timestamp || Math.floor(Date.now() / 1000),
            price: parseFloat(trade.sol_amount || 0) / parseFloat(trade.token_amount || 1),
            amount: parseFloat(trade.token_amount || 0),
            tokenAmount: parseFloat(trade.token_amount || 0),
            side: trade.is_buy ? 'buy' : 'sell',
            buyer: trade.is_buy ? (trade.user || trade.wallet || '') : '',
            seller: trade.is_buy ? '' : (trade.user || trade.wallet || ''),
            solAmount: parseFloat(trade.sol_amount || 0) / 1e9, // Convert lamports to SOL
          }));

          return res.json(trades);
        }
      }
    } catch (pumpError: any) {
      console.log('pump.fun trades API failed:', pumpError.message);
    }

    // Method 1b: Try alternative pump.fun trades endpoint
    try {
      console.log('🔍 Trying alternative pump.fun trades endpoint...');
      const pumpTradesUrl2 = `https://frontend-api.pump.fun/trades/${mint}?limit=${limit}&offset=0`;
      const pumpResponse2 = await fetch(pumpTradesUrl2, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });

      if (pumpResponse2.ok) {
        const pumpTrades2 = await pumpResponse2.json();
        if (pumpTrades2 && Array.isArray(pumpTrades2) && pumpTrades2.length > 0) {
          console.log(`✅ Found ${pumpTrades2.length} trades from pump.fun API (alt)`);

          const trades = pumpTrades2.map((trade: any) => {
            // pump.fun API returns sol_amount in lamports
            const solAmountLamports = parseFloat(trade.sol_amount || 0);
            const solAmount = solAmountLamports > 1000 ? solAmountLamports / 1e9 : solAmountLamports;
            const tokenAmount = parseFloat(trade.token_amount || 0);

            return {
              signature: trade.signature || trade.tx_hash || '',
              timestamp: trade.timestamp || Math.floor(Date.now() / 1000),
              price: tokenAmount > 0 ? solAmount / tokenAmount : 0,
              amount: tokenAmount,
              tokenAmount: tokenAmount,
              side: trade.is_buy ? 'buy' : 'sell',
              buyer: trade.is_buy ? (trade.user || trade.wallet || '') : '',
              seller: trade.is_buy ? '' : (trade.user || trade.wallet || ''),
              solAmount: solAmount,
            };
          });

          return res.json(trades);
        }
      }
    } catch (pumpError2: any) {
      console.log('pump.fun alt trades API failed:', pumpError2.message);
    }

    // Method 1c: Try DexScreener API for trades (free, no API key needed)
    try {
      console.log('🔍 Trying DexScreener API for trades...');
      const dexUrl = `https://api.dexscreener.com/latest/dex/tokens/${mint}`;
      const dexResponse = await fetch(dexUrl, {
        headers: { 'Accept': 'application/json' },
      });

      if (dexResponse.ok) {
        const dexData = await dexResponse.json();
        if (dexData.pairs && Array.isArray(dexData.pairs) && dexData.pairs.length > 0) {
          // Get the most liquid pair
          const mainPair = dexData.pairs[0];

          // DexScreener doesn't have direct trades endpoint, but we can use pair data
          // Try to get transactions from the pair address
          if (mainPair.pairAddress) {
            console.log(`✅ Found pair ${mainPair.pairAddress} from DexScreener`);
            // We'll use this pair address to get transactions
          }
        }
      }
    } catch (dexError: any) {
      console.log('DexScreener trades check failed:', dexError.message);
    }

    // Method 2: Try Helius API for transactions (if API key available)
    try {
      const heliusApiKey = process.env.HELIUS_API_KEY || 'b8baac5d-2270-45ba-8324-9d7024c3f828';
      if (heliusApiKey) {
        console.log('🔍 Trying Helius API for transactions...');
        const heliusUrl = `https://api.helius.xyz/v0/addresses/${mint}/transactions?api-key=${heliusApiKey}&limit=${limit}`;
        const heliusResponse = await fetch(heliusUrl, {
          headers: { 'Accept': 'application/json' },
        });

        if (heliusResponse.ok) {
          const heliusData = await heliusResponse.json();
          if (heliusData && Array.isArray(heliusData) && heliusData.length > 0) {
            console.log(`✅ Found ${heliusData.length} transactions from Helius`);
            
            // Parse Helius transactions to extract trades
            const trades: any[] = [];
            for (const tx of heliusData.slice(0, limit)) {
              try {
                // Helius provides parsed transaction data
                if (tx.type === 'SWAP' || tx.type === 'TRANSFER') {
                  const timestamp = tx.timestamp || tx.blockTime || Math.floor(Date.now() / 1000);
                  const signature = tx.signature || '';

                  let tokenAmount = 0;
                  let solAmount = 0;
                  let isBuy = false;
                  let trader = '';

                  // In pump.fun trades:
                  // BUY: User sends SOL to bonding curve, receives tokens
                  // SELL: User sends tokens to bonding curve, receives SOL

                  // First, find SOL transfers to identify who paid/received SOL
                  const solTransfers: any[] = [];
                  if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
                    for (const transfer of tx.nativeTransfers) {
                      const amount = Math.abs(transfer.amount) / 1e9;
                      if (amount > 0.0001) {
                        solTransfers.push({
                          from: transfer.fromUserAccount,
                          to: transfer.toUserAccount,
                          amount: amount
                        });
                      }
                    }
                  }

                  // Find the token transfer for our mint
                  if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
                    const tokenTransfer = tx.tokenTransfers.find((tt: any) => tt.mint === mint);
                    if (tokenTransfer) {
                      tokenAmount = Math.abs(tokenTransfer.tokenAmount || 0);
                      const tokenTo = tokenTransfer.toUserAccount || '';
                      const tokenFrom = tokenTransfer.fromUserAccount || '';

                      // Check SOL transfers to determine buy/sell
                      // The person who SENT SOL is the BUYER
                      // The person who RECEIVED SOL is the SELLER
                      for (const solTransfer of solTransfers) {
                        // If someone sent SOL and received tokens -> BUY
                        if (solTransfer.from === tokenTo && tokenTo.length > 30) {
                          isBuy = true;
                          trader = tokenTo;
                          solAmount = solTransfer.amount;
                          break;
                        }
                        // If someone received SOL and sent tokens -> SELL
                        if (solTransfer.to === tokenFrom && tokenFrom.length > 30) {
                          isBuy = false;
                          trader = tokenFrom;
                          solAmount = solTransfer.amount;
                          break;
                        }
                      }

                      // Fallback: use token transfer direction and largest SOL transfer
                      if (!trader && solTransfers.length > 0) {
                        // Get the largest SOL transfer
                        const largestSolTransfer = solTransfers.reduce((a, b) => a.amount > b.amount ? a : b);
                        solAmount = largestSolTransfer.amount;

                        // If tokens went TO someone (they received tokens) = BUY
                        // If tokens came FROM someone (they sent tokens) = SELL
                        if (tokenTo && tokenTo.length > 30) {
                          isBuy = true;
                          trader = tokenTo;
                        } else if (tokenFrom && tokenFrom.length > 30) {
                          isBuy = false;
                          trader = tokenFrom;
                        }
                      }
                    }
                  }

                  // If still no SOL amount, use the largest transfer
                  if (solAmount === 0 && solTransfers.length > 0) {
                    solAmount = Math.max(...solTransfers.map(t => t.amount));
                  }

                  // Calculate price
                  const price = tokenAmount > 0 && solAmount > 0 ? solAmount / tokenAmount : 0;

                  console.log(`📊 Helius Trade: ${isBuy ? 'BUY' : 'SELL'} | SOL: ${solAmount.toFixed(4)} | Tokens: ${tokenAmount.toFixed(2)} | Trader: ${trader.substring(0, 8)}...`);

                  // Only add trade if we have meaningful data
                  if (solAmount > 0.0001 && tokenAmount > 0) {
                    trades.push({
                      signature: signature,
                      timestamp: timestamp,
                      price: price,
                      amount: tokenAmount,
                      tokenAmount: tokenAmount,
                      side: isBuy ? 'buy' : 'sell',
                      buyer: isBuy ? trader : '',
                      seller: isBuy ? '' : trader,
                      solAmount: solAmount,
                    });
                  }
                }
              } catch (parseError) {
                continue;
              }
            }

            if (trades.length > 0) {
              console.log(`✅ Parsed ${trades.length} trades from Helius`);
              return res.json(trades);
            }
          }
        } else {
          console.log(`Helius API returned status ${heliusResponse.status}`);
        }
      }
    } catch (heliusError: any) {
      console.log('Helius API failed:', heliusError.message);
    }

    // Method 3: Get trades from real-time listener (if active)
    const activeListener = activeTradesListeners.get(mint);
    if (activeListener) {
      const realTimeTrades = activeListener.getRecentTrades(limit);
      if (realTimeTrades.length > 0) {
        console.log(`✅ Found ${realTimeTrades.length} trades from real-time listener`);
        return res.json(realTimeTrades.map(trade => ({
          signature: trade.signature,
          timestamp: trade.timestamp,
          price: trade.price,
          amount: trade.tokenAmount || trade.amount || 0,
          tokenAmount: trade.tokenAmount || trade.amount || 0,
          side: trade.side,
          buyer: trade.buyer,
          seller: trade.seller,
          solAmount: trade.solAmount || 0,
        })));
      }
    }

    // Method 4: Use PumpFunTransactionParser to get trades from pump.fun program
    try {
      console.log('🔍 Using PumpFunTransactionParser for pump.fun specific trades...');
      let PumpFunParser: any = null;
      try {
        PumpFunParser = require(path.join(distPath, 'pumpfun/pumpfun-parser')).PumpFunTransactionParser;
      } catch (e) {
        try {
          PumpFunParser = require(path.join(projectRoot, 'src/pumpfun/pumpfun-parser')).PumpFunTransactionParser;
        } catch (e2) {
          // Parser not available, skip
        }
      }

      if (PumpFunParser) {
        const parser = new PumpFunParser();
        const pumpFunTrades = await parser.getTradesFromPumpFunProgram(mint, limit);
        
        if (pumpFunTrades && pumpFunTrades.length > 0) {
          console.log(`✅ Found ${pumpFunTrades.length} trades from pump.fun program`);
          return res.json(pumpFunTrades.map((trade: any) => ({
            signature: trade.signature,
            timestamp: trade.timestamp,
            price: trade.price || 0,
            amount: trade.tokenAmount || trade.amount || 0,
            tokenAmount: trade.tokenAmount || trade.amount || 0,
            side: trade.side,
            buyer: trade.buyer,
            seller: trade.seller,
            solAmount: trade.solAmount || 0,
          })));
        }
      }
    } catch (parserError: any) {
      console.log('PumpFunTransactionParser failed:', parserError.message);
    }

    // Method 5: Parse real trades from on-chain transactions (improved)
    try {
      const { Connection, PublicKey } = require('@solana/web3.js');
      const rpcUrl = process.env.RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=7b05747c-b100-4159-ba5f-c85e8c8d3997';
      const connection = new Connection(rpcUrl, 'confirmed');
      const mintPubkey = new PublicKey(mint);
      
      console.log('📊 Parsing real trades from Solana blockchain...');
      
      // Get recent signatures for the token mint
      // CRITICAL: When searching by token mint, we get ALL transactions involving the token
      // This includes transfers, swaps, etc. We need to filter for actual trades
      const signatures = await connection.getSignaturesForAddress(
        mintPubkey,
        { limit: Math.min(limit * 3, 100) }, // Get more to filter better
        'confirmed'
      );

      if (signatures.length > 0) {
        console.log(`Found ${signatures.length} recent transactions for token mint`);
        
        const trades: any[] = [];
        
        // Process transactions to extract real trade info (limited to avoid rate limits)
        for (let i = 0; i < Math.min(signatures.length, 50); i++) {
          try {
            const sig = signatures[i];
            const tx = await connection.getTransaction(sig.signature, {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0,
            });

            if (!tx?.meta) continue;
            
            // Skip if transaction failed
            if (tx.meta.err) continue;

            // Parse token balance changes
            const preTokenBalances = tx.meta.preTokenBalances || [];
            const postTokenBalances = tx.meta.postTokenBalances || [];
            const preBalances = tx.meta.preBalances || [];
            const postBalances = tx.meta.postBalances || [];
            
            // Get accounts from transaction (needed for buyer/seller detection)
            const accounts = tx.transaction.message.accountKeys || [];
            
            // Skip if no token balance changes for our mint
            const hasTokenChanges = preTokenBalances.some(tb => tb.mint === mint) || 
                                   postTokenBalances.some(tb => tb.mint === mint);
            if (!hasTokenChanges) continue;

            let tokenBalanceChange = 0;
            let solBalanceChange = 0;
            let accountOwner = '';

            // Get signer address first (needed for token change tracking)
            const signer = accounts[0]?.pubkey?.toBase58() || '';
            const signerIndex = 0;
            
            // Find token balance changes for our mint
            // CRITICAL: We need to track changes per account, not sum all changes
            // The signer (account 0) is usually the trader, but when searching by token mint,
            // the signer might be the bonding curve or program, not the actual trader
            let signerTokenChange = 0;
            let otherTokenChange = 0;
            for (const preBalance of preTokenBalances) {
              if (preBalance.mint === mint && preBalance.accountIndex === signerIndex) {
                const postBalance = postTokenBalances.find(
                  (pb) => pb.accountIndex === signerIndex && pb.mint === mint
                );
                if (postBalance) {
                  const preAmount = parseFloat(preBalance.uiTokenAmount?.uiAmountString || '0');
                  const postAmount = parseFloat(postBalance.uiTokenAmount?.uiAmountString || '0');
                  signerTokenChange = postAmount - preAmount;
                  if (!accountOwner) accountOwner = preBalance.owner || '';
                  break;
                }
              }
            }
            
            // Check for new token accounts owned by signer
            if (Math.abs(signerTokenChange) < 0.0001) {
              for (const postBalance of postTokenBalances) {
                if (postBalance.mint === mint) {
                  const preBalance = preTokenBalances.find(
                    (pb) => pb.accountIndex === postBalance.accountIndex
                  );
                  if (!preBalance && postBalance.owner === signer) {
                    // New token account owned by signer - this is a buy
                    signerTokenChange = parseFloat(postBalance.uiTokenAmount?.uiAmountString || '0');
                    if (!accountOwner) accountOwner = postBalance.owner || '';
                    break;
                  }
                }
              }
            }
            
            // Calculate total token balance change (for amount calculation)
            // But use signer's change for side determination
            for (const preBalance of preTokenBalances) {
              if (preBalance.mint === mint) {
                const postBalance = postTokenBalances.find(
                  (pb) => pb.accountIndex === preBalance.accountIndex && pb.mint === mint
                );
                if (postBalance) {
                  const preAmount = parseFloat(preBalance.uiTokenAmount?.uiAmountString || '0');
                  const postAmount = parseFloat(postBalance.uiTokenAmount?.uiAmountString || '0');
                  const change = postAmount - preAmount;
                  if (preBalance.accountIndex !== signerIndex) {
                    otherTokenChange += change;
                  }
                }
              }
            }
            
            // Also check for new token accounts
            for (const postBalance of postTokenBalances) {
              if (postBalance.mint === mint) {
                const preBalance = preTokenBalances.find(
                  (pb) => pb.accountIndex === postBalance.accountIndex
                );
                if (!preBalance) {
                  const postAmount = parseFloat(postBalance.uiTokenAmount?.uiAmountString || '0');
                  if (postBalance.accountIndex !== signerIndex && postBalance.owner !== signer) {
                    otherTokenChange += postAmount;
                  }
                }
              }
            }
            
            // Total token change = signer change + other changes
            tokenBalanceChange = signerTokenChange + otherTokenChange;

            // Calculate SOL balance changes for ALL accounts
            // Find the account that lost SOL (buyer) or gained SOL (seller)
            // CRITICAL: When searching by token mint, the TRADER is the one with both SOL and token changes
            let buyerSolChange = 0;
            let sellerSolChange = 0;
            let buyerAccount = '';
            let sellerAccount = '';
            let actualTraderTokenChange = 0; // Track the actual trader's token change
            
            if (preBalances.length > 0 && postBalances.length > 0) {
              // Analyze all accounts to find buyer and seller
              for (let i = 0; i < Math.min(preBalances.length, postBalances.length); i++) {
                const solChange = (postBalances[i] - preBalances[i]) / 1e9;
                
                // Check if this account has token balance changes
                let accountTokenChange = 0;
                
                // Check existing token accounts
                for (const preBalance of preTokenBalances) {
                  if (preBalance.mint === mint && preBalance.accountIndex === i) {
                    const postBalance = postTokenBalances.find(
                      (pb) => pb.accountIndex === i && pb.mint === mint
                    );
                    if (postBalance) {
                      const preAmt = parseFloat(preBalance.uiTokenAmount?.uiAmountString || '0');
                      const postAmt = parseFloat(postBalance.uiTokenAmount?.uiAmountString || '0');
                      accountTokenChange += (postAmt - preAmt);
                    }
                  }
                }
                
                // Also check for new token accounts for this account index
                for (const postBalance of postTokenBalances) {
                  if (postBalance.mint === mint && postBalance.accountIndex === i) {
                    const preBalance = preTokenBalances.find(
                      (pb) => pb.accountIndex === i && pb.mint === mint
                    );
                    if (!preBalance) {
                      // New token account
                      const postAmt = parseFloat(postBalance.uiTokenAmount?.uiAmountString || '0');
                      accountTokenChange += postAmt;
                    }
                  }
                }
                
                // Buyer: loses SOL, gains tokens
                // CRITICAL: Check both conditions - SOL loss AND token gain
                if (solChange < -0.0001 && accountTokenChange > 0.0001) {
                  const solLoss = Math.abs(solChange);
                  // Only update if this is a larger change or we haven't found one yet
                  if (buyerSolChange === 0 || solLoss > buyerSolChange) {
                    buyerSolChange = solLoss;
                    if (!buyerAccount && accounts[i]) {
                      buyerAccount = accounts[i]?.pubkey?.toBase58() || '';
                      // This is the actual trader (buyer)
                      actualTraderTokenChange = accountTokenChange;
                      signerTokenChange = accountTokenChange; // Update for side detection
                      console.log(`  ✅ Found BUYER: account[${i}] lost ${solLoss.toFixed(6)} SOL, gained ${accountTokenChange.toFixed(4)} tokens`);
                    }
                  }
                }
                
                // Seller: gains SOL, loses tokens
                // CRITICAL: Check both conditions - SOL gain AND token loss
                if (solChange > 0.0001 && accountTokenChange < -0.0001) {
                  const solGain = solChange;
                  // Only update if this is a larger change or we haven't found one yet
                  if (sellerSolChange === 0 || solGain > sellerSolChange) {
                    sellerSolChange = solGain;
                    if (!sellerAccount && accounts[i]) {
                      sellerAccount = accounts[i]?.pubkey?.toBase58() || '';
                      // This is the actual trader (seller)
                      actualTraderTokenChange = accountTokenChange;
                      signerTokenChange = accountTokenChange; // Update for side detection
                      console.log(`  ✅ Found SELLER: account[${i}] gained ${solGain.toFixed(6)} SOL, lost ${Math.abs(accountTokenChange).toFixed(4)} tokens`);
                    }
                  }
                }
              }
              
              // Calculate the actual SOL change for the trade
              // If we identified a buyer, use their SOL loss
              // If we identified a seller, use their SOL gain
              if (buyerSolChange > 0) {
                solBalanceChange = -buyerSolChange; // Negative because buyer lost SOL
              } else if (sellerSolChange > 0) {
                solBalanceChange = sellerSolChange; // Positive because seller gained SOL
              } else {
                // Fallback: use signer's SOL change
                solBalanceChange = (postBalances[0] - preBalances[0]) / 1e9;
              }
            } else {
              // Fallback to signer's balance
              solBalanceChange = (postBalances[0] - preBalances[0]) / 1e9;
            }

            // Determine if it's a buy or sell
            // In pump.fun:
            // - BUY: User sends SOL to bonding curve, receives tokens (user loses SOL, gains tokens)
            // - SELL: User sends tokens to bonding curve, receives SOL (user loses tokens, gains SOL)
            // 
            // CRITICAL: buyerSolChange is the ABSOLUTE VALUE of SOL lost (positive number)
            //           sellerSolChange is the SOL gained (positive number)
            //           tokenBalanceChange: positive = gained tokens, negative = lost tokens
            
            let isBuy = false;
            let isSell = false;
            
            // Primary check: use identified buyer/seller from account analysis
            // buyerSolChange > 0 means we found someone who LOST SOL (buyer)
            // AND they must have GAINED tokens (tokenBalanceChange > 0)
            if (buyerSolChange > 0 && tokenBalanceChange > 0.0001) {
              isBuy = true;
            } 
            // sellerSolChange > 0 means we found someone who GAINED SOL (seller)
            // AND they must have LOST tokens (tokenBalanceChange < 0)
            else if (sellerSolChange > 0 && tokenBalanceChange < -0.0001) {
              isSell = true;
            } 
            // Fallback: use overall balance changes from signer
            // BUY: signer lost SOL (negative solBalanceChange) AND gained tokens (positive tokenBalanceChange)
            else if (solBalanceChange < -0.0001 && tokenBalanceChange > 0.0001) {
              isBuy = true;
            } 
            // SELL: signer gained SOL (positive solBalanceChange) AND lost tokens (negative tokenBalanceChange)
            else if (solBalanceChange > 0.0001 && tokenBalanceChange < -0.0001) {
              isSell = true;
            }

            if (!isBuy && !isSell) continue; // Not a clear trade

            // Calculate real price and amounts
            const solAmount = Math.abs(solBalanceChange);
            const tokenAmount = Math.abs(tokenBalanceChange);
            const price = tokenAmount > 0 ? solAmount / tokenAmount : 0;

            if (price === 0 || solAmount < 0.0001) continue; // Too small

            // Signer already retrieved above

            // Use identified buyer/seller accounts, or fallback to signer/owner
            // CRITICAL FIX: When isBuy=true, the trade is a BUY, so side='buy'
            //               When isSell=true, the trade is a SELL, so side='sell'
            const finalBuyer = buyerAccount || (isBuy ? signer : accountOwner);
            const finalSeller = sellerAccount || (isSell ? signer : accountOwner);
            
            // Use the appropriate SOL amount - always use absolute value
            // For BUY: buyer lost SOL (buyerSolChange is positive, represents loss)
            // For SELL: seller gained SOL (sellerSolChange is positive, represents gain)
            let finalSolAmount = 0;
            
            // Calculate signer's SOL change for fallback
            const signerSolChange = preBalances.length > 0 && postBalances.length > 0
              ? Math.abs((postBalances[0] - preBalances[0]) / 1e9)
              : 0;
            
            if (buyerSolChange > 0) {
              finalSolAmount = buyerSolChange; // Buyer's SOL loss (most accurate)
            } else if (sellerSolChange > 0) {
              finalSolAmount = sellerSolChange; // Seller's SOL gain (most accurate)
            } else if (signerSolChange > 0.0001) {
              // Use signer's SOL change as fallback
              finalSolAmount = signerSolChange;
            } else {
              // Last resort: use calculated solBalanceChange
              finalSolAmount = Math.abs(solBalanceChange);
            }
            
            // Ensure we have a valid amount
            if (finalSolAmount < 0.0001) {
              continue; // Skip trades with invalid amounts
            }

            // Ensure we have valid values
            if (finalSolAmount > 0 && tokenAmount > 0) {
              // CRITICAL: Determine side based on token balance change direction
              // If token balance increased (positive) = BUY (user received tokens)
              // If token balance decreased (negative) = SELL (user sent tokens)
              // BUT: We need to check which account actually changed
              // In pump.fun, the signer is usually the trader
              
              // Determine side based on the ACTUAL TRADER's token change
              // When searching by token mint, the trader is the one with SOL + token changes
              // CRITICAL: Prioritize buyer/seller detection over token change direction
              let tradeSide = 'sell'; // Default fallback
              let sideReason = '';
              
              // Primary method: Use buyer/seller detection (most reliable)
              // Check if we found a buyer (lost SOL) or seller (gained SOL)
              if (buyerSolChange > 0) {
                // We found someone who lost SOL - they're the buyer
                tradeSide = 'buy';
                sideReason = `buyerSolChange=${buyerSolChange.toFixed(6)} (account lost SOL)`;
              } else if (sellerSolChange > 0) {
                // We found someone who gained SOL - they're the seller
                tradeSide = 'sell';
                sideReason = `sellerSolChange=${sellerSolChange.toFixed(6)} (account gained SOL)`;
              } else {
                // Fallback: Use token change direction
                // Check signer's SOL change as additional indicator
                const signerSolChangeForSide = preBalances.length > 0 && postBalances.length > 0
                  ? (postBalances[0] - preBalances[0]) / 1e9
                  : 0;
                
                const traderTokenChangeForSide = Math.abs(actualTraderTokenChange) > 0.0001 
                  ? actualTraderTokenChange 
                  : (Math.abs(signerTokenChange) > 0.0001 ? signerTokenChange : tokenBalanceChange);
                
                // If signer lost SOL and gained tokens = BUY
                if (signerSolChangeForSide < -0.0001 && traderTokenChangeForSide > 0.0001) {
                  tradeSide = 'buy';
                  sideReason = `signerSolChange=${signerSolChangeForSide.toFixed(6)} (negative) + tokenChange=${traderTokenChangeForSide.toFixed(4)} (positive)`;
                } 
                // If signer gained SOL and lost tokens = SELL
                else if (signerSolChangeForSide > 0.0001 && traderTokenChangeForSide < -0.0001) {
                  tradeSide = 'sell';
                  sideReason = `signerSolChange=${signerSolChangeForSide.toFixed(6)} (positive) + tokenChange=${traderTokenChangeForSide.toFixed(4)} (negative)`;
                }
                // Fallback to token change only
                else if (traderTokenChangeForSide > 0.0001) {
                  tradeSide = 'buy';
                  sideReason = `traderTokenChange=${traderTokenChangeForSide.toFixed(4)} (positive, fallback)`;
                } else if (traderTokenChangeForSide < -0.0001) {
                  tradeSide = 'sell';
                  sideReason = `traderTokenChange=${traderTokenChangeForSide.toFixed(4)} (negative, fallback)`;
                } else {
                  tradeSide = tokenBalanceChange > 0 ? 'buy' : 'sell';
                  sideReason = `tokenBalanceChange=${tokenBalanceChange.toFixed(4)} (last fallback)`;
                }
              }
              
              // Debug logging with all details
              console.log(`🔍 Trade: ${tradeSide.toUpperCase()} | Reason: ${sideReason} | SOL: ${finalSolAmount.toFixed(6)} | Tokens: ${tokenAmount.toFixed(4)} | actualTraderTokenChange: ${actualTraderTokenChange.toFixed(4)} | signerTokenChange: ${signerTokenChange.toFixed(4)} | tokenBalanceChange: ${tokenBalanceChange.toFixed(4)} | buyerSol: ${buyerSolChange.toFixed(6)} | sellerSol: ${sellerSolChange.toFixed(6)} | buyerAccount: ${buyerAccount ? buyerAccount.substring(0, 8) + '...' : 'N/A'} | sellerAccount: ${sellerAccount ? sellerAccount.substring(0, 8) + '...' : 'N/A'}`);
              
              trades.push({
                signature: sig.signature,
                timestamp: sig.blockTime || Math.floor(Date.now() / 1000),
                price: price,
                amount: tokenAmount,
                tokenAmount: tokenAmount,
                side: tradeSide,
                buyer: finalBuyer,
                seller: finalSeller,
                solAmount: finalSolAmount,
              });
            }
            
            // Delay to avoid rate limiting (200ms between requests)
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (txError) {
            continue;
          }
        }

        if (trades.length > 0) {
          console.log(`✅ Parsed ${trades.length} real trades from blockchain`);
          return res.json(trades);
        }
      }
    } catch (rpcError: any) {
      console.log('RPC trades parsing failed:', rpcError.message);
    }

    // Method 6: All methods failed - return empty array
    console.log('⚠️ No real trades found after trying all methods');
    console.log('💡 Methods tried:');
    console.log('   1. DexScreener API');
    console.log('   2. Helius API');
    console.log('   3. PumpFunTransactionParser');
    console.log('   4. Real-time WebSocket listener');
    console.log('   5. On-chain parsing');
    console.log('💡 Possible reasons:');
    console.log('   • Token has no recent activity');
    console.log('   • RPC is slow or rate-limited');
    console.log('   • Token is too new');
    console.log('   • Transactions are still processing');
    console.log('💡 The system only shows 100% real trades from blockchain - no fake data');
    return res.json([]);

  } catch (error) {
    console.error('Get trades error:', error);
    return res.status(500).json({ error: String(error) });
  }
});

app.get('/api/pumpfun/token/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    console.log(`🔍 Fetching token info for: ${mint}`);
    
    const tokenInfo: any = {
      mint,
      name: '',
      symbol: '',
      description: '',
      image_uri: '',
      market_cap: 0,
      usd_market_cap: 0,
      price_usd: 0,
      price_sol: 0,
      holders: 0,
      supply: 0,
      complete: false,
      created_timestamp: 0,
      creator: '',
      bonding_curve: '',
      associated_bonding_curve: '',
      associated_market: '',
      volume_24h: 0,
      price_change_24h: 0,
      liquidity: 0,
      // Additional metrics
      dev_holdings: 0,
      dev_holdings_percent: 0,
      sniper_holdings: 0,
      sniper_holdings_percent: 0,
      insider_holdings: 0,
      insider_holdings_percent: 0,
      dex_is_paid: false,
      // Social links
      twitter: '',
      telegram: '',
      website: '',
      discord: '',
    };

    // Method 1: Try DexScreener API (most reliable)
    try {
      const dexUrl = `https://api.dexscreener.com/latest/dex/tokens/${mint}`;
      const dexResponse = await fetch(dexUrl, {
        headers: { 'Accept': 'application/json' },
      });

      if (dexResponse.ok) {
        const dexData = await dexResponse.json();
        if (dexData.pairs && dexData.pairs.length > 0) {
          const pair = dexData.pairs[0]; // Get the most liquid pair
          console.log(`✅ Found token info from DexScreener`);
          
          tokenInfo.name = pair.baseToken?.name || tokenInfo.name;
          tokenInfo.symbol = pair.baseToken?.symbol || tokenInfo.symbol;
          tokenInfo.image_uri = pair.baseToken?.logoURI || tokenInfo.image_uri;
          tokenInfo.price_usd = parseFloat(pair.priceUsd || 0);
          tokenInfo.price_sol = parseFloat(pair.priceNative || 0);
          tokenInfo.market_cap = parseFloat(pair.fdv || 0);
          tokenInfo.usd_market_cap = parseFloat(pair.marketCap || pair.fdv || 0);
          tokenInfo.volume_24h = parseFloat(pair.volume?.h24 || 0);
          tokenInfo.price_change_24h = parseFloat(pair.priceChange?.h24 || 0);
          tokenInfo.liquidity = parseFloat(pair.liquidity?.usd || 0);
          tokenInfo.holders = parseInt(pair.holders || 0);
          tokenInfo.complete = pair.liquidity?.usd ? parseFloat(pair.liquidity.usd) > 100000 : false;
          tokenInfo.associated_market = pair.url || '';
          
          // Check if DEX is paid (DexScreener premium features)
          // DexScreener free API has limited data, paid has more detailed info
          tokenInfo.dex_is_paid = !!(pair.liquidity?.usd && pair.volume?.h24 && pair.priceChange?.h24);
          
          console.log(`📊 DexScreener data: Liquidity=${tokenInfo.liquidity}, Volume=${tokenInfo.volume_24h}, Holders=${tokenInfo.holders}`);
        }
      }
    } catch (dexError) {
      console.log('DexScreener API failed:', dexError);
    }

    // Method 2: Try pump.fun API
    try {
      const pumpUrl = `https://frontend-api.pump.fun/coins/${mint}`;
      const pumpResponse = await fetch(pumpUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });

      if (pumpResponse.ok) {
        const pumpData = await pumpResponse.json();
        console.log(`✅ Found token info from pump.fun API`);
        
        // Merge pump.fun data (may have more details)
        if (pumpData.name && !tokenInfo.name) tokenInfo.name = pumpData.name;
        if (pumpData.symbol && !tokenInfo.symbol) tokenInfo.symbol = pumpData.symbol;
        if (pumpData.description) tokenInfo.description = pumpData.description;
        if (pumpData.image_uri) tokenInfo.image_uri = pumpData.image_uri;
        if (pumpData.market_cap) tokenInfo.market_cap = parseFloat(pumpData.market_cap) || 0;
        if (pumpData.usd_market_cap) tokenInfo.usd_market_cap = parseFloat(pumpData.usd_market_cap) || 0;
        if (pumpData.complete !== undefined) tokenInfo.complete = pumpData.complete;
        if (pumpData.created_timestamp) tokenInfo.created_timestamp = pumpData.created_timestamp;
        if (pumpData.creator) tokenInfo.creator = pumpData.creator;
        if (pumpData.pumpfun?.bonding_curve) tokenInfo.bonding_curve = pumpData.pumpfun.bonding_curve;
        if (pumpData.pumpfun?.associated_bonding_curve) tokenInfo.associated_bonding_curve = pumpData.pumpfun.associated_bonding_curve;
        if (pumpData.pumpfun?.associated_market) tokenInfo.associated_market = pumpData.pumpfun.associated_market;

        // Extract social links from pump.fun
        if (pumpData.twitter) tokenInfo.twitter = pumpData.twitter;
        if (pumpData.telegram) tokenInfo.telegram = pumpData.telegram;
        if (pumpData.website) tokenInfo.website = pumpData.website;
        if (pumpData.discord) tokenInfo.discord = pumpData.discord;

        // Also check for socials in different formats
        if (pumpData.socials) {
          if (pumpData.socials.twitter) tokenInfo.twitter = pumpData.socials.twitter;
          if (pumpData.socials.telegram) tokenInfo.telegram = pumpData.socials.telegram;
          if (pumpData.socials.website) tokenInfo.website = pumpData.socials.website;
          if (pumpData.socials.discord) tokenInfo.discord = pumpData.socials.discord;
        }

        // Parse description for social links if not found
        if (!tokenInfo.twitter && pumpData.description) {
          const twitterMatch = pumpData.description.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i);
          if (twitterMatch) tokenInfo.twitter = `https://twitter.com/${twitterMatch[1]}`;
        }
        if (!tokenInfo.telegram && pumpData.description) {
          const telegramMatch = pumpData.description.match(/(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)/i);
          if (telegramMatch) tokenInfo.telegram = `https://t.me/${telegramMatch[1]}`;
        }
        if (!tokenInfo.website && pumpData.description) {
          const websiteMatch = pumpData.description.match(/https?:\/\/(?!twitter\.com|x\.com|t\.me|telegram\.me|discord\.gg)[^\s\)]+/i);
          if (websiteMatch) tokenInfo.website = websiteMatch[0];
        }
      }
    } catch (pumpError) {
      console.log('Pump.fun API failed:', pumpError);
    }

    // Method 3: Get on-chain data (supply, decimals, holders, liquidity, metadata)
    try {
      const { Connection, PublicKey } = require('@solana/web3.js');
      const { getMint } = require('@solana/spl-token');

      const config = configManager.getConfig();
      const rpcUrl = config.rpcUrl || 'https://mainnet.helius-rpc.com/?api-key=7b05747c-b100-4159-ba5f-c85e8c8d3997';
      const connection = new Connection(rpcUrl, 'confirmed');
      const mintPubkey = new PublicKey(mint);

      // Get mint info
      const mintInfo = await getMint(connection, mintPubkey);
      tokenInfo.supply = Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals);

      // Get holders count and analyze holdings distribution
      try {
        const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey);
        // Count accounts with non-zero balance
        const nonZeroAccounts = largestAccounts.value.filter((acc: any) =>
          acc.uiAmount && acc.uiAmount > 0
        );
        
        if (!tokenInfo.holders || tokenInfo.holders === 0) {
          tokenInfo.holders = nonZeroAccounts.length;
          // Estimate: if we have 20 accounts (max returned), there are likely more
          if (nonZeroAccounts.length >= 20) {
            tokenInfo.holders = Math.round(nonZeroAccounts.length * 5); // Estimate 5x
          }
        }

        // Calculate total supply for percentage calculations
        const totalSupply = tokenInfo.supply || 0;
        
        if (totalSupply > 0 && nonZeroAccounts.length > 0) {
          // Get account addresses for analysis
          const accountAddresses = nonZeroAccounts.map((acc: any) => acc.address.toBase58());
          const accountAmounts = nonZeroAccounts.map((acc: any) => acc.uiAmount || 0);
          
          // Calculate dev holdings (creator wallet - usually one of the top holders)
          // If we have creator address, use it; otherwise assume top holder is dev
          if (tokenInfo.creator) {
            const creatorIndex = accountAddresses.findIndex((addr: string) => addr === tokenInfo.creator);
            if (creatorIndex >= 0) {
              tokenInfo.dev_holdings = accountAmounts[creatorIndex];
              tokenInfo.dev_holdings_percent = (accountAmounts[creatorIndex] / totalSupply) * 100;
            }
          }
          
          // If no creator match, assume top holder might be dev (if holding > 5%)
          if (tokenInfo.dev_holdings === 0 && accountAmounts.length > 0) {
            const topHolderAmount = accountAmounts[0];
            const topHolderPercent = (topHolderAmount / totalSupply) * 100;
            if (topHolderPercent > 5) {
              tokenInfo.dev_holdings = topHolderAmount;
              tokenInfo.dev_holdings_percent = topHolderPercent;
            }
          }
          
          // Calculate sniper holdings (wallets holding significant amounts but not dev)
          // Snipers typically hold 1-10% of supply
          let sniperTotal = 0;
          for (let i = 0; i < accountAmounts.length; i++) {
            const amount = accountAmounts[i];
            const percent = (amount / totalSupply) * 100;
            // Exclude dev holdings
            if (accountAddresses[i] !== tokenInfo.creator && percent >= 1 && percent <= 10) {
              sniperTotal += amount;
            }
          }
          tokenInfo.sniper_holdings = sniperTotal;
          tokenInfo.sniper_holdings_percent = (sniperTotal / totalSupply) * 100;
          
          // Calculate insider holdings (wallets holding > 10% but not dev)
          // Insiders typically hold large amounts (>10%)
          let insiderTotal = 0;
          for (let i = 0; i < accountAmounts.length; i++) {
            const amount = accountAmounts[i];
            const percent = (amount / totalSupply) * 100;
            // Exclude dev holdings
            if (accountAddresses[i] !== tokenInfo.creator && percent > 10) {
              insiderTotal += amount;
            }
          }
          tokenInfo.insider_holdings = insiderTotal;
          tokenInfo.insider_holdings_percent = (insiderTotal / totalSupply) * 100;
          
          console.log(`📊 Holdings analysis: Dev=${tokenInfo.dev_holdings_percent.toFixed(2)}%, Snipers=${tokenInfo.sniper_holdings_percent.toFixed(2)}%, Insiders=${tokenInfo.insider_holdings_percent.toFixed(2)}%`);
        }
      } catch (holderError) {
        console.log('Could not analyze holdings:', holderError);
      }

      // Get liquidity from bonding curve (pump.fun specific)
      if (!tokenInfo.liquidity || tokenInfo.liquidity === 0) {
        try {
          // Pump.fun bonding curve program
          const PUMP_FUN_PROGRAM = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6Px');

          // Find the bonding curve account for this token
          const [bondingCurve] = PublicKey.findProgramAddressSync(
            [Buffer.from('bonding-curve'), mintPubkey.toBuffer()],
            PUMP_FUN_PROGRAM
          );

          // Get SOL balance of bonding curve = liquidity
          const bondingCurveBalance = await connection.getBalance(bondingCurve);
          const liquiditySOL = bondingCurveBalance / 1e9;

          if (liquiditySOL > 0) {
            // Estimate USD value (rough SOL price estimate)
            tokenInfo.liquidity = liquiditySOL * 200; // Approximate SOL price
            console.log(`📊 Liquidity from bonding curve: ${liquiditySOL.toFixed(4)} SOL (~$${tokenInfo.liquidity.toFixed(2)})`);
          }
        } catch (liquidityError) {
          console.log('Could not get bonding curve liquidity:', liquidityError);
        }
      }

      // Get token metadata for image (Metaplex)
      if (!tokenInfo.image_uri) {
        try {
          // Metaplex Token Metadata Program
          const METADATA_PROGRAM = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

          // Find metadata PDA
          const [metadataPDA] = PublicKey.findProgramAddressSync(
            [
              Buffer.from('metadata'),
              METADATA_PROGRAM.toBuffer(),
              mintPubkey.toBuffer(),
            ],
            METADATA_PROGRAM
          );

          const metadataAccount = await connection.getAccountInfo(metadataPDA);
          if (metadataAccount) {
            // Parse metadata (simplified - just look for URI in the data)
            const data = metadataAccount.data;

            // Find URI in metadata (it's usually a JSON URL)
            const dataStr = data.toString('utf8');
            const uriMatch = dataStr.match(/https?:\/\/[^\x00\s]+\.json/);

            if (uriMatch) {
              const metadataUri = uriMatch[0].replace(/\x00/g, '');
              console.log(`📊 Found metadata URI: ${metadataUri}`);

              // Fetch the JSON metadata
              try {
                const metaResponse = await fetch(metadataUri, {
                  headers: { 'Accept': 'application/json' },
                });
                if (metaResponse.ok) {
                  const metaJson = await metaResponse.json();
                  if (metaJson.image) {
                    tokenInfo.image_uri = metaJson.image;
                    console.log(`📊 Found image from metadata: ${tokenInfo.image_uri}`);
                  }
                  if (metaJson.name && !tokenInfo.name) tokenInfo.name = metaJson.name;
                  if (metaJson.symbol && !tokenInfo.symbol) tokenInfo.symbol = metaJson.symbol;
                  if (metaJson.description && !tokenInfo.description) tokenInfo.description = metaJson.description;
                }
              } catch (fetchError) {
                console.log('Could not fetch metadata JSON:', fetchError);
              }
            }
          }
        } catch (metadataError) {
          console.log('Could not get Metaplex metadata:', metadataError);
        }
      }

      // Calculate price from recent trade if not available
      if (!tokenInfo.price_sol || tokenInfo.price_sol === 0) {
        try {
          const signatures = await connection.getSignaturesForAddress(mintPubkey, { limit: 5 });
          if (signatures.length > 0) {
            for (const sig of signatures) {
              const tx = await connection.getTransaction(sig.signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0,
              });

              if (tx?.meta && !tx.meta.err) {
                const preBalances = tx.meta.preBalances || [];
                const postBalances = tx.meta.postBalances || [];
                const preTokenBalances = tx.meta.preTokenBalances || [];
                const postTokenBalances = tx.meta.postTokenBalances || [];

                // Find token and SOL changes
                for (const post of postTokenBalances) {
                  if (post.mint !== mint) continue;
                  const pre = preTokenBalances.find((p: any) => p.mint === mint && p.accountIndex === post.accountIndex);
                  const preAmt = pre ? parseFloat(pre.uiTokenAmount?.uiAmountString || '0') : 0;
                  const postAmt = parseFloat(post.uiTokenAmount?.uiAmountString || '0');
                  const tokenChange = Math.abs(postAmt - preAmt);

                  if (tokenChange > 0) {
                    // Find corresponding SOL change
                    const idx = post.accountIndex;
                    if (idx < preBalances.length && idx < postBalances.length) {
                      const solChange = Math.abs((postBalances[idx] - preBalances[idx]) / 1e9);
                      if (solChange > 0.0001) {
                        tokenInfo.price_sol = solChange / tokenChange;
                        tokenInfo.price_usd = tokenInfo.price_sol * 200; // Approximate SOL price
                        console.log(`📊 Price from trade: ${tokenInfo.price_sol.toFixed(10)} SOL`);
                        break;
                      }
                    }
                  }
                }
                if (tokenInfo.price_sol > 0) break;
              }
            }
          }
        } catch (priceError) {
          console.log('Could not calculate price from trades:', priceError);
        }
      }

    } catch (onChainError) {
      console.log('On-chain data fetch failed:', onChainError);
    }

    // If we still don't have a name, use a default
    if (!tokenInfo.name) {
      tokenInfo.name = `Token ${mint.substring(0, 8)}`;
    }
    if (!tokenInfo.symbol) {
      tokenInfo.symbol = 'TKN';
    }

    return res.json(tokenInfo);

  } catch (error) {
    console.error('Get token error:', error);
    return res.status(500).json({ error: String(error) });
  }
});

// ==================== PORTFOLIO TRACKER API ====================

// Get portfolio summary
app.get('/api/portfolio/summary', (req, res) => {
  try {
    const summary = portfolioTracker.getPortfolioSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get all positions
app.get('/api/portfolio/positions', (req, res) => {
  try {
    const status = req.query.status as string;
    const positions = status === 'open' 
      ? portfolioTracker.getOpenPositions()
      : portfolioTracker.getAllPositions();
    res.json({ positions });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get positions by token
app.get('/api/portfolio/positions/:tokenMint', (req, res) => {
  try {
    const { tokenMint } = req.params;
    const positions = portfolioTracker.getPositionsByToken(tokenMint);
    res.json({ positions });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get trades
app.get('/api/portfolio/trades', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const trades = portfolioTracker.getTrades(limit);
    res.json({ trades });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get trades by token
app.get('/api/portfolio/trades/:tokenMint', (req, res) => {
  try {
    const { tokenMint } = req.params;
    const trades = portfolioTracker.getTradesByToken(tokenMint);
    res.json({ trades });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ==================== STOP LOSS / TAKE PROFIT API ====================

// Get all active orders
app.get('/api/stop-loss/orders', (req, res) => {
  try {
    const orders = stopLossManager.getActiveOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get orders by token
app.get('/api/stop-loss/orders/:tokenMint', (req, res) => {
  try {
    const { tokenMint } = req.params;
    const orders = stopLossManager.getOrdersByToken(tokenMint);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Create stop loss order
app.post('/api/stop-loss/create', (req, res) => {
  try {
    const {
      positionId,
      tokenMint,
      tokenName,
      tokenSymbol,
      walletIndex,
      walletAddress,
      triggerPrice,
      amount = 100,
    } = req.body;

    const order = stopLossManager.createStopLoss(
      positionId,
      tokenMint,
      tokenName,
      tokenSymbol,
      walletIndex,
      walletAddress,
      triggerPrice,
      amount
    );

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Create take profit order
app.post('/api/stop-loss/take-profit', (req, res) => {
  try {
    const {
      positionId,
      tokenMint,
      tokenName,
      tokenSymbol,
      walletIndex,
      walletAddress,
      triggerPrice,
      amount = 100,
    } = req.body;

    const order = stopLossManager.createTakeProfit(
      positionId,
      tokenMint,
      tokenName,
      tokenSymbol,
      walletIndex,
      walletAddress,
      triggerPrice,
      amount
    );

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Create trailing stop order
app.post('/api/stop-loss/trailing', (req, res) => {
  try {
    const {
      positionId,
      tokenMint,
      tokenName,
      tokenSymbol,
      walletIndex,
      walletAddress,
      trailingPercent,
      currentPrice,
    } = req.body;

    const order = stopLossManager.createTrailingStop(
      positionId,
      tokenMint,
      tokenName,
      tokenSymbol,
      walletIndex,
      walletAddress,
      trailingPercent,
      currentPrice
    );

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Cancel order
app.post('/api/stop-loss/cancel/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    const cancelled = stopLossManager.cancelOrder(orderId);
    if (cancelled) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Order not found or already cancelled' });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ==================== PRICE ALERTS API ====================

// Get all active alerts
app.get('/api/alerts', (req, res) => {
  try {
    const alerts = priceAlertManager.getActiveAlerts();
    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get alerts by token
app.get('/api/alerts/:tokenMint', (req, res) => {
  try {
    const { tokenMint } = req.params;
    const alerts = priceAlertManager.getAlertsByToken(tokenMint);
    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Create alert
app.post('/api/alerts/create', (req, res) => {
  try {
    const {
      tokenMint,
      tokenName,
      tokenSymbol,
      alertType,
      targetValue,
    } = req.body;

    const alert = priceAlertManager.createAlert(
      tokenMint,
      tokenName,
      tokenSymbol,
      alertType,
      targetValue
    );

    res.json({ success: true, alert });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Cancel alert
app.post('/api/alerts/cancel/:alertId', (req, res) => {
  try {
    const { alertId } = req.params;
    const cancelled = priceAlertManager.cancelAlert(alertId);
    if (cancelled) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Alert not found or already cancelled' });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ==================== JUPITER SWAP ENDPOINTS ====================

// Get swap quote
app.get('/api/jupiter/quote', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { inputMint, outputMint, amount, slippage } = req.query;

    if (!inputMint || !outputMint || !amount) {
      return res.status(400).json({ error: 'inputMint, outputMint, and amount are required' });
    }

    const quote = await jupiterService.getQuote(
      inputMint as string,
      outputMint as string,
      parseInt(amount as string),
      parseInt(slippage as string) || 100
    );

    if (!quote) {
      return res.status(404).json({ error: 'No route found' });
    }

    res.json(quote);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Execute swap via Jupiter (with trading fee)
app.post('/api/jupiter/swap', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;
    const { tokenMint, amount, action, slippage, walletIndex } = req.body;

    if (!tokenMint || !amount || !action) {
      return res.status(400).json({ error: 'tokenMint, amount, and action (buy/sell) are required' });
    }

    if (!isMongoConnected() || !userId) {
      return res.status(503).json({ error: 'Database connection required for trading' });
    }

    // Get user wallet
    const wallet = walletIndex
      ? await walletService.getWalletWithKey(userId, walletIndex)
      : await walletService.getMasterWalletWithKey(userId);

    if (!wallet) {
      return res.status(400).json({ error: 'Wallet not found' });
    }

    let result;
    if (action === 'buy') {
      result = await jupiterService.buyToken(tokenMint, parseFloat(amount), wallet.keypair, slippage || 100);
    } else {
      result = await jupiterService.sellToken(tokenMint, parseInt(amount), wallet.keypair, slippage || 100);
    }

    // Record trading fee
    if (result.success && result.feePaid) {
      await TradingFee.create({
        userId,
        tokenMint,
        tradeType: action,
        tradeAmount: parseFloat(amount),
        feePercent: TRADING_FEE_PERCENT,
        feeAmount: result.feePaid,
        feeCollected: true,
        signature: result.signature
      });
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get best route info
app.get('/api/jupiter/route', async (req, res) => {
  try {
    const { inputMint, outputMint, amount } = req.query;

    if (!inputMint || !outputMint || !amount) {
      return res.status(400).json({ error: 'inputMint, outputMint, and amount are required' });
    }

    const route = await jupiterService.getBestRoute(
      inputMint as string,
      outputMint as string,
      parseInt(amount as string)
    );

    if (!route) {
      return res.status(404).json({ error: 'No route found' });
    }

    res.json(route);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TOKEN AUDIT ENDPOINTS ====================

// Full token audit
app.get('/api/audit/token/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    const audit = await tokenAuditService.auditToken(mint);
    res.json(audit);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Quick safety check
app.get('/api/audit/quick/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    const result = await tokenAuditService.quickCheck(mint);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Honeypot check
app.get('/api/audit/honeypot/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    const result = await tokenAuditService.isHoneypot(mint);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TRADING FEES ENDPOINTS ====================

// Get user's trading fees summary
app.get('/api/fees/summary', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;

    const fees = await TradingFee.aggregate([
      { $match: { userId: new (require('mongoose').Types.ObjectId)(userId) } },
      {
        $group: {
          _id: null,
          totalFees: { $sum: '$feeAmount' },
          totalTrades: { $sum: 1 },
          totalVolume: { $sum: '$tradeAmount' }
        }
      }
    ]);

    res.json(fees[0] || { totalFees: 0, totalTrades: 0, totalVolume: 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's fee history
app.get('/api/fees/history', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit as string) || 50;

    const fees = await TradingFee.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    res.json(fees);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get platform fee stats
app.get('/api/fees/platform', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await TradingFee.aggregate([
      {
        $group: {
          _id: null,
          totalFeesCollected: { $sum: '$feeAmount' },
          totalTrades: { $sum: 1 },
          totalVolume: { $sum: '$tradeAmount' }
        }
      }
    ]);

    const last24h = await TradingFee.aggregate([
      { $match: { timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: null,
          fees24h: { $sum: '$feeAmount' },
          trades24h: { $sum: 1 },
          volume24h: { $sum: '$tradeAmount' }
        }
      }
    ]);

    res.json({
      allTime: stats[0] || { totalFeesCollected: 0, totalTrades: 0, totalVolume: 0 },
      last24h: last24h[0] || { fees24h: 0, trades24h: 0, volume24h: 0 }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SNIPER BOT ENDPOINTS ====================

// Get sniper config
app.get('/api/sniper/config', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const config = await sniperBot.getConfig(req.userId!);
    res.json(config || { enabled: false });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update sniper config
app.put('/api/sniper/config', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const config = await sniperBot.updateConfig(req.userId!, req.body);
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Enable sniper
app.post('/api/sniper/enable', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    await sniperBot.enable(req.userId!);
    res.json({ success: true, message: 'Sniper enabled' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Disable sniper
app.post('/api/sniper/disable', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    await sniperBot.disable(req.userId!);
    res.json({ success: true, message: 'Sniper disabled' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get snipe history
app.get('/api/sniper/history', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await sniperBot.getHistory(req.userId!, limit);
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Check if token passes sniper filters
app.post('/api/sniper/check', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { tokenMint } = req.body;
    const config = await sniperBot.getConfig(req.userId!);
    if (!config) {
      return res.status(400).json({ error: 'Sniper not configured' });
    }
    const result = await sniperBot.checkToken(tokenMint, config);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== DCA BOT ENDPOINTS ====================

// Create DCA order
app.post('/api/dca/orders', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { tokenMint, totalAmountSol, amountPerBuy, intervalMinutes, tokenName, walletIndex } = req.body;

    if (!tokenMint || !totalAmountSol || !amountPerBuy) {
      return res.status(400).json({ error: 'tokenMint, totalAmountSol, and amountPerBuy are required' });
    }

    const order = await dcaBot.createOrder(
      req.userId!,
      tokenMint,
      totalAmountSol,
      amountPerBuy,
      intervalMinutes || 60,
      tokenName,
      walletIndex
    );

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's DCA orders
app.get('/api/dca/orders', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const status = req.query.status as string;
    const orders = await dcaBot.getUserOrders(req.userId!, status);
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Pause DCA order
app.post('/api/dca/orders/:orderId/pause', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const success = await dcaBot.pauseOrder(req.params.orderId, req.userId!);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Resume DCA order
app.post('/api/dca/orders/:orderId/resume', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const success = await dcaBot.resumeOrder(req.params.orderId, req.userId!);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel DCA order
app.delete('/api/dca/orders/:orderId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const success = await dcaBot.cancelOrder(req.params.orderId, req.userId!);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get DCA order execution history
app.get('/api/dca/orders/:orderId/history', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const history = await dcaBot.getOrderHistory(req.params.orderId);
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's DCA stats
app.get('/api/dca/stats', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await dcaBot.getUserStats(req.userId!);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== COPY TRADING ENDPOINTS ====================

// Follow a wallet
app.post('/api/copy/follow', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { walletAddress, label, copyBuys, copySells, maxCopyAmountSol, copyPercentage } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }

    const followed = await copyTradingService.followWallet(req.userId!, walletAddress, {
      label, copyBuys, copySells, maxCopyAmountSol, copyPercentage
    });

    res.json(followed);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Unfollow a wallet
app.delete('/api/copy/follow/:walletAddress', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const success = await copyTradingService.unfollowWallet(req.userId!, req.params.walletAddress);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get followed wallets
app.get('/api/copy/followed', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const wallets = await copyTradingService.getFollowedWallets(req.userId!);
    res.json(wallets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update follow settings
app.put('/api/copy/follow/:walletAddress', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await copyTradingService.updateFollowSettings(
      req.userId!,
      req.params.walletAddress,
      req.body
    );
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get copy trade history
app.get('/api/copy/history', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await copyTradingService.getCopyHistory(req.userId!, limit);
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get wallet leaderboard
app.get('/api/copy/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const sortBy = (req.query.sortBy as string) || 'pnl7d';
    const leaderboard = await copyTradingService.getLeaderboard(limit, sortBy);
    res.json(leaderboard);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's copy trading stats
app.get('/api/copy/stats', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await copyTradingService.getUserStats(req.userId!);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Analyze a wallet
app.get('/api/copy/analyze/:walletAddress', async (req, res) => {
  try {
    const analysis = await copyTradingService.analyzeWallet(req.params.walletAddress);
    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SUBSCRIPTION ENDPOINTS ====================

// Get user subscription
app.get('/api/subscription', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;
    let subscription = await Subscription.findOne({ userId }).lean();

    if (!subscription) {
      // Create default free subscription
      subscription = await Subscription.create({
        userId,
        plan: 'free',
        feeDiscount: 0,
        maxWallets: 5
      });
    }

    res.json(subscription);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get subscription plans
app.get('/api/subscription/plans', (req, res) => {
  res.json({
    free: {
      price: 0,
      feeDiscount: 0,
      maxWallets: 5,
      features: { copyTrading: false, sniperBot: false, dcaBot: false, advancedAnalytics: false }
    },
    basic: {
      price: 0.5, // SOL per month
      feeDiscount: 25,
      maxWallets: 10,
      features: { copyTrading: false, sniperBot: true, dcaBot: true, advancedAnalytics: false }
    },
    premium: {
      price: 1.5,
      feeDiscount: 50,
      maxWallets: 25,
      features: { copyTrading: true, sniperBot: true, dcaBot: true, advancedAnalytics: true }
    },
    whale: {
      price: 5,
      feeDiscount: 75,
      maxWallets: 100,
      features: { copyTrading: true, sniperBot: true, dcaBot: true, advancedAnalytics: true, prioritySupport: true }
    }
  });
});

// ==================== TOKEN FEED ENDPOINTS (Like Axiom/GMGN) ====================

// Get all tokens with filters
app.get('/api/tokens/feed', async (req, res) => {
  try {
    const filter = (req.query.filter as string) || 'all';
    // Default to 0 to allow new tokens with low/no liquidity
    const minLiquidity = req.query.minLiquidity !== undefined ? parseInt(req.query.minLiquidity as string) : 0;
    const maxAge = parseInt(req.query.maxAge as string) || 1440;
    const limit = parseInt(req.query.limit as string) || 50;

    console.log(`🔍 /api/tokens/feed: filter=${filter}, minLiquidity=${minLiquidity}, maxAge=${maxAge}, limit=${limit}`);
    console.log(`📊 TokenFeed status: isStarted=${tokenFeed.isServiceStarted() ? 'yes' : 'no'}, onChainTokens=${tokenFeed.getOnChainTokens().size}`);

    const tokens = await tokenFeed.fetchTokens({
      filter: filter as any,
      minLiquidity,
      maxAge,
      limit
    });

    console.log(`✅ /api/tokens/feed: Returning ${tokens.length} tokens`);

    res.json({
      success: true,
      count: tokens.length,
      tokens
    });
  } catch (error: any) {
    console.error('❌ /api/tokens/feed error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      count: 0,
      tokens: []
    });
  }
});

// Get NEW tokens (< 30 min old)
app.get('/api/tokens/new', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const tokens = await tokenFeed.getNew(limit);
    res.json({ success: true, count: tokens.length, tokens });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get GRADUATING tokens (about to complete bonding curve)
app.get('/api/tokens/graduating', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const tokens = await tokenFeed.getGraduating(limit);
    res.json({ success: true, count: tokens.length, tokens });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get TRENDING tokens (high volume/liquidity ratio)
app.get('/api/tokens/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const tokens = await tokenFeed.getTrending(limit);
    res.json({ success: true, count: tokens.length, tokens });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific token by mint - Enhanced endpoint for Discord bots and external use
app.get('/api/tokens/:mint', async (req, res) => {
  try {
    const mint = req.params.mint;
    console.log(`🔍 Token lookup requested for: ${mint.substring(0, 8)}...`);
    
    // Try to get from tokenFeed first (most up-to-date)
    let token = await tokenFeed.getToken(mint);
    
    // If not found, try to get from MongoDB (if available)
    if (!token && tokenIndexer.isActive()) {
      const dbToken = await tokenIndexer.getToken(mint);
      if (dbToken) {
        // Convert TokenIndexData to TokenData format
        token = {
          mint: dbToken.mint,
          name: dbToken.name || `Token ${dbToken.mint.slice(0, 8)}`,
          symbol: dbToken.symbol || 'UNK',
          imageUrl: dbToken.imageUrl,
          price: dbToken.price || 0,
          priceChange5m: dbToken.priceChange5m || 0,
          priceChange1h: dbToken.priceChange1h || 0,
          priceChange24h: dbToken.priceChange24h || 0,
          volume5m: dbToken.volume5m || 0,
          volume1h: dbToken.volume1h || 0,
          volume24h: dbToken.volume24h || 0,
          liquidity: dbToken.liquidity || 0,
          marketCap: dbToken.marketCap || 0,
          fdv: dbToken.marketCap || 0,
          holders: dbToken.holders,
          txns5m: dbToken.txns5m || { buys: 0, sells: 0 },
          txns1h: dbToken.txns1h || { buys: 0, sells: 0 },
          txns24h: dbToken.txns24h || { buys: 0, sells: 0 },
          createdAt: dbToken.createdAt,
          pairAddress: dbToken.pairAddress || '',
          dexId: dbToken.dexId || 'unknown',
          age: dbToken.age || 0,
          isNew: dbToken.isNew || false,
          isGraduating: dbToken.isGraduating || false,
          isTrending: dbToken.isTrending || false,
          riskScore: dbToken.riskScore || 50,
        };
      }
    }
    
    if (!token) {
      return res.status(404).json({ 
        success: false,
        error: 'Token not found',
        mint: mint
      });
    }
    
    // Return comprehensive token data
    res.json({ 
      success: true, 
      token: {
        // Basic info
        mint: token.mint,
        name: token.name,
        symbol: token.symbol,
        imageUrl: token.imageUrl,
        
        // Price data
        price: token.price,
        priceChange5m: token.priceChange5m,
        priceChange1h: token.priceChange1h,
        priceChange24h: token.priceChange24h,
        
        // Market data
        marketCap: token.marketCap,
        liquidity: token.liquidity,
        fdv: token.fdv,
        holders: token.holders,
        
        // Volume data
        volume5m: token.volume5m,
        volume1h: token.volume1h,
        volume24h: token.volume24h,
        
        // Transaction data
        txns5m: token.txns5m,
        txns1h: token.txns1h,
        txns24h: token.txns24h,
        
        // Metadata
        createdAt: token.createdAt,
        age: token.age, // in minutes
        pairAddress: token.pairAddress,
        dexId: token.dexId,
        
        // Flags
        isNew: token.isNew,
        isGraduating: token.isGraduating,
        isTrending: token.isTrending,
        riskScore: token.riskScore,
        
        // Links (for Discord embeds)
        dexScreenerUrl: `https://dexscreener.com/solana/${token.pairAddress || token.mint}`,
        birdeyeUrl: `https://birdeye.so/token/${token.mint}`,
        solscanUrl: `https://solscan.io/token/${token.mint}`,
      }
    });
  } catch (error: any) {
    console.error('Error fetching token:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Discord Interactions endpoint is defined above (before express.json())

// Catch all handler: send back React's index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id, 'from', socket.handshake.address);
  
  // Send a welcome message
  socket.emit('connected', { message: 'Connected to server', timestamp: Date.now() });
  
  socket.on('disconnect', (reason) => {
    console.log('❌ Client disconnected:', socket.id, 'reason:', reason);
  });

  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });
});

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces for local network access

httpServer.listen(PORT, HOST as string, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Web interface available at:`);
  console.log(`   - http://localhost:${PORT}`);
  console.log(`   - http://127.0.0.1:${PORT}`);
  // Try to detect and show local IP
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && iface.address.startsWith('192.')) {
        console.log(`   - http://${iface.address}:${PORT}`);
      }
    }
  }
});

