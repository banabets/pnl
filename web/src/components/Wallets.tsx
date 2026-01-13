import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import api from '../utils/api';

interface Wallet {
  publicKey: string;
  balance: number;
  index: number;
}

interface WalletsProps {
  socket: Socket | null;
}

export default function Wallets({ socket }: WalletsProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generateCount, setGenerateCount] = useState(5);

  useEffect(() => {
    loadWallets();

    if (socket) {
      socket.on('wallets:generated', () => loadWallets());
      socket.on('wallets:cleaned', () => loadWallets());
      socket.on('funds:distributed', () => loadWallets());
      socket.on('funds:recovered', () => loadWallets());
    }

    // Auto-refresh wallets every 30 seconds (reduced to avoid rate limiting)
    const interval = setInterval(() => {
      loadWallets();
    }, 30000); // Update every 30 seconds

    return () => {
      if (socket) {
        socket.off('wallets:generated');
        socket.off('wallets:cleaned');
        socket.off('funds:distributed');
        socket.off('funds:recovered');
      }
      clearInterval(interval);
    };
  }, [socket]);

  const loadWallets = async () => {
    // Check if user is authenticated before making requests
    const token = localStorage.getItem('authToken');
    if (!token) {
      setWallets([]);
      setTotalBalance(0);
      return; // Silently skip if not authenticated
    }

    try {
      const res = await api.get('/wallets');
      setWallets(res.data.wallets || []);
      setTotalBalance(res.data.totalBalance || 0);
    } catch (error: any) {
      // Silently handle 401 errors (expected when not authenticated)
      if (error.response?.status !== 401) {
        console.error('Failed to load wallets:', error);
      }
      if (error.response?.status === 401) {
        setWallets([]);
        setTotalBalance(0);
      }
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await api.post('/wallets/generate', { count: generateCount });
      await loadWallets();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportKey = async (walletIndex: number) => {
    try {
      const res = await api.get(`/wallets/${walletIndex}/export-key`);
      const keyData = res.data;
      
      // Create download link
      const dataStr = JSON.stringify({
        walletIndex: keyData.walletIndex,
        publicKey: keyData.publicKey,
        secretKey: keyData.secretKey,
        secretKeyBase64: keyData.secretKeyBase64,
        exportDate: new Date().toISOString(),
        warning: '⚠️ CRITICAL: Keep this private key secure. Anyone with access to it can control your wallet.'
      }, null, 2);
      
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `wallet-${walletIndex}-private-key-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert(`✅ Private key exported! File: wallet-${walletIndex}-private-key.json\n\n⚠️ IMPORTANT: Keep this file secure!`);
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleExportAll = async () => {
    if (!confirm('⚠️ This will export ALL wallet private keys. Make sure you are in a secure location.\n\nContinue?')) {
      return;
    }
    
    try {
      const res = await api.get('/wallets/export-all');
      const backupData = res.data;
      
      // Create download link
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `all-wallets-backup-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert(`✅ All wallets exported! File: all-wallets-backup.json\n\n⚠️ CRITICAL: Keep this backup secure! Store it in a safe place.`);
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleCleanup = async () => {
    // First check balances
    try {
      const balanceCheck = await api.get('/wallets/check-balances');
      const { totalBalance, canCleanup, walletsWithFunds } = balanceCheck.data;
      
      if (!canCleanup && totalBalance > 0.001) {
        const recoverFirst = confirm(
          `⚠️ ADVERTENCIA: Hay ${totalBalance.toFixed(4)} SOL en las wallets.\n\n` +
          `¿Deseas recuperar los fondos al Master Wallet antes de borrar las wallets?\n\n` +
          `- Sí: Recupera fondos y luego borra wallets (RECOMENDADO)\n` +
          `- No: Solo borra wallets (puede perder fondos)`
        );
        
        if (recoverFirst) {
          // Safe cleanup: recover first
          setLoading(true);
          try {
            await api.post('/wallets/safe-cleanup');
            alert('✅ Wallets limpiadas de forma segura. Todos los fondos fueron recuperados al Master Wallet.');
            await loadWallets();
          } catch (error: any) {
            alert(`Error: ${error.response?.data?.error || error.message}`);
          } finally {
            setLoading(false);
          }
          return;
        } else {
          // Force cleanup (user confirmed)
          if (!confirm(`⚠️ ÚLTIMA ADVERTENCIA:\n\nHay ${totalBalance.toFixed(4)} SOL en las wallets.\n\n¿Estás seguro de que quieres borrar las wallets y PERDER estos fondos?`)) {
            return;
          }
        }
      } else {
        // No funds, safe to cleanup
        if (!confirm('¿Estás seguro de que quieres borrar todas las wallets? Esta acción no se puede deshacer.')) {
          return;
        }
      }
    } catch (error: any) {
      console.error('Error checking balances:', error);
      // Continue with cleanup if check fails
      if (!confirm('No se pudieron verificar los balances. ¿Continuar con la limpieza?')) {
        return;
      }
    }
    
    setLoading(true);
    try {
      await api.post('/wallets/cleanup');
      await loadWallets();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message;
      if (error.response?.data?.requiresRecovery) {
        alert(`⚠️ ${errorMsg}\n\nPor favor, recupera los fondos primero usando "Recover Funds to Master" en la pestaña Master Wallet.`);
      } else {
        alert(`Error: ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-black rounded-lg p-4 sm:p-6 border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Trading Wallets</h2>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={generateCount}
              onChange={(e) => setGenerateCount(parseInt(e.target.value) || 5)}
              min="1"
              max="20"
              className="px-3 py-2 bg-black border border-white/15 text-white rounded w-20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] focus:border-white/25 focus:outline-none"
            />
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-4 py-2 bg-black border border-white/15 hover:border-white/25 text-white rounded font-medium disabled:opacity-50 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-all"
            >
              Generate Wallets
            </button>
          </div>
          <button
            onClick={handleExportAll}
            disabled={loading || wallets.length === 0}
            className="px-4 py-2 bg-black border border-yellow-500/30 hover:border-yellow-500/50 text-yellow-400 rounded font-medium disabled:opacity-50 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-all"
            title="Export all wallet private keys as backup"
          >
            Export All Keys (Backup)
          </button>
          <button
            onClick={handleCleanup}
            disabled={loading || wallets.length === 0}
            className="px-4 py-2 bg-black border border-red-500/30 hover:border-red-500/50 text-white rounded font-medium disabled:opacity-50 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-all"
            title="Limpia todas las wallets. Si hay fondos, primero los recupera al Master Wallet."
          >
            Cleanup All
          </button>
          <button
            onClick={loadWallets}
            disabled={loading}
            className="px-4 py-2 bg-black border border-white/15 hover:border-white/25 text-white rounded font-medium disabled:opacity-50 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-all"
          >
            Refresh
          </button>
        </div>

        {/* Summary */}
        <div className="bg-black rounded-lg p-4 border border-white/15 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] mb-4 sm:mb-6">
          <div className="grid grid-cols-2 gap-4 sm:flex sm:justify-between sm:items-center">
            <div>
              <div className="text-white/60 text-xs font-medium uppercase mb-1">Total Wallets</div>
              <div className="text-xl sm:text-2xl font-bold text-white">{wallets.length}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs font-medium uppercase mb-1">Total Balance</div>
              <div className="text-xl sm:text-2xl font-bold text-white">{totalBalance.toFixed(4)} SOL</div>
            </div>
          </div>
        </div>

        {/* Wallets List */}
        <div className="space-y-2">
          {wallets.length === 0 ? (
            <div className="text-center py-8 text-white/60">
              No wallets found. Generate some wallets to get started.
            </div>
          ) : (
            wallets.map((wallet) => (
              <div
                key={wallet.index}
                className="bg-black rounded-lg p-3 sm:p-4 border border-white/15 hover:border-white/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 transition-all shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6)]"
              >
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <div className="text-white font-medium mb-1 text-sm sm:text-base">
                    Wallet {wallet.index}
                  </div>
                  <div className="text-white/60 text-xs sm:text-sm font-mono mb-1 break-all sm:break-normal">
                    {wallet.publicKey.substring(0, 12)}...{wallet.publicKey.substring(wallet.publicKey.length - 12)}
                  </div>
                  <details className="mt-2">
                    <summary className="text-white/40 text-xs cursor-pointer hover:text-white/60">
                      Ver clave completa
                    </summary>
                    <div className="text-white/60 text-xs font-mono mt-2 break-all bg-black border border-white/10 p-2 rounded">
                      {wallet.publicKey}
                    </div>
                  </details>
                </div>
                <div className="text-left sm:text-right ml-0 sm:ml-4 w-full sm:w-auto">
                  <div className={`text-base sm:text-lg font-bold ${wallet.balance > 0 ? 'text-white' : 'text-white/40'}`}>
                    {wallet.balance.toFixed(4)} SOL
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

