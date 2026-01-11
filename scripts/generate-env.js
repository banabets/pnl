#!/usr/bin/env node
/**
 * Generate Secure Environment Variables
 *
 * This script helps you generate secure values for environment variables.
 * Run with: node scripts/generate-env.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function generateEnvFile() {
  console.log('\n==================================================');
  console.log('🔐 Secure Environment Variables Generator');
  console.log('==================================================\n');

  console.log('This script will help you create a secure .env file.\n');

  // Generate secure keys
  const jwtSecret = crypto.randomBytes(64).toString('base64');
  const encryptionKey = crypto.randomBytes(32).toString('hex');

  console.log('✅ Generated secure JWT_SECRET');
  console.log('✅ Generated secure ENCRYPTION_KEY\n');

  // Ask for user input
  const heliusApiKey = await question('Enter your Helius API Key (get one from https://helius.dev): ');

  const mongodbUri = await question('Enter your MongoDB URI (or press Enter for default localhost): ');
  const finalMongodbUri = mongodbUri.trim() || 'mongodb://localhost:27017/pnl-onl';

  const port = await question('Enter server PORT (or press Enter for 3001): ');
  const finalPort = port.trim() || '3001';

  const nodeEnv = await question('Enter NODE_ENV (development/production, or press Enter for development): ');
  const finalNodeEnv = nodeEnv.trim() || 'development';

  // Build .env content
  const envContent = `# ==========================================
# 🔒 CRITICAL SECURITY VARIABLES (REQUIRED)
# ==========================================
# ⚠️ NEVER commit this file to git! Keep it secret!
# Generated on: ${new Date().toISOString()}

# JWT Secret (Generated securely)
JWT_SECRET=${jwtSecret}

# Encryption Key (Generated securely)
# ⚠️ CRITICAL: If you lose this key, ALL wallet data is PERMANENTLY lost!
ENCRYPTION_KEY=${encryptionKey}

# Helius API Key
HELIUS_API_KEY=${heliusApiKey}

# MongoDB Connection String
MONGODB_URI=${finalMongodbUri}

# ==========================================
# 🌐 RPC Configuration
# ==========================================
# Leave blank to use Helius RPC automatically
RPC_URL=

# ==========================================
# 💱 Trading Configuration
# ==========================================
SLIPPAGE_BPS=50
MIN_SOL_BALANCE=0.1
MAX_SOL_PER_SWAP=0.05
MAX_RETRIES=3

# ==========================================
# 🤖 Bot Configuration
# ==========================================
SWAP_DELAY_MS=3000

# ==========================================
# 🛡️ Jito Configuration (Optional - MEV protection)
# ==========================================
JITO_TIP_LAMPORTS=10000
USE_JITO=false

# ==========================================
# ⚠️ Safety Configuration
# ==========================================
MAX_DAILY_VOLUME_SOL=10.0

# ==========================================
# 📁 Directories
# ==========================================
KEYPAIRS_DIR=./keypairs

# ==========================================
# 🌍 Server Configuration
# ==========================================
PORT=${finalPort}
NODE_ENV=${finalNodeEnv}

# JWT Token Expiry
JWT_EXPIRY=7d

# ==========================================
# 📊 Monitoring (Optional)
# ==========================================
# SENTRY_DSN=your-sentry-dsn-here
# LOG_LEVEL=info

# ==========================================
# 📧 Email Configuration (Optional - for notifications)
# ==========================================
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
`;

  // Save .env file
  const envPath = path.join(__dirname, '..', '.env');

  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    const overwrite = await question('\n⚠️  .env file already exists! Overwrite? (yes/no): ');
    if (overwrite.toLowerCase() !== 'yes' && overwrite.toLowerCase() !== 'y') {
      console.log('\n❌ Cancelled. Your existing .env file was not modified.');
      rl.close();
      return;
    }
  }

  fs.writeFileSync(envPath, envContent);

  console.log('\n==================================================');
  console.log('✅ SUCCESS! .env file created');
  console.log('==================================================\n');

  console.log('📁 Location:', envPath);
  console.log('\n🔐 Your secure credentials:');
  console.log('   ✓ JWT_SECRET: (64-byte secure random)');
  console.log('   ✓ ENCRYPTION_KEY: (32-byte secure random)');
  console.log('   ✓ HELIUS_API_KEY:', heliusApiKey ? '✓ Set' : '✗ Not set');
  console.log('   ✓ MONGODB_URI:', finalMongodbUri);
  console.log('   ✓ PORT:', finalPort);
  console.log('   ✓ NODE_ENV:', finalNodeEnv);

  console.log('\n⚠️  IMPORTANT:');
  console.log('   1. NEVER commit .env to git!');
  console.log('   2. Back up ENCRYPTION_KEY securely!');
  console.log('   3. If you lose ENCRYPTION_KEY, all wallet data is lost!');
  console.log('   4. Keep JWT_SECRET secret - it controls authentication!');

  console.log('\n📝 Next steps:');
  console.log('   1. Review your .env file');
  console.log('   2. Start the server: npm run build && npm start');
  console.log('   3. Check for any validation errors on startup\n');

  rl.close();
}

// Run the generator
generateEnvFile().catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
