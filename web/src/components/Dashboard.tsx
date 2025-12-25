import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import api from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  socket: Socket | null;
}

export default function Dashboard({ socket }: DashboardProps) {
  const [stats, setStats] = useState({
    totalWallets: 0,
    totalBalance: 0,
    masterWalletExists: false,
    masterBalance: 0,
    simulationMode: false, // Always false - simulation removed
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadTransactions();

    if (socket) {
      socket.on('wallets:generated', () => {
        loadStats();
        loadTransactions();
      });
      socket.on('master-wallet:created', () => {
        loadStats();
        loadTransactions();
      });
      socket.on('master-wallet:withdrawn', (data) => {
        loadStats();
        loadTransactions();
        if (data.transaction) {
          setRecentActivity((prev) => [data.transaction, ...prev].slice(0, 50));
        }
      });
      socket.on('funds:distributed', (data) => {
        loadStats();
        loadTransactions();
        if (data.transaction) {
          setRecentActivity((prev) => [data.transaction, ...prev].slice(0, 50));
        }
      });
      socket.on('funds:recovered', (data) => {
        loadStats();
        loadTransactions();
        if (data.transaction) {
          setRecentActivity((prev) => [data.transaction, ...prev].slice(0, 50));
        }
      });
      socket.on('pumpfun:completed', (data) => {
        setRecentActivity((prev) => [{ type: 'pump', ...data, timestamp: new Date().toISOString() }, ...prev].slice(0, 50));
        loadStats();
        loadTransactions();
      });
    }

    // Auto-refresh stats every 30 seconds (reduced to avoid rate limiting)
    const interval = setInterval(() => {
      loadStats();
      loadTransactions();
    }, 30000); // Update every 30 seconds

    return () => {
      if (socket) {
        socket.off('wallets:generated');
        socket.off('master-wallet:created');
        socket.off('master-wallet:withdrawn');
        socket.off('funds:distributed');
        socket.off('funds:recovered');
        socket.off('pumpfun:completed');
      }
      clearInterval(interval);
    };
  }, [socket]);

  const loadStats = async () => {
    try {
      const [walletsRes, masterRes, configRes] = await Promise.all([
        api.get('/wallets'),
        api.get('/master-wallet'),
        api.get('/config'),
      ]);

      setStats({
        totalWallets: walletsRes.data.totalWallets || 0,
        totalBalance: walletsRes.data.totalBalance || 0,
        masterWalletExists: masterRes.data.exists || false,
        masterBalance: masterRes.data.balance || 0,
        simulationMode: false, // Always false - simulation removed
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const res = await api.get('/transactions');
      const transactions = res.data.transactions || [];
      setRecentActivity(transactions.slice(0, 50));
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  const chartData = recentActivity
    .filter((a) => a.type === 'pump')
    .map((a, i) => ({
      name: `Pump ${i + 1}`,
      volume: a.totalVolume || 0,
      tokens: a.totalTokensReceived || 0,
    }));

  const formatTransaction = (tx: any) => {
    const date = new Date(tx.timestamp);
    const timeStr = date.toLocaleTimeString();
    const dateStr = date.toLocaleDateString();
    
    if (tx.type === 'distribution') {
      return {
        ...tx,
        display: `Distributed ${tx.totalDistributed?.toFixed(4) || '0'} SOL to ${tx.successCount || 0} wallets`,
        icon: '💰',
        color: 'text-blue-400'
      };
    }
    if (tx.type === 'withdrawal') {
      return {
        ...tx,
        display: `Withdrew ${tx.amount === 'ALL' ? 'ALL' : `${tx.amount} SOL`} to ${tx.destination?.substring(0, 8)}...${tx.destination?.substring(tx.destination.length - 4)}`,
        icon: '💸',
        color: 'text-red-400'
      };
    }
    if (tx.type === 'recovery') {
      return {
        ...tx,
        display: `Recovered ${tx.totalRecovered?.toFixed(4) || '0'} SOL from ${tx.walletCount || 0} wallets`,
        icon: '🔄',
        color: 'text-green-400'
      };
    }
    if (tx.type === 'pump') {
      return {
        ...tx,
        display: `Pump trade: ${tx.totalVolume || 0} volume`,
        icon: '🚀',
        color: 'text-yellow-400'
      };
    }
    return {
      ...tx,
      display: `${tx.type || 'Unknown'}`,
      icon: '📝',
      color: 'text-gray-400'
    };
  };

  return (
    <div className="space-y-6">
      <div className="bg-black rounded-lg p-6 border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <h2 className="text-3xl font-bold text-white mb-8">Dashboard</h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-black rounded-lg p-5 border border-white/15 hover:border-white/25 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-300">
            <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2">Total Wallets</div>
            <div className="text-3xl font-bold text-white">{stats.totalWallets}</div>
          </div>
          <div className="bg-black rounded-lg p-5 border border-white/15 hover:border-white/25 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-300">
            <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2">Total Balance</div>
            <div className="text-3xl font-bold text-white">
              {stats.totalBalance.toFixed(4)} SOL
            </div>
          </div>
          <div className="bg-black rounded-lg p-5 border border-white/15 hover:border-white/25 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-300">
            <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2">Master Wallet</div>
            <div className="text-3xl font-bold text-white">
              {stats.masterWalletExists ? (
                <span className="text-green-400">✓</span>
              ) : (
                <span className="text-red-400">✗</span>
              )}
            </div>
            {stats.masterWalletExists && (
              <div className="text-sm text-white/60 mt-2">{stats.masterBalance.toFixed(4)} SOL</div>
            )}
          </div>
          <div className="bg-black rounded-lg p-5 border border-white/15 hover:border-white/25 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-300">
            <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2">Mode</div>
            <div className="text-2xl font-bold">
              <span className="text-red-400">Live</span> {/* Simulation mode removed - always real */}
            </div>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="bg-black rounded-lg p-6 border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] mt-6">
            <h3 className="text-xl font-semibold text-white mb-6">Recent Pump Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.6)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.9)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="volume" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#667eea" />
                    <stop offset="100%" stopColor="#764ba2" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="bg-black rounded-lg p-6 border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] mt-6">
          <h3 className="text-xl font-bold text-white mb-4">Recent Transactions</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <div className="text-white/50 text-sm text-center py-8">No transactions yet</div>
            ) : (
              recentActivity.slice(0, 50).map((tx, i) => {
                const formatted = formatTransaction(tx);
                const date = new Date(tx.timestamp);
                return (
                  <div key={i} className="flex items-start gap-3 p-3 bg-black/50 rounded border border-white/10 hover:border-white/20 transition-all">
                    <div className={`text-2xl ${formatted.color}`}>{formatted.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${formatted.color}`}>{formatted.display}</div>
                      <div className="text-xs text-white/50 mt-1">
                        {date.toLocaleDateString()} {date.toLocaleTimeString()}
                      </div>
                      {tx.type === 'distribution' && tx.results && (
                        <div className="mt-2 space-y-1">
                          <div className="text-xs text-white/60">Wallets funded:</div>
                          {tx.results.slice(0, 5).map((r: any, idx: number) => (
                            <div key={idx} className="text-xs text-white/50 ml-2">
                              • Wallet {r.walletIndex}: {r.walletAddress?.substring(0, 8)}...{r.walletAddress?.substring(r.walletAddress.length - 4)} → {r.amount?.toFixed(4)} SOL
                              {r.signature && (
                                <a 
                                  href={`https://solscan.io/tx/${r.signature}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 text-blue-400 hover:text-blue-300"
                                >
                                  View
                                </a>
                              )}
                            </div>
                          ))}
                          {tx.results.length > 5 && (
                            <div className="text-xs text-white/40 ml-2">...and {tx.results.length - 5} more</div>
                          )}
                        </div>
                      )}
                      {tx.type === 'withdrawal' && tx.destination && (
                        <div className="mt-2">
                          <div className="text-xs text-white/60">To: {tx.destination}</div>
                          {tx.signature && (
                            <a 
                              href={`https://solscan.io/tx/${tx.signature}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
                            >
                              View on Solscan
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
