// filepath: src/pages/SettingsPage.tsx
import { useState } from "react";
import { Moon, Sun, Languages, Bot, Check, Eye, EyeOff, Trash2, Save, Database, RotateCcw, CalendarX, AlertTriangle } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { inputCls, btnP, btnG } from "@/components/shared/Form";
import { useTheme } from "@/contexts/ThemeContext";
import { useLang } from "@/contexts/LangContext";
import type { Lang } from "@/i18n/translations";
import { getGeminiKey, setGeminiKey, clearGeminiKey } from "@/lib/gemini";
import { useData } from "@/store/dataStore";

const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "kk", label: "Қазақша", flag: "KZ" },
  { code: "ru", label: "Русский", flag: "RU" },
  { code: "en", label: "English", flag: "EN" },
];

type ConfirmAction = "schedules" | "all" | "demo" | null;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useLang();
  const data = useData();
  const [keyInput, setKeyInput] = useState(getGeminiKey() || "");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState<"saved" | "cleared" | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [doneMsg, setDoneMsg] = useState("");

  const counts = {
    classes: data.classes.length, teachers: data.teachers.length,
    rooms: data.rooms.length, subjects: data.subjects.length,
    versions: data.versions.length,
  };

  const doAction = () => {
    if (confirm === "schedules") { data.clearSchedules(); setDoneMsg(lang === "kk" ? "Кестелер тазаланды" : lang === "ru" ? "Расписания очищены" : "Schedules cleared"); }
    else if (confirm === "all") { data.clearAllData(); setDoneMsg(lang === "kk" ? "Барлық дерек тазаланды" : lang === "ru" ? "Все данные очищены" : "All data cleared"); }
    else if (confirm === "demo") { data.resetSeed(); setDoneMsg(lang === "kk" ? "Демо деректер қайтарылды" : lang === "ru" ? "Демо-данные восстановлены" : "Demo data restored"); }
    setConfirm(null);
    setTimeout(() => setDoneMsg(""), 3000);
  };

  const saveKey = () => {
    if (keyInput.trim()) {
      setGeminiKey(keyInput.trim());
      setSaved("saved");
    } else {
      clearGeminiKey();
      setSaved("cleared");
    }
    setTimeout(() => setSaved(null), 2500);
  };
  const removeKey = () => {
    clearGeminiKey(); setKeyInput(""); setSaved("cleared");
    setTimeout(() => setSaved(null), 2500);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("settings.title")}</h1>
        <p className="text-muted-c mt-1">{t("settings.appearance")} · {t("settings.language")} · {t("settings.aiSection")}</p>
      </div>

      {/* Тема */}
      <GlassCard hover={false}>
        <h3 className="font-semibold text-strong-c mb-4 flex items-center gap-2">
          {theme === "dark" ? <Moon className="w-4 h-4 accent-c" /> : <Sun className="w-4 h-4 accent-c" />}
          {t("settings.theme")}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setTheme("dark")}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${theme === "dark" ? "border-[var(--accent)] bg-[rgba(var(--bg-card),0.5)]" : "border-soft-c bg-input-c"}`}>
            <Moon className="w-5 h-5 text-strong-c" />
            <span className="text-sm font-medium text-strong-c">{t("settings.themeDark")}</span>
            {theme === "dark" && <Check className="w-4 h-4 accent-c ml-auto" />}
          </button>
          <button onClick={() => setTheme("light")}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${theme === "light" ? "border-[var(--accent)] bg-[rgba(var(--bg-card),0.5)]" : "border-soft-c bg-input-c"}`}>
            <Sun className="w-5 h-5 text-strong-c" />
            <span className="text-sm font-medium text-strong-c">{t("settings.themeLight")}</span>
            {theme === "light" && <Check className="w-4 h-4 accent-c ml-auto" />}
          </button>
        </div>
      </GlassCard>

      {/* Тіл */}
      <GlassCard hover={false}>
        <h3 className="font-semibold text-strong-c mb-4 flex items-center gap-2">
          <Languages className="w-4 h-4 accent-c" /> {t("settings.language")}
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {LANGS.map((l) => (
            <button key={l.code} onClick={() => setLang(l.code)}
              className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border transition-all ${lang === l.code ? "border-[var(--accent)] bg-[rgba(var(--bg-card),0.5)]" : "border-soft-c bg-input-c"}`}>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-[var(--accent)] text-strong-c">{l.flag}</span>
              <span className="text-sm font-medium text-strong-c">{l.label}</span>
              {lang === l.code && <Check className="w-4 h-4 accent-c" />}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Gemini API */}
      <GlassCard hover={false}>
        <h3 className="font-semibold text-strong-c mb-1 flex items-center gap-2">
          <Bot className="w-4 h-4 accent-c" /> {t("settings.aiSection")}
        </h3>
        <p className="text-xs text-muted-c mb-3">{t("settings.geminiKeyHint")}</p>
        <label className="text-xs text-muted-c block mb-1.5">{t("settings.geminiKey")}</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? "text" : "password"}
              className={inputCls + " pr-10"}
              placeholder={t("settings.geminiKeyPlaceholder")}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
            />
            <button onClick={() => setShowKey((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-c hover:text-strong-c">
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button className={btnP + " flex items-center gap-2 shrink-0"} onClick={saveKey}>
            <Save className="w-4 h-4" /> {t("action.save")}
          </button>
          {getGeminiKey() && (
            <button className={btnG + " shrink-0"} onClick={removeKey} title={t("action.delete")}>
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        {saved === "saved" && <p className="status-good text-sm mt-2 flex items-center gap-1.5"><Check className="w-4 h-4" /> {t("settings.geminiSaved")}</p>}
        {saved === "cleared" && <p className="text-muted-c text-sm mt-2">{t("settings.geminiCleared")}</p>}
      </GlassCard>

      {/* ── ДЕРЕКТЕРДІ БАСҚАРУ ── */}
      <GlassCard hover={false}>
        <h3 className="font-semibold text-strong-c mb-1 flex items-center gap-2">
          <Database className="w-4 h-4 accent-c" /> {lang === "kk" ? "Деректерді басқару" : lang === "ru" ? "Управление данными" : "Data Management"}
        </h3>
        <p className="text-xs text-muted-c mb-4">
          {lang === "kk" ? "Ағымдағы: " : lang === "ru" ? "Сейчас: " : "Current: "}
          {counts.classes} {lang === "kk" ? "сынып" : lang === "ru" ? "классов" : "classes"}, {counts.teachers} {lang === "kk" ? "мұғалім" : lang === "ru" ? "учителей" : "teachers"}, {counts.versions} {lang === "kk" ? "кесте" : lang === "ru" ? "расписаний" : "schedules"}
        </p>

        {doneMsg && <p className="status-good text-sm mb-3 flex items-center gap-1.5"><Check className="w-4 h-4" /> {doneMsg}</p>}

        <div className="space-y-2">
          {/* Кестелерді тазалау */}
          <button onClick={() => setConfirm("schedules")}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-input-c border border-soft-c hover:opacity-80 transition-all text-left">
            <CalendarX className="w-5 h-5 status-warn shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-strong-c">{lang === "kk" ? "Кестелерді тазалау" : lang === "ru" ? "Очистить расписания" : "Clear schedules"}</p>
              <p className="text-xs text-muted-c">{lang === "kk" ? "Құрылған кестелер өшеді, деректер қалады" : lang === "ru" ? "Удалятся расписания, данные останутся" : "Removes schedules, keeps data"}</p>
            </div>
          </button>

          {/* Бәрін тазалау */}
          <button onClick={() => setConfirm("all")}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-400/20 hover:bg-red-500/10 transition-all text-left">
            <Trash2 className="w-5 h-5 status-bad shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium status-bad">{lang === "kk" ? "Барлық деректі тазалау" : lang === "ru" ? "Очистить все данные" : "Clear all data"}</p>
              <p className="text-xs status-bad/70">{lang === "kk" ? "Сыныптар, мұғалімдер, кабинеттер, кестелер — бәрі өшеді" : lang === "ru" ? "Классы, учителя, кабинеты, расписания — всё" : "Classes, teachers, rooms, schedules — everything"}</p>
            </div>
          </button>

          {/* Демо қайтару */}
          <button onClick={() => setConfirm("demo")}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-input-c border border-soft-c hover:opacity-80 transition-all text-left">
            <RotateCcw className="w-5 h-5 accent-c shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-strong-c">{lang === "kk" ? "Демо деректерді қайтару" : lang === "ru" ? "Восстановить демо-данные" : "Restore demo data"}</p>
              <p className="text-xs text-muted-c">{lang === "kk" ? "Бастапқы үлгі деректерге оралу" : lang === "ru" ? "Вернуть исходные данные" : "Reset to sample data"}</p>
            </div>
          </button>
        </div>
      </GlassCard>

      {/* Растау модалы */}
      {confirm && (
        <div className="fixed inset-0 z-[1200] bg-black/60 flex items-center justify-center p-4" onClick={() => setConfirm(null)}>
          <div className="bg-surface border border-soft-c rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${confirm === "all" ? "bg-red-500/15" : "bg-yellow-500/15"}`}>
                <AlertTriangle className={`w-5 h-5 ${confirm === "all" ? "status-bad" : "status-warn"}`} />
              </div>
              <h3 className="font-semibold text-strong-c">{lang === "kk" ? "Растайсыз ба?" : lang === "ru" ? "Подтвердить?" : "Are you sure?"}</h3>
            </div>
            <p className="text-sm text-muted-c mb-5">
              {confirm === "schedules" && (lang === "kk" ? "Барлық құрылған кесте өшеді. Сыныптар мен мұғалімдер қалады. Бұл әрекетті қайтару мүмкін емес." : lang === "ru" ? "Все расписания будут удалены. Данные останутся. Действие необратимо." : "All schedules will be deleted. Data stays. This cannot be undone.")}
              {confirm === "all" && (lang === "kk" ? "БАРЛЫҚ дерек өшеді: сыныптар, мұғалімдер, кабинеттер, пәндер, кестелер. Бұл әрекетті қайтару мүмкін емес!" : lang === "ru" ? "ВСЕ данные будут удалены: классы, учителя, кабинеты, расписания. Необратимо!" : "ALL data will be deleted: classes, teachers, rooms, schedules. Irreversible!")}
              {confirm === "demo" && (lang === "kk" ? "Қазіргі деректер демо үлгімен алмастырылады. Сақталмаған өзгерістер жоғалады." : lang === "ru" ? "Текущие данные заменятся демо-данными." : "Current data will be replaced with demo data.")}
            </p>
            <div className="flex gap-3">
              <button className={btnG + " flex-1"} onClick={() => setConfirm(null)}>{t("action.cancel")}</button>
              <button
                className={`flex-1 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all ${confirm === "all" ? "bg-red-500 hover:bg-red-600" : "gradient-primary hover:opacity-90"}`}
                onClick={doAction}>
                {lang === "kk" ? "Иә, тазалау" : lang === "ru" ? "Да, очистить" : "Yes, clear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
