// filepath: src/pages/SchedulePage.tsx
import { useState, Fragment, useMemo } from "react";
import { Link } from "react-router-dom";
import GlassCard from "@/components/shared/GlassCard";
import { inputCls, subjBg, btnG, btnP } from "@/components/shared/Form";
import { useLang } from "@/contexts/LangContext";
import { Sparkles, Printer, Hand, Save, X, Undo2, Info } from "lucide-react";
import { useData, useActiveVersion } from "@/store/dataStore";
import { buildTimeline, maxSlots, HOMEROOM_SUBJECT_ID, HOMEROOM_LABEL } from "@/algorithm/engine";
import type { Slot } from "@/algorithm/engine";
import { lessonBlock, isMovable, moveViolation, movedBlock, type EditCtx } from "@/lib/manualEdit";
import folderUrl from "@/assets/deco-folder.png";


export default function SchedulePage() {
  const { classes, teachers, rooms, subjects, school, settings } = useData();
  const setActiveSlots = useData((s) => s.setActiveSlots);
  const active = useActiveVersion();
  const [view, setView] = useState<"class" | "teacher" | "room">("class");
  const { t } = useLang();
  const [sel, setSel] = useState("");
  const tl = buildTimeline(school);

  // ── Қолмен реттеу режимі ──
  const [editMode, setEditMode] = useState(false);
  const [editSlots, setEditSlots] = useState<Slot[]>([]);
  const [picked, setPicked] = useState<string | null>(null); // ұсталған сабақ блогының anchor.key
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");

  const editCtx: EditCtx = useMemo(() => ({
    subjects: new Map(subjects.map((s) => [s.id, s])),
    teachers: new Map(teachers.map((tc) => [tc.id, tc])),
    classes: new Map(classes.map((c) => [c.id, c])),
    rooms: new Map(rooms.map((r) => [r.id, r])),
    settings,
  }), [subjects, teachers, classes, rooms, settings]);

  if (!active)
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 text-center">
        <img src={folderUrl} alt="" aria-hidden className="w-32 mb-1" style={{ filter: "drop-shadow(0 10px 18px rgba(30,58,95,0.18))" }} />
        <p className="text-muted-c">{t("sched.noSchedule")}</p>
        <Link to="/generate" className="px-4 py-2 rounded-xl gradient-primary text-white text-sm inline-flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Генерация бетіне өту →
        </Link>
      </div>
    );

  // Редакциялау режимінде жергілікті көшірме, әйтпесе сақталған нұсқа
  const slots = editMode ? editSlots : active.result.slots;
  const canEdit = view === "class"; // қолмен реттеу тек сынып көрінісінде

  const enterEdit = () => { setView("class"); setEditSlots(active.result.slots.map((o) => ({ ...o }))); setEditMode(true); setPicked(null); setDirty(false); setMsg(""); };
  const cancelEdit = () => { setEditMode(false); setPicked(null); setDirty(false); setMsg(""); };
  const saveEdit = () => { setActiveSlots(editSlots); setEditMode(false); setPicked(null); setDirty(false); setMsg("Кесте сақталды."); };

  // Ұсталған блок пен оның есепке алынбайтын кілттері
  const pickedBlock = picked ? lessonBlock(slots, slots.find((o) => o.key === picked)!) : null;
  const pickedKeys = new Set(pickedBlock?.map((o) => o.key) || []);

  // Мақсат ұяшыққа не болатынын бағалау: 'move' | 'swap' | 'self' | 'blocked'
  const evalTarget = (day: number, slot: number, cellBlockAnchor: Slot | null): { kind: string; reason?: string } => {
    if (!pickedBlock) return { kind: "none" };
    const pb = pickedBlock[0];
    if (pb.day === day && pb.slot === slot) return { kind: "self" };
    // Мақсатта сол сыныптың басқа (жылжымалы) сабағы болса — своп
    if (cellBlockAnchor) {
      const tgt = lessonBlock(slots, cellBlockAnchor);
      if (!isMovable(tgt).ok) return { kind: "blocked", reason: "мұндағы сабақ жылжымайды" };
      const ign = new Set([...pickedKeys, ...tgt.map((o) => o.key)]);
      const r1 = moveViolation(slots, pickedBlock, day, slot, editCtx, ign);
      if (r1) return { kind: "blocked", reason: r1 };
      const r2 = moveViolation(slots, tgt, pb.day, pb.slot, editCtx, ign);
      if (r2) return { kind: "blocked", reason: r2 };
      return { kind: "swap" };
    }
    // Бос ұяшық — жай жылжу
    const r = moveViolation(slots, pickedBlock, day, slot, editCtx, pickedKeys);
    return r ? { kind: "blocked", reason: r } : { kind: "move" };
  };

  const doMove = (day: number, slot: number, cellBlockAnchor: Slot | null) => {
    if (!pickedBlock) return;
    const ev = evalTarget(day, slot, cellBlockAnchor);
    if (ev.kind === "self") { setPicked(null); return; }
    if (ev.kind === "blocked") { setMsg(ev.reason || "бұл жерге қою мүмкін емес"); return; }
    const pb = pickedBlock[0];
    let next = editSlots;
    if (ev.kind === "swap" && cellBlockAnchor) {
      const tgt = lessonBlock(slots, cellBlockAnchor);
      const movedTgt = new Map(movedBlock(tgt, pb.day, pb.slot).map((o) => [o.key, o]));
      const movedPk = new Map(movedBlock(pickedBlock, day, slot).map((o) => [o.key, o]));
      next = editSlots.map((o) => movedPk.get(o.key) || movedTgt.get(o.key) || o);
    } else {
      const movedPk = new Map(movedBlock(pickedBlock, day, slot).map((o) => [o.key, o]));
      next = editSlots.map((o) => movedPk.get(o.key) || o);
    }
    setEditSlots(next); setPicked(null); setDirty(true); setMsg("");
  };

  const onCellClick = (day: number, slot: number, cellAnchor: Slot | null) => {
    if (!editMode || !canEdit) return;
    if (!picked) {
      if (!cellAnchor) return; // бос ұяшық — ұстайтын ештеңе жоқ
      const blk = lessonBlock(slots, cellAnchor);
      const mv = isMovable(blk);
      if (!mv.ok) { setMsg(mv.reason || "жылжымайды"); return; }
      setPicked(cellAnchor.key); setMsg("");
    } else {
      doMove(day, slot, cellAnchor);
    }
  };

  const S = (id: string) => subjects.find((x) => x.id === id);
  const Tn = (id: string) => teachers.find((x) => x.id === id)?.name || "";
  const Rn = (id: string) => rooms.find((x) => x.id === id)?.number || "";
  const Cn = (id: string) => classes.find((x) => x.id === id)?.name || "";

  const list = view === "class" ? classes.map((c) => ({ id: c.id, label: c.name }))
    : view === "teacher" ? teachers.map((t) => ({ id: t.id, label: t.name }))
    : rooms.map((r) => ({ id: r.id, label: r.number }));
  const selId = sel && list.some((x) => x.id === sel) ? sel : list[0]?.id || "";

  const cls = view === "class" ? classes.find((c) => c.id === selId) : null;
  // settings міндетті: алгоритм worker-де жүреді, негізгі ағында maxSlots
  // әдепкіге түсіп қалады — пайдаланушы лимитті өзгертсе қатар жоғалады
  const rowsCount = cls ? maxSlots(cls.grade, settings) : 8;
  const filtered = slots.filter((o) =>
    view === "class" ? o.classId === selId : view === "teacher" ? o.teacherId === selId : o.roomId === selId);
  // Бір кабинет (немесе мұғалім) екі ауысымда да қолданылуы мүмкін. Слот индексі екі
  // ауысымда бірдей болғандықтан, оларды бір жолда көрсетсек — бір уақытта 2 сынып
  // отырғандай жалған қақтығыс шығады. Сондықтан әр ауысымды бөлек, өз уақытымен көрсетеміз.
  const shiftsPresent: (1 | 2)[] = cls
    ? [cls.shift]
    : ([1, 2] as const).filter((sh) => filtered.some((o) => o.shift === sh));
  if (shiftsPresent.length === 0) shiftsPresent.push(1);
  const grid: Record<string, Slot[]> = {};
  filtered.forEach((o) => { const k = `${o.shift}-${o.day}-${o.slot}`; (grid[k] = grid[k] || []).push(o); });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("sched.title")}</h1>
          <p className="text-muted-c mt-1">{active.name} · сапа {active.result.quality}/100</p>
        </div>
        <div className="flex items-center gap-2">
          {!editMode ? (
            <>
              <button className={btnG + " flex items-center gap-2"} onClick={() => window.print()}><Printer className="w-4 h-4" /> Басып шығару</button>
              <button className={btnP + " flex items-center gap-2"} onClick={enterEdit}><Hand className="w-4 h-4" /> Қолмен реттеу</button>
            </>
          ) : (
            <>
              <button className={btnP + " flex items-center gap-2 disabled:opacity-50"} disabled={!dirty} onClick={saveEdit}><Save className="w-4 h-4" /> Сақтау</button>
              <button className={btnG + " flex items-center gap-2"} onClick={cancelEdit}><X className="w-4 h-4" /> Болдырмау</button>
            </>
          )}
        </div>
      </div>

      {/* Қолмен реттеу нұсқауы */}
      {editMode && (
        <div className="rounded-xl border border-soft-c bg-input-c/60 p-3 flex items-start gap-2 flex-wrap">
          <Info className="w-4 h-4 accent-c shrink-0 mt-0.5" />
          <p className="text-xs text-muted-c flex-1 min-w-[200px]">
            {picked
              ? "Сабақ ұсталды — жасыл ұяшыққа қойыңыз (немесе басқа сабақпен орын ауыстырыңыз). Қызыл — болмайды. Қайта басу — бас тарту."
              : "Жылжытатын сабақты басыңыз. Жүйе жарамды орындарды жасыл, жарамсызды қызыл көрсетеді әрі себебін айтады."}
          </p>
          {picked && (
            <button className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg bg-app-c text-muted-c hover:text-strong-c" onClick={() => setPicked(null)}>
              <Undo2 className="w-3.5 h-3.5" /> Таңдауды алу
            </button>
          )}
        </div>
      )}
      {editMode && msg && (
        <div className="rounded-xl border border-soft-c bg-app-c p-2.5 text-xs status-warn flex items-center gap-2">
          <Info className="w-3.5 h-3.5 shrink-0" /> {msg}
        </div>
      )}
      {!editMode && msg && (
        <div className="rounded-xl border border-soft-c bg-app-c p-2.5 text-xs status-good flex items-center gap-2">
          <Save className="w-3.5 h-3.5 shrink-0" /> {msg}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          {(["class", "teacher", "room"] as const).map((m) => (
            <button key={m} disabled={editMode && m !== "class"} onClick={() => { setView(m); setSel(""); }}
              className={`px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-40 ${view === m ? "gradient-primary text-white" : "bg-input-c text-muted-c hover:bg-[rgba(127,127,127,0.1)]"}`}>
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
              {shiftsPresent.map((sh) => (
                <Fragment key={sh}>
                  {shiftsPresent.length > 1 && (
                    <tr className="border-t border-soft-c">
                      <td colSpan={6} className="p-2 text-xs font-semibold accent-c bg-input-c">
                        {sh === 1 ? t("sch.shift1") : t("sch.shift2")}
                      </td>
                    </tr>
                  )}
                  {Array.from({ length: rowsCount }, (_, i) => i + 1).map((slot) => (
                    <tr key={`${sh}-${slot}`} className="border-t border-soft-c">
                      <td className="p-2 align-top">
                        <p className="font-bold text-strong-c">{slot}</p>
                        <p className="text-faint-c">{tl[sh][slot].start}–{tl[sh][slot].end}</p>
                      </td>
                      {[1, 2, 3, 4, 5].map((day) => {
                        const cells = grid[`${sh}-${day}-${slot}`] || [];
                        // Редакциялау: ұяшық anchor (жылжымалы жалғыз сабақ) + бағалау
                        const cellAnchor = editMode && canEdit
                          ? cells.find((o) => o.subjectId !== HOMEROOM_SUBJECT_ID) || null
                          : null;
                        const ev = editMode && canEdit && picked ? evalTarget(day, slot, cellAnchor) : { kind: "none" as string };
                        const cellHi =
                          ev.kind === "move" || ev.kind === "swap" ? "ring-2 ring-emerald-500/70 rounded-lg cursor-pointer"
                          : ev.kind === "blocked" ? "ring-2 ring-red-500/50 rounded-lg cursor-not-allowed"
                          : "";
                        return (
                          <td key={day}
                            title={editMode && ev.kind === "blocked" ? ev.reason : editMode && (ev.kind === "move" || ev.kind === "swap") ? (ev.kind === "swap" ? "Орын ауыстыру" : "Осында қою") : undefined}
                            onClick={editMode && canEdit ? () => onCellClick(day, slot, cellAnchor) : undefined}
                            className={`p-1 align-top min-w-[140px] ${cellHi}`}>
                            {cells.length === 0 ? (
                              <div className={`text-center py-3 ${ev.kind === "move" ? "status-good font-bold" : "text-faint-c"}`}>
                                {ev.kind === "move" ? "＋" : "—"}
                              </div>
                            ) : cells.map((o, ci) => {
                              if (o.subjectId === HOMEROOM_SUBJECT_ID) {
                                return (
                                  <div key={ci} className="rounded-lg border p-1.5 mb-1 text-center italic text-faint-c bg-[rgba(127,127,127,0.08)]">
                                    {HOMEROOM_LABEL}
                                  </div>
                                );
                              }
                              const s = S(o.subjectId);
                              const isPicked = pickedKeys.has(o.key);
                              return (
                                <div key={ci}
                                  onClick={editMode && canEdit && !picked ? (e) => { e.stopPropagation(); onCellClick(day, slot, o); } : undefined}
                                  className={`rounded-lg border p-1.5 mb-1 ${s ? subjBg(s.score) : ""} ${isPicked ? "ring-2 ring-[var(--accent)] scale-[0.97]" : ""} ${editMode && canEdit && !picked ? "cursor-grab hover:brightness-95" : ""}`}>
                                  <p className="font-semibold leading-tight">
                                    {s?.name}{o.dpart ? " ×2" : ""}{o.groupId ? ` · ${o.groupId}` : ""}
                                  </p>
                                  <p className="opacity-70">
                                    {view !== "teacher" && Tn(o.teacherId)}
                                    {view === "teacher" && Cn(o.classId)}
                                  </p>
                                  <p className="opacity-60">
                                    {view !== "room" ? Rn(o.roomId) : Cn(o.classId)}
                                  </p>
                                </div>
                              );
                            })}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
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
