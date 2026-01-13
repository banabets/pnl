/**
 * Script para eliminar todas las master wallets de un usuario específico
 * Uso: npx ts-node scripts/delete-user-master-wallets.ts <email>
 */

import mongoose from 'mongoose';
import { User, MasterWallet } from '../server/database';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pnl';

async function deleteUserMasterWallets(email: string) {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Buscar usuario por email
    const user = await User.findOne({ email: email.toLowerCase() }).exec();
    
    if (!user) {
      console.log(`❌ User with email "${email}" not found`);
      process.exit(1);
    }

    console.log(`📧 Found user: ${user.username} (${user.email})`);
    console.log(`🆔 User ID: ${user.id}`);
    console.log(`🔑 MongoDB ObjectId: ${user._id}`);

    // Buscar master wallets del usuario
    const masterWallets = await MasterWallet.find({ userId: user._id }).exec();
    
    if (masterWallets.length === 0) {
      console.log('ℹ️  No master wallets found for this user');
      process.exit(0);
    }

    console.log(`\n📊 Found ${masterWallets.length} master wallet(s):`);
    masterWallets.forEach((mw, index) => {
      console.log(`  ${index + 1}. Public Key: ${mw.publicKey}`);
      console.log(`     Balance: ${mw.balance} SOL`);
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
  console.error('❌ Usage: npx ts-node scripts/delete-user-master-wallets.ts <email>');
  console.error('   Example: npx ts-node scripts/delete-user-master-wallets.ts bana@onl.onl');
  process.exit(1);
}

deleteUserMasterWallets(email);

