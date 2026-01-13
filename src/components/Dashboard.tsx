import React from 'react';
import { Socket } from 'socket.io-client';
import api from '../utils/api';
import TrenchesBoard from './TrenchesBoard';
import TokenTerminalModal from './TokenTerminalModal';
import TokenTerminal from './TokenTerminal';
import { Token } from './TokenRowCard';

interface DashboardProps {
  socket: Socket | null;
}

export default function Dashboard({ socket }: DashboardProps) {
  const [tokens, setTokens] = React.useState<Token[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const [selectedToken, setSelectedToken] = React.useState<Token | null>(null);
  const [terminalOpen, setTerminalOpen] = React.useState(false);

  const loadTokens = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/pumpfun/tokens?offset=0&limit=120&sort=created_timestamp&order=DESC');
      const data = Array.isArray(res.data) ? res.data : (res.data?.coins || res.data?.data || []);
      setTokens(data || []);
    } catch (e) {
      console.error('Failed to load tokens:', e);
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  React.useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => loadTokens(), 10_000);
    return () => window.clearInterval(id);
  }, [autoRefresh, loadTokens]);

  // Optional: if your backend emits updates, refresh when bot finishes
  React.useEffect(() => {
    if (!socket) return;
    const onPump = () => loadTokens();
    socket.on('pumpfun:completed', onPump);
    return () => {
      socket.off('pumpfun:completed', onPump);
    };
  }, [socket, loadTokens]);

  const columns = React.useMemo(() => {
    const left = tokens.slice(0, 60);
    const mid = tokens.filter((t) => !t.complete).slice(0, 60);
    const right = tokens.filter((t) => t.complete).slice(0, 60);
    return { left, mid, right };
  }, [tokens]);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-bold text-white">Trenches</div>
            <div className="text-[12px] text-white/50">
              Click any token to open the terminal view.
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-white/70 text-sm select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded accent-primary-500"
              />
              Auto refresh 10s
            </label>

            <button
              onClick={loadTokens}
              className="px-4 py-2 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] text-white/80 text-sm"
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <TrenchesBoard
        columns={columns}
        selectedMint={selectedToken?.mint}
        onSelect={(t) => {
          setSelectedToken(t);
          setTerminalOpen(true);
        }}
      />

      <TokenTerminalModal
        open={terminalOpen && !!selectedToken}
        title={selectedToken ? `${selectedToken.name} (${selectedToken.symbol})` : 'Terminal'}
        onClose={() => setTerminalOpen(false)}
      >
        {selectedToken ? <TokenTerminal token={selectedToken} /> : null}
      </TokenTerminalModal>
    </div>
  );
}
