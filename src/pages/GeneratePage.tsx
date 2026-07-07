// filepath: src/pages/GeneratePage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Layers, CheckCircle2, AlertCircle, XCircle, Loader2, Save, Calendar, RotateCw, Circle, Telescope, Bot, Users, CalendarRange } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import AIRobot, { type RobotStageGroup } from "@/components/shared/AIRobot";
import UpgradeModal from "@/components/shared/UpgradeModal";
import { btnP, btnG, inputCls } from "@/components/shared/Form";
import { useData, useActiveVersion } from "@/store/dataStore";
import { useScheduler, STAGES } from "@/hooks/useScheduler";
import { useMultiScheduler } from "@/hooks/useMultiScheduler";
import { explainSchedule, hasGeminiKey } from "@/lib/gemini";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import { consumeGeneration, type GenerationKind } from "@/lib/roles";
import { teacherBudgets, classBudget, classScoreBudget, roomThroughputs, shiftCapacity, ROOM_TYPE_KK } from "@/lib/dataBudget";
import Markdown from "@/components/shared/Markdown";
import { useSchedulerStore } from "@/store/schedulerStore";
import type { AlgoInput, AlgoResult } from "@/algorithm/engine";

export default function GeneratePage() {
  const data = useData();
  const active = useActiveVersion();
  const navigate = useNavigate();
  const { lang, t } = useLang();
  const { user, role, record, refreshRecord } = useAuth();
  const isAdmin = role === "admin";
  const [upgradeKind, setUpgradeKind] = useState<GenerationKind>("quick");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { running, pct, stage, result, error, start, cancel, reset } = useScheduler();
  const multi = useMultiScheduler();
  // mode жаһандық дүкенде: пайдаланушы «Генерация» бетінен шығып, терең іздеу
  // фонда жалғасып жатқанда қайта кірсе, дұрыс прогресс экраны көрінуі үшін
  // (жергілікті useState болса, бет қайта құрылғанда "full"-ға түсіп қалатын еді).
  const mode = useSchedulerStore((s) => s.mode);
  const setMode = useSchedulerStore((s) => s.setMode);
  const [deepCount, setDeepCount] = useState(100);
  const [scopeClass, setScopeClass] = useState("");
  const [saved, setSaved] = useState(false);
  const [softFill, setSoftFill] = useState(false);

  // Автотүсіндірме (РАСПИС AI)
  const [explanation, setExplanation] = useState("");
  const [explaining, setExplaining] = useState(false);
  const [explainErr, setExplainErr] = useState("");

  // "AI жұмыс істеп жатыр" әсері — генерация кезінде нақты деректер (сынып/мұғалім/пән)
  // атауларымен циклденетін жол, алгоритмнің нақты не істеп жатқанын сезіндіру үшін
  const [flavor, setFlavor] = useState("");
  const isBusy = running || multi.running;
  useEffect(() => {
    if (!isBusy) return;
    const pick = <T,>(arr: T[]): T | null => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null);
    const tick = () => {
      const cls = pick(data.classes)?.name;
      const teacher = pick(data.teachers)?.name;
      const subject = pick(data.subjects)?.name;
      const room = pick(data.rooms)?.number;
      const templates: (() => string | null)[] = [
        () => cls ? (lang === "kk" ? `«${cls}» сыныбының кестесін құрастыруда...` : lang === "ru" ? `Формирование расписания «${cls}»...` : `Building the schedule for "${cls}"...`) : null,
        () => teacher ? (lang === "kk" ? `${teacher} жүктемесін тексеруде...` : lang === "ru" ? `Проверка нагрузки: ${teacher}...` : `Checking workload: ${teacher}...`) : null,
        () => subject ? (lang === "kk" ? `«${subject}» пәнін орналастыруда...` : lang === "ru" ? `Размещение предмета «${subject}»...` : `Placing subject "${subject}"...`) : null,
        () => room ? (lang === "kk" ? `№${room} кабинетінің қолжетімділігін тексеруде...` : lang === "ru" ? `Проверка кабинета №${room}...` : `Checking room #${room} availability...`) : null,
      ];
      const opts = templates.map((f) => f()).filter((x): x is string => !!x);
      if (opts.length) setFlavor(opts[Math.floor(Math.random() * opts.length)]);
    };
    tick();
    const id = setInterval(tick, 1100);
    return () => clearInterval(id);
  }, [isBusy, data.classes, data.teachers, data.subjects, data.rooms, lang]);

  // Қай нәтиже белсенді — жалғыз генерация ма, multi ме
  const activeResult: AlgoResult | null = mode === "deep" ? (multi.result?.best ?? null) : result;
  const isRunning = mode === "deep" ? multi.running : running;
  const runError = mode === "deep" ? multi.error : error;

  /* Алдын-ала валидация */
  const issues: { level: "error" | "warn"; text: string }[] = [];
  if (!data.classes.length) issues.push({ level: "error", text: t("classes.empty").split(".")[0] });
  if (!data.teachers.length) issues.push({ level: "error", text: t("teachers.empty") });
  if (!data.rooms.length) issues.push({ level: "error", text: t("rooms.empty") });
  data.classes.forEach((c) => {
    if (!c.curriculum.length) issues.push({ level: "warn", text: `${c.name}: оқу жоспары бос` });
    c.curriculum.forEach((cu) => {
      const s = data.subjects.find((x) => x.id === cu.subjectId);
      if (!s) return;
      if (cu.hours > 5 && !s.canDouble) issues.push({ level: "error", text: `${c.name} / ${s.name}: ${cu.hours} сағ — қос сабақ рұқсаты жоқ` });
      if (!cu.isSplit && !cu.teacherId) issues.push({ level: "error", text: `${c.name} / ${s.name}: мұғалім тағайындалмаған` });
      if (s.room && !data.rooms.some((r) => r.type === s.room)) issues.push({ level: "error", text: `${s.name}: арнайы кабинет жоқ` });
    });
  });
  // ТІРІ БЮДЖЕТ тексерулері — дерек мәселесін генерацияға дейін ұстау
  {
    // мұғалім нормадан асып тағайындалған ба
    for (const b of teacherBudgets(data.teachers, data.classes).values())
      if (b.free < 0) issues.push({ level: "warn", text: `${b.teacher.name}: ${b.assigned}/${b.teacher.norm} сағ — норма ${-b.free} сағатқа асып тұр (кейбір сабақ орналаспайды)` });
    // сынып сағаты сыйымдылықтан асса
    for (const c of data.classes) {
      const { total, capacity } = classBudget(c, data.settings);
      if (total > capacity) issues.push({ level: "error", text: `${c.name}: ${total} сағ — сыйымдылық ${capacity} (5 күн × ${capacity / 5} сабақ), ${total - capacity} сағ артық` });
      // балл қоры тығыз болса — 1-сағаттық пәндер сыймай қалады
      const sb = classScoreBudget(c, data.subjects, data.settings);
      if (sb.tight) issues.push({ level: "warn", text: `${c.name}: апталық балл ${sb.total}/${sb.capacity} — күндік балл лимиті тығыз, кейбір сабақ сыймауы мүмкін. Алгоритм бетінде лимитті көтеріңіз немесе ауыр пәндерді азайтыңыз` });
    }
    // арнайы кабинет өткізу қабілеті
    for (const rt of roomThroughputs(data.classes, data.subjects, data.rooms))
      if (rt.needed > rt.capacity) issues.push({ level: "error", text: `${ROOM_TYPE_KK[rt.type]} кабинеті (${rt.shift}-ауысым): керегі ${rt.needed} сағ, сыйымдылығы ${rt.capacity} — кабинет жетпейді` });
    // ауысым сыйымдылығы
    for (const sc of shiftCapacity(data.classes, data.rooms))
      if (sc.needed > sc.capacity) issues.push({ level: "error", text: `${sc.shift}-ауысым: ${sc.needed} сабаққа ${sc.capacity} орын ғана бар — кабинет қосыңыз` });
  }
  const dedup = [...new Map(issues.map((i) => [i.text, i])).values()];
  const blocked = dedup.some((i) => i.level === "error");

  // STAGES индексін (0-6) роботтың 4 анимация тобының біріне сәйкестендіру
  const robotStageGroup: RobotStageGroup = stage <= 1 ? "scan" : stage <= 3 ? "build" : stage <= 5 ? "balance" : "done";
  const multiRatio = multi.total ? multi.done / multi.total : 0;
  const multiStageGroup: RobotStageGroup = multiRatio < 0.34 ? "scan" : multiRatio < 0.67 ? "build" : multiRatio < 0.92 ? "balance" : "done";

  const run = async () => {
    const kind: GenerationKind = mode === "deep" ? "deep" : "quick";
    if (user && !isAdmin) {
      const { ok } = await consumeGeneration(user.uid, kind);
      if (!ok) { setUpgradeKind(kind); setUpgradeOpen(true); return; }
      refreshRecord();
    }
    setSaved(false);
    const input: AlgoInput = {
      school: data.school, subjects: data.subjects, classes: data.classes,
      teachers: data.teachers, rooms: data.rooms, settings: data.settings,
      softFill,
    };
    if (mode === "deep") {
      multi.start(input, deepCount);
    } else {
      if (mode === "partial" && scopeClass && active) {
        input.partial = { classId: scopeClass, baseSlots: active.result.slots };
      }
      start(input);
    }
  };

  const save = () => {
    const res = activeResult;
    if (!res || !res.success) return;
    data.saveVersion(res, mode === "partial", mode === "partial" ? `class:${data.classes.find((c) => c.id === scopeClass)?.name}` : mode === "deep" ? `deep:${multi.result?.triedCount}` : undefined);
    setSaved(true);
  };

  const resetAll = () => { reset(); multi.reset(); setMode("full"); setSaved(false); setExplanation(""); setExplainErr(""); };

  // Автотүсіндірме: нәтиже сәтті болғанда РАСПИС AI түсіндірме жазады
  useEffect(() => {
    if (activeResult && activeResult.success && hasGeminiKey() && !explanation && !explaining && !explainErr) {
      setExplaining(true);
      explainSchedule({
        classes: data.classes, teachers: data.teachers, rooms: data.rooms,
        subjects: data.subjects, result: activeResult, lang,
      })
        .then((text) => setExplanation(text))
        .catch((err) => {
          const code = err instanceof Error ? err.message : "ERROR";
          const msgs: Record<string, string> = {
            RATE_LIMIT: lang === "kk" ? "Лимит асты, 1 минуттан соң қайталаңыз" : lang === "ru" ? "Лимит, подождите минуту" : "Rate limit, wait a minute",
            FORBIDDEN: lang === "kk" ? "Gemini API қосулы емес" : lang === "ru" ? "Gemini API не включён" : "Gemini API not enabled",
            INVALID_KEY: lang === "kk" ? "API кілті жарамсыз" : lang === "ru" ? "Неверный ключ" : "Invalid key",
          };
          setExplainErr(msgs[code] || (lang === "kk" ? "Түсіндірме жазу мүмкін болмады" : lang === "ru" ? "Не удалось" : "Failed"));
        })
        .finally(() => setExplaining(false));
    }
  }, [activeResult, explanation, explaining, explainErr, data, lang]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("gen.title")}</h1>
        <p className="text-muted-c mt-1">{t("gen.subtitle")}</p>
      </div>

      {!isRunning && !activeResult && !runError && (
        <>
          <GlassCard hover={false}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button onClick={() => setMode("full")}
                className={`py-4 rounded-xl text-center transition-all ${mode === "full" ? "gradient-primary text-white glow-blue" : "bg-input-c text-muted-c hover:bg-[rgba(127,127,127,0.1)]"}`}>
                <Sparkles className="w-6 h-6 mx-auto mb-2" />
                <p className="font-semibold">{t("gen.mode.fast")}</p>
                <p className="text-xs mt-1 opacity-80">{t("gen.mode.fastDesc")}</p>
              </button>
              <button onClick={() => setMode("deep")}
                className={`py-4 rounded-xl text-center transition-all relative ${mode === "deep" ? "gradient-primary text-white glow-blue" : "bg-input-c text-muted-c hover:bg-[rgba(127,127,127,0.1)]"}`}>
                <Telescope className="w-6 h-6 mx-auto mb-2" />
                <p className="font-semibold">{t("gen.mode.deep")}</p>
                <p className="text-xs mt-1 opacity-80">{t("gen.mode.deepDesc")}</p>
              </button>
              <button onClick={() => setMode("partial")} disabled={!active}
                className={`py-4 rounded-xl text-center transition-all disabled:opacity-40 ${mode === "partial" ? "gradient-primary text-white glow-blue" : "bg-input-c text-muted-c hover:bg-[rgba(127,127,127,0.1)]"}`}>
                <Layers className="w-6 h-6 mx-auto mb-2" />
                <p className="font-semibold">{t("gen.mode.partial")}</p>
                <p className="text-xs mt-1 opacity-80">{active ? "Қалғаны құлыпта" : "Алдымен толық керек"}</p>
              </button>
            </div>
            {mode === "partial" && active && (
              <select className={inputCls + " mt-4"} value={scopeClass} onChange={(e) => setScopeClass(e.target.value)}>
                <option value="">{t("gen.rebuildClass")}</option>
                {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {mode === "deep" && (
              <div className="mt-4 p-3 rounded-xl bg-input-c">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-muted-c">{t("gen.howMany")}</label>
                  <span className="text-sm font-bold accent-c">{deepCount}</span>
                </div>
                <input type="range" min={20} max={300} step={10} value={deepCount}
                  onChange={(e) => setDeepCount(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
                <p className="text-xs text-faint-c mt-2">Болжалды уақыт: ~{Math.round(deepCount * 0.07)} сек. Көп нұсқа = жақсырақ нәтиже, бірақ ұзағырақ.</p>
              </div>
            )}
          </GlassCard>

          <GlassCard hover={false}>
            <h3 className="font-semibold text-strong-c mb-3">{t("imp.preview")}</h3>
            {dedup.length === 0 ? (
              <p className="status-good text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {t("gen.dataReady")}</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                {dedup.map((i, idx) => (
                  <p key={idx} className={`text-xs flex items-center gap-2 ${i.level === "error" ? "status-bad" : "status-warn"}`}>
                    {i.level === "error" ? <XCircle className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />} {i.text}
                  </p>
                ))}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 my-4 text-center">
              {[[t("gen.statClasses"), data.classes.length], [t("gen.statTeachers"), data.teachers.length], [t("gen.statRooms"), data.rooms.length]].map(([l, v]) => (
                <div key={String(l)} className="rounded-xl bg-input-c p-3">
                  <p className="text-xl font-bold gradient-text">{v}</p>
                  <p className="text-xs text-muted-c">{l}</p>
                </div>
              ))}
            </div>
            {/* Жұмсақ режим қосқышы */}
            <button
              onClick={() => setSoftFill(!softFill)}
              className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border mb-3 transition-all ${softFill ? "border-[var(--accent)] bg-[rgba(74,144,217,0.08)]" : "border-soft-c bg-input-c"}`}
            >
              <div className="text-left">
                <p className="text-sm font-medium text-strong-c flex items-center gap-1.5">{t("gen.softMode")}</p>
                <p className="text-xs text-muted-c mt-0.5">{t("gen.softModeDesc")}</p>
              </div>
              <div className={`w-11 h-6 rounded-full shrink-0 transition-all relative ${softFill ? "bg-[var(--accent)]" : "bg-[rgba(127,127,127,0.3)]"}`}>
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${softFill ? "left-[22px]" : "left-0.5"}`} />
              </div>
            </button>
            {/* Жұмсақ режим шкалалары — әр ереже жеке реттеледі */}
            {softFill && (
              <div className="rounded-xl border border-soft-c bg-input-c p-3 mb-3 space-y-3">
                <p className="text-xs text-muted-c">{t("gen.relaxHint")}</p>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-soft-c">{t("gen.relaxSlots")}</span>
                    <span className="accent-c font-medium">+{data.settings.relax?.extraSlots ?? 2}</span>
                  </div>
                  <input type="range" min={0} max={3} step={1} value={data.settings.relax?.extraSlots ?? 2}
                    onChange={(e) => data.setSettings({ relax: { ...(data.settings.relax ?? { extraSlots: 2, extraScore: 20, allowFatigue: true, allowBlacklist: true, allowDigital: true }), extraSlots: +e.target.value } })}
                    className="w-full accent-[var(--accent)]" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-soft-c">{t("gen.relaxScore")}</span>
                    <span className="accent-c font-medium">+{data.settings.relax?.extraScore ?? 20}</span>
                  </div>
                  <input type="range" min={0} max={40} step={5} value={data.settings.relax?.extraScore ?? 20}
                    onChange={(e) => data.setSettings({ relax: { ...(data.settings.relax ?? { extraSlots: 2, extraScore: 20, allowFatigue: true, allowBlacklist: true, allowDigital: true }), extraScore: +e.target.value } })}
                    className="w-full accent-[var(--accent)]" />
                </div>
                {([["allowFatigue", t("gen.relaxFatigue")], ["allowBlacklist", t("gen.relaxBlacklist")], ["allowDigital", t("gen.relaxDigital")]] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="text-soft-c">{label}</span>
                    <input type="checkbox" checked={data.settings.relax?.[key] ?? true}
                      onChange={(e) => data.setSettings({ relax: { ...(data.settings.relax ?? { extraSlots: 2, extraScore: 20, allowFatigue: true, allowBlacklist: true, allowDigital: true }), [key]: e.target.checked } })}
                      className="w-4 h-4 accent-[var(--accent)]" />
                  </label>
                ))}
              </div>
            )}

            {/* Мұғалім жайлылығы (SWAP деңгейі) — терезе азайту, ӘРҚАШАН көрінеді */}
            <div className="rounded-xl border-2 border-[var(--accent)] bg-[rgba(74,144,217,0.06)] p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 accent-c" />
                <p className="text-sm font-semibold text-strong-c">{t("gen.comfortTitle")}</p>
              </div>
              <p className="text-xs text-muted-c mb-3">{t("gen.comfortDesc")}</p>
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  [0, t("gen.comfortOff"), t("gen.comfortFast")],
                  [1, t("gen.comfortSoft"), t("gen.comfortSafe")],
                  [2, t("gen.comfortMed"), t("gen.comfortRec")],
                  [3, t("gen.comfortMax"), t("gen.comfortLeast")],
                ] as const).map(([lvl, label, hint]) => {
                  const active2 = (data.settings.teacherComfort ?? 0) === lvl;
                  return (
                    <button
                      key={lvl}
                      onClick={() => data.setSettings({ teacherComfort: lvl as 0 | 1 | 2 | 3 })}
                      className={`py-2 px-1 rounded-lg text-center transition-all ${active2 ? "gradient-primary text-white" : "bg-surface-c text-muted-c border border-soft-c hover:bg-[rgba(127,127,127,0.08)]"}`}
                    >
                      <p className="text-xs font-semibold">{label}</p>
                      <p className="text-[10px] mt-0.5 opacity-80">{hint}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Апталық сағат теңгерімі (мұғалім күндік жүктемесі) — comfort-тан тәуелсіз */}
            <div className="rounded-xl border-2 border-[var(--accent)] bg-[rgba(74,144,217,0.06)] p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <CalendarRange className="w-4 h-4 accent-c" />
                <p className="text-sm font-semibold text-strong-c">{t("gen.dayBalanceTitle")}</p>
              </div>
              <p className="text-xs text-muted-c mb-3">{t("gen.dayBalanceDesc")}</p>
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  [0, t("gen.dayBalanceOff"), t("gen.dayBalanceFast")],
                  [1, t("gen.dayBalanceSoft"), t("gen.dayBalanceSafe")],
                  [2, t("gen.dayBalanceMed"), t("gen.dayBalanceRec")],
                  [3, t("gen.dayBalanceMax"), t("gen.dayBalanceLeast")],
                ] as const).map(([lvl, label, hint]) => {
                  const active3 = (data.settings.teacherDayBalance ?? 0) === lvl;
                  return (
                    <button
                      key={lvl}
                      onClick={() => data.setSettings({ teacherDayBalance: lvl as 0 | 1 | 2 | 3 })}
                      className={`py-2 px-1 rounded-lg text-center transition-all ${active3 ? "gradient-primary text-white" : "bg-surface-c text-muted-c border border-soft-c hover:bg-[rgba(127,127,127,0.08)]"}`}
                    >
                      <p className="text-xs font-semibold">{label}</p>
                      <p className="text-[10px] mt-0.5 opacity-80">{hint}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {record && !isAdmin && (
              <p className="text-xs text-center text-muted-c mb-2">
                {mode === "deep"
                  ? `${t("plan.deepRemaining")}: ${record.deepRemaining}`
                  : `${t("plan.quickRemaining")}: ${record.quickRemaining}`}
              </p>
            )}
            <button className={btnP + " w-full py-3"} disabled={blocked || (mode === "partial" && !scopeClass)} onClick={run}>
              {mode === "deep" ? <><Telescope className="w-4 h-4 inline mr-1.5" /> {deepCount} {t("gen.tryVariants")}</> : <><Sparkles className="w-4 h-4 inline mr-1.5" /> {t("gen.generate")}</>}
            </button>
            {blocked && <p className="text-xs status-bad text-center mt-2">{t("gen.blocked")}</p>}
          </GlassCard>
        </>
      )}

      {/* Жылдам/Бір сынып прогрессі */}
      {running && (
        <GlassCard hover={false}>
          <div className="text-center mb-4">
            <AIRobot stageGroup={robotStageGroup} size={104} />
            <p className="text-3xl font-bold gradient-text mt-2">{pct}%</p>
            <p className="text-muted-c text-sm mt-1">{t("gen.running")}</p>
          </div>
          <div className="h-3 bg-input-c rounded-full overflow-hidden mb-2 relative">
            <div className="h-full gradient-primary rounded-full transition-all duration-200 relative overflow-hidden" style={{ width: pct + "%" }}>
              <div className="absolute inset-0 animate-shimmer opacity-40" />
            </div>
          </div>
          <p className="text-xs accent-c text-center mb-5 h-4 transition-opacity">{flavor}</p>
          <div className="space-y-2">
            {STAGES.map((s, i) => (
              <div key={s} className="flex items-center gap-2 text-sm">
                <span className="w-4 h-4 flex items-center justify-center">
                  {i < stage ? <CheckCircle2 className="w-4 h-4 status-good" /> : i === stage ? <Loader2 className="w-4 h-4 accent-c animate-spin" /> : <Circle className="w-3 h-3 text-faint-c" />}
                </span>
                <span className={i === stage ? "accent-c font-medium" : i < stage ? "text-muted-c" : "text-faint-c"}>{s}</span>
              </div>
            ))}
          </div>
          <button className={btnG + " mt-4"} onClick={cancel}>{t("gen.stop")}</button>
        </GlassCard>
      )}

      {/* Терең іздеу прогрессі */}
      {multi.running && (
        <GlassCard hover={false}>
          <div className="text-center mb-4">
            <AIRobot stageGroup={multiStageGroup} size={104} />
            <p className="text-3xl font-bold gradient-text mt-2">{multi.done} / {multi.total}</p>
            <p className="text-muted-c text-sm mt-1">{t("gen.searching")}</p>
          </div>
          <div className="h-3 bg-input-c rounded-full overflow-hidden mb-2 relative">
            <div className="h-full gradient-primary rounded-full transition-all duration-200 relative overflow-hidden" style={{ width: (multi.total ? (multi.done / multi.total) * 100 : 0) + "%" }}>
              <div className="absolute inset-0 animate-shimmer opacity-40" />
            </div>
          </div>
          <p className="text-xs accent-c text-center mb-4 h-4 transition-opacity">{flavor}</p>
          <div className="flex items-center justify-center gap-2 text-sm mb-4">
            <span className="text-muted-c">{t("gen.bestQuality")}:</span>
            <span className="font-bold status-good text-lg">{multi.bestQuality}</span>
          </div>
          <button className={btnG + " w-full"} onClick={multi.cancel}>{t("gen.stop")}</button>
        </GlassCard>
      )}

      {runError && (
        <GlassCard hover={false}>
          <p className="status-bad font-semibold flex items-center gap-2"><XCircle className="w-5 h-5" /> Алгоритм қатесі</p>
          <p className="text-sm status-bad mt-1">{runError}</p>
          <button className={btnG + " mt-4"} onClick={resetAll}>{t("action.reset")}</button>
        </GlassCard>
      )}

      {activeResult && !activeResult.success && (
        <GlassCard hover={false}>
          <p className="status-bad font-semibold flex items-center gap-2"><XCircle className="w-5 h-5" /> {activeResult.error?.message}</p>
          <p className="text-sm text-muted-c mt-1">{activeResult.error?.details}</p>
          <button className={btnG + " mt-4"} onClick={resetAll}>{t("action.reset")}</button>
        </GlassCard>
      )}

      {activeResult && activeResult.success && (
        <>
          {/* Терең іздеу қорытындысы */}
          {mode === "deep" && multi.result && (
            <GlassCard hover={false}>
              <div className="flex items-center gap-2 mb-3">
                <Telescope className="w-5 h-5 accent-c" />
                <h3 className="font-semibold text-strong-c">{t("gen.deepResult")}</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-input-c p-3">
                  <p className="text-xl font-bold gradient-text">{multi.result.triedCount}</p>
                  <p className="text-xs text-muted-c">{t("gen.variantsTried")}</p>
                </div>
                <div className="rounded-xl bg-input-c p-3">
                  <p className="text-xl font-bold status-good">{multi.result.cleanCount}</p>
                  <p className="text-xs text-muted-c">{t("gen.cleanVariants")}</p>
                </div>
                <div className="rounded-xl bg-input-c p-3">
                  <p className="text-xl font-bold text-strong-c">{multi.result.qualityRange.min}–{multi.result.qualityRange.max}</p>
                  <p className="text-xs text-muted-c">{t("gen.qualityRange")}</p>
                </div>
              </div>
              <p className="text-xs text-faint-c text-center mt-3">{multi.result.triedCount} нұсқаның ішінен ең жақсысы таңдалды (тесіксіздік басым, сосын сапа)</p>
            </GlassCard>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <GlassCard hover={false}>
              <p className={`text-4xl font-bold ${activeResult.quality >= 80 ? "status-good" : activeResult.quality >= 60 ? "status-warn" : "status-bad"}`}>{activeResult.quality}</p>
              <p className="text-xs text-muted-c mt-1">{t("gen.qualityScore")}</p>
            </GlassCard>
            <GlassCard hover={false}>
              <p className="text-4xl font-bold gradient-text">{activeResult.stats.total}</p>
              <p className="text-xs text-muted-c mt-1">{t("gen.lessonsPlaced")}</p>
            </GlassCard>
            <GlassCard hover={false}>
              <p className="text-4xl font-bold text-strong-c">{activeResult.tests.filter((t) => t.passed).length}/{activeResult.tests.length}</p>
              <p className="text-xs text-muted-c mt-1">{t("gen.stressTest")}</p>
            </GlassCard>
          </div>
          {activeResult.warnings.length > 0 && (
            <GlassCard hover={false}>
              <p className="text-sm font-medium status-warn mb-2">⚠ Ескертулер ({activeResult.warnings.length})</p>
              <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
                {activeResult.warnings.map((w, i) => <p key={i} className="text-xs text-muted-c">{w}</p>)}
              </div>
            </GlassCard>
          )}

          {/* РАСПИС AI автотүсіндірмесі */}
          {(explaining || explanation || explainErr) && (
            <GlassCard hover={false}>
              <div className="flex items-center gap-2 mb-3">
                <AIRobot stageGroup="idle" size={32} />
                <h3 className="font-semibold text-strong-c">РАСПИС AI талдауы</h3>
              </div>
              {explaining && (
                <div className="flex items-center gap-2 text-muted-c text-sm py-4">
                  <Loader2 className="w-4 h-4 animate-spin accent-c" />
                  {lang === "kk" ? "Кесте талдануда..." : lang === "ru" ? "Анализ расписания..." : "Analyzing schedule..."}
                </div>
              )}
              {explainErr && <p className="text-sm text-muted-c py-2">{explainErr}</p>}
              {explanation && (
                <div className="text-soft-c leading-relaxed"><Markdown text={explanation} /></div>
              )}
            </GlassCard>
          )}
          {!hasGeminiKey() && (
            <GlassCard hover={false}>
              <p className="text-xs text-muted-c flex items-center gap-2">
                <Bot className="w-4 h-4 accent-c shrink-0" />
                {lang === "kk" ? "РАСПИС AI кестені автоматты талдауы үшін Баптаулардан Gemini кілтін қосыңыз." : lang === "ru" ? "Для авто-анализа добавьте Gemini ключ в Настройках." : "Add a Gemini key in Settings for auto-analysis."}
              </p>
            </GlassCard>
          )}
          <div className="flex gap-3 justify-center">
            {!saved ? (
              <button className={btnP + " flex items-center gap-2"} onClick={save}><Save className="w-4 h-4" /> {t("gen.saveVersion")}</button>
            ) : (
              <button className={btnP + " flex items-center gap-2"} onClick={() => navigate("/schedule")}><Calendar className="w-4 h-4" /> {t("gen.viewSchedule")}</button>
            )}
            <button className={btnG + " flex items-center gap-2"} onClick={resetAll}><RotateCw className="w-4 h-4" /> {t("gen.newGen")}</button>
          </div>
          {saved && <p className="text-center status-good text-sm flex items-center justify-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Сақталды және белсендірілді</p>}
        </>
      )}
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} kind={upgradeKind} />
    </div>
  );
}
