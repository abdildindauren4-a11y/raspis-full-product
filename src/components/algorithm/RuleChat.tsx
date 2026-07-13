// filepath: src/components/algorithm/RuleChat.tsx
// Хамелеон ЖИ-баптаушы чаты (M6): завуч ережелерді сөзбен айтады, ЖИ ұсыныс
// дайындайды, завуч «Қолдану» батырмасын басады. ЖИ ешқашан тікелей өзгертпейді.
import { useState } from "react";
import { useData } from "@/store/dataStore";
import { askRuleChat, applyActions, hasRuleChatKey, type RuleAction } from "@/lib/ruleChat";
import type { EngineV2Config } from "@/algorithm2";
import { Sparkles, Send, Check, Loader2, AlertCircle, Wand2 } from "lucide-react";

const EXAMPLES = [
  "Ахметова сейсенбіде жұмыс істемейді",
  "Дене шынықтыру 1-сабаққа қойылмасын",
  "Мұғалім терезелерін азайту маңыздырақ болсын",
];

export default function RuleChat() {
  const subjects = useData((s) => s.subjects);
  const teachers = useData((s) => s.teachers);
  const engineConfigs = useData((s) => s.engineConfigs);
  const setEngineConfig = useData((s) => s.setEngineConfig);
  const setSubjects = useData((s) => s.setSubjects);
  const setTeachers = useData((s) => s.setTeachers);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [reply, setReply] = useState("");
  const [actions, setActions] = useState<RuleAction[] | null>(null);
  const [applied, setApplied] = useState(false);

  const hasKey = hasRuleChatKey();

  const submit = async (msg?: string) => {
    const q = (msg ?? text).trim();
    if (!q || busy) return;
    setBusy(true); setErr(""); setReply(""); setActions(null); setApplied(false);
    try {
      const res = await askRuleChat(q, subjects, teachers);
      setReply(res.reply);
      setActions(res.actions.length ? res.actions : null);
    } catch (e) {
      setErr(e instanceof Error && e.message === "NO_KEY"
        ? "ЖИ қосылмаған — Vercel-де VITE_GEMINI_SALES_KEYS қосыңыз."
        : "ЖИ уақытша қолжетімсіз. Ережелерді төменнен қолмен де баптай аласыз.");
    } finally { setBusy(false); }
  };

  const apply = () => {
    if (!actions) return;
    const base: EngineV2Config = engineConfigs.v2 || {};
    const out = applyActions(actions, base, subjects, teachers);
    setEngineConfig("v2", out.config);
    if (out.subjects !== subjects) setSubjects(out.subjects);
    if (out.teachers !== teachers) setTeachers(out.teachers);
    setApplied(true); setActions(null);
  };

  return (
    <div className="rounded-xl border border-soft-c bg-input-c/50 p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Wand2 className="w-4 h-4 accent-c" />
        <h4 className="font-semibold text-strong-c text-sm">ЖИ-баптаушы</h4>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(127,127,127,0.15)] text-faint-c">beta</span>
      </div>
      <p className="text-xs text-muted-c mb-3">
        Мектебіңіздің ережелерін жай ғана жазыңыз — жүйе автоматты баптайды. Қолданбас бұрын әрқашан көрсетеді.
      </p>

      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Мыс: 9-сыныптарға жұма 6 сабақтан аспасын"
          disabled={busy}
          className="flex-1 px-3 py-2 rounded-lg bg-app-c border border-soft-c text-strong-c text-sm placeholder:text-faint-c" />
        <button onClick={() => submit()} disabled={busy || !text.trim()}
          className="px-3 py-2 rounded-lg gradient-primary text-white disabled:opacity-40 shrink-0">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>

      {/* Мысал сұраныстар */}
      {!actions && !reply && !busy && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => { setText(ex); submit(ex); }}
              className="text-[11px] px-2 py-1 rounded-full bg-app-c border border-soft-c text-muted-c hover:text-strong-c">
              {ex}
            </button>
          ))}
        </div>
      )}

      {err && (
        <p className="text-xs status-warn flex items-center gap-1.5 mt-3">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {err}
        </p>
      )}

      {/* ЖИ жауабы + ұсыныс */}
      {reply && (
        <div className="mt-3 rounded-lg bg-app-c border border-soft-c p-3">
          <p className="text-sm text-strong-c flex items-start gap-2">
            <Sparkles className="w-4 h-4 accent-c shrink-0 mt-0.5" /> {reply}
          </p>
          {actions && (
            <>
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-c">Мына өзгерістер қолданылады:</p>
                {actions.map((a, i) => (
                  <p key={i} className="text-xs text-soft-c flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 status-good shrink-0 mt-0.5" /> {a.summary}
                  </p>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={apply}
                  className="px-3 py-1.5 rounded-lg gradient-primary text-white text-sm flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Қолдану
                </button>
                <button onClick={() => { setActions(null); setReply(""); }}
                  className="px-3 py-1.5 rounded-lg bg-input-c text-muted-c text-sm">
                  Болдырмау
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {applied && (
        <p className="text-xs status-good flex items-center gap-1.5 mt-3">
          <Check className="w-3.5 h-3.5 shrink-0" /> Баптау қосылды (бұрынғылар сақталды). Төмендегі «Белсенді баптаулар» тізімінен көре аласыз, қажет болса қолмен өшіресіз.
        </p>
      )}

      {!hasKey && !err && (
        <p className="text-[11px] text-faint-c mt-2">
          Ескерту: ЖИ-баптаушы Gemini кілтін талап етеді. Кілтсіз де барлық ережені төменнен қолмен баптай аласыз.
        </p>
      )}
    </div>
  );
}
