import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import api from '../utils/api';

interface VolumeBotProps {
  socket: Socket | null;
}

export default function VolumeBot({ socket }: VolumeBotProps) {
  const [config, setConfig] = useState({
    tokenMint: '',
    targetVolume: 10,
    walletCount: 3,
    minTradeSize: 0.1,
    maxTradeSize: 0.5,
    delayBetweenTrades: 5000,
    duration: 0,
  });

  const [status, setStatus] = useState({
    isRunning: false,
    tokenMint: null,
    currentVolume: 0,
    targetVolume: 0,
    tradesExecuted: 0,
    walletsUsed: 0,
    startTime: null,
    errors: [] as string[],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [totalWallets, setTotalWallets] = useState(0);

  useEffect(() => {
    loadStatus();
    loadWallets();

    // Listen to socket events
    if (socket) {
      socket.on('volume:started', () => {
        loadStatus();
      });
      socket.on('volume:stopped', () => {
        loadStatus();
      });
      socket.on('volume:error', (data) => {
        alert('Volume bot error: ' + data.error);
        loadStatus();
      });
    }

    // Auto-refresh status every 5 seconds
    const interval = setInterval(() => {
      loadStatus();
    }, 5000);

    return () => {
      if (socket) {
        socket.off('volume:started');
        socket.off('volume:stopped');
        socket.off('volume:error');
      }
      clearInterval(interval);
    };
  }, [socket]);

  const loadStatus = async () => {
    try {
      const res = await api.get('/volume/status');
      setStatus(res.data);
    } catch (error: any) {
      console.error('Failed to load volume bot status:', error);
    }
  };

  const loadWallets = async () => {
    try {
      const res = await api.get('/wallets');
      setTotalWallets(res.data.totalWallets || 0);
    } catch (error: any) {
      console.error('Failed to load wallets:', error);
    }
  };

  const handleStart = async () => {
    if (!config.tokenMint) {
      alert('Por favor ingresa el mint del token');
      return;
    }

    if (config.walletCount > totalWallets) {
      alert(`Solo tienes ${totalWallets} wallets. Reduce la cantidad o crea más wallets.`);
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/volume/start', config);
      alert('Volume bot iniciado correctamente');
      loadStatus();
    } catch (error: any) {
      alert('Error al iniciar volume bot: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      await api.post('/volume/stop');
      alert('Volume bot detenido');
      loadStatus();
    } catch (error: any) {
      alert('Error al detener volume bot: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-black rounded-lg p-6 border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <h2 className="text-3xl font-bold text-white mb-2">Volume Bot</h2>
        <p className="text-white/60 text-sm mb-6">Genera volumen de trading automático en tokens usando múltiples wallets</p>

        {/* Status Cards */}
        {status.isRunning && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-black rounded-lg p-4 border border-white/15">
              <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Volumen Generado</div>
              <div className="text-2xl font-bold text-green-400">{status.currentVolume.toFixed(2)} SOL</div>
              <div className="text-xs text-white/50 mt-1">de {status.targetVolume.toFixed(2)} SOL</div>
            </div>
            <div className="bg-black rounded-lg p-4 border border-white/15">
              <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Trades Ejecutados</div>
              <div className="text-2xl font-bold text-blue-400">{status.tradesExecuted}</div>
            </div>
            <div className="bg-black rounded-lg p-4 border border-white/15">
              <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Wallets Usadas</div>
              <div className="text-2xl font-bold text-purple-400">{status.walletsUsed}</div>
            </div>
            <div className="bg-black rounded-lg p-4 border border-white/15">
              <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Tiempo Corriendo</div>
              <div className="text-2xl font-bold text-yellow-400">
                {status.startTime ? formatDuration(Date.now() - status.startTime) : '0s'}
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {status.isRunning && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-white/60 mb-2">
              <span>Progreso</span>
              <span>{((status.currentVolume / status.targetVolume) * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
                style={{ width: `${Math.min((status.currentVolume / status.targetVolume) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Configuration Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Token Mint Address</label>
            <input
              type="text"
              value={config.tokenMint}
              onChange={(e) => setConfig({ ...config, tokenMint: e.target.value })}
              disabled={status.isRunning}
              placeholder="Ej: 4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R"
              className="w-full px-4 py-2 bg-black border border-white/20 rounded text-white placeholder-white/30 focus:outline-none focus:border-white/40 disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Volumen Objetivo (SOL)
              </label>
              <input
                type="number"
                value={config.targetVolume}
                onChange={(e) => setConfig({ ...config, targetVolume: parseFloat(e.target.value) })}
                disabled={status.isRunning}
                min="1"
                step="1"
                className="w-full px-4 py-2 bg-black border border-white/20 rounded text-white focus:outline-none focus:border-white/40 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Número de Wallets ({totalWallets} disponibles)
              </label>
              <input
                type="number"
                value={config.walletCount}
                onChange={(e) => setConfig({ ...config, walletCount: parseInt(e.target.value) })}
                disabled={status.isRunning}
                min="1"
                max={totalWallets}
                className="w-full px-4 py-2 bg-black border border-white/20 rounded text-white focus:outline-none focus:border-white/40 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Trade Mínimo (SOL)
              </label>
              <input
                type="number"
                value={config.minTradeSize}
                onChange={(e) => setConfig({ ...config, minTradeSize: parseFloat(e.target.value) })}
                disabled={status.isRunning}
                min="0.01"
                step="0.01"
                className="w-full px-4 py-2 bg-black border border-white/20 rounded text-white focus:outline-none focus:border-white/40 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Trade Máximo (SOL)
              </label>
              <input
                type="number"
                value={config.maxTradeSize}
                onChange={(e) => setConfig({ ...config, maxTradeSize: parseFloat(e.target.value) })}
                disabled={status.isRunning}
                min="0.01"
                step="0.01"
                className="w-full px-4 py-2 bg-black border border-white/20 rounded text-white focus:outline-none focus:border-white/40 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Delay Entre Trades (ms)
              </label>
              <input
                type="number"
                value={config.delayBetweenTrades}
                onChange={(e) => setConfig({ ...config, delayBetweenTrades: parseInt(e.target.value) })}
                disabled={status.isRunning}
                min="1000"
                step="1000"
                className="w-full px-4 py-2 bg-black border border-white/20 rounded text-white focus:outline-none focus:border-white/40 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Duración (minutos, 0 = indefinido)
              </label>
              <input
                type="number"
                value={config.duration}
                onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) })}
                disabled={status.isRunning}
                min="0"
                className="w-full px-4 py-2 bg-black border border-white/20 rounded text-white focus:outline-none focus:border-white/40 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {!status.isRunning ? (
              <button
                onClick={handleStart}
                disabled={isLoading || !config.tokenMint}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Iniciando...' : '▶ Iniciar Volume Bot'}
              </button>
            ) : (
              <button
                onClick={handleStop}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Deteniendo...' : '⏹ Detener Volume Bot'}
              </button>
            )}
          </div>
        </div>

        {/* Errors */}
        {status.errors.length > 0 && (
          <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="text-red-400 font-semibold mb-2">⚠️ Errores ({status.errors.length})</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {status.errors.slice(-5).map((error, i) => (
                <div key={i} className="text-sm text-red-300">{error}</div>
              ))}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="text-blue-400 font-semibold mb-2">ℹ️ Información</div>
          <ul className="text-sm text-blue-300 space-y-1 list-disc list-inside">
            <li>El bot ejecuta trades automáticos para generar volumen</li>
            <li>Usa múltiples wallets para simular actividad orgánica</li>
            <li>60% compras / 40% ventas para presión alcista</li>
            <li>Los tamaños de trade se randomizan entre min y max</li>
            <li>Asegúrate de tener suficiente SOL en las wallets</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
