// filepath: src/pages/DashboardPage.tsx
import { Link } from "react-router-dom";
import { useMemo } from "react";
import { Users, GraduationCap, DoorOpen, Gauge, Sparkles, CheckCircle2, Circle, Calendar, BarChart3, Upload, HeartPulse, AlertTriangle } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { useData, useActiveVersion } from "@/store/dataStore";
import monitorUrl from "@/assets/deco-monitor.png";
import booksUrl from "@/assets/deco-books.png";
import { useLang } from "@/contexts/LangContext";
import { teacherBudgets, classBudget, classScoreBudget, teacherSpread, roomThroughputs, shiftCapacity, ROOM_TYPE_KK } from "@/lib/dataBudget";

export default function DashboardPage() {
  const { classes, teachers, rooms, subjects, settings, versions, school } = useData();
  const active = useActiveVersion();
  const { t } = useLang();
  const students = classes.reduce((s, c) => s + c.students, 0);

  // ДЕРЕКТЕР ДЕНСАУЛЫҒЫ: 100 балдан бюджет мәселелері үшін ұпай шегеріледі,
  // әр мәселе өз бетіне сілтейді (бір басып түзетуге)
  const health = useMemo(() => {
    const problems: { text: string; to: string }[] = [];
    if (classes.length) {
      const budgets = teacherBudgets(teachers, classes);
      for (const b of budgets.values())
        if (b.free < 0) problems.push({ text: `${b.teacher.name}: ${b.assigned}/${b.teacher.norm} сағ (норма +${-b.free})`, to: "/teachers" });
      for (const s of teacherSpread(budgets))
        if (s.tight) problems.push({ text: `${s.teacher.name}: ${s.classCount} бөлек сыныпқа тағайындалған — тым көп (тесік қаупі жоғары), 2-мұғалімге бөліңіз`, to: "/teachers" });
      for (const c of classes) {
        if (!c.curriculum.length) { problems.push({ text: `${c.name}: оқу жоспары бос`, to: "/classes" }); continue; }
        const { total, capacity } = classBudget(c, settings);
        if (total > capacity) problems.push({ text: `${c.name}: ${total}/${capacity} сағ — сыйымдылықтан артық`, to: "/classes" });
        const sb = classScoreBudget(c, subjects, settings);
        if (sb.tight) problems.push({ text: `${c.name}: балл қоры тығыз (${sb.total}/${sb.capacity}) — лимитті көтеріңіз`, to: "/algorithm" });
        for (const cu of c.curriculum)
          if (!cu.isSplit && !cu.teacherId) { problems.push({ text: `${c.name}: мұғалім тағайындалмаған пән бар`, to: "/classes" }); break; }
      }
      for (const rt of roomThroughputs(classes, subjects, rooms))
        if (rt.needed > rt.capacity) problems.push({ text: `${ROOM_TYPE_KK[rt.type]} (${rt.shift}-ауысым): ${rt.needed}/${rt.capacity} сағ — кабинет жетпейді`, to: "/rooms" });
      for (const sc of shiftCapacity(classes, rooms))
        if (sc.needed > sc.capacity) problems.push({ text: `${sc.shift}-ауысым: ${sc.needed}/${sc.capacity} орын — толып тұр`, to: "/rooms" });
    }
    const score = Math.max(0, 100 - problems.length * 12);
    return { score, problems };
  }, [classes, teachers, rooms, subjects, settings]);

  const steps = [
    { label: t("dash.step.classes"), done: classes.length > 0 && classes.every((c) => c.curriculum.length > 0), to: "/classes" },
    { label: t("dash.step.teachers"), done: teachers.length > 0, to: "/teachers" },
    { label: t("dash.step.rooms"), done: rooms.length > 0, to: "/rooms" },
    { label: t("dash.step.generate"), done: !!active, to: "/generate" },
  ];

  const stats = [
    { icon: Users, label: t("common.students"), value: students },
    { icon: GraduationCap, label: t("nav.teachers"), value: teachers.length },
    { icon: Users, label: t("nav.classes"), value: classes.length },
    { icon: DoorOpen, label: t("nav.rooms"), value: rooms.length },
  ];

  return (
    <div className="space-y-6">
      {/* Hero: қарсы алу + 3D декор (монитор мен кітаптар — тек кең экранда) */}
      <div className="relative overflow-hidden rounded-2xl border border-soft-c glass-strong px-6 py-6 lg:py-8 lg:px-8">
        <div
          className="absolute top-4 left-1/2 w-24 h-14 opacity-40 pointer-events-none hidden lg:block"
          style={{ backgroundImage: "radial-gradient(rgba(74,144,217,0.35) 1.5px, transparent 1.5px)", backgroundSize: "14px 14px" }}
          aria-hidden
        />
        <div className="lg:pr-[320px] relative">
          <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("dash.title")}</h1>
          <p className="text-muted-c mt-1">{school.name}</p>
        </div>
        <img src={booksUrl} alt="" aria-hidden className="hidden xl:block absolute right-[240px] -bottom-3 w-[92px] pointer-events-none" style={{ filter: "drop-shadow(0 8px 14px rgba(30,58,95,0.18))" }} />
        <img src={monitorUrl} alt="" aria-hidden className="hidden lg:block absolute -right-4 -bottom-10 w-[260px] pointer-events-none" style={{ filter: "drop-shadow(0 10px 18px rgba(30,58,95,0.18))" }} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => (
          <GlassCard key={s.label} hover={false}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center">
                <s.icon className="w-5 h-5 text-strong-c" />
              </div>
              <div>
                <p className="text-2xl font-bold text-strong-c">{s.value}</p>
                <p className="text-xs text-muted-c">{s.label}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
      {/* ДЕРЕКТЕР ДЕНСАУЛЫҒЫ — мәселе болса ғана көрінеді */}
      {classes.length > 0 && health.problems.length > 0 && (
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="font-semibold text-strong-c flex items-center gap-2">
              <HeartPulse className="w-4 h-4 accent-c" /> Деректер денсаулығы
            </h3>
            <span className={`text-2xl font-bold ${health.score >= 80 ? "status-good" : health.score >= 50 ? "status-warn" : "status-bad"}`}>
              {health.score}/100
            </span>
          </div>
          <div className="h-2 rounded-full bg-input-c overflow-hidden mb-3">
            <div className={`h-full rounded-full ${health.score >= 80 ? "bg-emerald-500" : health.score >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: health.score + "%" }} />
          </div>
          <div className="space-y-1.5 max-h-44 overflow-y-auto scrollbar-thin">
            {health.problems.map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-xs status-warn flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {p.text}
                </span>
                <Link to={p.to} className="text-xs accent-c hover:underline shrink-0">Түзету →</Link>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <GlassCard hover={false}>
          <h3 className="font-semibold text-strong-c mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 accent-c" /> {t("dash.checklist")}</h3>
          <div className="space-y-3">
            {steps.map((st) => (
              <div key={st.label} className="flex items-center justify-between">
                <span className={`text-sm flex items-center gap-2 ${st.done ? "text-faint-c line-through" : "text-soft-c"}`}>
                  {st.done ? <CheckCircle2 className="w-4 h-4 status-good" /> : <Circle className="w-4 h-4 text-faint-c" />}
                  {st.label}
                </span>
                {!st.done && <Link to={st.to} className="text-xs accent-c hover:underline">{t("dash.goToSchedule")} →</Link>}
              </div>
            ))}
          </div>
        </GlassCard>
        <GlassCard hover={false}>
          <h3 className="font-semibold text-strong-c mb-4 flex items-center gap-2"><Gauge className="w-4 h-4 accent-c" /> {t("dash.activeSchedule")}</h3>
          {active ? (
            <div>
              <div className="flex items-center gap-4">
                <span className={`text-4xl font-bold ${active.result.quality >= 80 ? "status-good" : active.result.quality >= 60 ? "status-warn" : "status-bad"}`}>
                  {active.result.quality}
                </span>
                <div className="text-xs text-muted-c">
                  <p className="text-strong-c font-medium text-sm">{active.name}</p>
                  <p>{active.createdAt}</p>
                  <p>{active.result.stats.total} {t("dash.lessons")} · {active.result.tests.filter((t) => t.passed).length}/{active.result.tests.length} {t("dash.tests")}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Link to="/schedule" className="text-xs accent-c hover:underline flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {t("nav.schedule")}</Link>
                <Link to="/quality" className="text-xs accent-c hover:underline flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> {t("dash.quality")}</Link>
                <Link to="/export" className="text-xs accent-c hover:underline flex items-center gap-1"><Upload className="w-3.5 h-3.5" /> {t("nav.export")}</Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-c text-sm mb-3">{t("dash.noSchedule")}</p>
              <Link to="/generate" className="px-4 py-2 rounded-xl gradient-primary text-white text-sm inline-flex items-center gap-2"><Sparkles className="w-4 h-4" /> {t("gen.button")}</Link>
            </div>
          )}
          {versions.length > 1 && (
            <p className="text-xs text-faint-c mt-4">{t("common.total")} {versions.length} · <Link to="/versions" className="accent-c">{t("nav.versions")} →</Link></p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
