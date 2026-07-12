// filepath: src/pages/AlgorithmPage.tsx
import { useState } from "react";
import GlassCard from "@/components/shared/GlassCard";
import { Field, inputCls, btnG, btnP } from "@/components/shared/Form";
import { useData } from "@/store/dataStore";
import { useLang } from "@/contexts/LangContext";
import { DEFAULT_MAX_LESSONS } from "@/algorithm/engine";
import { School, Settings2, BarChart3, Battery, Target, RotateCcw, Lightbulb, ChevronDown, PlusCircle } from "lucide-react";
import { seedSettings } from "@/lib/seed";
import clockUrl from "@/assets/deco-clock.png";

function Slider({ label, value, min, max, step, onChange, suffix }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-muted-c">{label}</label>
        <span className="text-sm font-semibold accent-c">{value}{suffix || ""}</span>
      </div>
      <input type="range" min={min} max={max} step={step || 1} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]" />
    </div>
  );
}

export default function AlgorithmPage() {
  const { t } = useLang();
  const { school, setSchool, settings, setSettings, subjects, setSubjects, resetSeed, resetBigSeed } = useData();
  const [extraOpen, setExtraOpen] = useState(false);
  const dl = settings.dayLimits, ft = settings.fatigue, cf = settings.coeffs;
  const hr = settings.homeroom || { enabled: false, day: 1 };
  const setHR = (patch: Partial<typeof hr>) => setSettings({ homeroom: { ...hr, ...patch } });
  const toggleElective = (id: string) =>
    setSubjects(subjects.map((s) => (s.id === id ? { ...s, elective: !s.elective } : s)));
  const DAY_NAMES = [t("day.mon"), t("day.tue"), t("day.wed"), t("day.thu"), t("day.fri")];
  // Күндік сабақ саны лимиті (СанПиН) — settings.maxLessons немесе әдепкі
  const ml = settings.maxLessons || DEFAULT_MAX_LESSONS;
  const setML = (patch: Partial<typeof ml>) => setSettings({ maxLessons: { ...ml, ...patch } });
  const setDL = (patch: Partial<typeof dl>) => setSettings({ dayLimits: { ...dl, ...patch } });
  const setFT = (patch: Partial<typeof ft>) => setSettings({ fatigue: { ...ft, ...patch } });
  const setCF = (patch: Partial<typeof cf>) => setSettings({ coeffs: { ...cf, ...patch } });
  const resetAlgo = () => setSettings({
    dayLimits: { ...seedSettings.dayLimits }, fatigue: { ...seedSettings.fatigue }, coeffs: { ...seedSettings.coeffs },
  });

  return (
    <div className="space-y-6">
      <div className="relative">
        <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("algo.title")}</h1>
        <p className="text-muted-c mt-1">{t("algo.optHint")}</p>
        <img src={clockUrl} alt="" aria-hidden className="hidden sm:block absolute right-2 -top-3 w-16 pointer-events-none" style={{ filter: "drop-shadow(0 6px 12px rgba(30,58,95,0.18))" }} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <GlassCard hover={false}>
          <h3 className="font-semibold text-strong-c mb-4 flex items-center gap-2"><School className="w-4 h-4 accent-c" /> {t("algo.schoolParams")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t("algo.schoolName")}><input className={inputCls} value={school.name} onChange={(e) => setSchool({ name: e.target.value })} /></Field>
            <Field label={t("algo.shift1Start")}><input className={inputCls} value={school.shift1Start} onChange={(e) => setSchool({ shift1Start: e.target.value })} /></Field>
            <Field label={t("algo.shift2Start")}><input className={inputCls} value={school.shift2Start} onChange={(e) => setSchool({ shift2Start: e.target.value })} /></Field>
            <Field label={t("algo.lessonLen")}>
              <select className={inputCls} value={school.lessonDuration} onChange={(e) => setSchool({ lessonDuration: Number(e.target.value) })}>
                {[30, 40, 45].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label={t("algo.shortBreak")}>
              <select className={inputCls} value={school.shortBreak} onChange={(e) => setSchool({ shortBreak: Number(e.target.value) })}>
                {[5, 10].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label={t("algo.bigBreak")}>
              <select className={inputCls} value={school.longBreak} onChange={(e) => setSchool({ longBreak: Number(e.target.value) })}>
                {[15, 20, 30].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label={t("algo.bigBreakAfter")}>
              <select className={inputCls} value={school.longBreakAfter} onChange={(e) => setSchool({ longBreakAfter: Number(e.target.value) })}>
                {[2, 3, 4].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label={t("algo.interShift")}><input type="number" className={inputCls} value={school.interShiftGap} onChange={(e) => setSchool({ interShiftGap: Number(e.target.value) })} /></Field>
          </div>
        </GlassCard>

        <GlassCard hover={false}>
          <h3 className="font-semibold text-strong-c mb-4 flex items-center gap-2"><Settings2 className="w-4 h-4 accent-c" /> {t("algo.optimization")}</h3>
          <label className="flex items-center justify-between mb-4 p-3 rounded-xl bg-input-c">
            <div>
              <p className="text-sm text-strong-c font-medium">{t("algo.maximinBalance")}</p>
              <p className="text-xs text-muted-c">{t("algo.maximinDesc")}</p>
            </div>
            <input type="checkbox" className="scale-125" checked={settings.maximin} onChange={(e) => setSettings({ maximin: e.target.checked })} />
          </label>
          <Field label={t("algo.maximinIter")}><input type="number" className={inputCls} value={settings.maxIterations} onChange={(e) => setSettings({ maxIterations: Number(e.target.value) })} /></Field>
          <div className="mt-4 p-3 rounded-xl bg-surface border border-soft-c">
            <p className="text-xs font-medium text-strong-c mb-1 flex items-center gap-1.5">{t("algo.slotLimit")}</p>
            <p className="text-[11px] text-faint-c mb-3">{t("algo.slotLimitDesc")}</p>
            <div className="space-y-2">
              {([
                ["g1", "1", 1],
                ["g24", "2–4", 4],
                ["g56", "5–6", 6],
                ["g79", "7–9", 9],
                ["g1011", "10–11", 11],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-c">{label} {t("com.gradeShort")}</span>
                  <input
                    type="number" min={1} max={8}
                    className={inputCls + " w-16 text-center py-1"}
                    value={ml[key]}
                    onChange={(e) => setML({ [key]: Math.max(1, Math.min(8, Number(e.target.value) || 1)) })}
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-faint-c mt-2">{t("algo.sanpinNote")}</p>
          </div>
          <button className={btnG + " mt-4 w-full flex items-center justify-center gap-2"} onClick={() => { if (confirm("Барлық деректер бастапқы демо-күйге қайтады. Жалғастыру?")) resetSeed(); }}>
            <RotateCcw className="w-4 h-4" /> Демо-деректерге қайтару
          </button>
          <button className={btnP + " mt-2 w-full flex items-center justify-center gap-2"} onClick={() => { if (confirm("№165 мектеп — 33 сынып, 53 мұғалім, 44 кабинет. Жүктеу?")) resetBigSeed(); }}>
            <RotateCcw className="w-4 h-4" /> №165 Үлкен мектеп деректері
          </button>
        </GlassCard>
      </div>

      {/* РЕТТЕЛЕТІН ПАРАМЕТРЛЕР */}
      <GlassCard hover={false}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-strong-c flex items-center gap-2"><BarChart3 className="w-4 h-4 accent-c" /> {t("algo.dayLimits")}</h3>
          <button className={btnG + " !py-1.5 text-xs flex items-center gap-1.5"} onClick={resetAlgo}><RotateCcw className="w-3.5 h-3.5" /> {t("algo.resetDefault")}</button>
        </div>
        <p className="text-xs text-muted-c mb-4">{t("algo.dayLimitsDesc")}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          <Slider label="1–4 сынып" value={dl.g14} min={15} max={40} onChange={(v) => setDL({ g14: v })} />
          <Slider label="5–6 сынып" value={dl.g56} min={20} max={50} onChange={(v) => setDL({ g56: v })} />
          <Slider label="7–9 сынып" value={dl.g79} min={25} max={60} onChange={(v) => setDL({ g79: v })} />
          <Slider label="10–11 сынып" value={dl.g1011} min={30} max={70} onChange={(v) => setDL({ g1011: v })} />
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <GlassCard hover={false}>
          <h3 className="font-semibold text-strong-c mb-1 flex items-center gap-2"><Battery className="w-4 h-4 accent-c" /> {t("algo.fatigueLimits")}</h3>
          <p className="text-xs text-muted-c mb-4">{t("algo.fatigueDesc")}</p>
          <div className="space-y-4">
            <Slider label="1–4 сынып" value={ft.g14} min={15} max={35} onChange={(v) => setFT({ g14: v })} />
            <Slider label="5–9 сынып" value={ft.g59} min={20} max={45} onChange={(v) => setFT({ g59: v })} />
            <Slider label="10–11 сынып" value={ft.g1011} min={30} max={55} onChange={(v) => setFT({ g1011: v })} />
          </div>
        </GlassCard>

        <GlassCard hover={false}>
          <h3 className="font-semibold text-strong-c mb-1 flex items-center gap-2"><Target className="w-4 h-4 accent-c" /> {t("algo.placeCoef")}</h3>
          <p className="text-xs text-muted-c mb-4">{t("algo.placeCoefDesc")}</p>
          <div className="space-y-4">
            <Slider label="Ауыр пәндер (балл 9–11)" value={cf.hard} min={1} max={10} step={0.5} onChange={(v) => setCF({ hard: v })} />
            <Slider label="Орташа пәндер (балл 6–8)" value={cf.medium} min={1} max={10} step={0.5} onChange={(v) => setCF({ medium: v })} />
            <Slider label="Жеңіл пәндер (балл 1–5)" value={cf.easy} min={1} max={10} step={0.5} onChange={(v) => setCF({ easy: v })} />
          </div>
        </GlassCard>
      </div>

      {/* ҚОСЫМША РЕТТЕУЛЕР — Сынып сағаты + электив пәндер (жиналмалы бөлім) */}
      <GlassCard hover={false}>
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setExtraOpen((v) => !v)}
        >
          <h3 className="font-semibold text-strong-c flex items-center gap-2">
            <PlusCircle className="w-4 h-4 accent-c" /> {t("algo.extraTitle")}
          </h3>
          <ChevronDown className={`w-4 h-4 text-muted-c transition-transform ${extraOpen ? "rotate-180" : ""}`} />
        </button>
        {extraOpen && (
          <div className="mt-4 space-y-5">
            <p className="text-xs text-muted-c">{t("algo.extraDesc")}</p>

            {/* Сынып сағаты */}
            <div className="p-3 rounded-xl bg-input-c">
              <label className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-strong-c font-medium">{t("algo.homeroomTitle")}</p>
                  <p className="text-xs text-muted-c">{t("algo.homeroomDesc")}</p>
                </div>
                <input type="checkbox" className="scale-125" checked={hr.enabled} onChange={(e) => setHR({ enabled: e.target.checked })} />
              </label>
              {hr.enabled && (
                <Field label={t("algo.homeroomDay")}>
                  <select className={inputCls} value={hr.day} onChange={(e) => setHR({ day: Number(e.target.value) })}>
                    {DAY_NAMES.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
                  </select>
                </Field>
              )}
            </div>

            {/* Электив пәндер */}
            <div className="p-3 rounded-xl bg-input-c">
              <p className="text-sm text-strong-c font-medium mb-1">{t("algo.electiveTitle")}</p>
              <p className="text-xs text-muted-c mb-3">{t("algo.electiveDesc")}</p>
              {subjects.length === 0 ? (
                <p className="text-xs text-faint-c">{t("algo.electiveEmpty")}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
                  {subjects.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-xs text-muted-c px-2 py-1.5 rounded-lg hover:bg-[rgba(127,127,127,0.08)]">
                      <input type="checkbox" checked={!!s.elective} onChange={() => toggleElective(s.id)} />
                      <span className={s.elective ? "text-strong-c" : ""}>{s.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </GlassCard>

      <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-4">
        <p className="text-sm accent-c flex items-center gap-2"><Lightbulb className="w-4 h-4 shrink-0" /> Баптауды өзгерткен соң <b>Генерация</b> {t("algo.tipRebuild")}</p>
      </div>
    </div>
  );
}
