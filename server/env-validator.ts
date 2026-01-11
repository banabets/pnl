// Environment Variables Validator
// This module validates that all required environment variables are set correctly
// MUST be imported at the very beginning of server/index.ts

import crypto from 'crypto';

interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates all required environment variables
 * Throws error if critical variables are missing or invalid
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('🔍 Validating environment variables...');

  // ===== CRITICAL VARIABLES (MUST be set) =====
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT || process.env.VERCEL;

  // 1. JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    if (isProduction) {
      // In production, provide helpful error message for Railway/Vercel
      errors.push('JWT_SECRET is not set. Set it in your deployment platform (Railway/Vercel) environment variables.');
      errors.push('  Generate: openssl rand -base64 64');
      errors.push('  Or use: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'base64\'))"');
    } else {
      errors.push('JWT_SECRET is not set. Generate one with: openssl rand -base64 64');
    }
  } else if (jwtSecret === 'your-secret-key-change-in-production' || jwtSecret.length < 32) {
    errors.push('JWT_SECRET is using default or weak value. Must be at least 32 characters.');
  }

  // 2. ENCRYPTION_KEY
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    if (isProduction) {
      // In production, provide helpful error message for Railway/Vercel
      errors.push('ENCRYPTION_KEY is not set. Set it in your deployment platform (Railway/Vercel) environment variables.');
      errors.push('  Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    } else {
      errors.push('ENCRYPTION_KEY is not set. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    }
  } else if (encryptionKey.length !== 64 || !/^[0-9a-f]{64}$/i.test(encryptionKey)) {
    errors.push('ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes).');
  }

  // 3. HELIUS_API_KEY - Allow RPC_URL as alternative
  const rpcUrl = process.env.RPC_URL || process.env.SOLANA_RPC_URL;
  let heliusApiKey = process.env.HELIUS_API_KEY;
  
  // Try to extract HELIUS_API_KEY from RPC_URL if not set
  if ((!heliusApiKey || heliusApiKey === 'your-helius-api-key-here') && rpcUrl) {
    if (rpcUrl.includes('helius-rpc.com') || rpcUrl.includes('api-key=')) {
      const match = rpcUrl.match(/api-key=([a-f0-9-]{36})/i);
      if (match && match[1]) {
        heliusApiKey = match[1];
        process.env.HELIUS_API_KEY = heliusApiKey;
        warnings.push('HELIUS_API_KEY extracted from RPC_URL. Consider setting it explicitly for clarity.');
      }
    }
  }
  
  if (!heliusApiKey || heliusApiKey === 'your-helius-api-key-here') {
    if (rpcUrl && !rpcUrl.includes('helius-rpc.com')) {
      // RPC_URL is set but not Helius, warn but don't error
      warnings.push('HELIUS_API_KEY is not set, but RPC_URL is configured. Some WebSocket features may not work.');
    } else if (isProduction) {
      errors.push('HELIUS_API_KEY is not set. Get one from https://helius.dev and set it in your deployment platform.');
    } else {
      errors.push('HELIUS_API_KEY is not set or using placeholder. Get one from https://helius.dev');
    }
  } else if (heliusApiKey === '7b05747c-b100-4159-ba5f-c85e8c8d3997') {
    errors.push('⚠️ CRITICAL: HELIUS_API_KEY is using the EXPOSED key from code! This key is PUBLIC and must be revoked immediately!');
  }

  // 4. MONGODB_URI (warn if not set, but allow fallback for development)
  const mongodbUri = process.env.MONGODB_URI || process.env.MONGO_URL;
  if (!mongodbUri) {
    warnings.push('MONGODB_URI is not set. Using default: mongodb://localhost:27017/pnl-onl');
    warnings.push('⚠️ Without MongoDB, data will be stored in JSON files and lost on restart!');
  }

  // ===== IMPORTANT VARIABLES (Should be set) =====

  // 5. RPC_URL (already checked above for HELIUS_API_KEY extraction)
  if (!rpcUrl && !heliusApiKey) {
    warnings.push('RPC_URL is not set. Will use Helius RPC with HELIUS_API_KEY if available.');
  }

  // 6. NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv) {
    warnings.push('NODE_ENV is not set. Defaulting to "development".');
  } else if (nodeEnv === 'production') {
    // Additional checks for production
    if (!mongodbUri) {
      errors.push('MONGODB_URI is REQUIRED in production environment!');
    }
    if (jwtSecret && jwtSecret.includes('change-me')) {
      errors.push('JWT_SECRET cannot contain placeholder text in production!');
    }
  }

  // 7. JWT_EXPIRY
  const jwtExpiry = process.env.JWT_EXPIRY;
  if (!jwtExpiry) {
    warnings.push('JWT_EXPIRY is not set. Defaulting to "7d".');
  }

  // ===== TRADING CONFIGURATION (Optional but recommended) =====

  const slippageBps = process.env.SLIPPAGE_BPS;
  if (slippageBps && (parseInt(slippageBps) < 0 || parseInt(slippageBps) > 10000)) {
    warnings.push('SLIPPAGE_BPS should be between 0 and 10000 (0-100%).');
  }

  const maxSolPerSwap = process.env.MAX_SOL_PER_SWAP;
  if (maxSolPerSwap && parseFloat(maxSolPerSwap) > 100) {
    warnings.push('MAX_SOL_PER_SWAP is very high (>100 SOL). Consider lowering for safety.');
  }

  // ===== PRINT RESULTS =====

  if (errors.length > 0) {
    console.error('\n❌ CRITICAL ENVIRONMENT ERRORS:');
    errors.forEach((error, i) => {
      console.error(`   ${i + 1}. ${error}`);
    });
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  ENVIRONMENT WARNINGS:');
    warnings.forEach((warning, i) => {
      console.warn(`   ${i + 1}. ${warning}`);
    });
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All environment variables validated successfully!\n');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate secure environment variables for new installations
 */
export function generateSecureEnvVars(): { JWT_SECRET: string; ENCRYPTION_KEY: string } {
  const jwtSecret = crypto.randomBytes(64).toString('base64');
  const encryptionKey = crypto.randomBytes(32).toString('hex');

  return {
    JWT_SECRET: jwtSecret,
    ENCRYPTION_KEY: encryptionKey
  };
}

/**
 * Validate and throw error if environment is invalid
 * Use this at the start of your application
 */
export function validateOrThrow(): void {
  const result = validateEnvironment();

  if (!result.valid) {
    console.error('\n🚨 ENVIRONMENT VALIDATION FAILED!\n');
    console.error('Please fix the errors above before starting the server.\n');
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT || process.env.VERCEL;
    
    if (isProduction) {
      console.error('Steps to fix (in your deployment platform):');
      console.error('  1. Go to your deployment platform (Railway/Vercel) settings');
      console.error('  2. Add environment variables:');
      console.error('     - JWT_SECRET: openssl rand -base64 64');
      console.error('     - ENCRYPTION_KEY: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
      console.error('     - HELIUS_API_KEY: Get from https://helius.dev');
      console.error('     - MONGODB_URI: Your MongoDB connection string');
      console.error('  3. Redeploy your application\n');
    } else {
      console.error('Steps to fix:');
      console.error('  1. Copy .env.example to .env');
      console.error('  2. Generate secure values:');
      console.error('     - JWT_SECRET: openssl rand -base64 64');
      console.error('     - ENCRYPTION_KEY: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
      console.error('  3. Get HELIUS_API_KEY from https://helius.dev');
      console.error('  4. Set MONGODB_URI to your MongoDB connection string\n');
    }

    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.warn('\n⚠️  Some warnings were detected. Review them carefully.\n');
  }
}

// Export helper to get validated RPC URL
export function getValidatedRpcUrl(): string {
  const rpcUrl = process.env.RPC_URL || process.env.SOLANA_RPC_URL;
  let heliusApiKey = process.env.HELIUS_API_KEY;

  // If RPC_URL is already a complete Helius URL, use it directly
  if (rpcUrl && rpcUrl.includes('helius-rpc.com')) {
    // Extract API key if not already set
    if (!heliusApiKey) {
      const match = rpcUrl.match(/api-key=([a-f0-9-]{36})/i);
      if (match && match[1]) {
        heliusApiKey = match[1];
      }
    }
    return rpcUrl;
  }

  // If we have a Helius API key, construct the URL
  if (heliusApiKey) {
    return `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
  }

  // Fallback to public RPC (not recommended for production)
  console.warn('⚠️ Using public Solana RPC. This is SLOW and rate-limited. Set HELIUS_API_KEY or RPC_URL for better performance.');
  return 'https://api.mainnet-beta.solana.com';
}
