// filepath: src/pages/VersionsPage.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { btnP, btnG, btnD } from "@/components/shared/Form";
import calendarUrl from "@/assets/deco-calendar.png";
import { useData } from "@/store/dataStore";
import { useLang } from "@/contexts/LangContext";
import { HOMEROOM_SUBJECT_ID, HOMEROOM_LABEL } from "@/algorithm/engine";

export default function VersionsPage() {
  const { t } = useLang();
  const { versions, activeVersionId, activateVersion, deleteVersion, classes, subjects } = useData();
  const [cmp, setCmp] = useState<string[]>([]);

  const toggleCmp = (id: string) =>
    setCmp((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 2 ? [...c, id] : [c[1], id]));

  const diff = (() => {
    if (cmp.length !== 2) return null;
    const a = versions.find((v) => v.id === cmp[0])!;
    const b = versions.find((v) => v.id === cmp[1])!;
    const key = (o: { classId: string; day: number; slot: number }) => `${o.classId}|${o.day}|${o.slot}`;
    const mapA = new Map(a.result.slots.filter((o) => !o.groupId || o.groupId === "Г1").map((o) => [key(o), o]));
    const mapB = new Map(b.result.slots.filter((o) => !o.groupId || o.groupId === "Г1").map((o) => [key(o), o]));
    const changes: string[] = [];
    const cName = (id: string) => classes.find((c) => c.id === id)?.name || id;
    const sName = (id: string) => id === HOMEROOM_SUBJECT_ID ? HOMEROOM_LABEL : subjects.find((s) => s.id === id)?.name || id;
    const DAYS = ["", t("day.mon").slice(0,2), t("day.tue").slice(0,2), t("day.wed").slice(0,2), t("day.thu").slice(0,2), t("day.fri").slice(0,2)];
    for (const [k, oB] of mapB) {
      const oA = mapA.get(k);
      if (!oA) changes.push(`+ ${cName(oB.classId)} ${DAYS[oB.day]} ${oB.slot}: ${sName(oB.subjectId)}`);
      else if (oA.subjectId !== oB.subjectId) changes.push(`~ ${cName(oB.classId)} ${DAYS[oB.day]} ${oB.slot}: ${sName(oA.subjectId)} → ${sName(oB.subjectId)}`);
    }
    for (const [k, oA] of mapA) if (!mapB.has(k)) changes.push(`− ${cName(oA.classId)} ${DAYS[oA.day]} ${oA.slot}: ${sName(oA.subjectId)}`);
    return { a, b, changes };
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("ver.title")}</h1>
        <p className="text-muted-c mt-1">{t("ver.subtitle")}</p>
      </div>
      {versions.length === 0 && (
        <GlassCard hover={false}>
          <div className="flex flex-col items-center text-center py-10">
            <img src={calendarUrl} alt="" aria-hidden className="w-32 mb-4" style={{ filter: "drop-shadow(0 10px 18px rgba(30,58,95,0.18))" }} />
            <p className="text-strong-c font-medium mb-1">{t("ver.empty")}</p>
            <p className="text-muted-c text-sm mb-4 max-w-sm">{t("ver.emptyHint")}</p>
            <Link to="/generate" className="px-4 py-2 rounded-xl gradient-primary text-white text-sm inline-flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> {t("gen.button")}
            </Link>
          </div>
        </GlassCard>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {versions.map((v) => (
          <GlassCard key={v.id} hover={false}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-strong-c">{v.name}</p>
                <p className="text-xs text-muted-c">{v.createdAt}{v.scope ? ` · ${v.scope}` : ""}</p>
              </div>
              <input type="checkbox" checked={cmp.includes(v.id)} onChange={() => toggleCmp(v.id)} title={t("ver.pickCompare")} />
            </div>
            <div className="flex items-center gap-3 my-3">
              <span className={`text-2xl font-bold ${v.result.quality >= 80 ? "status-good" : v.result.quality >= 60 ? "status-warn" : "status-bad"}`}>{v.result.quality}</span>
              <span className="text-xs text-muted-c">{v.result.stats.total} " + t("ver.lessonsWord") + " · {v.result.tests.filter((t) => t.passed).length}/{v.result.tests.length} тест</span>
            </div>
            <div className="flex gap-2">
              {activeVersionId === v.id ? (
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 status-good text-xs">✓ {t("ver.active")}</span>
              ) : (
                <button className={btnP + " !py-1.5 text-xs"} onClick={() => activateVersion(v.id)}>{t("ver.activate")}</button>
              )}
              <button className={btnD} onClick={() => { if (confirm(`${v.name} жою?`)) deleteVersion(v.id); }}>Жою</button>
            </div>
          </GlassCard>
        ))}
      </div>
      {diff && (
        <GlassCard hover={false}>
          <h3 className="font-semibold text-strong-c mb-2">Салыстыру: {diff.a.name} ↔ {diff.b.name} <span className="text-xs text-muted-c">({diff.changes.length} өзгеріс)</span></h3>
          <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-1">
            {diff.changes.length === 0 && <p className="text-sm text-muted-c">Айырмашылық жоқ</p>}
            {diff.changes.map((c, i) => (
              <p key={i} className={`text-xs font-mono ${c.startsWith("+") ? "status-good" : c.startsWith("−") ? "status-bad" : "status-warn"}`}>{c}</p>
            ))}
          </div>
          <button className={btnG + " mt-3 text-xs"} onClick={() => setCmp([])}>Жабу</button>
        </GlassCard>
      )}
    </div>
  );
}
