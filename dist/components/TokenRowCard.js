"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TokenRowCard;
const react_1 = __importDefault(require("react"));
function formatMarketCapUSD(value) {
    if (!value || Number.isNaN(value))
        return 'N/A';
    if (value >= 1000000)
        return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000)
        return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(0)}`;
}
function formatAge(createdTsSeconds) {
    const now = Date.now();
    const ageMs = now - createdTsSeconds * 1000;
    const s = Math.max(0, Math.floor(ageMs / 1000));
    if (s < 60)
        return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60)
        return `${m}m`;
    const h = Math.floor(m / 60);
    return `${h}h`;
}
function TokenRowCard({ token, active, onClick, }) {
    return (<button onClick={onClick} className={`w-full text-left rounded-lg border px-3 py-2 transition-all ` +
            (active
                ? 'border-orange-500/50 ring-1 ring-orange-500/40 bg-white/[0.04]'
                : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.04] hover:border-white/20')}>
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          {token.image_uri ? (<img src={token.image_uri} alt={token.name} className="w-10 h-10 rounded-md object-cover bg-white/5" onError={(e) => {
                e.target.style.display = 'none';
            }}/>) : (<div className="w-10 h-10 rounded-md bg-white/5 border border-white/10"/>)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">
                {token.name || 'Unnamed'}
              </div>
              <div className="text-[11px] text-white/60 font-mono truncate">
                {token.symbol || 'N/A'}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-[11px] text-white/70">{formatAge(token.created_timestamp)}</div>
              <div className={`text-[11px] font-medium ` +
            (token.complete ? 'text-emerald-400' : 'text-yellow-300')}>
                {token.complete ? 'Completed' : 'Active'}
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] text-white/70">
              <span className="px-2 py-0.5 rounded border border-white/10 bg-white/[0.02]">
                MC {formatMarketCapUSD(token.usd_market_cap)}
              </span>
              <span className="px-2 py-0.5 rounded border border-white/10 bg-white/[0.02] font-mono truncate max-w-[140px]">
                {token.mint.slice(0, 4)}…{token.mint.slice(-4)}
              </span>
            </div>
            <span className="text-[11px] text-white/50">↵ Open</span>
          </div>
        </div>
      </div>
    </button>);
}
//# sourceMappingURL=TokenRowCard.js.map