// Temporary script to recover funds from specific wallets
// Usage: node -e "require('./dist/server/recover-wallets.js').recoverFromWallets(['wallet1', 'wallet2'], 'privateKey1', 'privateKey2')"

import { Keypair, Connection, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

export async function recoverFromWallets(
  walletAddresses: string[],
  privateKeys: string[], // Array of base58 private keys
  masterWalletAddress: string,
  rpcUrl: string = process.env.RPC_URL || `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY || ''}`
) {
  const connection = new Connection(rpcUrl, 'confirmed');
  const masterPublicKey = new PublicKey(masterWalletAddress);
  
  if (walletAddresses.length !== privateKeys.length) {
    throw new Error('Number of wallet addresses must match number of private keys');
  }
  
  const results: any[] = [];
  let totalRecovered = 0;
  
  for (let i = 0; i < walletAddresses.length; i++) {
    try {
      const walletAddress = walletAddresses[i];
      const privateKeyStr = privateKeys[i];
      
      // Convert private key from base58 to Uint8Array
      const privateKeyBytes = Buffer.from(privateKeyStr, 'base64');
      const keypair = Keypair.fromSecretKey(privateKeyBytes);
      
      // Verify the public key matches
      if (keypair.publicKey.toBase58() !== walletAddress) {
        throw new Error(`Private key does not match wallet address ${walletAddress}`);
      }
      
      // Get balance
      const balance = await connection.getBalance(keypair.publicKey);
      const balanceInSol = balance / LAMPORTS_PER_SOL;
      
      if (balanceInSol <= 0.000005) {
        results.push({
          walletAddress,
          amount: 0,
          success: false,
          error: 'Insufficient balance'
        });
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
      
      console.log(`💸 Recovering ${amountToRecover.toFixed(4)} SOL from ${walletAddress.substring(0, 8)}...`);
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [keypair],
        { commitment: 'confirmed' }
      );
      
      console.log(`✅ Recovered from ${walletAddress.substring(0, 8)}...: ${signature}`);
      totalRecovered += amountToRecover;
      
      results.push({
        walletAddress,
        amount: amountToRecover,
        signature,
        success: true
      });
      
    } catch (error: any) {
      console.error(`❌ Failed to recover from ${walletAddresses[i]}:`, error.message);
      results.push({
        walletAddress: walletAddresses[i],
        amount: 0,
        success: false,
        error: error.message
      });
    }
  }
  
  return {
    totalRecovered,
    results
  };
}





