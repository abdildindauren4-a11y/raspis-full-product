// filepath: src/components/shared/SalesChat.tsx
// ТОЛЫҚ ЭКРАНДЫ сату-чат — сайтқа кірген әлеуетті клиенттермен сөйлеседі.
// /login (кірмегендер) және /pricing беттерінде қалқымалы батырма, ашқанда
// толық экран (мөлдір емес, bg-app фонында).
//
// Чат ішінде ДЕМО жасауға болады:
//   1) «Үлгіні алу» — Excel импорт үлгісі жүктеледі (lib/excelTemplate.ts)
//   2) Клиент 3-4 сыныптың деректерін толтырып, файлды чатқа жүктейді
//   3) 4 сыныптан КӨП болса — қабылданбайды (толық кесте тарифпен ғана)
//   4) Кесте бірден құрылып, кәсіби Excel болып жүктеледі
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, FileDown, FileUp, FileSpreadsheet } from "lucide-react";
import AIRobot from "@/components/shared/AIRobot";
import Markdown from "@/components/shared/Markdown";
import { PAYMENT } from "@/lib/payment";
import { askSalesBot, cannedAnswer, hasSalesKey, QUICK_QUESTIONS, type BotMessage } from "@/lib/salesBot";
import { downloadTemplate, parseWorkbook } from "@/lib/excelTemplate";
import { exportProfessionalExcel } from "@/lib/excelExport";
import { generate, type AlgoResult, type Klass, type Teacher, type Room, type Subject } from "@/algorithm/engine";
import { seedSchool, seedSettings } from "@/lib/seed";

// Чат хабары: қарапайым мәтін немесе қосымша әрекеті бар (файл жүктеу батырмасы)
interface ChatMsg extends BotMessage {
  download?: "result"; // хабардың астында «Кестені Excel-ге жүктеу» батырмасы
}

// Демо шектеуі: қанша сыныпқа дейін қабылданады
const DEMO_MAX_CLASSES = 4;

const GREETING: ChatMsg = {
  role: "model",
  text: "Сәлеметсіз бе! 👋 Мен — РАСПИС кеңесшісімін.\n\nОсы чаттың ішінде-ақ **демо-кесте** жасап бере аламын: төмендегі «Үлгіні алу» батырмасымен Excel үлгісін жүктеп, 3-4 сыныптың деректерін толтырыңыз да, файлды маған қайта жүктеңіз — дайын кестені Excel күйінде бірден аласыз.\n\nНемесе кез келген сұрағыңызды жазыңыз!",
};

export default function SalesChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Соңғы сәтті демоның контексті — «қайта жүктеу» батырмасы үшін
  const demoCtx = useRef<{ classes: Klass[]; teachers: Teacher[]; rooms: Room[]; subjects: Subject[]; result: AlgoResult } | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, demoBusy, open]);

  const pushBot = (text: string, extra?: Partial<ChatMsg>) =>
    setMessages((prev) => [...prev, { role: "model", text, ...extra }]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    const newHistory = [...messages, { role: "user" as const, text: msg }];
    setMessages(newHistory);

    if (!hasSalesKey()) {
      setMessages([...newHistory, { role: "model", text: cannedAnswer(msg) }]);
      return;
    }
    setLoading(true);
    try {
      const reply = await askSalesBot(msg, messages.slice(1).map(({ role, text }) => ({ role, text })));
      setMessages([...newHistory, { role: "model", text: reply }]);
    } catch {
      setMessages([...newHistory, { role: "model", text: cannedAnswer(msg) }]);
    } finally {
      setLoading(false);
    }
  };

  // «Үлгіні алу» — импорт Excel үлгісін жүктеу
  const getTemplate = async () => {
    setMessages((prev) => [...prev, { role: "user", text: "📥 Excel үлгісін алу" }]);
    try {
      await downloadTemplate();
      pushBot("Үлгі жүктелді ✅ (РАСПИС_үлгі.xlsx)\n\nІшінде 5 парақ бар: Сыныптар, Мұғалімдер, Оқу жоспары, Кабинеттер, Пәндер (ҚР пәндері дайын тұр). Әр бағанның түсініктемесі бар — тақырыпқа тінтуірді апарсаңыз шығады.\n\n**3-4 сыныптың** деректерін толтырыңыз да, файлды осы чатқа «Толтырылған үлгіні жүктеу» батырмасымен қайта жүктеңіз — кестені бірден жасап беремін.");
    } catch {
      pushBot(`Үлгіні жүктеуде қате шықты. WhatsApp-қа жазыңыз, үлгіні қолма-қол жіберемін: ${PAYMENT.kaspiPhone}`);
    }
  };

  // Толтырылған үлгіні қабылдап, демо-кесте жасау
  const onFile = async (f: File | null) => {
    if (!f || demoBusy) return;
    setMessages((prev) => [...prev, { role: "user", text: `📤 ${f.name}` }]);
    setDemoBusy(true);
    try {
      const parsed = parseWorkbook(await f.arrayBuffer());

      // Құрылым қателері
      if (parsed.errors.length) {
        const list = parsed.errors.slice(0, 5).map((e) => `• ${e.sheet}, ${e.row}-жол: ${e.message}`).join("\n");
        pushBot(`Файлда толтыру қателері бар, алдымен соларды түзеңіз:\n\n${list}${parsed.errors.length > 5 ? `\n...және тағы ${parsed.errors.length - 5} қате` : ""}`);
        return;
      }
      if (!parsed.classes.length) {
        pushBot("Файлдан бірде-бір сынып табылмады. «Сыныптар» парағын толтырғаныңызды тексеріңіз — үлгідегі сары жолдар тек мысал, оларды өз деректеріңізбен алмастырыңыз.");
        return;
      }
      // ДЕМО ШЕКТЕУІ: толық мектеп қабылданбайды
      if (parsed.classes.length > DEMO_MAX_CLASSES) {
        pushBot(`Файлда **${parsed.classes.length} сынып** бар — бұл толық мектеп деректеріне жақын 🙂\n\nДемо режимде ең көбі **${DEMO_MAX_CLASSES} сынып** қабылдаймын: жүйенің қалай жұмыс істейтінін көруге сол жеткілікті.\n\nТолық мектеп кестесі тариф аясында жасалады — қазір алғашқы мектептерге жеңілдік те бар. WhatsApp-қа жазыңыз: ${PAYMENT.kaspiPhone}`);
        return;
      }
      if (!parsed.teachers.length) {
        pushBot("«Мұғалімдер» парағы бос сияқты — кемінде бірнеше мұғалім қосыңыз (оқу жоспарында соларды көрсетесіз).");
        return;
      }
      if (!parsed.rooms.length) {
        pushBot("«Кабинеттер» парағы бос сияқты — үлгіде дайын типтік кабинеттер бар еді, оларды өшірмей қалдырсаңыз да болады.");
        return;
      }

      // Генерация (3-4 сынып — сәттер ішінде)
      pushBot(`Қабылдадым: ${parsed.classes.map((c) => c.name).join(", ")} — ${parsed.teachers.length} мұғалім, ${parsed.summary.curItems} оқу жоспары жолы.\n\nКесте құрылып жатыр...`);
      const result = generate({
        school: { ...seedSchool, name: "Демо мектеп" },
        settings: seedSettings,
        classes: parsed.classes, teachers: parsed.teachers,
        rooms: parsed.rooms, subjects: parsed.subjects,
      });

      if (!result.success) {
        pushBot(`Кесте құру мүмкін болмады: **${result.error?.message}**\n\n${result.error?.details || ""}\n\nТүзетіп қайта жүктеп көріңіз немесе WhatsApp-қа жазыңыз — бірге қараймыз: ${PAYMENT.kaspiPhone}`);
        return;
      }

      demoCtx.current = { classes: parsed.classes, teachers: parsed.teachers, rooms: parsed.rooms, subjects: parsed.subjects, result };
      // Кәсіби Excel-ді бірден жүктейміз
      await exportProfessionalExcel({
        school: { ...seedSchool, name: "Демо мектеп" }, settings: seedSettings,
        classes: parsed.classes, teachers: parsed.teachers,
        rooms: parsed.rooms, subjects: parsed.subjects, result,
      });
      const gaps = result.gaps?.length ?? 0;
      const timeText = result.stats.timeMs < 1000 ? "бір секундтан аз уақытта" : `${(result.stats.timeMs / 1000).toFixed(1)} секундта`;
      pushBot(
        `Дайын! 🎉 Кесте **${timeText}** құрылды және Excel файлы жүктелді.\n\n• Сапа: **${result.quality}/100**\n• Орналасқан сабақ: **${result.stats.total}**\n• Тесік (бос сабақ): **${gaps}**\n• СанПиН тексерулері: **${result.tests.filter((t) => t.passed).length}/${result.tests.length}** өтті\n\nБұл — бар болғаны ${parsed.classes.length} сынып. Толық мектебіңіздің кестесі де дәл осылай, бірнеше секундта құрылады. Қызықтырса — WhatsApp-қа жазыңыз: ${PAYMENT.kaspiPhone}`,
        { download: "result" }
      );
    } catch {
      pushBot(`Файлды оқу мүмкін болмады — РАСПИС үлгісіндегі .xlsx файл екенін тексеріңіз (алдымен «Үлгіні алу» батырмасымен үлгіні жүктеп, соны толтырыңыз).`);
    } finally {
      setDemoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Демо кестені қайта жүктеу (хабардың астындағы батырма)
  const redownload = async () => {
    const c = demoCtx.current;
    if (!c) return;
    await exportProfessionalExcel({
      school: { ...seedSchool, name: "Демо мектеп" }, settings: seedSettings,
      classes: c.classes, teachers: c.teachers, rooms: c.rooms, subjects: c.subjects, result: c.result,
    });
  };

  const waLink = `https://wa.me/${PAYMENT.whatsappPhone}?text=${encodeURIComponent("Сәлеметсіз бе! РАСПИС туралы білгім келеді")}`;

  return (
    <>
      {/* Ашу батырмасы */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Кеңесшімен сөйлесу"
          className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full gradient-primary glow-blue flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[var(--bg-app)] animate-pulse" />
        </button>
      )}

      {/* ТОЛЫҚ ЭКРАН чат (мөлдір емес фон) */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--bg-app)" }}>
          {/* Тақырып */}
          <div className="flex items-center gap-2.5 px-4 py-3 gradient-primary text-white shrink-0">
            <AIRobot stageGroup="idle" size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">РАСПИС кеңесшісі</p>
              <p className="text-[11px] opacity-80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 inline-block" /> онлайн · демо-кесте жасай алады
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-white/15 transition-colors" aria-label="Жабу">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Хабарлар */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="max-w-2xl mx-auto w-full p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "gradient-primary text-white whitespace-pre-wrap" : "text-soft-c border border-soft-c"}`}
                    style={m.role === "user" ? undefined : { background: "var(--bg-surface)" }}
                  >
                    {m.role === "user" ? m.text : <Markdown text={m.text} />}
                    {m.download === "result" && (
                      <button
                        onClick={redownload}
                        className="mt-2.5 flex items-center gap-2 px-3.5 py-2 rounded-xl gradient-primary text-white text-xs font-medium hover:opacity-90 transition-opacity"
                      >
                        <FileSpreadsheet className="w-4 h-4" /> Кестені Excel-ге қайта жүктеу
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {(loading || demoBusy) && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-2.5 border border-soft-c flex items-center gap-2" style={{ background: "var(--bg-surface)" }}>
                    <Loader2 className="w-4 h-4 accent-c animate-spin" />
                    {demoBusy && <span className="text-xs text-muted-c">Кесте құрылуда...</span>}
                  </div>
                </div>
              )}
              {/* Жылдам сұрақтар — әңгіме басында */}
              {messages.length === 1 && !loading && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="text-xs px-3 py-1.5 rounded-full border border-[var(--accent)] accent-c hover:bg-[rgba(74,144,217,0.1)] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Демо батырмалары + енгізу + WhatsApp */}
          <div className="shrink-0 border-t border-soft-c" style={{ background: "var(--bg-surface)" }}>
            <div className="max-w-2xl mx-auto w-full p-3 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={getTemplate}
                  disabled={demoBusy}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-input-c border border-soft-c text-xs font-medium text-soft-c hover:border-[var(--accent)] transition-colors disabled:opacity-50"
                >
                  <FileDown className="w-3.5 h-3.5 accent-c" /> Үлгіні алу
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={demoBusy}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-input-c border border-soft-c text-xs font-medium text-soft-c hover:border-[var(--accent)] transition-colors disabled:opacity-50"
                >
                  <FileUp className="w-3.5 h-3.5 accent-c" /> Толтырылған үлгіні жүктеу
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-input-c border border-soft-c rounded-xl px-3 py-2.5 text-sm text-strong-c placeholder:text-faint-c focus:outline-none focus:border-[var(--accent)]"
                  placeholder="Сұрағыңызды жазыңыз..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                  disabled={loading}
                />
                <button
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  className="px-4 rounded-xl gradient-primary text-white disabled:opacity-50 flex items-center justify-center"
                  aria-label="Жіберу"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-white text-xs font-medium transition-opacity hover:opacity-90"
                style={{ background: "#25D366" }}
              >
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp-қа жазу — {PAYMENT.kaspiPhone}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
