// filepath: src/pages/AIAdvisorPage.tsx
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, AlertCircle, Info, CheckCircle2, Lightbulb, Send, Loader2, Sparkles, Settings as SettingsIcon, Lock } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import AIRobot from "@/components/shared/AIRobot";
import { useData, useActiveVersion } from "@/store/dataStore";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import { canUse } from "@/lib/roles";
import { useNavigate } from "react-router-dom";
import { btnP } from "@/components/shared/Form";
import { askGemini, hasGeminiKey, type ChatMessage } from "@/lib/gemini";
import { HOMEROOM_SUBJECT_ID } from "@/algorithm/engine";
import Markdown from "@/components/shared/Markdown";

interface Issue { level: "red" | "yellow" | "green"; title: string; desc: string; advice: string }

export default function AIAdvisorPage() {
  const { classes, teachers, rooms, subjects } = useData();
  const active = useActiveVersion();
  const { lang, t } = useLang();
  const { role } = useAuth();
  const navigate = useNavigate();

  // РАСПИС AI — ақылы функция (free пайдаланушыға жабық)
  if (!canUse(role, "aiAdvisor")) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-input-c border border-soft-c flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 status-warn" />
        </div>
        <h2 className="text-xl font-bold text-strong-c mb-2">{t("ai.lockedTitle")}</h2>
        <p className="text-muted-c text-sm mb-5">{t("ai.lockedDesc")}</p>
        <button className={btnP} onClick={() => navigate("/profile")}>{t("ai.openProfile")}</button>
      </div>
    );
  }

  // ── Gemini чат ──
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const keyPresent = hasGeminiKey();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput(""); setChatError("");
    const newHistory = [...messages, { role: "user" as const, text: msg }];
    setMessages(newHistory);
    setLoading(true);
    try {
      const reply = await askGemini(msg, messages, {
        classes, teachers, rooms, subjects,
        result: active?.result ?? null, lang,
      });
      setMessages([...newHistory, { role: "model", text: reply }]);
    } catch (e) {
      const err = e instanceof Error ? e.message : "ERROR";
      const msgMap: Record<string, string> = {
        NO_KEY: t("ai.noKey"),
        INVALID_KEY: lang === "kk" ? "API кілті жарамсыз. Баптаулардан тексеріңіз." : lang === "ru" ? "Неверный API ключ. Проверьте в настройках." : "Invalid API key. Check Settings.",
        RATE_LIMIT: lang === "kk" ? "Минуттық/күндік шектен асты. 1 минуттан соң қайталаңыз (тегін: 10 сұраныс/мин)." : lang === "ru" ? "Превышен лимит запросов. Подождите минуту (бесплатно: 10/мин)." : "Rate limit reached. Wait a minute (free: 10/min).",
        FORBIDDEN: lang === "kk" ? "Кілтке рұқсат жоқ. Google AI Studio-да Gemini API қосулы екенін тексеріңіз." : lang === "ru" ? "Нет доступа. Проверьте, включён ли Gemini API в Google AI Studio." : "Access denied. Check if Gemini API is enabled in Google AI Studio.",
        MODEL_NOT_FOUND: lang === "kk" ? "Модель табылмады. Қосымшаны жаңартыңыз." : lang === "ru" ? "Модель не найдена. Обновите приложение." : "Model not found. Update the app.",
        SERVER_ERROR: lang === "kk" ? "Google сервері уақытша қолжетімсіз. Кейінірек қайталаңыз." : lang === "ru" ? "Сервер Google временно недоступен." : "Google server temporarily unavailable.",
        BLOCKED_SAFETY: lang === "kk" ? "Жауап қауіпсіздік сүзгісімен бөгелді. Сұрақты басқаша қойыңыз." : lang === "ru" ? "Ответ заблокирован фильтром. Переформулируйте." : "Response blocked by safety filter. Rephrase.",
        BAD_REQUEST: lang === "kk" ? "Сұраныс қате. Қайталап көріңіз." : lang === "ru" ? "Неверный запрос." : "Bad request.",
        EMPTY_RESPONSE: lang === "kk" ? "Бос жауап келді. Қайталаңыз." : lang === "ru" ? "Пустой ответ." : "Empty response.",
      };
      setChatError(msgMap[err] || (lang === "kk" ? "Қате пайда болды. Қайталап көріңіз." : lang === "ru" ? "Произошла ошибка." : "An error occurred."));
    } finally {
      setLoading(false);
    }
  };

  const issues: Issue[] = [];
  if (active) {
    const slots = active.result.slots;
    // 1. Мұғалім жүктемесі
    for (const t of teachers) {
      const h = slots.filter((o) => o.teacherId === t.id).length;
      if (h > t.norm * 1.2) issues.push({ level: "red", title: `Мұғалім артық жүктелген: ${t.name}`, desc: `${h} сағ — норма ${t.norm} сағаттан 20%+ артық`, advice: "Кейбір пәндерді басқа мұғалімге беріңіз" });
      else if (h > t.norm * 1.1) issues.push({ level: "yellow", title: `Жүктеме жоғары: ${t.name}`, desc: `${h} сағ (норма ${t.norm})`, advice: "Жүктемені қайта бөлуді қарастырыңыз" });
    }
    // 2. Ауыр пәндер теңгерімі
    for (const c of classes) {
      for (let d = 1; d <= 5; d++) {
        const dayS = slots.filter((o) => o.classId === c.id && o.day === d && (!o.groupId || o.groupId === "Г1"));
        if (!dayS.length) continue;
        const heavy = dayS.filter((o) => (subjects.find((s) => s.id === o.subjectId)?.score || 0) >= 9).length;
        if (heavy / dayS.length > 0.6) {
          issues.push({ level: "yellow", title: `${c.name}: бір күнде ауыр пәндер көп`, desc: `${["", "Дс", "Сс", "Ср", "Бс", "Жм"][d]} күні ${heavy}/${dayS.length} сабақ ауыр`, advice: "Кейбір ауыр пәнді басқа күнге жылжытыңыз (Partial Generate)" });
          break;
        }
      }
    }
    // 3. Қиын орналасқан пәндер
    const bySubj: Record<string, { sum: number; n: number }> = {};
    slots.forEach((o) => {
      if (o.subjectId === HOMEROOM_SUBJECT_ID) return;
      const k = o.subjectId; (bySubj[k] = bySubj[k] || { sum: 0, n: 0 }); bySubj[k].sum += o.score; bySubj[k].n++;
    });
    for (const [sid, v] of Object.entries(bySubj)) {
      if (v.n >= 3 && (v.sum / v.n) * 10 < 30)
        issues.push({ level: "yellow", title: `«${sid}» нашар орналасқан`, desc: `Орташа орналасу ұпайы ${Math.round((v.sum / v.n) * 10)}%`, advice: "Идеал орындарын немесе мұғалім шектеулерін қайта қараңыз" });
    }
    // 4. Бос кабинеттер
    const used = new Set(slots.map((o) => o.roomId));
    const idle = rooms.filter((r) => r.type === "regular" && !used.has(r.id));
    if (idle.length >= 3) issues.push({ level: "green", title: `${idle.length} кабинет мүлдем бос`, desc: idle.slice(0, 5).map((r) => r.number).join(", "), advice: "Резерв ретінде немесе үйірмелерге пайдалануға болады" });
    // 5. Орналаспағандар
    active.result.unplaced.forEach((u) =>
      issues.push({ level: "red", title: `Орналаспады: ${u.className} / ${u.subject}`, desc: `${u.placed}/${u.need} сағат қана`, advice: u.reason }));
    // 6. Тесіктер — ресурс жетіспеу сигналы (себеп бойынша топтау)
    const gaps = active.result.gaps || [];
    if (gaps.length) {
      // спортзал тесіктері
      const gymGaps = gaps.filter((g) => g.reason.includes("спортзал"));
      if (gymGaps.length)
        issues.push({ level: "yellow", title: `Спортзал жетіспеуінен ${gymGaps.length} тесік`, desc: gymGaps.slice(0, 3).map((g) => `${g.className} ${["", "Дс", "Сс", "Ср", "Бс", "Жм"][g.day]} ${g.slot}-сабақ`).join(", "), advice: "Қосымша спортзал немесе дене шынықтыру мұғалімін қосыңыз" });
      // арнайы кабинет тесіктері
      const roomGaps = gaps.filter((g) => g.reason.includes("арнайы кабинет"));
      if (roomGaps.length)
        issues.push({ level: "yellow", title: `Арнайы кабинет жетіспеуінен ${roomGaps.length} тесік`, desc: roomGaps.slice(0, 3).map((g) => `${g.className} ${["", "Дс", "Сс", "Ср", "Бс", "Жм"][g.day]} ${g.slot}-сабақ`).join(", "), advice: "Физика/химия/информатика кабинетін қосыңыз" });
      // мұғалім тесіктері
      const teacherGaps = gaps.filter((g) => g.reason.includes("мұғалімі") && g.reason.includes("сабақ беруде"));
      if (teacherGaps.length)
        issues.push({ level: "yellow", title: `Мұғалім жетіспеуінен ${teacherGaps.length} тесік`, desc: teacherGaps.slice(0, 3).map((g) => `${g.className} ${["", "Дс", "Сс", "Ср", "Бс", "Жм"][g.day]} ${g.slot}-сабақ`).join(", "), advice: "Сол пәнге қосымша мұғалім қосыңыз — бір мұғалім бір уақытта бірнеше сыныпқа жетпейді" });
    }
  }

  const ICON = { red: AlertTriangle, yellow: AlertCircle, green: Info };
  const CL = { red: "border-red-400/30 bg-red-500/10 status-bad", yellow: "border-yellow-400/30 bg-yellow-500/10 text-yellow-100", green: "border-emerald-400/30 bg-emerald-500/10 status-good" };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <AIRobot stageGroup="idle" size={48} />
        <div>
          <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("ai.title")}</h1>
          <p className="text-muted-c text-sm">{keyPresent ? "Gemini AI" : t("ai.localDiag")}</p>
        </div>
      </div>

      {/* ── GEMINI ЧАТ ── */}
      <GlassCard hover={false}>
        <h3 className="font-semibold text-strong-c mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 accent-c" /> Gemini AI</h3>
        {!keyPresent ? (
          <div className="text-center py-6">
            <AIRobot stageGroup="idle" size={72} className="mb-3" />
            <p className="text-sm text-muted-c mb-3">{t("ai.noKey")}</p>
            <Link to="/settings" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-white text-sm">
              <SettingsIcon className="w-4 h-4" /> {t("settings.title")}
            </Link>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="max-h-[380px] overflow-y-auto scrollbar-thin space-y-3 mb-3 pr-1">
              {messages.length === 0 && (
                <p className="text-sm text-faint-c text-center py-6">{t("ai.placeholder")}</p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "gradient-primary text-white whitespace-pre-wrap"
                      : "bg-input-c text-soft-c border border-soft-c"
                  }`}>
                    {m.role === "user" ? m.text : <Markdown text={m.text} />}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-2.5 bg-input-c border border-soft-c">
                    <Loader2 className="w-4 h-4 accent-c animate-spin" />
                  </div>
                </div>
              )}
            </div>
            {chatError && <p className="status-bad text-xs mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {chatError}</p>}
            <div className="flex gap-2">
              <input
                className="flex-1 bg-input-c border border-soft-c rounded-xl px-3 py-2 text-sm text-strong-c placeholder:text-faint-c focus:outline-none focus:border-[var(--accent)]"
                placeholder={t("ai.placeholder")}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                disabled={loading}
              />
              <button onClick={send} disabled={loading || !input.trim()}
                className="px-4 rounded-xl gradient-primary text-white disabled:opacity-50 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </GlassCard>

      {/* ── ЖЕРГІЛІКТІ ДИАГНОСТИКА ── */}
      <div>
        <h3 className="font-semibold text-strong-c mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 accent-c" /> {t("ai.localDiag")}</h3>
      </div>
      {!active ? (
        <GlassCard hover={false}>
          <p className="text-center text-muted-c py-8 text-sm">{t("ai.title")} — <Link to="/generate" className="accent-c">{t("nav.generate")} →</Link></p>
        </GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {(["red", "yellow", "green"] as const).map((lv) => (
              <GlassCard key={lv} hover={false}>
                <p className={`text-3xl font-bold ${lv === "red" ? "status-bad" : lv === "yellow" ? "status-warn" : "status-good"}`}>
                  {issues.filter((i) => i.level === lv).length}
                </p>
                <p className="text-xs text-muted-c">{lv === "red" ? "Критикалық" : lv === "yellow" ? "Ескерту" : "Ақпарат"}</p>
              </GlassCard>
            ))}
          </div>
          <div className="space-y-3">
            {issues.length === 0 && (
              <GlassCard hover={false}><p className="status-good text-sm text-center py-6 flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" /> Елеулі мәселе табылмады — кесте жақсы күйде</p></GlassCard>
            )}
            {issues.map((i, idx) => {
              const Icon = ICON[i.level];
              return (
                <div key={idx} className={`rounded-xl border p-4 ${CL[i.level]}`}>
                  <p className="font-semibold text-sm flex items-center gap-2"><Icon className="w-4 h-4" /> {i.title}</p>
                  <p className="text-xs opacity-80 mt-1">{i.desc}</p>
                  <p className="text-xs mt-1.5 opacity-90 flex items-start gap-1.5"><Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {i.advice}</p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
