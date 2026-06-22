// filepath: src/pages/SchedulePage.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import GlassCard from "@/components/shared/GlassCard";
import { inputCls, subjBg, btnG } from "@/components/shared/Form";
import { useLang } from "@/contexts/LangContext";
import { Sparkles, Printer } from "lucide-react";
import { useData, useActiveVersion } from "@/store/dataStore";
import { buildTimeline, maxSlots } from "@/algorithm/engine";
import type { Slot } from "@/algorithm/engine";


export default function SchedulePage() {
  const { classes, teachers, rooms, subjects, school } = useData();
  const active = useActiveVersion();
  const [view, setView] = useState<"class" | "teacher" | "room">("class");
  const { t } = useLang();
  const [sel, setSel] = useState("");
  const tl = buildTimeline(school);

  if (!active)
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3">
        <p className="text-muted-c">{t("sched.noSchedule")}</p>
        <Link to="/generate" className="accent-c text-sm flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Генерация бетіне өту →</Link>
      </div>
    );

  const slots = active.result.slots;
  const S = (id: string) => subjects.find((x) => x.id === id);
  const Tn = (id: string) => teachers.find((x) => x.id === id)?.name || "";
  const Rn = (id: string) => rooms.find((x) => x.id === id)?.number || "";
  const Cn = (id: string) => classes.find((x) => x.id === id)?.name || "";

  const list = view === "class" ? classes.map((c) => ({ id: c.id, label: c.name }))
    : view === "teacher" ? teachers.map((t) => ({ id: t.id, label: t.name }))
    : rooms.map((r) => ({ id: r.id, label: r.number }));
  const selId = sel && list.some((x) => x.id === sel) ? sel : list[0]?.id || "";

  const cls = view === "class" ? classes.find((c) => c.id === selId) : null;
  const shift: 1 | 2 = cls ? cls.shift : 1;
  const rowsCount = cls ? maxSlots(cls.grade) : 8;
  const filtered = slots.filter((o) =>
    view === "class" ? o.classId === selId : view === "teacher" ? o.teacherId === selId : o.roomId === selId);
  const grid: Record<string, Slot[]> = {};
  filtered.forEach((o) => { const k = `${o.day}-${o.slot}`; (grid[k] = grid[k] || []).push(o); });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("sched.title")}</h1>
          <p className="text-muted-c mt-1">{active.name} · сапа {active.result.quality}/100</p>
        </div>
        <button className={btnG + " flex items-center gap-2"} onClick={() => window.print()}><Printer className="w-4 h-4" /> Басып шығару</button>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          {(["class", "teacher", "room"] as const).map((m) => (
            <button key={m} onClick={() => { setView(m); setSel(""); }}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${view === m ? "gradient-primary text-white" : "bg-input-c text-muted-c hover:bg-[rgba(127,127,127,0.1)]"}`}>
              {m === "class" ? t("common.class") : m === "teacher" ? t("common.teacher") : t("common.room")}
            </button>
          ))}
        </div>
        <select className={inputCls + " !w-56"} value={selId} onChange={(e) => setSel(e.target.value)}>
          {list.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
      </div>
      <GlassCard hover={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left text-muted-c w-24">№ / Уақыт</th>
                {[t("day.mon"), t("day.tue"), t("day.wed"), t("day.thu"), t("day.fri")].map((d) => <th key={d} className="p-2 text-muted-c">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowsCount }, (_, i) => i + 1).map((slot) => (
                <tr key={slot} className="border-t border-soft-c">
                  <td className="p-2 align-top">
                    <p className="font-bold text-strong-c">{slot}</p>
                    <p className="text-faint-c">{tl[shift][slot].start}–{tl[shift][slot].end}</p>
                  </td>
                  {[1, 2, 3, 4, 5].map((day) => {
                    const cells = grid[`${day}-${slot}`] || [];
                    return (
                      <td key={day} className="p-1 align-top min-w-[140px]">
                        {cells.length === 0 ? (
                          <div className="text-center text-faint-c py-3">—</div>
                        ) : cells.map((o, ci) => {
                          const s = S(o.subjectId);
                          return (
                            <div key={ci} className={`rounded-lg border p-1.5 mb-1 ${s ? subjBg(s.score) : ""}`}>
                              <p className="font-semibold leading-tight">
                                {s?.name}{o.dpart ? " ×2" : ""}{o.groupId ? ` · ${o.groupId}` : ""}
                              </p>
                              <p className="opacity-70">
                                {view !== "teacher" && Tn(o.teacherId)}
                                {view === "teacher" && Cn(o.classId)}
                              </p>
                              <p className="opacity-60">
                                {view !== "room" ? Rn(o.roomId) : Cn(o.classId)}
                                {view === "room" && o.shift === 2 ? " · " + t("sch.shift2") : ""}
                              </p>
                            </div>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-4 mt-3 text-xs text-muted-c">
          <span><span className="inline-block w-3 h-3 rounded bg-red-500/30 mr-1" />{t("sched.legend.hard")}</span>
          <span><span className="inline-block w-3 h-3 rounded bg-yellow-500/30 mr-1" />{t("sched.legend.medium")}</span>
          <span><span className="inline-block w-3 h-3 rounded bg-emerald-500/30 mr-1" />{t("sched.legend.easy")}</span>
          <span>{t("sch.legend")}</span>
        </div>
      </GlassCard>
    </div>
  );
}
