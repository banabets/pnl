/**
 * Script para listar y eliminar master wallets de MongoDB
 * Uso: node scripts/list-and-delete-master-wallets.js [delete-all]
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI 
  || process.env.MONGO_URL 
  || process.env.MONGODB_URL
  || 'mongodb://localhost:27017/pnl';

const MasterWalletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  publicKey: String,
  encryptedPrivateKey: String,
  balance: Number,
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  id: String,
  username: String,
  email: String,
}, { timestamps: true });

const MasterWallet = mongoose.model('MasterWallet', MasterWalletSchema);
const User = mongoose.model('User', UserSchema);

async function listAndDeleteMasterWallets(deleteAll = false) {
  try {
    console.log(`🔌 Connecting to MongoDB...`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Buscar todas las master wallets
    const masterWallets = await MasterWallet.find({}).populate('userId').exec();
    
    if (masterWallets.length === 0) {
      console.log('ℹ️  No master wallets found in MongoDB');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`📊 Found ${masterWallets.length} master wallet(s):\n`);
    masterWallets.forEach((mw, index) => {
      const user = mw.userId;
      const userInfo = user 
        ? `${user.username || 'N/A'} (${user.email || 'N/A'}) - ID: ${user.id || user._id}`
        : `User ID: ${mw.userId}`;
      
      console.log(`  ${index + 1}. Public Key: ${mw.publicKey}`);
      console.log(`     User: ${userInfo}`);
      console.log(`     Balance: ${mw.balance || 0} SOL`);
      console.log(`     Created: ${mw.createdAt}`);
      console.log('');
    });

    if (deleteAll) {
      console.log('🗑️  Deleting ALL master wallets...');
      const result = await MasterWallet.deleteMany({}).exec();
      console.log(`\n✅ Successfully deleted ${result.deletedCount} master wallet(s)`);
      
      // Verificar
      const remaining = await MasterWallet.find({}).exec();
      if (remaining.length === 0) {
        console.log('✅ Verification: All master wallets deleted');
      } else {
        console.log(`⚠️  Warning: ${remaining.length} master wallet(s) still exist`);
      }
    } else {
      console.log('💡 To delete all master wallets, run:');
      console.log('   node scripts/list-and-delete-master-wallets.js delete-all');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

const deleteAll = process.argv[2] === 'delete-all';

if (deleteAll) {
  console.log('⚠️  WARNING: This will delete ALL master wallets from MongoDB!');
  console.log('Press Ctrl+C to cancel, or wait 3 seconds...\n');
  setTimeout(() => {
    listAndDeleteMasterWallets(true);
  }, 3000);
} else {
  listAndDeleteMasterWallets(false);
}

