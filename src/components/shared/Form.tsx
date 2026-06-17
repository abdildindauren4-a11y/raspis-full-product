// filepath: src/components/shared/Form.tsx
import type { ReactNode } from "react";

export const inputCls = "w-full bg-input-c border border-soft-c rounded-xl px-3 py-2 text-sm text-strong-c focus:outline-none focus:border-[var(--accent)]";
export const btnP = "px-4 py-2 rounded-xl gradient-primary text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-40";
export const btnG = "px-4 py-2 rounded-xl bg-input-c border border-soft-c text-muted-c text-sm hover:opacity-80 transition-all";
export const btnD = "px-3 py-1.5 rounded-lg bg-red-500/10 status-bad text-xs hover:bg-red-500/20 transition-all";

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className={`glass-strong border border-soft-c rounded-2xl p-4 sm:p-6 w-full ${wide ? "max-w-3xl" : "max-w-md"} max-h-[90vh] overflow-y-auto scrollbar-thin`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-strong-c">{title}</h3>
          <button className="text-muted-c hover:text-strong-c text-xl" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-muted-c mb-1">{label}</label>
      {children}
    </div>
  );
}
export const subjBg = (score: number) =>
  score >= 9 ? "bg-red-500/15 border-red-400/30 status-bad"
  : score >= 6 ? "bg-yellow-500/15 border-yellow-400/30 status-warn"
  : "bg-emerald-500/15 border-emerald-400/30 status-good";
