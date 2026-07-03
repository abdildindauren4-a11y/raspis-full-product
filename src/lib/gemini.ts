// filepath: src/lib/gemini.ts
// Gemini API интеграциясы — кілт басқару + сайт-контекст білетін кеңесші
import type { AlgoResult, Klass, Teacher, Room, Subject } from "@/algorithm/engine";
import { AI_KNOWLEDGE } from "@/lib/aiKnowledge";

const KEY_STORAGE = "raspis-gemini-key";

export function getGeminiKey(): string | null {
  return localStorage.getItem(KEY_STORAGE);
}
export function setGeminiKey(key: string) {
  localStorage.setItem(KEY_STORAGE, key);
}
export function clearGeminiKey() {
  localStorage.removeItem(KEY_STORAGE);
}
export function hasGeminiKey(): boolean {
  return !!localStorage.getItem(KEY_STORAGE);
}

// Сайттың толық жағдайын Gemini-ге түсінікті мәтінге айналдыру
export interface SiteContext {
  classes: Klass[];
  teachers: Teacher[];
  rooms: Room[];
  subjects: Subject[];
  result: AlgoResult | null;
  lang: "kk" | "ru" | "en";
}

function buildSystemContext(ctx: SiteContext): string {
  const { classes, teachers, rooms, subjects, result } = ctx;
  const langName = { kk: "қазақ", ru: "орыс (русский)", en: "English" }[ctx.lang];

  let s = `Сенің атың — «РАСПИС AI». Сен мектеп кестесін автоматты құратын РАСПИС жүйесінің жасанды интеллект көмекшісісің. Сен қосымшаның ТОЛЫҚ жағдайын білесің және мұғалімдерге/завучтарға кестені жақсартуға көмектесесің. Жауаптарыңды ${langName} тілінде бер. Қысқа әрі нақты бол.

${AI_KNOWLEDGE}

=== ҚАЗІРГІ ДЕРЕКТЕР ===
Сыныптар: ${classes.length} (${classes.map((c) => c.name).join(", ")})
Мұғалімдер: ${teachers.length}
Кабинеттер: ${rooms.length} (${rooms.map((r) => r.number).join(", ")})
Пәндер: ${subjects.length}
`;

  if (result && result.success) {
    s += `
=== ҚҰРЫЛҒАН КЕСТЕ ===
Сапа: ${result.quality}/100
Барлық сабақ: ${result.stats?.total ?? "?"}
Орналаспаған сабақ: ${result.unplaced.length}
Тесік саны: ${result.gaps?.length ?? 0}
`;
    const load = teachers.map((t) => {
      const h = result.slots.filter((o) => o.teacherId === t.id).length;
      return { name: t.name, h, norm: t.norm };
    }).filter((x) => x.h > 0);
    if (load.length) {
      s += `\nМұғалім жүктемесі (нақты/норма):\n`;
      load.slice(0, 25).forEach((l) => {
        const mark = l.h > l.norm * 1.1 ? " (артық!)" : l.h < l.norm * 0.7 ? " (аз)" : "";
        s += `  ${l.name}: ${l.h}/${l.norm}${mark}\n`;
      });
    }
    if (result.gaps && result.gaps.length) {
      s += `Тесіктер:\n`;
      result.gaps.slice(0, 10).forEach((g) => {
        s += `  - ${g.className}, ${["", "Дс", "Сс", "Ср", "Бс", "Жм"][g.day]} ${g.slot}-сабақ: ${g.reason}\n`;
      });
    }
    if (result.unplaced.length) {
      s += `Орналаспаған сабақтар:\n`;
      result.unplaced.slice(0, 10).forEach((u) => {
        s += `  - ${u.className} / ${u.subject}: ${u.placed}/${u.need} (${u.reason})\n`;
      });
    }
    const failedTests = result.tests?.filter((t) => !t.passed) || [];
    if (failedTests.length) {
      s += `Орындалмаған тексерулер:\n`;
      failedTests.forEach((t) => { s += `  - ${t.name}: ${t.details}\n`; });
    }
  } else if (result && !result.success) {
    s += `\n=== ҚАТЕ ===\nКесте құрылмады: ${result.error?.message}\n${result.error?.details || ""}\n`;
  } else {
    s += `\n=== КЕСТЕ ӘЛІ ҚҰРЫЛМАҒАН ===\nҚолданушы әлі генерация жасамаған.\n`;
  }

  s += `
=== СЕНІҢ МІНДЕТІҢ ===
- Қолданушының сұрағына осы деректер негізінде жауап бер
- Тесік немесе қате болса, НАҚТЫ шешім ұсын (қай мұғалім/кабинет қосу керек, қай баптауды өзгерту керек)
- Кеңестерің практикалық әрі қосымшаның мүмкіндіктеріне сай болсын
- Білмейтін нәрсені ойдан құрма`;

  return s;
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

// Gemini-ге сұраныс жіберу
export async function askGemini(
  userMessage: string,
  history: ChatMessage[],
  ctx: SiteContext
): Promise<string> {
  const key = getGeminiKey();
  if (!key) throw new Error("NO_KEY");

  const systemContext = buildSystemContext(ctx);

  const contents = [
    { role: "user", parts: [{ text: systemContext }] },
    { role: "model", parts: [{ text: "Түсіндім. Қосымшаның жағдайын білемін, көмектесуге дайынмын." }] },
    ...history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  // gemini-2.5-flash — тұрақты модель (тегін лимитте: 10 сұраныс/мин, 250/күн)
  // Ескерту: gemini-2.0-flash 2026-06-01 жабылды, сондықтан 2.5-ке көштік.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        // 2.5-flash "ойлану" токендері де осы лимиттен есептеледі — лимит
        // аз болса жауап үзіліп қалады. Ойлануды өшіріп, қор жеткілікті береміз.
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    // Нақты қате түрлерін ажыратамыз (пайдаланушыға дұрыс хабар беру үшін)
    if (resp.status === 400 && errText.includes("API_KEY_INVALID")) throw new Error("INVALID_KEY");
    if (resp.status === 400) throw new Error("BAD_REQUEST");
    if (resp.status === 403) throw new Error("FORBIDDEN");       // кілтте рұқсат жоқ
    if (resp.status === 404) throw new Error("MODEL_NOT_FOUND");  // модель табылмады
    if (resp.status === 429) throw new Error("RATE_LIMIT");       // шынайы лимит
    if (resp.status >= 500) throw new Error("SERVER_ERROR");      // Google сервері
    throw new Error(`API_ERROR: ${resp.status}`);
  }

  const data = await resp.json();
  // Жауап блокталған болуы мүмкін (қауіпсіздік сүзгісі)
  if (data?.candidates?.[0]?.finishReason === "SAFETY") throw new Error("BLOCKED_SAFETY");
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("EMPTY_RESPONSE");
  return text;
}

/* ════════════════════════════════════════════════════════════
   АВТОТҮСІНДІРМЕ — генерациядан кейін кестені талдап түсіндірме жазу.
   РАСПИС AI кестенің сапасын, артықшылықтарын, кемшіліктерін
   түсіндіреді әрі жақсарту ұсынады.
   ════════════════════════════════════════════════════════════ */
export async function explainSchedule(ctx: SiteContext): Promise<string> {
  const key = getGeminiKey();
  if (!key) throw new Error("NO_KEY");

  const { result, teachers, lang } = ctx;
  if (!result || !result.success) throw new Error("NO_SCHEDULE");

  const langName = { kk: "қазақ", ru: "орыс (русский)", en: "English" }[lang];

  // Кесте туралы нақты деректерді жинаймыз
  const failedTests = result.tests?.filter((t) => !t.passed) || [];
  const passedCount = (result.tests?.filter((t) => t.passed).length) || 0;
  const totalTests = result.tests?.length || 0;

  // Мұғалім жүктемесі (артық/аз)
  const overloaded: string[] = [];
  const underused: string[] = [];
  teachers.forEach((t) => {
    const h = result.slots.filter((o) => o.teacherId === t.id).length;
    if (h > t.norm * 1.1) overloaded.push(`${t.name} (${h}/${t.norm})`);
    else if (h > 0 && h < t.norm * 0.6) underused.push(`${t.name} (${h}/${t.norm})`);
  });

  const dataText = `
КЕСТЕ ДЕРЕКТЕРІ (нақты):
- Сапа: ${result.quality}/100
- Барлық сабақ: ${result.stats?.total ?? "?"}
- Орналаспаған сабақ: ${result.unplaced.length}
- Тесік (бос ұя): ${result.gaps?.length ?? 0}
- Стресс-тест: ${passedCount}/${totalTests} өтті
- Мұғалім жайлылығы: ${result.stats?.comfort ?? "?"}%
- Сынып теңгерімі: ${result.stats?.balance ?? "?"}%
${failedTests.length ? `- Орындалмаған тексерулер: ${failedTests.map((t) => t.name + (t.details ? ` (${t.details})` : "")).join("; ")}` : "- Барлық тексеру өтті"}
${overloaded.length ? `- Артық жүктелген мұғалімдер: ${overloaded.slice(0, 5).join(", ")}` : ""}
${underused.length ? `- Аз жүктелген мұғалімдер: ${underused.slice(0, 5).join(", ")}` : ""}
${result.unplaced.length ? `- Орналаспаған: ${result.unplaced.slice(0, 5).map((u) => `${u.className}/${u.subject} (${u.placed}/${u.need})`).join(", ")}` : ""}
`;

  const systemContext = buildSystemContext(ctx);

  const prompt = `${systemContext}

${dataText}

ТАПСЫРМА: Сен — РАСПИС AI. Жаңа құрылған осы кестеге ТОЛЫҚ кәсіби түсіндірме жаз (${langName} тілінде).

Түсіндірме мынадай құрылымда болсын:
1. ЖАЛПЫ БАҒА — кестенің сапасы қандай (жақсы/орташа/жақсартуға болады), неге.
2. АРТЫҚШЫЛЫҚТАРЫ — нақты нені дұрыс істеді (тесіксіздік, баланс, ережелер).
3. КЕМШІЛІКТЕРІ — егер бар болса, нақты не проблема (нақты деректермен).
4. ҰСЫНЫСТАР — қалай жақсартуға болады (практикалық қадамдар).

Маңызды:
- Нақты сандарды қолдан (сапа ${result.quality}, тесік ${result.gaps?.length ?? 0}, т.б.)
- Қарапайым, түсінікті тілмен жаз (завуч/мұғалім оқиды)
- Шынайы бол: кесте жақсы болса — мақта, кемшілік болса — ашық айт
- Артық ұзақ жазба, нақты әрі пайдалы бол (200-300 сөз)
- Markdown форматын қолдан (тақырыптар, тізімдер)`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        // 2.5-flash "ойлану" токендері де осы лимиттен есептеледі — лимит
        // аз болса жауап үзіліп қалады. Ойлануды өшіріп, қор жеткілікті береміз.
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!resp.ok) {
    if (resp.status === 400) throw new Error("BAD_REQUEST");
    if (resp.status === 403) throw new Error("FORBIDDEN");
    if (resp.status === 404) throw new Error("MODEL_NOT_FOUND");
    if (resp.status === 429) throw new Error("RATE_LIMIT");
    if (resp.status >= 500) throw new Error("SERVER_ERROR");
    throw new Error(`API_ERROR: ${resp.status}`);
  }

  const data = await resp.json();
  if (data?.candidates?.[0]?.finishReason === "SAFETY") throw new Error("BLOCKED_SAFETY");
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("EMPTY_RESPONSE");
  return text;
}
