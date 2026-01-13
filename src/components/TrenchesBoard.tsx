import React from 'react';
import TokenRowCard, { Token } from './TokenRowCard';

function ColumnHeader({
  title,
  subtitle,
  query,
  setQuery,
}: {
  title: string;
  subtitle?: string;
  query: string;
  setQuery: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-white/10">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white truncate">{title}</div>
        {subtitle ? <div className="text-[11px] text-white/50 truncate">{subtitle}</div> : null}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Keyword"
        className="w-40 bg-white/[0.03] border border-white/10 rounded-md px-2 py-1 text-[11px] text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
      />
    </div>
  );
}

function BoardColumn({
  title,
  subtitle,
  tokens,
  activeMint,
  query,
  setQuery,
  onSelect,
}: {
  title: string;
  subtitle?: string;
  tokens: Token[];
  activeMint?: string;
  query: string;
  setQuery: (v: string) => void;
  onSelect: (t: Token) => void;
}) {
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter((t) => {
      return (
        (t.name || '').toLowerCase().includes(q) ||
        (t.symbol || '').toLowerCase().includes(q) ||
        (t.mint || '').toLowerCase().includes(q)
      );
    });
  }, [tokens, query]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <ColumnHeader title={title} subtitle={subtitle} query={query} setQuery={setQuery} />

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
  const [q1, setQ1] = React.useState('');
  const [q2, setQ2] = React.useState('');
  const [q3, setQ3] = React.useState('');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <BoardColumn
        title="New Creations"
        subtitle="Latest tokens"
        tokens={columns.left}
        activeMint={selectedMint}
        query={q1}
        setQuery={setQ1}
        onSelect={onSelect}
      />
      <BoardColumn
        title="Complete"
        subtitle="Active (not completed)"
        tokens={columns.mid}
        activeMint={selectedMint}
        query={q2}
        setQuery={setQ2}
        onSelect={onSelect}
      />
      <BoardColumn
        title="Completed"
        subtitle="Completed / graduated"
        tokens={columns.right}
        activeMint={selectedMint}
        query={q3}
        setQuery={setQ3}
        onSelect={onSelect}
      />
    </div>
  );
}
