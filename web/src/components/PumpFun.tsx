import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import api from '../utils/api';
import TokenTerminal from './TokenTerminal';

interface PumpFunProps {
  socket: Socket | null;
}

export default function PumpFun({ socket }: PumpFunProps) {
  const [config, setConfig] = useState({
    tokenMint: '',
    tokenName: '',
    totalBuyAmount: 0.5,
    numberOfWallets: 5,
    executionMode: 'simultaneous' as 'simultaneous' | 'sequential' | 'bundled',
    delayBetweenWallets: 100,
    slippagePercent: 10,
    tradeType: 'buy' as 'buy' | 'sell',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [wallets, setWallets] = useState<any[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [loadingTokenInfo, setLoadingTokenInfo] = useState(false);
  const [selectedPercentage, setSelectedPercentage] = useState<number | null>(null);
  const [selectedWallets, setSelectedWallets] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadWallets();

    // Listen for token mint from TokenExplorer
    const handleSetTokenMint = (event: Event) => {
      const customEvent = event as CustomEvent;
      setConfig((prev) => ({ ...prev, tokenMint: customEvent.detail }));
    };

    window.addEventListener('setTokenMint', handleSetTokenMint);

    if (socket) {
      socket.on('pumpfun:completed', (data) => {
        setResult(data);
        setLoading(false);
      });
      socket.on('pumpfun:error', (data) => {
        alert(`Error: ${data.error}`);
        setLoading(false);
      });
      socket.on('pumpfun:stopped', () => {
        setLoading(false);
      });
    }

    return () => {
      window.removeEventListener('setTokenMint', handleSetTokenMint);
      if (socket) {
        socket.off('pumpfun:completed');
        socket.off('pumpfun:error');
        socket.off('pumpfun:stopped');
      }
    };
  }, [socket]);

  const loadWallets = async () => {
    try {
      const res = await api.get('/wallets');
      const walletsData = res.data.wallets || [];
      setWallets(walletsData);
      setTotalBalance(res.data.totalBalance || 0);
      
      // Auto-select first wallets if none selected
      if (selectedWallets.size === 0 && walletsData.length > 0) {
        const initialSelection = new Set<number>(
          walletsData.slice(0, Math.min(5, walletsData.length)).map((w: any) => Number(w.index))
        );
        setSelectedWallets(initialSelection);
        setConfig((prev) => ({
          ...prev,
          numberOfWallets: initialSelection.size,
        }));
      } else {
        // Update numberOfWallets based on selected wallets
        setConfig((prev) => ({
          ...prev,
          numberOfWallets: selectedWallets.size || prev.numberOfWallets,
        }));
      }
    } catch (error) {
      console.error('Failed to load wallets:', error);
    }
  };

  const handleWalletToggle = (walletIndex: number) => {
    const newSelected = new Set(selectedWallets);
    if (newSelected.has(walletIndex)) {
      newSelected.delete(walletIndex);
    } else {
      newSelected.add(walletIndex);
    }
    setSelectedWallets(newSelected);
    setConfig((prev) => ({
      ...prev,
      numberOfWallets: newSelected.size,
    }));
  };

  const handleSelectAll = () => {
    if (selectedWallets.size === wallets.length) {
      setSelectedWallets(new Set<number>());
      setConfig((prev) => ({ ...prev, numberOfWallets: 0 }));
    } else {
      const allIndices = new Set<number>(wallets.map((w: any) => Number(w.index)));
      setSelectedWallets(allIndices);
      setConfig((prev) => ({ ...prev, numberOfWallets: allIndices.size }));
    }
  };

  const getSelectedWalletsBalance = () => {
    return wallets
      .filter((w: any) => selectedWallets.has(Number(w.index)))
      .reduce((sum: number, w: any) => sum + (w.balance || 0), 0);
  };

  const handlePercentageSelect = (percentage: number) => {
    setSelectedPercentage(percentage);
    const amount = (totalBalance * percentage) / 100;
    setConfig((prev) => ({ ...prev, totalBuyAmount: Math.max(0.001, amount) }));
  };

  const handleAmountChange = (value: number) => {
    setSelectedPercentage(null);
    setConfig((prev) => ({ ...prev, totalBuyAmount: Math.max(0.001, value) }));
  };

  const handleExecute = async (tradeType: 'buy' | 'sell') => {
    if (!config.tokenMint) {
      alert('Por favor ingresa una dirección de token mint');
      return;
    }

    if (config.totalBuyAmount <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    if (config.totalBuyAmount > totalBalance) {
      alert(`El monto excede el balance disponible (${totalBalance.toFixed(4)} SOL)`);
      return;
    }

    const confirmMessage = tradeType === 'buy' 
      ? `¿Confirmar COMPRA de ${config.totalBuyAmount.toFixed(4)} SOL?\n\nEsto ejecutará transacciones REALES en la blockchain.`
      : `¿Confirmar VENTA de tokens por ${config.totalBuyAmount.toFixed(4)} SOL?\n\nEsto ejecutará transacciones REALES en la blockchain.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const executeConfig = {
        ...config,
        tradeType,
        selectedWalletIndices: Array.from(selectedWallets),
      };
      await api.post('/pumpfun/execute', executeConfig);
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
      setLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      await api.post('/pumpfun/stop');
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleLoadTokenInfo = async () => {
    if (!config.tokenMint || config.tokenMint.length < 32) {
      alert('Please enter a valid token mint address');
      return;
    }

    setLoadingTokenInfo(true);
    setTokenInfo(null);
    try {
      const res = await api.get(`/pumpfun/token/${config.tokenMint}`);
      setTokenInfo(res.data);
      
      // Auto-fill token name if available
      if (res.data.name && !config.tokenName) {
        setConfig({ ...config, tokenName: res.data.name });
      }
    } catch (error: any) {
      alert(`Error loading token info: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoadingTokenInfo(false);
    }
  };

  const selectedWalletsBalance = getSelectedWalletsBalance();
  const availableBalance = selectedWalletsBalance > 0 ? selectedWalletsBalance : totalBalance;
  const percentageOptions = [15, 25, 50, 75, 100];
  const maxAmount = availableBalance;

  return (
    <div className="space-y-6">
      <div className="bg-black rounded-lg p-4 sm:p-6 md:p-8 border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Trade Bot</h2>
            <p className="text-white/50 text-xs sm:text-sm">Ejecuta operaciones de compra y venta en pump.fun</p>
          </div>
          <div className="bg-black rounded-lg px-4 sm:px-5 py-2.5 sm:py-3 border border-white/15 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] w-full sm:w-auto">
            <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">
              {selectedWallets.size > 0 ? 'Balance Seleccionado' : 'Balance Total'}
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white">
              {availableBalance.toFixed(4)} <span className="text-xs sm:text-sm text-white/70 font-normal">SOL</span>
            </div>
            {selectedWallets.size > 0 && (
              <div className="text-white/40 text-xs mt-1">
                {selectedWallets.size} wallet{selectedWallets.size !== 1 ? 's' : ''} seleccionada{selectedWallets.size !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Security Info */}
        <div className="mb-8 p-5 bg-black/50 border border-white/10 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-blue-400 text-lg mt-0.5">ℹ</div>
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-2 text-sm">Información de Seguridad</h3>
              <p className="text-white/60 text-xs leading-relaxed">
                Todas las transacciones son REALES y verificables en Solscan. Las wallets están bajo tu control y los private keys se almacenan localmente en tu sistema.
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Form */}
        <div className="space-y-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
                Token Mint Address
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.tokenMint}
                  onChange={(e) => {
                    setConfig({ ...config, tokenMint: e.target.value });
                    setTokenInfo(null);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && config.tokenMint.length > 0) {
                      handleLoadTokenInfo();
                    }
                  }}
                  placeholder="Ingresa la dirección del token"
                  className="flex-1 px-4 py-2.5 bg-black text-white rounded-md border border-white/15 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-sm"
                />
                <button
                  onClick={handleLoadTokenInfo}
                  disabled={loadingTokenInfo || !config.tokenMint || config.tokenMint.length < 32}
                  className="px-5 py-2.5 bg-black border border-white/15 hover:border-white/30 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] text-sm"
                >
                  {loadingTokenInfo ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
                Token Name
              </label>
              <input
                type="text"
                value={config.tokenName}
                onChange={(e) => setConfig({ ...config, tokenName: e.target.value })}
                placeholder="Nombre del token (opcional)"
                className="w-full px-4 py-2.5 bg-black text-white rounded-md border border-white/15 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-sm"
              />
            </div>
          </div>

          {/* Amount Selection Section */}
          <div className="bg-black/30 rounded-lg p-5 border border-white/10">
            <label className="block text-white/70 text-sm font-medium mb-4 uppercase tracking-wider">
              Monto en SOL
            </label>
            
            {/* Percentage Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {percentageOptions.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentageSelect(pct)}
                  className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
                    selectedPercentage === pct
                      ? 'bg-white/10 text-white border border-white/30'
                      : 'bg-black text-white/60 border border-white/10 hover:border-white/20 hover:text-white/80'
                  } shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]`}
                >
                  {pct}%
                </button>
              ))}
            </div>
            
            {/* Amount Input and Slider */}
            <div className="space-y-4">
              <input
                type="number"
                value={config.totalBuyAmount}
                onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                min="0.001"
                max={maxAmount}
                step="0.01"
                className="w-full px-4 py-3 bg-black text-white rounded-md border border-white/15 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-lg font-semibold"
              />
              
              {/* Slider */}
              <div className="space-y-2">
                <input
                  type="range"
                  min="0.001"
                  max={maxAmount}
                  step="0.01"
                  value={config.totalBuyAmount}
                  onChange={(e) => handleAmountChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.3) ${(config.totalBuyAmount / maxAmount) * 100}%, rgba(255,255,255,0.1) ${(config.totalBuyAmount / maxAmount) * 100}%, rgba(255,255,255,0.1) 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-white/40">
                  <span>0.001 SOL</span>
                  <span>{maxAmount.toFixed(4)} SOL</span>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Selection Section */}
          <div className="bg-black/30 rounded-lg p-5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-white/70 text-sm font-medium uppercase tracking-wider">
                Seleccionar Wallets ({selectedWallets.size} de {wallets.length} seleccionadas)
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1.5 text-xs font-medium bg-black border border-white/15 hover:border-white/30 text-white rounded-md transition-all shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]"
              >
                {selectedWallets.size === wallets.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
              </button>
            </div>
            
            {selectedWallets.size > 0 && (
              <div className="mb-4 p-3 bg-black/50 rounded-md border border-white/10">
                <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">
                  Balance Total Seleccionado
                </div>
                <div className="text-xl font-bold text-white">
                  {selectedWalletsBalance.toFixed(4)} <span className="text-sm text-white/70 font-normal">SOL</span>
                </div>
              </div>
            )}

            <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
              {wallets.length === 0 ? (
                <div className="text-white/40 text-sm text-center py-4">
                  No hay wallets disponibles. Genera wallets en la pestaña "Wallets".
                </div>
              ) : (
                wallets.map((wallet: any) => {
                  const walletIndex = Number(wallet.index);
                  const isSelected = selectedWallets.has(walletIndex);
                  return (
                    <div
                      key={walletIndex}
                      onClick={() => handleWalletToggle(walletIndex)}
                      className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-white/5 border-white/30 shadow-[0_1px_3px_rgba(255,255,255,0.1)]'
                          : 'bg-black border-white/10 hover:border-white/20'
                      } shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-white/10 border-white/40'
                            : 'bg-black border-white/20'
                        }`}>
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium truncate">
                            Wallet #{walletIndex}
                          </div>
                          <div className="text-white/40 text-xs font-mono truncate">
                            {wallet.publicKey}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <div className="text-white text-sm font-semibold">
                          {wallet.balance?.toFixed(4) || '0.0000'} <span className="text-white/60 text-xs">SOL</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

            <div>
              <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
                Modo de Ejecución
              </label>
              <select
                value={config.executionMode}
                onChange={(e) => setConfig({ ...config, executionMode: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-black text-white rounded-md border border-white/15 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-sm"
              >
                <option value="simultaneous">Simultáneo</option>
                <option value="sequential">Secuencial</option>
                <option value="bundled">Bundled (Jito)</option>
              </select>
            </div>

            <div>
              <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
                Slippage (%)
              </label>
              <input
                type="number"
                value={config.slippagePercent}
                onChange={(e) => setConfig({ ...config, slippagePercent: parseFloat(e.target.value) || 10 })}
                min="0.1"
                max="50"
                step="0.1"
                className="w-full px-4 py-2.5 bg-black text-white rounded-md border border-white/15 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-sm"
              />
            </div>
          </div>

          {config.executionMode === 'sequential' && (
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
                Delay Entre Wallets (ms)
              </label>
              <input
                type="number"
                value={config.delayBetweenWallets}
                onChange={(e) => setConfig({ ...config, delayBetweenWallets: parseInt(e.target.value) || 100 })}
                min="0"
                max="5000"
                className="w-full px-4 py-2.5 bg-black text-white rounded-md border border-white/15 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-sm"
              />
            </div>
          )}
        </div>

        {/* Token Terminal View */}
        {tokenInfo && (
          <div className="mb-6">
            <TokenTerminal socket={socket} tokenMint={config.tokenMint} />
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4 pt-6 border-t border-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <button
              onClick={() => handleExecute('buy')}
              disabled={loading || selectedWallets.size === 0 || config.totalBuyAmount <= 0 || config.totalBuyAmount > availableBalance}
              className="group relative px-8 py-5 bg-black border-2 border-green-500/40 hover:border-green-500/60 text-white rounded-lg font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-green-500/40 transition-all duration-200 shadow-[0_2px_8px_rgba(34,197,94,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] hover:shadow-[0_4px_12px_rgba(34,197,94,0.25)] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center justify-center gap-3">
                {loading && config.tradeType === 'buy' ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Ejecutando compra...</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>COMPRAR</span>
                    <span className="text-green-400 font-bold">{config.totalBuyAmount.toFixed(4)} SOL</span>
                  </>
                )}
              </div>
            </button>
            
            <button
              onClick={() => handleExecute('sell')}
              disabled={loading || selectedWallets.size === 0 || config.totalBuyAmount <= 0 || config.totalBuyAmount > availableBalance}
              className="group relative px-8 py-5 bg-black border-2 border-red-500/40 hover:border-red-500/60 text-white rounded-lg font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-red-500/40 transition-all duration-200 shadow-[0_2px_8px_rgba(239,68,68,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] hover:shadow-[0_4px_12px_rgba(239,68,68,0.25)] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center justify-center gap-3">
                {loading && config.tradeType === 'sell' ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Ejecutando venta...</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span>VENDER</span>
                    <span className="text-red-400 font-bold">{config.totalBuyAmount.toFixed(4)} SOL</span>
                  </>
                )}
              </div>
            </button>
          </div>
          
          {loading && (
            <button
              onClick={handleStop}
              className="w-full px-6 py-3 bg-black border border-red-500/40 hover:border-red-500/60 text-white rounded-lg font-medium transition-all duration-200 shadow-[0_1px_3px_rgba(239,68,68,0.2)]"
            >
              Detener Operación
            </button>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="mt-6 bg-black rounded-lg p-6 border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
            <h3 className="text-xl font-semibold text-white mb-4">Results</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-black rounded-md p-4 border border-white/15 shadow-[0_1px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Total Trades</div>
                <div className="text-2xl font-bold text-white">{result.totalTrades}</div>
              </div>
              <div className="bg-black rounded-md p-4 border border-white/15 shadow-[0_1px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Successful</div>
                <div className="text-2xl font-bold text-green-400">{result.successfulTrades}</div>
              </div>
              <div className="bg-black rounded-md p-4 border border-white/15 shadow-[0_1px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Total Volume</div>
                <div className="text-2xl font-bold text-white">
                  {result.totalVolume?.toFixed(4)} SOL
                </div>
              </div>
              <div className="bg-black rounded-md p-4 border border-white/15 shadow-[0_1px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Tokens Received</div>
                <div className="text-2xl font-bold text-white">
                  {result.totalTokensReceived?.toFixed(4)}
                </div>
              </div>
            </div>
            {result.signatures && result.signatures.length > 0 && (
              <div className="mt-4">
                <div className="text-white/60 text-sm mb-2">Signatures:</div>
                <div className="space-y-1">
                  {result.signatures.slice(0, 5).map((sig: string, i: number) => (
                    <a
                      key={i}
                      href={`https://solscan.io/tx/${sig}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-primary-400 hover:text-primary-300 text-sm font-mono transition-colors"
                    >
                      {sig.substring(0, 16)}...
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

