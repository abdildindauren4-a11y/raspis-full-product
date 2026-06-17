// filepath: src/pages/VersionsPage.tsx
import { useState } from "react";
import GlassCard from "@/components/shared/GlassCard";
import { btnP, btnG, btnD } from "@/components/shared/Form";
import { useData } from "@/store/dataStore";
import { useLang } from "@/contexts/LangContext";

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
    const sName = (id: string) => subjects.find((s) => s.id === id)?.name || id;
    const DAYS = ["", "Дс", "Сс", "Ср", "Бс", "Жм"];
    for (const [k, oB] of mapB) {
      const oA = mapA.get(k);
      if (!oA) changes.push(`+ ${cName(oB.classId)} ${DAYS[oB.day]} ${oB.slot}-сабақ: ${sName(oB.subjectId)}`);
      else if (oA.subjectId !== oB.subjectId) changes.push(`~ ${cName(oB.classId)} ${DAYS[oB.day]} ${oB.slot}-сабақ: ${sName(oA.subjectId)} → ${sName(oB.subjectId)}`);
    }
    for (const [k, oA] of mapA) if (!mapB.has(k)) changes.push(`− ${cName(oA.classId)} ${DAYS[oA.day]} ${oA.slot}-сабақ: ${sName(oA.subjectId)}`);
    return { a, b, changes };
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("ver.title")}</h1>
        <p className="text-muted-c mt-1">Кесте нұсқаларын басқару және салыстыру (2 нұсқа таңдаңыз)</p>
      </div>
      {versions.length === 0 && (
        <GlassCard hover={false}><p className="text-center text-muted-c py-8 text-sm">Нұсқалар жоқ — генерация жасап сақтаңыз</p></GlassCard>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {versions.map((v) => (
          <GlassCard key={v.id} hover={false}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-strong-c">{v.name}</p>
                <p className="text-xs text-muted-c">{v.createdAt}{v.scope ? ` · ${v.scope}` : ""}</p>
              </div>
              <input type="checkbox" checked={cmp.includes(v.id)} onChange={() => toggleCmp(v.id)} title="Салыстыруға таңдау" />
            </div>
            <div className="flex items-center gap-3 my-3">
              <span className={`text-2xl font-bold ${v.result.quality >= 80 ? "status-good" : v.result.quality >= 60 ? "status-warn" : "status-bad"}`}>{v.result.quality}</span>
              <span className="text-xs text-muted-c">{v.result.stats.total} сабақ · {v.result.tests.filter((t) => t.passed).length}/{v.result.tests.length} тест</span>
            </div>
            <div className="flex gap-2">
              {activeVersionId === v.id ? (
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 status-good text-xs">✓ Белсенді</span>
              ) : (
                <button className={btnP + " !py-1.5 text-xs"} onClick={() => activateVersion(v.id)}>Белсендіру</button>
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
