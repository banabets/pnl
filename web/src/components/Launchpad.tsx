import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import api from '../utils/api';

interface LaunchpadProps {
  socket: Socket | null;
}

export default function Launchpad({ socket }: LaunchpadProps) {
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    twitter: '',
    telegram: '',
    website: '',
    initialBuy: 0,
  });

  const [isLaunching, setIsLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [masterWallet, setMasterWallet] = useState<any>(null);

  useEffect(() => {
    loadMasterWallet();

    if (socket) {
      socket.on('launchpad:created', (data) => {
        alert(`Token launched successfully! Mint: ${data.mint}`);
        setLaunchResult(data);
      });
    }

    return () => {
      if (socket) {
        socket.off('launchpad:created');
      }
    };
  }, [socket]);

  const loadMasterWallet = async () => {
    try {
      const res = await api.get('/master-wallet');
      setMasterWallet(res.data);
    } catch (error: any) {
      console.error('Failed to load master wallet:', error);
    }
  };

  const handleLaunch = async () => {
    setErrors([]);
    setLaunchResult(null);

    // Client-side validation
    const validationErrors: string[] = [];
    if (!formData.name.trim()) validationErrors.push('Name is required');
    if (!formData.symbol.trim()) validationErrors.push('Symbol is required');
    if (!formData.description.trim()) validationErrors.push('Description is required');

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!masterWallet?.exists) {
      alert('You need to create a Master Wallet first');
      return;
    }

    setIsLaunching(true);
    try {
      const res = await api.post('/launchpad/create', formData);

      if (res.data.success) {
        setLaunchResult(res.data);
        alert(`Token launched successfully!\n\nMint: ${res.data.mint}\nName: ${formData.name}\nSymbol: ${formData.symbol}`);

        // Reset form
        setFormData({
          name: '',
          symbol: '',
          description: '',
          twitter: '',
          telegram: '',
          website: '',
          initialBuy: 0,
        });
      } else {
        setErrors([res.data.error || 'Unknown error']);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message;
      const errorList = error.response?.data?.errors || [errorMsg];
      setErrors(errorList);
      alert('Error launching token: ' + errorMsg);
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-black rounded-lg p-6 border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <h2 className="text-3xl font-bold text-white mb-2">Token Launchpad</h2>
        <p className="text-white/60 text-sm mb-6">Launch your own token on Pump.fun with one click</p>

        {/* Master Wallet Status */}
        <div className="mb-6 bg-black/50 rounded-lg p-4 border border-white/15">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Master Wallet</div>
              <div className="text-white font-medium">
                {masterWallet?.exists ? (
                  <>
                    <span className="text-green-400">✓ Connected</span>
                    <span className="text-white/60 ml-3 text-sm">{masterWallet.balance?.toFixed(4)} SOL</span>
                  </>
                ) : (
                  <span className="text-red-400">✗ Not configured</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Launch Result */}
        {launchResult && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="text-green-400 font-semibold mb-2">🎉 Token Launched Successfully</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Mint:</span>
                <span className="text-green-300 font-mono">{launchResult.mint}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Name:</span>
                <span className="text-white">{launchResult.metadata?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Symbol:</span>
                <span className="text-white">{launchResult.metadata?.symbol}</span>
              </div>
              {launchResult.signature && (
                <a
                  href={`https://solscan.io/tx/${launchResult.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm block mt-2"
                >
                  Ver en Solscan →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="text-red-400 font-semibold mb-2">⚠️ Errors</div>
            <ul className="text-sm text-red-300 space-y-1 list-disc list-inside">
              {errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Token Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isLaunching}
                placeholder="Ex: My Awesome Token"
                maxLength={32}
                className="input-field"
              />
              <div className="text-xs text-white/40 mt-1">{formData.name.length}/32 characters</div>
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Símbolo (Ticker) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                disabled={isLaunching}
                placeholder="Ex: MAT"
                maxLength={10}
                className="w-full px-4 py-2 bg-black border border-white/20 rounded text-white placeholder-white/30 focus:outline-none focus:border-white/40 disabled:opacity-50 uppercase"
              />
              <div className="text-xs text-white/40 mt-1">{formData.symbol.length}/10 characters</div>
            </div>
          </div>

          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isLaunching}
              placeholder="Describe your token, its purpose, utility, etc."
              maxLength={1000}
              rows={4}
              className="w-full px-4 py-2 bg-black border border-white/20 rounded text-white placeholder-white/30 focus:outline-none focus:border-white/40 disabled:opacity-50 resize-none"
            />
            <div className="text-xs text-white/40 mt-1">{formData.description.length}/1000 characters</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Twitter (optional)</label>
              <input
                type="url"
                value={formData.twitter}
                onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                disabled={isLaunching}
                placeholder="https://twitter.com/..."
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Telegram (optional)</label>
              <input
                type="url"
                value={formData.telegram}
                onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                disabled={isLaunching}
                placeholder="https://t.me/..."
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Website (optional)</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                disabled={isLaunching}
                placeholder="https://..."
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Initial Buy (SOL) - Optional
            </label>
            <input
              type="number"
              value={formData.initialBuy}
              onChange={(e) => setFormData({ ...formData, initialBuy: parseFloat(e.target.value) || 0 })}
              disabled={isLaunching}
              min="0"
              step="0.1"
              placeholder="0"
              className="input-field"
            />
            <div className="text-xs text-white/40 mt-1">
              Amount of SOL to buy tokens immediately after launching
            </div>
          </div>

          {/* Launch Button */}
          <button
            onClick={handleLaunch}
            disabled={isLaunching || !masterWallet?.exists || !formData.name || !formData.symbol || !formData.description}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isLaunching ? '🚀 Launching Token...' : '🚀 Launch Token on Pump.fun'}
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="text-blue-400 font-semibold mb-2">ℹ️ Information</div>
          <ul className="text-sm text-blue-300 space-y-1 list-disc list-inside">
            <li>The token is automatically created on Pump.fun</li>
            <li>Your Master Wallet is used as the token creator</li>
            <li>You can make an initial buy to generate liquidity</li>
            <li>Pump.fun tokens use the bonding curve model</li>
            <li>The approximate cost is ~0.02 SOL to create the token</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
