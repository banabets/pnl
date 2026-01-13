import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import api from '../utils/api';

interface ConfigProps {
  socket: Socket | null;
}

export default function Config({ socket }: ConfigProps) {
  const [config, setConfig] = useState({
    rpcUrl: '',
    maxSolPerSwap: 0.05,
    slippageBps: 50,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfig();

    // Simulation mode removed - no socket listener needed

    return () => {
      if (socket) {
        socket.off('config:updated');
      }
    };
  }, [socket]);

  const loadConfig = async () => {
    try {
      const res = await api.get('/config');
      console.log('📊 Config loaded:', res.data);
      setConfig(res.data);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  // Simulation mode removed - this function no longer needed

  return (
    <div className="space-y-6">
      <div className="bg-black rounded-lg p-6 border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <h2 className="text-2xl font-bold text-white mb-6">Configuration</h2>

        <div className="space-y-6">
          {/* Config Info */}
          <div className="bg-black rounded-lg p-4 border border-white/15 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-white/60 text-sm">RPC URL</span>
              <span className="text-white font-mono text-sm">{config.rpcUrl}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-white/60 text-sm">Max SOL per Swap</span>
              <span className="text-white">{config.maxSolPerSwap} SOL</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-white/60 text-sm">Slippage</span>
              <span className="text-white">{config.slippageBps / 100}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

