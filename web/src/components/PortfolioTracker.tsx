import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import api from '../utils/api';

interface PortfolioTrackerProps {
  socket: Socket | null;
}

interface Position {
  id: string;
  tokenMint: string;
  tokenName: string;
  tokenSymbol: string;
  walletIndex: number;
  entryPrice: number;
  entryAmount: number;
  tokenAmount: number;
  currentPrice: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  entryTimestamp: number;
  status: 'open' | 'closed';
}

interface PortfolioSummary {
  openPositions: number;
  totalInvested: number;
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  realizedPnl: number;
}

export default function PortfolioTracker({ socket }: PortfolioTrackerProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('open');

  useEffect(() => {
    loadPortfolio();
    const interval = setInterval(loadPortfolio, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [filter]);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      const [summaryRes, positionsRes] = await Promise.all([
        api.get('/portfolio/summary'),
        api.get(`/portfolio/positions?status=${filter === 'all' ? '' : filter}`),
      ]);
      setSummary(summaryRes.data);
      setPositions(positionsRes.data.positions || []);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1) return price.toFixed(4);
    if (price >= 0.01) return price.toFixed(6);
    return price.toFixed(8);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-black border border-white/15 rounded-lg p-4">
            <div className="text-white/60 text-sm mb-1">Total Invested</div>
            <div className="text-2xl font-bold text-white">
              {summary.totalInvested.toFixed(4)} SOL
            </div>
          </div>
          <div className="bg-black border border-white/15 rounded-lg p-4">
            <div className="text-white/60 text-sm mb-1">Current Value</div>
            <div className="text-2xl font-bold text-white">
              {summary.totalValue.toFixed(4)} SOL
            </div>
          </div>
          <div className="bg-black border border-white/15 rounded-lg p-4">
            <div className="text-white/60 text-sm mb-1">Total P&L</div>
            <div className={`text-2xl font-bold ${
              summary.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {summary.totalPnl >= 0 ? '+' : ''}{summary.totalPnl.toFixed(4)} SOL
            </div>
            <div className={`text-sm ${
              summary.totalPnlPercent >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {summary.totalPnlPercent >= 0 ? '+' : ''}{summary.totalPnlPercent.toFixed(2)}%
            </div>
          </div>
          <div className="bg-black border border-white/15 rounded-lg p-4">
            <div className="text-white/60 text-sm mb-1">Open Positions</div>
            <div className="text-2xl font-bold text-white">
              {summary.openPositions}
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-white/15">
        {(['all', 'open', 'closed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 font-medium transition-all ${
              filter === f
                ? 'text-white border-b-2 border-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Positions Table */}
      <div className="bg-black border border-white/15 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black/50 border-b border-white/15">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Token</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-white/60">Entry Price</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-white/60">Current Price</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-white/60">Amount</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-white/60">Value</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-white/60">P&L</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-white/60">Entry Date</th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-white/40">
                    No positions found
                  </td>
                </tr>
              ) : (
                positions.map((position) => (
                  <tr
                    key={position.id}
                    className="border-b border-white/10 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-white">{position.tokenName}</div>
                        <div className="text-sm text-white/60">{position.tokenSymbol}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {formatPrice(position.entryPrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {formatPrice(position.currentPrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {position.tokenAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {position.currentValue.toFixed(4)} SOL
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className={`font-medium ${
                        position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {position.pnl >= 0 ? '+' : ''}{position.pnl.toFixed(4)} SOL
                      </div>
                      <div className={`text-sm ${
                        position.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-white/60 text-sm">
                      {formatTime(position.entryTimestamp)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

