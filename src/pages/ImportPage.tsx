// filepath: src/pages/ImportPage.tsx
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, RotateCcw } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { ExcelIcon } from "@/components/shared/BrandIcons";
import { btnP, btnG } from "@/components/shared/Form";
import { useData } from "@/store/dataStore";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import { canUse } from "@/lib/roles";
import { Lock } from "lucide-react";
import { downloadTemplate, parseWorkbook, type ParsedData } from "@/lib/excelTemplate";
import { teacherBudgets, classBudget, roomThroughputs, shiftCapacity, ROOM_TYPE_KK } from "@/lib/dataBudget";

// Импортталатын деректің БЮДЖЕТ тексеруі: құрылым дұрыс болса да,
// мұғалім нормасы/сынып сыйымдылығы/кабинет қабілеті асып тұрса — ескертеміз
function budgetWarnings(p: ParsedData): string[] {
  const w: string[] = [];
  for (const b of teacherBudgets(p.teachers, p.classes).values())
    if (b.free < 0) w.push(`${b.teacher.name}: ${b.assigned}/${b.teacher.norm} сағ — норма ${-b.free} сағатқа асып тұр`);
  for (const c of p.classes) {
    const { total, capacity } = classBudget(c);
    if (total > capacity) w.push(`${c.name}: ${total} сағ — сыйымдылық ${capacity} (5 күн × ${capacity / 5} сабақ)`);
  }
  for (const rt of roomThroughputs(p.classes, p.subjects, p.rooms))
    if (rt.needed > rt.capacity) w.push(`${ROOM_TYPE_KK[rt.type]} кабинеті (${rt.shift}-ауысым): керегі ${rt.needed} сағ / сыйымдылығы ${rt.capacity}`);
  for (const sc of shiftCapacity(p.classes, p.rooms))
    if (sc.needed > sc.capacity) w.push(`${sc.shift}-ауысым: ${sc.needed} сабаққа ${sc.capacity} орын ғана бар`);
  return w;
}

export default function ImportPage() {
  const { t } = useLang();
  const data = useData();
  const { role } = useAuth();
  const navigate = useNavigate();

  // Excel импорт — ақылы функция (free пайдаланушыға жабық)
  if (!canUse(role, "excelImport")) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-input-c border border-soft-c flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 status-warn" />
        </div>
        <h2 className="text-xl font-bold text-strong-c mb-2">{t("imp.lockedTitle")}</h2>
        <p className="text-muted-c text-sm mb-5">{t("imp.lockedDesc")}</p>
        <button className={btnP} onClick={() => navigate("/profile")}>{t("imp.openProfile")}</button>
      </div>
    );
  }
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const [done, setDone] = useState(false);

  const onFile = async (file: File) => {
    setFileName(file.name); setDone(false);
    const buf = await file.arrayBuffer();
    try {
      setParsed(parseWorkbook(buf));
    } catch {
      setParsed({ classes: [], teachers: [], rooms: [], subjects: [], errors: [{ sheet: "—", row: 0, message: t("imp.readError") }], summary: { classes: 0, teachers: 0, rooms: 0, subjects: 0, curItems: 0 } });
    }
  };

  const apply = () => {
    if (!parsed) return;
    if (mode === "replace") {
      data.setSubjects(parsed.subjects.length ? parsed.subjects : data.subjects);
      data.setRooms(parsed.rooms);
      data.setTeachers(parsed.teachers);
      data.setClasses(parsed.classes);
    } else {
      // Қосу: дублікатсыз біріктіру (аты бойынша)
      const subjMap = new Map(data.subjects.map((s) => [s.name.toLowerCase(), s]));
      parsed.subjects.forEach((s) => subjMap.set(s.name.toLowerCase(), s));
      const teacherNames = new Set(data.teachers.map((t) => t.name.toLowerCase()));
      const newTeachers = parsed.teachers.filter((t) => !teacherNames.has(t.name.toLowerCase()));
      const classNames = new Set(data.classes.map((c) => c.name.toLowerCase()));
      const newClasses = parsed.classes.filter((c) => !classNames.has(c.name.toLowerCase()));
      const roomNumbers = new Set(data.rooms.map((r) => r.number.toLowerCase()));
      const newRooms = parsed.rooms.filter((r) => !roomNumbers.has(r.number.toLowerCase()));
      data.setSubjects([...subjMap.values()]);
      data.setTeachers([...data.teachers, ...newTeachers]);
      data.setClasses([...data.classes, ...newClasses]);
      data.setRooms([...data.rooms, ...newRooms]);
    }
    setDone(true);
  };

  const errorCount = parsed?.errors.length ?? 0;
  const canImport = parsed && parsed.summary.classes > 0 && errorCount === 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center">
          <FileSpreadsheet className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("imp.title")}</h1>
          <p className="text-muted-c">{t("imp.subtitle")}</p>
        </div>
      </div>

      {/* 1-қадам: үлгі жүктеу */}
      <GlassCard hover={false}>
        <div className="flex items-start gap-4 flex-wrap">
          <ExcelIcon size={44} />
          <div className="flex-1 min-w-[200px]">
            <h3 className="font-semibold text-strong-c">{t("imp.step1")}</h3>
            <p className="text-xs text-muted-c mt-1">{t("imp.step1desc")}</p>
          </div>
          <button className={btnP + " flex items-center gap-2"} onClick={() => { downloadTemplate().catch((e) => console.error("Үлгі жүктеу қатесі:", e)); }}>
            <Download className="w-4 h-4" /> {t("imp.downloadTpl")}
          </button>
        </div>
      </GlassCard>

      {/* 2-қадам: файл жүктеу */}
      <GlassCard hover={false}>
        <h3 className="font-semibold text-strong-c mb-1">{t("imp.step2")}</h3>
        <p className="text-xs text-muted-c mb-3">{t("imp.step2desc")}</p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
          className="border-2 border-dashed border-white/15 rounded-xl p-8 text-center cursor-pointer hover:border-[var(--accent)]/50 transition-all"
        >
          <Upload className="w-8 h-8 mx-auto text-faint-c mb-2" />
          <p className="text-sm text-muted-c">{fileName || t("imp.dropFile")}</p>
          <p className="text-xs text-faint-c mt-1">.xlsx / .xls</p>
        </div>
      </GlassCard>

      {/* 3-қадам: preview + қателер */}
      {parsed && !done && (
        <>
          <GlassCard hover={false}>
            <h3 className="font-semibold text-strong-c mb-3">{t("imp.step3")}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-4">
              {[[t("imp.statClasses"), parsed.summary.classes], [t("imp.statTeachers"), parsed.summary.teachers], [t("imp.statRooms"), parsed.summary.rooms], [t("imp.statSubjects"), parsed.summary.subjects], [t("imp.statPlan"), parsed.summary.curItems]].map(([l, v]) => (
                <div key={String(l)} className="rounded-xl bg-input-c p-3 text-center">
                  <p className="text-xl font-bold gradient-text">{v}</p>
                  <p className="text-xs text-muted-c">{l}</p>
                </div>
              ))}
            </div>
            {/* Бюджет ескертулері: импортқа кедергі емес, бірақ кестеге әсер етеді */}
            {errorCount === 0 && (() => {
              const bw = budgetWarnings(parsed);
              if (!bw.length) return null;
              return (
                <div className="mb-3">
                  <p className="status-warn text-sm flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4" /> {bw.length} бюджет ескертуі (импортқа болады, бірақ кесте толық шықпауы мүмкін)</p>
                  <div className="max-h-44 overflow-y-auto scrollbar-thin space-y-1 rounded-xl bg-yellow-500/5 border border-yellow-400/20 p-3">
                    {bw.map((m, i) => (
                      <p key={i} className="text-xs status-warn flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {m}
                      </p>
                    ))}
                  </div>
                  <p className="text-xs text-faint-c mt-1.5">Excel үлгісіндегі «Күйі (авто)» бағандары да дәл осыны көрсетеді — файлда түзетіп қайта жүктеуге болады.</p>
                </div>
              );
            })()}
            {errorCount === 0 ? (
              <p className="status-good text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {t("imp.noErrors")}</p>
            ) : (
              <div>
                <p className="status-bad text-sm flex items-center gap-2 mb-2"><XCircle className="w-4 h-4" /> {errorCount} {t("imp.errorsFound")}</p>
                <div className="max-h-56 overflow-y-auto scrollbar-thin space-y-1 rounded-xl bg-red-500/5 border border-red-400/20 p-3">
                  {parsed.errors.map((er, i) => (
                    <p key={i} className="text-xs status-bad flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span><b>{er.sheet}</b>{er.row ? `, ${er.row}${t("imp.rowLabel")}` : ""}: {er.message}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>

          {/* 4-қадам: режим + растау */}
          <GlassCard hover={false}>
            <h3 className="font-semibold text-strong-c mb-3">{t("imp.step4")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <button onClick={() => setMode("replace")}
                className={`text-left p-4 rounded-xl border transition-all ${mode === "replace" ? "border-[var(--accent)] bg-[rgba(74,144,217,0.12)]" : "border-soft-c bg-input-c hover:bg-[rgba(127,127,127,0.1)]"}`}>
                <p className="text-sm font-semibold text-strong-c flex items-center gap-2"><RotateCcw className="w-4 h-4" /> {t("imp.replace")}</p>
                <p className="text-xs text-muted-c mt-1">{t("imp.replaceDesc")}</p>
              </button>
              <button onClick={() => setMode("append")}
                className={`text-left p-4 rounded-xl border transition-all ${mode === "append" ? "border-[var(--accent)] bg-[rgba(74,144,217,0.12)]" : "border-soft-c bg-input-c hover:bg-[rgba(127,127,127,0.1)]"}`}>
                <p className="text-sm font-semibold text-strong-c flex items-center gap-2"><Upload className="w-4 h-4" /> {t("imp.append")}</p>
                <p className="text-xs text-muted-c mt-1">{t("imp.appendDesc")}</p>
              </button>
            </div>
            <button className={btnP + " w-full"} disabled={!canImport} onClick={apply}>
              {mode === "replace" ? t("imp.doReplace") : t("imp.doAppend")}
            </button>
            {!canImport && errorCount > 0 && <p className="text-xs status-bad text-center mt-2">{t("imp.cantImport")}</p>}
            {!canImport && errorCount === 0 && parsed.summary.classes === 0 && <p className="text-xs status-warn text-center mt-2">Сыныптар табылмады — үлгіні тексеріңіз</p>}
          </GlassCard>
        </>
      )}

      {/* Сәтті */}
      {done && (
        <GlassCard hover={false}>
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 mx-auto status-good mb-3" />
            <p className="text-lg font-bold text-strong-c">Импорт сәтті аяқталды!</p>
            <p className="text-sm text-muted-c mt-1">
              {parsed?.summary.classes} сынып, {parsed?.summary.teachers} мұғалім, {parsed?.summary.rooms} кабинет жүктелді
            </p>
            <div className="flex gap-3 justify-center mt-5 flex-wrap">
              <button className={btnP} onClick={() => navigate("/generate")}>Генерацияға өту</button>
              <button className={btnG} onClick={() => navigate("/classes")}>Сыныптарды көру</button>
              <button className={btnG} onClick={() => { setParsed(null); setFileName(""); setDone(false); }}>Тағы импорттау</button>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
