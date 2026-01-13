/**
 * Script para eliminar todas las master wallets de un usuario específico
 * Uso: node scripts/delete-user-master-wallets.js <email>
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Try multiple MongoDB URI sources
const MONGODB_URI = process.env.MONGODB_URI 
  || process.env.MONGO_URL 
  || process.env.MONGODB_URL
  || 'mongodb://localhost:27017/pnl';

// Definir schemas (simplificados para el script)
const UserSchema = new mongoose.Schema({
  id: String,
  username: String,
  email: String,
  passwordHash: String,
}, { timestamps: true });

const MasterWalletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  publicKey: String,
  encryptedPrivateKey: String,
  balance: Number,
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const MasterWallet = mongoose.model('MasterWallet', MasterWalletSchema);

async function deleteUserMasterWallets(email) {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Buscar usuario por email (case-insensitive)
    let user = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { email: email },
        { email: new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
      ]
    }).exec();
    
    if (!user) {
      // Buscar por username también
      user = await User.findOne({ 
        username: new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      }).exec();
    }
    
    if (!user) {
      console.log(`❌ User with email/username "${email}" not found`);
      console.log('\n📋 Searching for similar users...');
      
      // Buscar usuarios similares
      const similarUsers = await User.find({
        $or: [
          { email: new RegExp(email.split('@')[0], 'i') },
          { username: new RegExp(email.split('@')[0], 'i') }
        ]
      }).limit(10).exec();
      
      if (similarUsers.length > 0) {
        console.log(`\nFound ${similarUsers.length} similar user(s):`);
        similarUsers.forEach((u, i) => {
          console.log(`  ${i + 1}. ${u.username} (${u.email}) - ID: ${u.id}`);
        });
      } else {
        // Listar todos los usuarios
        const allUsers = await User.find({}).limit(20).exec();
        console.log(`\n📋 Listing first ${allUsers.length} users in database:`);
        allUsers.forEach((u, i) => {
          console.log(`  ${i + 1}. ${u.username} (${u.email}) - ID: ${u.id}`);
        });
      }
      
      process.exit(1);
    }

    console.log(`📧 Found user: ${user.username} (${user.email})`);
    console.log(`🆔 User ID: ${user.id}`);
    console.log(`🔑 MongoDB ObjectId: ${user._id}`);

    // Buscar master wallets del usuario
    const masterWallets = await MasterWallet.find({ userId: user._id }).exec();
    
    if (masterWallets.length === 0) {
      console.log('ℹ️  No master wallets found for this user');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`\n📊 Found ${masterWallets.length} master wallet(s):`);
    masterWallets.forEach((mw, index) => {
      console.log(`  ${index + 1}. Public Key: ${mw.publicKey}`);
      console.log(`     Balance: ${mw.balance || 0} SOL`);
      console.log(`     Created: ${mw.createdAt}`);
    });

    // Eliminar todas las master wallets
    const result = await MasterWallet.deleteMany({ userId: user._id }).exec();
    
    console.log(`\n✅ Successfully deleted ${result.deletedCount} master wallet(s)`);
    
    // Verificar que se eliminaron
    const remaining = await MasterWallet.find({ userId: user._id }).exec();
    if (remaining.length === 0) {
      console.log('✅ Verification: All master wallets deleted');
    } else {
      console.log(`⚠️  Warning: ${remaining.length} master wallet(s) still exist`);
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Obtener email de argumentos de línea de comandos
const email = process.argv[2];

if (!email) {
  console.error('❌ Usage: node scripts/delete-user-master-wallets.js <email>');
  console.error('   Example: node scripts/delete-user-master-wallets.js bana@onl.onl');
  process.exit(1);
}

deleteUserMasterWallets(email);

