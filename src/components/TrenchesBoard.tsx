import React from 'react';
import TokenRowCard, { Token } from './TokenRowCard';

interface FilterState {
  query: string;
  minMarketCap: number;
  maxMarketCap: number;
  minVolume: number;
  maxVolume: number;
  maxAge: number;
  sortBy: 'created' | 'marketCap' | 'volume' | 'age';
  sortOrder: 'asc' | 'desc';
}

function ColumnHeader({
  title,
  subtitle,
  filters,
  setFilters,
}: {
  title: string;
  subtitle?: string;
  filters: FilterState;
  setFilters: (v: FilterState) => void;
}) {
  const [showFilters, setShowFilters] = React.useState(false);

  return (
    <div className="border-b border-white/10">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">{title}</div>
          {subtitle ? <div className="text-[11px] text-white/50 truncate">{subtitle}</div> : null}
        </div>

        <div className="flex items-center gap-2">
          <input
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            placeholder="Search..."
            className="w-32 bg-white/[0.03] border border-white/10 rounded-md px-2 py-1 text-[11px] text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-2 py-1 rounded-md border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] text-white/70 text-[11px]"
          >
            {showFilters ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="px-3 py-2 space-y-2 bg-white/[0.01] border-t border-white/10">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-white/50 block mb-1">Min Market Cap</label>
              <input
                type="number"
                value={filters.minMarketCap || ''}
                onChange={(e) => setFilters({ ...filters, minMarketCap: Number(e.target.value) || 0 })}
                placeholder="0"
                className="w-full bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-[11px] text-white/80"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/50 block mb-1">Max Market Cap</label>
              <input
                type="number"
                value={filters.maxMarketCap || ''}
                onChange={(e) => setFilters({ ...filters, maxMarketCap: Number(e.target.value) || Infinity })}
                placeholder="∞"
                className="w-full bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-[11px] text-white/80"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-white/50 block mb-1">Min Volume (24h)</label>
              <input
                type="number"
                value={filters.minVolume || ''}
                onChange={(e) => setFilters({ ...filters, minVolume: Number(e.target.value) || 0 })}
                placeholder="0"
                className="w-full bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-[11px] text-white/80"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/50 block mb-1">Max Age (min)</label>
              <input
                type="number"
                value={filters.maxAge || ''}
                onChange={(e) => setFilters({ ...filters, maxAge: Number(e.target.value) || Infinity })}
                placeholder="∞"
                className="w-full bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-[11px] text-white/80"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-white/50 block mb-1">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as FilterState['sortBy'] })}
                className="w-full bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-[11px] text-white/80"
              >
                <option value="created">Created Time</option>
                <option value="marketCap">Market Cap</option>
                <option value="volume">Volume</option>
                <option value="age">Age</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-white/50 block mb-1">Order</label>
              <select
                value={filters.sortOrder}
                onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value as FilterState['sortOrder'] })}
                className="w-full bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-[11px] text-white/80"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setFilters({
              query: '',
              minMarketCap: 0,
              maxMarketCap: Infinity,
              minVolume: 0,
              maxVolume: Infinity,
              maxAge: Infinity,
              sortBy: 'created',
              sortOrder: 'desc',
            })}
            className="w-full px-2 py-1 rounded border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] text-white/70 text-[10px]"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}

function BoardColumn({
  title,
  subtitle,
  tokens,
  activeMint,
  filters,
  setFilters,
  onSelect,
}: {
  title: string;
  subtitle?: string;
  tokens: Token[];
  activeMint?: string;
  filters: FilterState;
  setFilters: (v: FilterState) => void;
  onSelect: (t: Token) => void;
}) {
  const filtered = React.useMemo(() => {
    let result = [...tokens];

    // Text search
    const q = filters.query.trim().toLowerCase();
    if (q) {
      result = result.filter((t) => {
        return (
          (t.name || '').toLowerCase().includes(q) ||
          (t.symbol || '').toLowerCase().includes(q) ||
          (t.mint || '').toLowerCase().includes(q)
        );
      });
    }

    // Market cap filter
    if (filters.minMarketCap > 0) {
      result = result.filter((t) => (t.market_cap || 0) >= filters.minMarketCap);
    }
    if (filters.maxMarketCap < Infinity) {
      result = result.filter((t) => (t.market_cap || 0) <= filters.maxMarketCap);
    }

    // Volume filter
    if (filters.minVolume > 0) {
      result = result.filter((t) => (t.volume_24h || 0) >= filters.minVolume);
    }

    // Age filter (in minutes)
    if (filters.maxAge < Infinity) {
      const now = Date.now();
      result = result.filter((t) => {
        const age = Math.floor((now - (t.created_timestamp || 0)) / 60000);
        return age <= filters.maxAge;
      });
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = 0;
      let bVal = 0;

      switch (filters.sortBy) {
        case 'created':
          aVal = a.created_timestamp || 0;
          bVal = b.created_timestamp || 0;
          break;
        case 'marketCap':
          aVal = a.market_cap || 0;
          bVal = b.market_cap || 0;
          break;
        case 'volume':
          aVal = a.volume_24h || 0;
          bVal = b.volume_24h || 0;
          break;
        case 'age':
          const now = Date.now();
          aVal = now - (a.created_timestamp || 0);
          bVal = now - (b.created_timestamp || 0);
          break;
      }

      return filters.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return result;
  }, [tokens, filters]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <ColumnHeader title={title} subtitle={subtitle} filters={filters} setFilters={setFilters} />

      <div className="p-2 space-y-2 overflow-y-auto" style={{ height: 'calc(100vh - 220px)' }}>
        {filtered.length === 0 ? (
          <div className="text-center text-white/40 text-sm py-10">No results</div>
        ) : (
          filtered.map((t) => (
            <TokenRowCard
              key={t.mint}
              token={t}
              active={activeMint === t.mint}
              onClick={() => onSelect(t)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function TrenchesBoard({
  columns,
  selectedMint,
  onSelect,
}: {
  columns: {
    left: Token[];
    mid: Token[];
    right: Token[];
  };
  selectedMint?: string;
  onSelect: (t: Token) => void;
}) {
  const [filters1, setFilters1] = React.useState<FilterState>({
    query: '',
    minMarketCap: 0,
    maxMarketCap: Infinity,
    minVolume: 0,
    maxVolume: Infinity,
    maxAge: Infinity,
    sortBy: 'created',
    sortOrder: 'desc',
  });

  const [filters2, setFilters2] = React.useState<FilterState>({
    query: '',
    minMarketCap: 0,
    maxMarketCap: Infinity,
    minVolume: 0,
    maxVolume: Infinity,
    maxAge: Infinity,
    sortBy: 'created',
    sortOrder: 'desc',
  });

  const [filters3, setFilters3] = React.useState<FilterState>({
    query: '',
    minMarketCap: 0,
    maxMarketCap: Infinity,
    minVolume: 0,
    maxVolume: Infinity,
    maxAge: Infinity,
    sortBy: 'created',
    sortOrder: 'desc',
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <BoardColumn
        title="New Creations"
        subtitle="Latest tokens"
        tokens={columns.left}
        activeMint={selectedMint}
        filters={filters1}
        setFilters={setFilters1}
        onSelect={onSelect}
      />
      <BoardColumn
        title="Active"
        subtitle="Not completed"
        tokens={columns.mid}
        activeMint={selectedMint}
        filters={filters2}
        setFilters={setFilters2}
        onSelect={onSelect}
      />
      <BoardColumn
        title="Completed"
        subtitle="Completed / graduated"
        tokens={columns.right}
        activeMint={selectedMint}
        filters={filters3}
        setFilters={setFilters3}
        onSelect={onSelect}
      />
    </div>
  );
}
