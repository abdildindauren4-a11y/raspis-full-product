// filepath: src/components/algorithm/RulesConstructor.tsx
// Хамелеон ережелер конструкторы (M3): завуч кодсыз кез келген ережені
// қосады/өшіреді, параметрлерін баптайды, жұмсақ ережелердің салмағын береді.
// Барлық форма ALL_RULES реестрінің ParamSchema-сынан АВТОМАТТЫ құрылады —
// жаңа ереже қосқанда бұл бет өзгеріссіз оны көрсете береді.
import { useMemo } from "react";
import GlassCard from "@/components/shared/GlassCard";
import { useData } from "@/store/dataStore";
import { ALL_RULES } from "@/algorithm2";
import type { EngineV2Config, Rule } from "@/algorithm2";
import RuleChat from "./RuleChat";
import { Lock, Shield, Sparkles, RotateCcw, Check } from "lucide-react";

export default function RulesConstructor() {
  const engineConfigs = useData((s) => s.engineConfigs);
  const setEngineConfig = useData((s) => s.setEngineConfig);
  const cfg: EngineV2Config = engineConfigs.v2 || {};
  const rules = cfg.rules || {};

  const { hard, soft } = useMemo(() => ({
    hard: ALL_RULES.filter((r) => r.kind === "hard"),
    soft: ALL_RULES.filter((r) => r.kind === "soft"),
  }), []);

  const patch = (id: string, p: { enabled?: boolean; weight?: number; params?: Record<string, unknown> }) => {
    const prev = rules[id] || {};
    const next = { ...rules, [id]: { ...prev, ...p, params: { ...prev.params, ...p.params } } };
    setEngineConfig("v2", { ...cfg, rules: next });
  };
  const resetAll = () => setEngineConfig("v2", { ...cfg, rules: {} });

  const isEnabled = (r: Rule) => (r.removable ? (rules[r.id]?.enabled ?? r.defaultEnabled) : true);
  const paramVal = (r: Rule, key: string, dflt: unknown) => rules[r.id]?.params?.[key] ?? dflt;
  const weightVal = (r: Rule) => rules[r.id]?.weight ?? r.defaultWeight ?? 1;

  const changed = Object.keys(rules).length > 0;

  return (
    <GlassCard hover={false}>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-strong-c flex items-center gap-2">
            <Sparkles className="w-4 h-4 accent-c" /> Хамелеон ережелері
          </h3>
          <p className="text-xs text-muted-c mt-1">
            Мектебіңіздің ережелерін өзіңіз баптаңыз — қосыңыз, өшіріңіз, параметрлерін өзгертіңіз.
            Өзгерістер тек «Хамелеон» моделіне қолданылады.
          </p>
        </div>
        {changed && (
          <button onClick={resetAll} className="text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg bg-input-c text-muted-c hover:bg-[rgba(127,127,127,0.1)] shrink-0">
            <RotateCcw className="w-3.5 h-3.5" /> Әдепкіге қайтару
          </button>
        )}
      </div>

      {/* ЖИ-баптаушы чат */}
      <RuleChat />

      {/* Қатаң ережелер */}
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-c uppercase tracking-wide mb-2">
        <Shield className="w-3.5 h-3.5" /> Қатаң ережелер (бұзылмайды)
      </div>
      <div className="space-y-2 mb-5">
        {hard.map((r) => (
          <RuleRow key={r.id} r={r} enabled={isEnabled(r)} onToggle={(v) => patch(r.id, { enabled: v })}
            paramVal={paramVal} onParam={(k, v) => patch(r.id, { params: { [k]: v } })} />
        ))}
      </div>

      {/* Жұмсақ ережелер */}
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-c uppercase tracking-wide mb-2">
        <Sparkles className="w-3.5 h-3.5" /> Жұмсақ ережелер (сапаны реттейді)
      </div>
      <div className="space-y-2">
        {soft.map((r) => (
          <RuleRow key={r.id} r={r} enabled={isEnabled(r)} onToggle={(v) => patch(r.id, { enabled: v })}
            paramVal={paramVal} onParam={(k, v) => patch(r.id, { params: { [k]: v } })}
            weight={weightVal(r)} onWeight={(w) => patch(r.id, { weight: w })} />
        ))}
      </div>
    </GlassCard>
  );
}

function RuleRow({ r, enabled, onToggle, paramVal, onParam, weight, onWeight }: {
  r: Rule; enabled: boolean; onToggle: (v: boolean) => void;
  paramVal: (r: Rule, key: string, dflt: unknown) => unknown;
  onParam: (key: string, val: unknown) => void;
  weight?: number; onWeight?: (w: number) => void;
}) {
  return (
    <div className={`rounded-xl border p-3 transition-colors ${enabled ? "border-soft-c bg-input-c" : "border-soft-c bg-transparent opacity-60"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-strong-c flex items-center gap-1.5">
            {r.title}
            {!r.removable && <Lock className="w-3 h-3 text-faint-c shrink-0" aria-label="Өшірілмейді" />}
          </p>
          <p className="text-xs text-muted-c mt-0.5">{r.description}</p>
        </div>
        {/* Қосқыш (өшірілмейтіндер — құлыпталған) */}
        {r.removable ? (
          <button onClick={() => onToggle(!enabled)} role="switch" aria-checked={enabled}
            className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${enabled ? "gradient-primary" : "bg-[rgba(127,127,127,0.3)]"}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${enabled ? "left-[22px]" : "left-0.5"}`} />
          </button>
        ) : (
          <span className="text-[10px] px-2 py-1 rounded-full bg-[rgba(127,127,127,0.15)] text-faint-c shrink-0 flex items-center gap-1">
            <Check className="w-3 h-3" /> Әрқашан
          </span>
        )}
      </div>

      {/* Параметрлер (тек қосулы кезде) */}
      {enabled && r.params && r.params.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {r.params.map((ps) => {
            const cur = paramVal(r, ps.key, ps.default);
            if (ps.type === "number") {
              return (
                <label key={ps.key} className="text-xs text-muted-c flex items-center justify-between gap-2">
                  <span>{ps.label}</span>
                  <input type="number" min={ps.min} max={ps.max} value={Number(cur)}
                    onChange={(e) => onParam(ps.key, Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded-lg bg-app-c border border-soft-c text-strong-c text-right" />
                </label>
              );
            }
            if (ps.type === "boolean") {
              return (
                <label key={ps.key} className="text-xs text-muted-c flex items-center justify-between gap-2 cursor-pointer">
                  <span>{ps.label}</span>
                  <input type="checkbox" checked={!!cur} onChange={(e) => onParam(ps.key, e.target.checked)}
                    className="accent-[var(--accent)] w-4 h-4" />
                </label>
              );
            }
            return (
              <label key={ps.key} className="text-xs text-muted-c flex items-center justify-between gap-2">
                <span>{ps.label}</span>
                <select value={String(cur)} onChange={(e) => onParam(ps.key, e.target.value)}
                  className="px-2 py-1 rounded-lg bg-app-c border border-soft-c text-strong-c">
                  {ps.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            );
          })}
        </div>
      )}

      {/* Жұмсақ ереже салмағы */}
      {enabled && onWeight && weight != null && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-c">Салмағы (маңыздылығы)</span>
            <span className="text-xs font-semibold accent-c">{weight}</span>
          </div>
          <input type="range" min={0} max={6} step={1} value={weight}
            onChange={(e) => onWeight(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
        </div>
      )}
    </div>
  );
}
