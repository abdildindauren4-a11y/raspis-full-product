// filepath: src/pages/QualityPage.tsx
import { Link } from "react-router-dom";
import GlassCard from "@/components/shared/GlassCard";
import { useData, useActiveVersion } from "@/store/dataStore";
import { useLang } from "@/contexts/LangContext";
import { inputCls } from "@/components/shared/Form";
import { Sparkles, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function QualityPage() {
  const { t } = useLang();
  const { versions, activeVersionId, activateVersion } = useData();
  const active = useActiveVersion();
  if (!active)
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3">
        <p className="text-muted-c">{t("qual.needSchedule")}</p>
        <Link to="/generate" className="accent-c text-sm flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> {t("qual.toGenerate")} →</Link>
      </div>
    );
  const r = active.result;
  const color = r.quality >= 80 ? "#34D399" : r.quality >= 60 ? "#FBBF24" : "#F87171";
  const circ = 2 * Math.PI * 45;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("qual.title")}</h1>
          <p className="text-muted-c mt-1">{t("qual.subtitle")}</p>
        </div>
        <select className={inputCls + " !w-56"} value={activeVersionId || ""} onChange={(e) => activateVersion(e.target.value)}>
          {versions.map((v) => <option key={v.id} value={v.id}>{v.name} · {v.result.quality}/100</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <GlassCard hover={false}>
          <div className="relative w-36 h-36 mx-auto">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#2A3441" strokeWidth="8" />
              <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${(circ * r.quality) / 100} ${circ}`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl sm:text-3xl font-bold text-strong-c">{r.quality}</span>
              <span className="text-xs text-muted-c">/ 100</span>
            </div>
          </div>
          <div className="mt-4 space-y-1.5 text-xs text-muted-c">
            <div className="flex justify-between"><span>{t("qual.avgClass")}</span><b className="text-strong-c">{r.stats.avgClass}%</b></div>
            <div className="flex justify-between"><span>{t("qual.balance")}</span><b className="text-strong-c">{r.stats.balance}%</b></div>
            <div className="flex justify-between"><span>{t("qual.comfort")}</span><b className="text-strong-c">{r.stats.comfort}%</b></div>
            <div className="flex justify-between"><span>{t("qual.stress")}</span><b className="text-strong-c">{Math.round((r.tests.filter((t) => t.passed).length / r.tests.length) * 100)}%</b></div>
            <div className="flex justify-between"><span>{t("qual.timeIter")}</span><b className="text-strong-c">{(r.stats.timeMs / 1000).toFixed(1)}s / {r.stats.iters}</b></div>
          </div>
        </GlassCard>
        <GlassCard hover={false} className="lg:col-span-2">
          <h3 className="font-semibold text-strong-c mb-3">{t("qual.stressTests")} ({r.tests.filter((t) => t.passed).length}/{r.tests.length})</h3>
          <div className="space-y-1.5">
            {r.tests.map((t, i) => (
              <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${t.passed ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                {t.passed ? <CheckCircle2 className="w-4 h-4 status-good shrink-0" /> : <XCircle className="w-4 h-4 status-bad shrink-0" />}
                <span className={t.passed ? "status-good" : "status-bad"}>{t.name}</span>
                {t.details && <span className="text-xs text-muted-c ml-auto">{t.details}</span>}
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
      <GlassCard hover={false}>
        <h3 className="font-semibold text-strong-c mb-3">{t("qual.classRank")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {Object.entries(r.classScores).sort(([, a], [, b]) => a - b).map(([name, score]) => (
            <div key={name} className={`rounded-xl border p-2.5 text-center ${score >= 70 ? "border-emerald-400/20 bg-emerald-500/5" : score >= 50 ? "border-yellow-400/20 bg-yellow-500/5" : "border-red-400/20 bg-red-500/5"}`}>
              <p className="font-bold text-strong-c text-sm">{name}</p>
              <p className={`text-lg font-bold ${score >= 70 ? "status-good" : score >= 50 ? "status-warn" : "status-bad"}`}>{score}%</p>
              <div className="h-1 bg-input-c rounded-full mt-1">
                <div className="h-1 rounded-full" style={{ width: score + "%", background: score >= 70 ? "#34D399" : score >= 50 ? "#FBBF24" : "#F87171" }} />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
      {(r.gaps?.length ?? 0) > 0 && (
        <GlassCard hover={false}>
          <h3 className="font-semibold status-warn mb-2 flex items-center gap-2"><Clock className="w-4 h-4" /> {t("qual.gapsTitle")} ({r.gaps.length})</h3>
          <p className="text-xs text-muted-c mb-3">{t("qual.gapsDesc")}</p>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-c border-b border-soft-c"><th className="py-1">{t("qual.colClass")}</th><th>{t("qual.colDay")}</th><th>{t("qual.colLesson")}</th><th>{t("qual.colReason")}</th></tr></thead>
            <tbody>
              {r.gaps.map((g, i) => (
                <tr key={i} className="border-b border-soft-c">
                  <td className="py-1.5 text-strong-c">{g.className}</td>
                  <td className="text-soft-c">{["", t("day.mon"), t("day.tue"), t("day.wed"), t("day.thu"), t("day.fri")][g.day]?.slice(0,2) || ""}</td>
                  <td className="text-soft-c">{g.slot}{t("qual.lessonNum")}</td>
                  <td className="text-xs text-muted-c">{g.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}

      {r.unplaced.length > 0 && (
        <GlassCard hover={false}>
          <h3 className="font-semibold status-warn mb-3">⚠ {t("qual.unplacedTitle")} ({r.unplaced.length})</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-c border-b border-soft-c"><th className="py-1">{t("qual.colClass")}</th><th>{t("qual.colSubject")}</th><th>{t("qual.colPlaced")}</th><th>{t("qual.colReason")}</th></tr></thead>
            <tbody>
              {r.unplaced.map((u, i) => (
                <tr key={i} className="border-b border-soft-c">
                  <td className="py-1.5 text-strong-c">{u.className}</td>
                  <td className="text-soft-c">{u.subject}</td>
                  <td className="status-bad">{u.placed}/{u.need}</td>
                  <td className="text-xs text-muted-c">{u.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}
    </div>
  );
}
