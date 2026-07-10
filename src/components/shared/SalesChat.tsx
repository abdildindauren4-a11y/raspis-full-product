// filepath: src/components/shared/SalesChat.tsx
// Қалқымалы сату-чат виджеті — сайтқа кірген әлеуетті клиенттермен сөйлеседі.
// /login (кірмегендер) және /pricing (сатып алу шешімі) беттерінде көрінеді.
// Gemini кілті болса — тірі AI-кеңесші (lib/salesBot.ts), болмаса — жиі
// сұрақтарға дайын жауаптар. Екі режимде де WhatsApp-қа шақырады.
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import AIRobot from "@/components/shared/AIRobot";
import Markdown from "@/components/shared/Markdown";
import { PAYMENT } from "@/lib/payment";
import { askSalesBot, cannedAnswer, hasSalesKey, QUICK_QUESTIONS, type BotMessage } from "@/lib/salesBot";

const GREETING: BotMessage = {
  role: "model",
  text: "Сәлеметсіз бе! 👋 Мен — РАСПИС кеңесшісімін. Мектеп кестесін автоматты құру жайлы кез келген сұрағыңызға жауап беремін. Немен көмектесейін?",
};

export default function SalesChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<BotMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    const newHistory = [...messages, { role: "user" as const, text: msg }];
    setMessages(newHistory);

    if (!hasSalesKey()) {
      // Кілтсіз режим — дайын жауаптар
      setMessages([...newHistory, { role: "model", text: cannedAnswer(msg) }]);
      return;
    }
    setLoading(true);
    try {
      const reply = await askSalesBot(msg, messages.slice(1)); // GREETING промптқа кірмейді
      setMessages([...newHistory, { role: "model", text: reply }]);
    } catch {
      // AI қолжетімсіз — дайын жауапқа құлаймыз (клиент қатені көрмейді)
      setMessages([...newHistory, { role: "model", text: cannedAnswer(msg) }]);
    } finally {
      setLoading(false);
    }
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
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[var(--bg)] animate-pulse" />
        </button>
      )}

      {/* Чат панелі */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[370px] rounded-2xl border border-soft-c bg-surface-c shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "min(560px, calc(100vh - 5rem))" }}>
          {/* Тақырып */}
          <div className="flex items-center gap-2.5 px-4 py-3 gradient-primary text-white">
            <AIRobot stageGroup="idle" size={34} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">РАСПИС кеңесшісі</p>
              <p className="text-[11px] opacity-80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 inline-block" /> онлайн
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/15 transition-colors" aria-label="Жабу">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Хабарлар */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2.5 min-h-[220px]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-sm ${
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
                <div className="rounded-2xl px-3.5 py-2 bg-input-c border border-soft-c">
                  <Loader2 className="w-4 h-4 accent-c animate-spin" />
                </div>
              </div>
            )}
            {/* Жылдам сұрақтар — сөйлесу әлі басталмағанда */}
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

          {/* Енгізу + WhatsApp */}
          <div className="p-3 border-t border-soft-c space-y-2">
            <div className="flex gap-2">
              <input
                className="flex-1 bg-input-c border border-soft-c rounded-xl px-3 py-2 text-sm text-strong-c placeholder:text-faint-c focus:outline-none focus:border-[var(--accent)]"
                placeholder="Сұрағыңызды жазыңыз..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                disabled={loading}
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="px-3.5 rounded-xl gradient-primary text-white disabled:opacity-50 flex items-center justify-center"
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
      )}
    </>
  );
}
