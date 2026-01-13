"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TokenTerminal;
const react_1 = __importDefault(require("react"));
const recharts_1 = require("recharts");
const api_1 = __importDefault(require("../utils/api"));
function formatMarketCapUSD(value) {
    if (!value || Number.isNaN(value))
        return 'N/A';
    if (value >= 1000000)
        return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000)
        return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(0)}`;
}
function Toolbar() {
    const icons = ['≡', '⌖', '⤢', '⟲', '✎', '⚙'];
    return (<div className="h-full w-full flex flex-col items-center gap-2 py-3 border-r border-white/10 bg-white/[0.02]">
      {icons.map((i) => (<button key={i} className="w-9 h-9 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-white/80 text-sm" title="tool">
          {i}
        </button>))}
      <div className="mt-auto"/>
      <div className="w-9 h-9 rounded-full border border-white/10 bg-white/[0.02]"/>
    </div>);
}
function StatPill({ label, value }) {
    return (<div className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02]">
      <div className="text-[11px] text-white/50">{label}</div>
      <div className="text-sm font-semibold text-white mt-0.5">{value}</div>
    </div>);
}
function TradePanel({ token }) {
    const [mode, setMode] = react_1.default.useState('buy');
    const [amount, setAmount] = react_1.default.useState('0.01');
    return (<div className="h-full border-l border-white/10 bg-white/[0.02]">
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-white">Trading</div>
          <button className="px-3 py-1.5 rounded-md border border-white/10 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-300 text-xs" onClick={() => {
            // placeholder for auth
            alert('Connect/login placeholder');
        }}>
            Login
          </button>
        </div>
        <div className="text-[11px] text-white/50 mt-1 font-mono truncate">
          {token.mint}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2">
          {['buy', 'sell', 'auto'].map((t) => (<button key={t} onClick={() => setMode(t)} className={'flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ' +
                (mode === t
                    ? 'border-white/20 bg-white/[0.06] text-white'
                    : 'border-white/10 bg-white/[0.02] text-white/70 hover:bg-white/[0.04]')}>
              {t === 'buy' ? 'Buy' : t === 'sell' ? 'Sell' : 'Auto'}
            </button>))}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-white/50">
            <span>Amount</span>
            <span className="font-mono">SOL</span>
          </div>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-white/90 focus:outline-none focus:ring-1 focus:ring-white/20"/>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {['0.01', '0.1', '0.5', '1'].map((v) => (<button key={v} onClick={() => setAmount(v)} className="px-2 py-1.5 rounded-md border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] text-[12px] text-white/80">
                {v}
              </button>))}
          </div>
        </div>

        <button className={'mt-4 w-full px-4 py-3 rounded-lg font-semibold transition-all ' +
            (mode === 'sell'
                ? 'bg-rose-500/20 hover:bg-rose-500/25 text-rose-200 border border-rose-500/30'
                : 'bg-emerald-500/20 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-500/30')} onClick={() => alert(`Mock ${mode.toUpperCase()} ${amount} SOL`)}>
          {mode === 'sell' ? 'Sell' : 'Buy'}
        </button>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] text-white/80 text-sm" onClick={() => {
            window.dispatchEvent(new CustomEvent('setTokenMint', { detail: token.mint }));
            window.dispatchEvent(new CustomEvent('switchTab', { detail: 'pumpfun' }));
        }}>
            Use in Pump Bot
          </button>
          <button className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] text-white/80 text-sm" onClick={() => window.open(`https://pump.fun/${token.mint}`, '_blank')}>
            Open pump.fun
          </button>
        </div>
      </div>
    </div>);
}
function ActivityTable() {
    const rows = new Array(8).fill(0).map((_, i) => ({
        t: `${(i + 1) * 7}s`,
        side: i % 2 === 0 ? 'Buy' : 'Sell',
        qty: (Math.random() * 2).toFixed(3),
        usd: (Math.random() * 50).toFixed(2),
    }));
    return (<div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Activity</div>
        <div className="text-[11px] text-white/50">Mock data</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="text-white/50">
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-2 font-medium">Time</th>
              <th className="text-left px-4 py-2 font-medium">Side</th>
              <th className="text-right px-4 py-2 font-medium">Qty</th>
              <th className="text-right px-4 py-2 font-medium">USD</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (<tr key={idx} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="px-4 py-2 text-white/70">{r.t}</td>
                <td className={"px-4 py-2 " + (r.side === 'Buy' ? 'text-emerald-300' : 'text-rose-300')}>
                  {r.side}
                </td>
                <td className="px-4 py-2 text-right text-white/80 font-mono">{r.qty}</td>
                <td className="px-4 py-2 text-right text-white/80 font-mono">${r.usd}</td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>);
}
function TokenTerminal({ token }) {
    const [priceData, setPriceData] = react_1.default.useState([]);
    react_1.default.useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await api_1.default.get(`/pumpfun/token/${token.mint}`);
                const data = res.data || {};
                const now = Date.now();
                const basePrice = data.usd_market_cap ? data.usd_market_cap / 1000000 : (token.usd_market_cap || 0) / 1000000;
                const pts = [];
                for (let i = 60; i >= 0; i--) {
                    const time = new Date(now - i * 60000);
                    const variance = 0.95 + Math.random() * 0.1;
                    pts.push({
                        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        price: Math.max(0, basePrice * variance),
                        volume: Math.random() * 100,
                    });
                }
                if (!cancelled)
                    setPriceData(pts);
            }
            catch {
                const now = Date.now();
                const pts = [];
                for (let i = 60; i >= 0; i--) {
                    const time = new Date(now - i * 60000);
                    pts.push({
                        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        price: Math.random() * 10,
                        volume: Math.random() * 100,
                    });
                }
                if (!cancelled)
                    setPriceData(pts);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [token.mint]);
    return (<div className="h-full grid grid-cols-[56px_1fr_360px]">
      <Toolbar />

      <div className="h-full p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              {token.image_uri ? (<img src={token.image_uri} alt={token.name} className="w-10 h-10 rounded-md object-cover bg-white/5 border border-white/10" onError={(e) => (e.target.style.display = 'none')}/>) : null}
              <div className="min-w-0">
                <div className="text-lg font-bold text-white truncate">
                  {token.name} <span className="text-white/60 font-mono text-sm">{token.symbol}</span>
                </div>
                <div className="text-[11px] text-white/50 font-mono truncate">{token.mint}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] text-white/80 text-sm" onClick={() => navigator.clipboard.writeText(token.mint)}>
              Copy CA
            </button>
            <button className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] text-white/80 text-sm" onClick={() => window.open(`https://solscan.io/token/${token.mint}`, '_blank')}>
              Solscan
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatPill label="Market Cap" value={formatMarketCapUSD(token.usd_market_cap)}/>
          <StatPill label="Status" value={token.complete ? <span className="text-emerald-300">Completed</span> : <span className="text-yellow-300">Active</span>}/>
          <StatPill label="Creator" value={<span className="font-mono text-[12px] text-white/80">{token.creator ? `${token.creator.slice(0, 4)}…${token.creator.slice(-4)}` : 'N/A'}</span>}/>
          <StatPill label="Supply" value={<span className="text-white/80">1B</span>}/>
        </div>

        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="text-sm font-semibold text-white">Chart</div>
            <div className="text-[11px] text-white/50">1m</div>
          </div>
          <div className="p-3">
            <div className="h-[360px]">
              <recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.LineChart data={priceData}>
                  <recharts_1.CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)"/>
                  <recharts_1.XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" fontSize={11}/>
                  <recharts_1.YAxis stroke="rgba(255,255,255,0.5)" fontSize={11}/>
                  <recharts_1.Tooltip contentStyle={{ backgroundColor: 'rgba(11,15,20,0.96)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }} labelStyle={{ color: 'rgba(255,255,255,0.75)' }}/>
                  <recharts_1.Line type="monotone" dataKey="price" stroke="rgba(129, 140, 248, 0.95)" strokeWidth={2} dot={false}/>
                </recharts_1.LineChart>
              </recharts_1.ResponsiveContainer>
            </div>

            <div className="h-[140px] mt-3">
              <recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.BarChart data={priceData}>
                  <recharts_1.CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)"/>
                  <recharts_1.XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" fontSize={11} hide/>
                  <recharts_1.YAxis stroke="rgba(255,255,255,0.5)" fontSize={11}/>
                  <recharts_1.Tooltip contentStyle={{ backgroundColor: 'rgba(11,15,20,0.96)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }} labelStyle={{ color: 'rgba(255,255,255,0.75)' }}/>
                  <recharts_1.Bar dataKey="volume" fill="rgba(34, 197, 94, 0.55)"/>
                </recharts_1.BarChart>
              </recharts_1.ResponsiveContainer>
            </div>
          </div>
        </div>

        <ActivityTable />
      </div>

      <TradePanel token={token}/>
    </div>);
}
//# sourceMappingURL=TokenTerminal.js.map