import React from 'react';

export default function TokenTerminalModal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="absolute inset-0 p-3 sm:p-4">
        <div className="h-full w-full rounded-xl border border-white/10 bg-[#0b0f14] shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{title || 'Terminal'}</div>
              <div className="text-[11px] text-white/50">Esc to close</div>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] text-white/80 text-sm"
            >
              ✕
            </button>
          </div>

          <div className="h-[calc(100%-52px)]">{children}</div>
        </div>
      </div>
    </div>
  );
}
