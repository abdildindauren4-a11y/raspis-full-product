// filepath: src/pages/DashboardPage.tsx
import { Link } from "react-router-dom";
import { Users, GraduationCap, DoorOpen, Gauge, Sparkles, CheckCircle2, Circle, Calendar, BarChart3, Upload } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { useData, useActiveVersion } from "@/store/dataStore";
import { useLang } from "@/contexts/LangContext";

export default function DashboardPage() {
  const { classes, teachers, rooms, versions, school } = useData();
  const active = useActiveVersion();
  const { t } = useLang();
  const students = classes.reduce((s, c) => s + c.students, 0);

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
      <div>
        <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("dash.title")}</h1>
        <p className="text-muted-c mt-1">{school.name}</p>
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
