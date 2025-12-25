import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Dashboard from './components/Dashboard';
import Wallets from './components/Wallets';
import PumpFun from './components/PumpFun';
import MasterWallet from './components/MasterWallet';
import Config from './components/Config';
import TokenExplorer from './components/TokenExplorer';
import UserProfile from './components/UserProfile';
import PortfolioTracker from './components/PortfolioTracker';
import api from './utils/api';

type Tab = 'dashboard' | 'wallets' | 'pumpfun' | 'master' | 'config' | 'explorer' | 'profile' | 'portfolio';

interface Server {
  id: string;
  name: string;
  region: string;
  latency: number;
  color: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [solPrice, setSolPrice] = useState<{ price: number; change24h: number } | null>(null);
  const [selectedServer, setSelectedServer] = useState<string>('GLOBAL');
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(null);
  const [servers, setServers] = useState<Server[]>([
    { id: 'GLOBAL', name: 'GLOBAL', region: 'Global', latency: 60, color: 'yellow' },
    { id: 'ASIA-V2', name: 'ASIA-V2', region: 'Asia', latency: 136, color: 'orange' },
    { id: 'AUS', name: 'AUS', region: 'Australia', latency: 130, color: 'orange' },
    { id: 'EU', name: 'EU', region: 'Europe', latency: 152, color: 'red' },
  ]);
  const [masterWallet, setMasterWallet] = useState<any>(null);
  const [isMasterWalletDropdownOpen, setIsMasterWalletDropdownOpen] = useState(false);
  const [masterWalletDropdownTimeout, setMasterWalletDropdownTimeout] = useState<NodeJS.Timeout | null>(null);
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPercentage, setWithdrawPercentage] = useState<number | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  useEffect(() => {
    // Listen for tab switch events
    const handleSwitchTab = (event: CustomEvent) => {
      setActiveTab(event.detail);
    };

    window.addEventListener('switchTab' as any, handleSwitchTab as EventListener);
    return () => {
      window.removeEventListener('switchTab' as any, handleSwitchTab as EventListener);
    };
  }, []);

  // Fetch SOL price
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        // Try CoinGecko API (free, no API key needed)
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true');
        const data = await response.json();
        if (data.solana) {
          setSolPrice({
            price: data.solana.usd,
            change24h: data.solana.usd_24h_change || 0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch SOL price:', error);
        // Fallback: try alternative API
        try {
          const response = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=SOLUSDT');
          const data = await response.json();
          if (data.lastPrice && data.priceChangePercent) {
            setSolPrice({
              price: parseFloat(data.lastPrice),
              change24h: parseFloat(data.priceChangePercent),
            });
          }
        } catch (fallbackError) {
          console.error('Failed to fetch SOL price from fallback:', fallbackError);
        }
      }
    };

    // Fetch immediately
    fetchSolPrice();

    // Update every 30 seconds
    const interval = setInterval(fetchSolPrice, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Auto-detect server URL based on environment
    let serverUrl: string;
    
    // Use environment variable if available (for production)
    if (import.meta.env.VITE_SOCKET_URL) {
      serverUrl = import.meta.env.VITE_SOCKET_URL;
    }
    // If we're on the same origin (served by the backend), use same origin
    else if (window.location.port === '3001' || window.location.port === '') {
      serverUrl = window.location.origin;
    }
    // Development: use localhost:3001
    else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      serverUrl = 'http://localhost:3001';
    }
    // Production fallback: try to use same origin (won't work if backend is separate)
    else {
      serverUrl = window.location.origin;
    }
    
    console.log('🔌 Connecting to Socket.IO server:', serverUrl);
    const newSocket = io(serverUrl, {
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      timeout: 30000,
      forceNew: false,
    });
    
    newSocket.on('connect', () => {
      console.log('✅ Connected to server:', newSocket.id);
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      setConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts');
      setConnected(true);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Reconnection attempt', attemptNumber);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('❌ Reconnection error:', error.message);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed');
    });

    setSocket(newSocket);

    return () => {
      console.log('🔌 Closing socket connection');
      newSocket.close();
    };
  }, []);

  // Load master wallet and listen for updates
  useEffect(() => {
    const loadMasterWallet = async () => {
      try {
        const res = await api.get('/master-wallet');
        setMasterWallet(res.data);
      } catch (error) {
        console.error('Failed to load master wallet:', error);
      }
    };

    loadMasterWallet();

    if (socket) {
      socket.on('master-wallet:created', () => loadMasterWallet());
      socket.on('master-wallet:withdrawn', () => loadMasterWallet());
      socket.on('funds:distributed', () => loadMasterWallet());
      socket.on('funds:recovered', () => loadMasterWallet());
    }

    // Auto-refresh master wallet balance every 30 seconds (reduced to avoid rate limiting)
    const interval = setInterval(() => {
      loadMasterWallet();
    }, 30000);

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

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="bg-black border-b border-white/15 sticky top-0 z-50 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm bg-black/95">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 py-3 min-h-[70px] sm:min-h-[72px]">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">
                <span className="bg-gradient-to-r from-white via-white/95 to-white/80 bg-clip-text text-transparent">
                  pnl.onl
                </span>
              </h1>
            </div>
            
            {/* SOL Price and Master Wallet Balance */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {/* SOL Price */}
              {solPrice ? (
                <div className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-black border border-white/15 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-white/20 transition-all">
                  <div className="flex items-center space-x-1">
                    <span className="text-white text-sm sm:text-base font-bold tracking-tight">
                      ${solPrice.price.toFixed(2)}
                    </span>
                  </div>
                  <div className={`flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 rounded-md text-xs font-bold transition-all ${
                    solPrice.change24h > 0
                      ? 'bg-green-500/25 text-green-300 border border-green-500/40 shadow-[0_1px_3px_rgba(34,197,94,0.2)]'
                      : solPrice.change24h < 0
                      ? 'bg-red-500/25 text-red-300 border border-red-500/40 shadow-[0_1px_3px_rgba(239,68,68,0.2)]'
                      : 'bg-white/10 text-white/60 border border-white/10'
                  }`}>
                    <span className="text-xs">{solPrice.change24h > 0 ? '▲' : solPrice.change24h < 0 ? '▼' : '—'}</span>
                    <span className="text-xs">{Math.abs(solPrice.change24h).toFixed(2)}%</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-black border border-white/10">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white/80 rounded-full animate-spin"></div>
                  <span className="text-white/40 text-xs">Loading...</span>
                </div>
              )}

              {/* Master Wallet Balance */}
              {masterWallet?.exists && (
                <div 
                  className="relative"
                  onMouseEnter={() => {
                    if (masterWalletDropdownTimeout) {
                      clearTimeout(masterWalletDropdownTimeout);
                      setMasterWalletDropdownTimeout(null);
                    }
                    setIsMasterWalletDropdownOpen(true);
                  }}
                  onMouseLeave={() => {
                    const timeout = setTimeout(() => {
                      setIsMasterWalletDropdownOpen(false);
                    }, 150);
                    setMasterWalletDropdownTimeout(timeout);
                  }}
                >
                  <button
                    onClick={() => {
                      setIsMasterWalletDropdownOpen(!isMasterWalletDropdownOpen);
                    }}
                    className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-black border border-white/15 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-white/25 hover:shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-all cursor-pointer"
                  >
                    <div className="flex items-center space-x-1">
                      <span className="text-white text-sm sm:text-base font-bold whitespace-nowrap tracking-tight">
                        {masterWallet?.balance !== undefined && masterWallet?.balance !== null
                          ? `${masterWallet.balance.toFixed(4)}`
                          : '0.0000'}
                      </span>
                      <span className="text-white text-sm sm:text-base font-bold whitespace-nowrap">SOL</span>
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png" 
                        alt="Solana" 
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </button>

                  {/* Master Wallet Dropdown */}
                  {isMasterWalletDropdownOpen && (
                    <div 
                      className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-black border border-white/15 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] z-[60] pointer-events-auto"
                      onMouseEnter={() => {
                        if (masterWalletDropdownTimeout) {
                          clearTimeout(masterWalletDropdownTimeout);
                          setMasterWalletDropdownTimeout(null);
                        }
                      }}
                      onMouseLeave={() => {
                        const timeout = setTimeout(() => {
                          setIsMasterWalletDropdownOpen(false);
                        }, 150);
                        setMasterWalletDropdownTimeout(timeout);
                      }}
                    >
                      <div className="p-4 space-y-4">
                        {/* Wallet Info */}
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

                        {/* Actions */}
                        <div className="pt-2 border-t border-white/10">
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  await api.post('/funds/distribute-from-master');
                                  const res = await api.get('/master-wallet');
                                  setMasterWallet(res.data);
                                  alert('✅ Funds distributed successfully');
                                } catch (error: any) {
                                  alert(`Error: ${error.response?.data?.error || error.message}`);
                                }
                              }}
                              className="flex-1 px-4 py-2 bg-black border border-white/15 hover:border-white/25 text-white rounded font-medium text-sm shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-all"
                            >
                              Distribute
                            </button>

                            <button
                              onClick={async () => {
                                try {
                                  await api.post('/funds/recover-to-master');
                                  const res = await api.get('/master-wallet');
                                  setMasterWallet(res.data);
                                  alert('✅ Funds recovered successfully');
                                } catch (error: any) {
                                  alert(`Error: ${error.response?.data?.error || error.message}`);
                                }
                              }}
                              className="flex-1 px-4 py-2 bg-black border border-white/15 hover:border-white/25 text-white rounded font-medium text-sm shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-all"
                            >
                              Recover
                            </button>

                            <button
                              onClick={() => setIsWithdrawModalOpen(true)}
                              className="flex-1 px-4 py-2 bg-black border border-red-500/30 hover:border-red-500/50 text-white rounded font-medium text-sm shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-all"
                            >
                              Withdraw
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Withdraw Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-2 sm:p-4">
          <div className="bg-black border border-white/15 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] w-full max-w-md p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Withdraw from Master Wallet</h3>
              <button
                onClick={() => {
                  setIsWithdrawModalOpen(false);
                  setWithdrawAddress('');
                  setWithdrawAmount('');
                  setWithdrawPercentage(null);
                }}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

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
                Amount
              </label>
              
              {/* Percentage Buttons */}
              <div className="flex gap-2 mb-3">
                {[25, 50, 75, 100].map((percent) => (
                  <button
                    key={percent}
                    onClick={() => {
                      setWithdrawPercentage(percent);
                      if (masterWallet?.balance) {
                        const amount = (masterWallet.balance * percent) / 100;
                        setWithdrawAmount(amount.toFixed(4));
                      }
                    }}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all ${
                      withdrawPercentage === percent
                        ? 'bg-white/20 border border-white/30 text-white'
                        : 'bg-black border border-white/15 text-white/60 hover:text-white hover:border-white/25'
                    }`}
                  >
                    {percent}%
                  </button>
                ))}
              </div>

              {/* Amount Input with Slider */}
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max={masterWallet?.balance ? (masterWallet.balance * 100).toFixed(0) : '100'}
                  value={withdrawAmount ? (parseFloat(withdrawAmount) * 100).toFixed(0) : '0'}
                  onChange={(e) => {
                    const percent = parseFloat(e.target.value);
                    setWithdrawPercentage(null);
                    if (masterWallet?.balance) {
                      const amount = (masterWallet.balance * percent) / 100;
                      setWithdrawAmount(amount.toFixed(4));
                    }
                  }}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, white 0%, white ${withdrawAmount && masterWallet?.balance ? (parseFloat(withdrawAmount) / masterWallet.balance * 100) : 0}%, rgba(255,255,255,0.1) ${withdrawAmount && masterWallet?.balance ? (parseFloat(withdrawAmount) / masterWallet.balance * 100) : 0}%, rgba(255,255,255,0.1) 100%)`
                  }}
                />
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => {
                    setWithdrawAmount(e.target.value);
                    setWithdrawPercentage(null);
                  }}
                  placeholder="0"
                  step="0.0001"
                  max={masterWallet?.balance}
                  className="w-full px-4 py-2 bg-black border border-white/15 text-white rounded focus:border-white/25 focus:outline-none shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]"
                />
                <div className="text-white/40 text-xs text-right">
                  Max: {masterWallet?.balance ? masterWallet.balance.toFixed(4) : '0.0000'} SOL
                </div>
              </div>
            </div>

            <button
              onClick={async () => {
                if (!withdrawAddress) {
                  alert('Please enter a destination address');
                  return;
                }

                if (withdrawAddress.length < 32 || withdrawAddress.length > 44) {
                  alert('Invalid Solana address format. Address should be 32-44 characters.');
                  return;
                }

                const finalAmount = withdrawAmount ? parseFloat(withdrawAmount) : undefined;
                const amountText = finalAmount ? `${finalAmount.toFixed(4)} SOL` : 'ALL SOL';
                
                if (!confirm(`⚠️ Confirm withdrawal:\n\nAmount: ${amountText}\nTo: ${withdrawAddress}\n\nThis action cannot be undone.`)) {
                  return;
                }

                setIsWithdrawing(true);
                try {
                  console.log(`💸 Sending withdraw request: ${finalAmount || 'ALL'} SOL to ${withdrawAddress}`);
                  
                  const response = await api.post('/master-wallet/withdraw', {
                    destination: withdrawAddress,
                    amount: finalAmount,
                  });
                  
                  console.log('✅ Withdraw response:', response.data);
                  
                  alert(`✅ Success! ${response.data.message || 'Withdrawal completed successfully.'}`);
                  
                  setWithdrawAddress('');
                  setWithdrawAmount('');
                  setWithdrawPercentage(null);
                  setIsWithdrawModalOpen(false);
                  
                  // Wait a moment for transaction to be confirmed
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  
                  // Reload master wallet to get updated balance
                  const res = await api.get('/master-wallet');
                  setMasterWallet(res.data);
                  
                  console.log('✅ Master wallet balance updated:', res.data.balance);
                } catch (error: any) {
                  const errorMsg = error.response?.data?.error || error.message;
                  console.error('❌ Withdraw error:', errorMsg);
                  alert(`❌ Error: ${errorMsg}`);
                } finally {
                  setIsWithdrawing(false);
                }
              }}
              disabled={isWithdrawing || !withdrawAddress}
              className="w-full px-4 py-3 bg-black border border-red-500/30 hover:border-red-500/50 text-white rounded font-medium disabled:opacity-50 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-all"
            >
              {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-black border-b border-white/15 shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'explorer', label: 'Token Explorer' },
              { id: 'portfolio', label: 'Portfolio' },
              { id: 'wallets', label: 'Wallets' },
              { id: 'pumpfun', label: 'Trade Bot' },
              { id: 'master', label: 'Master Wallet' },
              { id: 'config', label: 'Config' },
              { id: 'profile', label: 'Profile' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-white bg-black border-b-2 border-white'
                    : 'text-white/60 hover:text-white hover:bg-black'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 pb-20 sm:pb-24 w-full">
        {activeTab === 'dashboard' && <Dashboard socket={socket} />}
        {activeTab === 'explorer' && <TokenExplorer socket={socket} />}
        {activeTab === 'portfolio' && <PortfolioTracker socket={socket} />}
        {activeTab === 'wallets' && <Wallets socket={socket} />}
        {activeTab === 'pumpfun' && <PumpFun socket={socket} />}
        {activeTab === 'master' && <MasterWallet socket={socket} />}
        {activeTab === 'profile' && <UserProfile />}
        {activeTab === 'config' && <Config socket={socket} />}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/15 shadow-[0_-2px_8px_rgba(0,0,0,0.5)] z-40">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 py-3 sm:py-0 sm:h-16 min-h-[64px] sm:min-h-[64px]">
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              {/* Server Selector */}
              <div 
                className="relative flex-1 sm:flex-initial"
                onMouseEnter={() => {
                  if (dropdownTimeout) {
                    clearTimeout(dropdownTimeout);
                    setDropdownTimeout(null);
                  }
                  setIsServerDropdownOpen(true);
                }}
                onMouseLeave={() => {
                  const timeout = setTimeout(() => {
                    setIsServerDropdownOpen(false);
                  }, 150); // Small delay to allow mouse movement
                  setDropdownTimeout(timeout);
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)}
                  className="relative flex items-center gap-[8px] px-[12px] hover:bg-white/10 rounded-[4px] h-[32px] overflow-hidden"
                >
                  <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                  <span className="text-[12px] leading-[16px] font-medium text-white/80">
                    {servers.find(s => s.id === selectedServer)?.name || 'GLOBAL'}
                  </span>
                  <div className="flex-grow"></div>
                  <span className={`text-[11px] tabular-nums font-medium ${
                    servers.find(s => s.id === selectedServer)?.color === 'yellow' ? 'text-yellow-500' :
                    servers.find(s => s.id === selectedServer)?.color === 'orange' ? 'text-orange-500' :
                    servers.find(s => s.id === selectedServer)?.color === 'red' ? 'text-red-500' :
                    'text-white/60'
                  }`}>
                    {servers.find(s => s.id === selectedServer)?.latency || 60}ms
                  </span>
                </button>
                
                {/* Dropdown Menu - Opens upward since footer is at bottom */}
                {isServerDropdownOpen && (
                  <div 
                    className="absolute bottom-full right-0 mb-1 z-[60]"
                    onMouseEnter={() => {
                      if (dropdownTimeout) {
                        clearTimeout(dropdownTimeout);
                        setDropdownTimeout(null);
                      }
                      setIsServerDropdownOpen(true);
                    }}
                    onMouseLeave={() => {
                      const timeout = setTimeout(() => {
                        setIsServerDropdownOpen(false);
                      }, 150);
                      setDropdownTimeout(timeout);
                    }}
                  >
                    <div className="bg-black border border-white/15 rounded-lg shadow-lg p-2 w-full sm:min-w-[200px]">
                      {servers.map((server) => (
                        <button
                          key={server.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedServer(server.id);
                            setIsServerDropdownOpen(false);
                            if (dropdownTimeout) {
                              clearTimeout(dropdownTimeout);
                              setDropdownTimeout(null);
                            }
                          }}
                          className={`relative flex items-center gap-[8px] px-[12px] hover:bg-white/10 hover:opacity-100 hover:grayscale-0 opacity-90 grayscale-[0.25] rounded-[4px] w-full text-left justify-start h-[32px] overflow-hidden transition-all cursor-pointer ${
                            selectedServer === server.id ? 'bg-white/5' : ''
                          }`}
                        >
                          {selectedServer === server.id && (
                            <div className="absolute left-0 w-[2px] h-[16px] transition-colors duration-300 bg-yellow-500"></div>
                          )}
                          <svg className={`w-4 h-4 ${
                            server.color === 'yellow' ? 'text-yellow-500' :
                            server.color === 'orange' ? 'text-orange-500' :
                            server.color === 'red' ? 'text-red-500' :
                            'text-white/60'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                          </svg>
                          <span className={`text-[12px] leading-[16px] font-medium ${
                            selectedServer === server.id ? 'text-white' : 'text-white/60'
                          }`}>
                            {server.name}
                          </span>
                          <div className="flex-grow"></div>
                          <span className={`text-[11px] tabular-nums font-medium ${
                            server.color === 'yellow' ? 'text-yellow-500' :
                            server.color === 'orange' ? 'text-orange-500' :
                            server.color === 'red' ? 'text-red-500' :
                            'text-white/60'
                          }`}>
                            {server.latency}ms
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Connection Status - Right side */}
            <div className={`flex flex-row h-[24px] px-2 sm:px-[8px] gap-[4px] justify-start items-center rounded-[4px] ${
              connected 
                ? 'text-green-500 bg-green-500/20 sm:bg-transparent lg:bg-green-500/20' 
                : 'text-red-500 bg-red-500/20 sm:bg-transparent lg:bg-red-500/20'
            }`}>
              <div className="flex flex-row gap-[4px] justify-start items-center">
                <div className={`${
                  connected ? 'bg-green-500/20' : 'bg-red-500/20'
                } w-[12px] h-[12px] rounded-full flex flex-row gap-[4px] justify-center items-center`}>
                  <div className={`${
                    connected ? 'bg-green-500' : 'bg-red-500'
                  } w-[8px] h-[8px] rounded-full`}></div>
                </div>
              </div>
              <span className="hidden sm:flex text-[12px] font-medium">
                {connected ? 'Connection is stable' : 'Connection lost'}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

