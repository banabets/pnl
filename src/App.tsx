import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Dashboard from './components/Dashboard';
import Wallets from './components/Wallets';
import PumpFun from './components/PumpFun';
import MasterWallet from './components/MasterWallet';
import Config from './components/Config';
import TokenExplorer from './components/TokenExplorer';

type Tab = 'dashboard' | 'wallets' | 'pumpfun' | 'master' | 'config' | 'explorer';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

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

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      {/* Header */}
      <header className="border-b border-white/10 sticky top-0 z-50 bg-[#0b0f14]/95 backdrop-blur">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold gradient-text">
                Pump.fun Bot
              </h1>
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs font-medium text-white/70">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-white/10 bg-[#0b0f14]/80 backdrop-blur">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'explorer', label: 'Token Explorer', icon: '🔍' },
              { id: 'wallets', label: 'Wallets', icon: '💼' },
              { id: 'pumpfun', label: 'Pump.fun', icon: '📈' },
              { id: 'master', label: 'Master Wallet', icon: '🏦' },
              { id: 'config', label: 'Config', icon: '⚙️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-white bg-gradient-to-r from-primary-500 to-accent-pink border-b-2 border-primary-500'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full px-3 sm:px-4 lg:px-6 py-4">
        {activeTab === 'dashboard' && <Dashboard socket={socket} />}
        {activeTab === 'explorer' && <TokenExplorer socket={socket} />}
        {activeTab === 'wallets' && <Wallets socket={socket} />}
        {activeTab === 'pumpfun' && <PumpFun socket={socket} />}
        {activeTab === 'master' && <MasterWallet socket={socket} />}
        {activeTab === 'config' && <Config socket={socket} />}
      </main>
    </div>
  );
}

export default App;

