import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import api from '../utils/api';

interface MasterWalletProps {
  socket: Socket | null;
}

export default function MasterWallet({ socket }: MasterWalletProps) {
  const [masterWallet, setMasterWallet] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  useEffect(() => {
    loadMasterWallet();

    if (socket) {
      socket.on('master-wallet:created', () => loadMasterWallet());
      socket.on('master-wallet:withdrawn', () => loadMasterWallet());
      socket.on('funds:distributed', () => loadMasterWallet());
      socket.on('funds:recovered', () => loadMasterWallet());
    }

    // Auto-refresh balance every 30 seconds (reduced to avoid rate limiting)
    const interval = setInterval(() => {
      loadMasterWallet();
    }, 30000); // Update every 30 seconds

    return () => {
      if (socket) {
        socket.off('master-wallet:created');
        socket.off('master-wallet:withdrawn');
        socket.off('funds:distributed');
        socket.off('funds:recovered');
      }
      clearInterval(interval);
    };
  }, [socket]);

  const loadMasterWallet = async () => {
    try {
      const res = await api.get('/master-wallet');
      setMasterWallet(res.data);
      // Log balance update for debugging
      if (res.data?.exists && res.data?.balance !== undefined) {
        console.log(`💰 Master wallet balance updated: ${res.data.balance.toFixed(4)} SOL`);
      }
    } catch (error) {
      console.error('Failed to load master wallet:', error);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      await api.post('/master-wallet/create');
      await loadMasterWallet();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDistribute = async () => {
    setLoading(true);
    try {
      await api.post('/funds/distribute-from-master');
      await loadMasterWallet();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async () => {
    // Ask user if they want to recover from specific wallets
    const specificWallets = prompt('Enter wallet addresses to recover from (comma-separated, or leave empty to recover from all trading wallets):');
    
    setLoading(true);
    try {
      const payload: any = {};
      if (specificWallets && specificWallets.trim()) {
        const wallets = specificWallets.split(',').map(w => w.trim()).filter(w => w.length > 0);
        if (wallets.length > 0) {
          payload.specificWallets = wallets;
        }
      }
      
      const response = await api.post('/funds/recover-to-master', payload);
      await loadMasterWallet();
      
      if (response.data.message) {
        alert(response.data.message);
      } else {
        alert(`✅ Recovery completed: ${response.data.successCount || 0} successful, ${response.data.failCount || 0} failed`);
      }
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportKey = async () => {
    if (!confirm('⚠️ ADVERTENCIA: Exportarás la clave privada del Master Wallet.\n\nEsta clave da acceso completo a todos los fondos. ¿Estás seguro?')) {
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.get('/master-wallet/export-key');
      const keyData = res.data;
      
      // Create download link
      const dataStr = JSON.stringify({
        publicKey: keyData.publicKey,
        secretKey: keyData.secretKey,
        secretKeyBase64: keyData.secretKeyBase64,
        exportDate: keyData.exportDate,
        warning: keyData.warning
      }, null, 2);
      
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `master-wallet-private-key-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('✅ Clave privada exportada!\n\n⚠️ IMPORTANTE: Guarda este archivo en un lugar seguro. Cualquiera con acceso a esta clave puede controlar tu Master Wallet.');
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAddress) {
      alert('Please enter a destination address');
      return;
    }

    // Validate address format
    if (withdrawAddress.length < 32 || withdrawAddress.length > 44) {
      alert('Invalid Solana address format. Address should be 32-44 characters.');
      return;
    }

    // Confirm withdrawal
    const amountText = withdrawAmount ? `${withdrawAmount} SOL` : 'ALL SOL';
    if (!confirm(`⚠️ Confirm withdrawal:\n\nAmount: ${amountText}\nTo: ${withdrawAddress}\n\nThis action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      console.log(`💸 Sending withdraw request: ${withdrawAmount || 'ALL'} SOL to ${withdrawAddress}`);
      
      const response = await api.post('/master-wallet/withdraw', {
        destination: withdrawAddress,
        amount: withdrawAmount ? parseFloat(withdrawAmount) : undefined,
      });
      
      console.log('✅ Withdraw response:', response.data);
      
      alert(`✅ Success! ${response.data.message || 'Withdrawal completed successfully.'}`);
      
                                  setWithdrawAddress('');
                                  setWithdrawAmount('');
                                  
                                  // Wait a moment for transaction to be confirmed
                                  await new Promise(resolve => setTimeout(resolve, 2000));
                                  
                                  // Reload master wallet to get updated balance
                                  await loadMasterWallet();
                                  
                                  console.log('✅ Master wallet balance updated');
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message;
      console.error('❌ Withdraw error:', errorMsg);
      alert(`❌ Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-black rounded-lg p-6 border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <h2 className="text-2xl font-bold text-white mb-6">Master Wallet</h2>

        {!masterWallet?.exists ? (
          <div className="text-center py-8">
            <p className="text-white/60 mb-4">No master wallet found</p>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="px-6 py-3 bg-black border border-white/15 hover:border-white/25 text-white rounded font-medium disabled:opacity-50 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-all"
            >
              Create Master Wallet
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Wallet Info */}
            <div className="bg-black rounded-lg p-4 border border-white/15 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] mb-4">
              <div className="space-y-3">
                <div>
                  <div className="text-white/60 text-xs font-medium uppercase mb-1">Address</div>
                  <div className="flex items-center gap-2">
                    <div className="text-white font-mono text-sm break-all flex-1">{masterWallet.publicKey}</div>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(masterWallet.publicKey);
                          alert('✅ Address copied to clipboard!');
                        } catch (error) {
                          // Fallback for older browsers
                          const textArea = document.createElement('textarea');
                          textArea.value = masterWallet.publicKey;
                          textArea.style.position = 'fixed';
                          textArea.style.opacity = '0';
                          document.body.appendChild(textArea);
                          textArea.select();
                          try {
                            document.execCommand('copy');
                            alert('✅ Address copied to clipboard!');
                          } catch (err) {
                            alert('❌ Failed to copy address');
                          }
                          document.body.removeChild(textArea);
                        }
                      }}
                      className="flex-shrink-0 p-2 hover:bg-white/10 rounded transition-all"
                      title="Copy address"
                    >
                      <svg className="w-4 h-4 text-white/60 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-white/60 text-xs font-medium uppercase mb-1">Balance</div>
                  <div className="text-2xl font-bold text-white">
                    {masterWallet.balance !== undefined && masterWallet.balance !== null 
                      ? `${masterWallet.balance.toFixed(4)} SOL`
                      : '0.0000 SOL'}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <button
                onClick={handleExportKey}
                disabled={loading}
                className="w-full px-4 py-3 bg-black border-2 border-yellow-500/40 hover:border-yellow-500/60 text-yellow-400 rounded-lg font-semibold disabled:opacity-50 shadow-[0_2px_6px_rgba(234,179,8,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(234,179,8,0.3)] transition-all"
              >
                📥 Exportar Clave Privada (Backup)
              </button>

              <button
                onClick={handleDistribute}
                disabled={loading}
                className="w-full px-4 py-3 bg-black border border-white/15 hover:border-white/25 text-white rounded font-medium disabled:opacity-50 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-all"
              >
                Distribute to Trading Wallets
              </button>

              <button
                onClick={handleRecover}
                disabled={loading}
                className="w-full px-4 py-3 bg-black border border-white/15 hover:border-white/25 text-white rounded font-medium disabled:opacity-50 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-all"
              >
                Recover Funds to Master
              </button>

              <div className="bg-black rounded-lg p-4 border border-white/15 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4">
                <h3 className="text-lg font-semibold text-white">Withdraw from Master</h3>
                <div>
                  <label className="block text-white/60 text-sm font-medium mb-2">
                    Destination Address
                  </label>
                  <input
                    type="text"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    placeholder="Enter Solana address"
                    className="w-full px-4 py-2 bg-black border border-white/15 text-white rounded focus:border-white/25 focus:outline-none shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]"
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-sm font-medium mb-2">
                    Amount (leave empty for all)
                  </label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0"
                    step="0.001"
                    className="w-full px-4 py-2 bg-black border border-white/15 text-white rounded focus:border-white/25 focus:outline-none shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]"
                  />
                </div>
                <button
                  onClick={handleWithdraw}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-black border border-red-500/30 hover:border-red-500/50 text-white rounded font-medium disabled:opacity-50 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-all"
                >
                  Withdraw
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

