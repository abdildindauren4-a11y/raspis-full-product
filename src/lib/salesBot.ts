// filepath: src/lib/salesBot.ts
// РАСПИС САТУ-КЕҢЕСШІСІ — сайтқа кірген әлеуетті клиенттермен сөйлесетін чат-бот.
// Өнім туралы толық біліммен және сату психологиясымен «оқытылған» Gemini.
//
// Кілт (үш дереккөз, басымдық ретімен):
// 1. Vercel-де орта айнымалысы VITE_GEMINI_SALES_KEY (ұсынылады — өндіріс үшін);
// 2. Төмендегі SALES_KEY_FALLBACK тұрақтысы (aistudio.google.com/apikey-ден
//    жаңа кілт алып осында қой; кілтті HTTP referrer-мен шектеуді ұмытпа);
// 3. Пайдаланушының өз Gemini кілті (Баптаулардан — админ тестілеуі үшін).
// Кілт болмаса — бот дайын (canned) жауаптармен жұмыс істей береді.
import { PLANS, PLAN_ORDER, LAUNCH_PROMO, formatKzt, effectivePrice } from "@/lib/plans";
import { PAYMENT } from "@/lib/payment";
import { getPromoState } from "@/lib/promo";
import { getGeminiKey } from "@/lib/gemini";

export interface BotMessage {
  role: "user" | "model";
  text: string;
}

// «Батарея» кілттер: лимит бітсе (429) не кілт/модель жарамсыз болса,
// автоматты КЕЛЕСІ кілтке ауысады.
// Кілттер КОДТА САҚТАЛМАЙДЫ (GitHub secret-scanning push-ты бөгейді) —
// Vercel-де орта айнымалысы арқылы беріледі:
//   VITE_GEMINI_SALES_KEYS = кілт1,кілт2,кілт3,кілт4   (үтірмен бөлінген)
// Тегін лимит әр кілтке жеке: ~10 сұраныс/мин, 250/күн → 4 кілт = 1000/күн.
const SALES_KEYS: string[] = (
  (import.meta.env.VITE_GEMINI_SALES_KEYS as string | undefined) || ""
)
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

// Модель нұсқалары: кейбір (жаңа) аккаунттарға 2.5-flash жабық — 404 берсе
// келесі атауды қолданамыз. flash-lite — ең соңғы қор (жеңіл, бірақ жылдам).
const MODELS = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest"];

const KI_STORAGE = "raspis-salesbot-ki"; // соңғы сәтті (кілт|модель) индексі

function allKeys(): string[] {
  const env = import.meta.env.VITE_GEMINI_SALES_KEY as string | undefined;
  const list = [...(env ? [env] : []), ...SALES_KEYS];
  const own = getGeminiKey(); // админнің жеке кілті — қосымша қор
  if (own && !list.includes(own)) list.push(own);
  return list;
}
export function hasSalesKey(): boolean {
  return allKeys().length > 0;
}

// Тарифтер мәтіні — plans.ts-тен ЖАНДЫ түрде құрылады (баға өзгерсе бот та біледі)
function tariffText(promoActive: boolean): string {
  return PLAN_ORDER.filter((id) => id !== "free")
    .map((id) => {
      const p = PLANS[id];
      const now = formatKzt(effectivePrice(p.price, promoActive));
      const orig = formatKzt(p.price);
      return promoActive
        ? `- ${p.name}: ${now} (${orig} орнына, −${LAUNCH_PROMO.percent}%) / ${p.durationLabel} — ${p.quickGenerations} жылдам генерация, ${p.deepSearches} терең іздеу`
        : `- ${p.name}: ${now} / ${p.durationLabel} — ${p.quickGenerations} жылдам генерация, ${p.deepSearches} терең іздеу`;
    })
    .join("\n");
}

// Боттың жүйелік нұсқауы: өнім білімі + сату психологиясы
function buildSalesPrompt(promoActive: boolean, seatsLeft: number): string {
  return `Сен — «РАСПИС» жүйесінің сату-кеңесшісісің. Атың — РАСПИС кеңесшісі.
Сайтқа кірген адамдармен (мектеп директорлары, завучтар, мұғалімдер) сөйлесесің.

=== ӨНІМ ТУРАЛЫ (тек осы фактілерді қолдан, ойдан ештеңе қоспа) ===
РАСПИС — мектеп сабақ кестесін автоматты құратын қазақстандық жүйе.
- Кестені секундтар ішінде құрады (қолмен жасау әдетте 1-2 апта алады)
- СанПиН талаптарын автоматты сақтайды: күндік жүктеме лимиті, ауыр пәндердің
  дұрыс орналасуы, шаршау шегі, қос сабақ ережелері
- Мұғалім жайлылығы: терезелерді (бос сабақтарды) азайту режимі
- Терең іздеу: жүздеген нұсқа құрып, ең жақсысын таңдайды
- АҚЫЛДЫ ЖАҢАРТУ: оқу жылы басында мұғалім кетсе/келсе, сынып қосылса —
  бүкіл кестені бұзбай, тек өзгерген жерін түзейді (басқа сыныптардың
  кестесі орнында қалады). Бұл — біздің басты артықшылығымыз.
- Excel, PDF экспорт, басып шығару
- Нұсқалар тарихы: әр кесте сақталады, кез келгеніне қайтуға болады
- Сапа есебі: әр сынып кестесінің баллы, стресс-тесттер
- AI талдау: жасанды интеллект кестені талдап, жақсарту ұсынады
- Мұғалім алмастыру модулі (ауырып қалғанда орнын басатынды табады)
- Excel-ден деректерді импорттау (дайын шаблонмен)
- Толық қазақ тілінде (орыс, ағылшын тілдері де бар)
- Деректер Google серверлерінде қауіпсіз сақталады
- Браузерде жұмыс істейді, ештеңе орнату керек емес
- 37 беттік толық қазақша нұсқаулық бар

=== ТАРИФТЕР ===
${tariffText(promoActive)}
Барлық функция әр тарифте толық ашық — айырмашылық тек генерация санында.
${promoActive ? `НАЗАР АУДАР: қазір іске қосу науқаны — алғашқы 10 мектепке −${LAUNCH_PROMO.percent}% жеңілдік. Орын шектеулі${seatsLeft > 0 && seatsLeft <= 5 ? ` (${seatsLeft} орын ғана қалды!)` : ""}. Бұны сөз арасында айт, бірақ қысым жасама.` : ""}

=== БАЙЛАНЫС ===
WhatsApp: ${PAYMENT.kaspiPhone} — көрсетілім сұрау, төлем, кез келген сұрақ.
Төлем: Kaspi аударым → чекті WhatsApp-қа → тариф қосылады.

=== СӨЙЛЕСУ СТИЛІ (сату психологиясы) ===
1. ҚЫСҚА жауап бер: 2-4 сөйлем. Ешқашан ұзақ лекция оқыма.
2. Клиент тілінде жаз: қазақша жазса — қазақша, орысша жазса — орысша.
3. Қарапайым тіл: техникалық терминсіз, завучқа/директорға түсінікті сөзбен.
4. Алдымен ТҮСІН: мектебі қандай (қанша сынып), кестені қазір қалай жасайды,
   қанша уақыт кетеді — бір сұрақтан ғана қой, тергеу жүргізбе.
5. Ауырсынуын күшейт: қолмен жасау апталар алады, қателер шығады, мұғалімдер
   наразы болады, СанПиН тексерісі қауіп — осыған РАСПИС қалай шешім екенін
   НАҚТЫ мысалмен көрсет.
6. Функция емес, ПАЙДА сат: «терең іздеу бар» деме — «2 аптада қолмен
   жасайтын жұмысты 3 минутта аласыз» де.
7. Күмәнмен жұмыс: «қымбат» десе — қолмен жасауға кететін апталармен салыстыр;
   «қателеспей ме» десе — СанПиН тексерулері мен сапа есебін айт; «үйрену
   қиын ба» десе — көрсетілім мен толық нұсқаулықты айт.
8. Әр 2-3 хабардан кейін жұмсақ әрекетке шақыр: «WhatsApp-қа жазыңыз,
   мектебіңіздің өз деректерімен көрсетілім жасап берейік».
9. МАҢЫЗДЫ: «тегін» деген сөзді ҚОЛДАНБА. Демо туралы айтқанда «көрсетілім»
   де. Free тарифті өзің ұсынба.
10. Білмейтін сұраққа (техникалық интеграция, ерекше жағдай) адал бол:
    «Бұны нақтылау үшін WhatsApp-қа жазыңыз» де. Ешқашан өтірік айтпа,
    жоқ функцияны бар деме.
11. Сыпайы, жылы, кәсіби бол. Смайлды сирек қолдан (ең көбі 1 хабарда 1).`;
}

// Бір (кілт, модель) жұбымен нақты сұраныс
async function callGemini(key: string, model: string, contents: unknown): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.8, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  if (!resp.ok) throw new Error(`HTTP_${resp.status}`);
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("EMPTY_RESPONSE");
  return text;
}

// Gemini-ге сұраныс (сату-кеңесші рөлінде) — батарея-ротациямен:
// соңғы сәтті жұптан бастап, сәтсіздікте келесі (кілт, модель) жұбына көшеді.
export async function askSalesBot(userMessage: string, history: BotMessage[]): Promise<string> {
  const keys = allKeys();
  if (!keys.length) throw new Error("NO_KEY");

  // Акция күйін нақты санауыштан аламыз (орын толса бот та жеңілдік айтпайды).
  // Firestore баяу болса — 2 секундтан кейін статикалық күймен жалғасамыз,
  // клиентті күттірмейміз.
  const promo = await Promise.race([
    getPromoState(),
    new Promise<{ active: boolean; used: number; seats: number; percent: number }>((res) =>
      setTimeout(() => res({ active: LAUNCH_PROMO.active, used: 0, seats: LAUNCH_PROMO.seats, percent: LAUNCH_PROMO.percent }), 2000)
    ),
  ]);
  const prompt = buildSalesPrompt(promo.active, promo.seats - promo.used);

  const contents = [
    { role: "user", parts: [{ text: prompt }] },
    { role: "model", parts: [{ text: "Түсіндім. Мен РАСПИС сату-кеңесшісімін, клиентпен қысқа әрі пайдалы сөйлесемін." }] },
    ...history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  // (кілт × модель) жұптарының тізімі: кілт бойымен, әр кілтке модельдер ретімен
  const pairs: { k: number; m: number }[] = [];
  for (let k = 0; k < keys.length; k++)
    for (let m = 0; m < MODELS.length; m++) pairs.push({ k, m });

  // соңғы сәтті жұптан бастаймыз (лимиті біткен кілтке қайта-қайта ұрынбау үшін)
  let start = Number(localStorage.getItem(KI_STORAGE)) || 0;
  if (start >= pairs.length || start < 0) start = 0;

  let lastErr: Error = new Error("API_ERROR");
  for (let a = 0; a < pairs.length; a++) {
    const i = (start + a) % pairs.length;
    const { k, m } = pairs[i];
    try {
      const text = await callGemini(keys[k], MODELS[m], contents);
      localStorage.setItem(KI_STORAGE, String(i));
      return text;
    } catch (e) {
      // 429 (лимит) / 404 (модель жабық) / 403 (кілт) / 503 — келесі батареяға
      lastErr = e instanceof Error ? e : new Error("API_ERROR");
    }
  }
  throw lastErr;
}

// ── Кілтсіз режим: жиі сұрақтарға дайын жауаптар ──
export const QUICK_QUESTIONS = [
  "Бағасы қанша?",
  "Қалай жұмыс істейді?",
  "Көрсетілім алғым келеді",
];

export function cannedAnswer(msg: string): string {
  const m = msg.toLowerCase();
  const wa = `WhatsApp: **${PAYMENT.kaspiPhone}**`;
  if (/баға|бағасы|қанша|тариф|цена|стоит|сколько/.test(m)) {
    const promoOn = LAUNCH_PROMO.active;
    return `Тарифтер (барлық функция әр тарифте толық ашық):\n\n${tariffText(promoOn)}\n\n${promoOn ? `🔥 Қазір алғашқы 10 мектепке −${LAUNCH_PROMO.percent}% жеңілдік жүріп жатыр.\n\n` : ""}Толығырақ — ${wa}`;
  }
  if (/қалай|жұмыс|как работает|истейд/.test(m)) {
    return `Барлығы 3 қадам:\n\n1. Мектеп деректерін енгізесіз (сыныптар, мұғалімдер, пәндер) — Excel-ден импорттауға да болады\n2. «Генерация» батырмасын басасыз — 30 секундта дайын кесте\n3. Excel/PDF-ке экспорттап, басып шығарасыз\n\nСанПиН талаптарын жүйе өзі сақтайды. Мұғалім кетсе/келсе — «Ақылды жаңарту» бүкіл кестені бұзбай тек өзгерген жерін түзейді.\n\nӨз деректеріңізбен көрсетілім жасап берейік — ${wa}`;
  }
  if (/демо|көрсетілім|показ|посмотреть|көру|көрейін/.test(m)) {
    return `Әрине! Мектебіңіздің өз деректерімен тірі көрсетілім жасап береміз — кестеңіз көз алдыңызда құрылғанын көресіз.\n\nЖазыңыз: ${wa}\n\nМектеп атауы мен шамамен сынып санын айтсаңыз болды.`;
  }
  if (/қауіпсіз|деректер|безопас|данные/.test(m)) {
    return `Деректеріңіз Google серверлерінде (Firebase) сақталады — әлемдегі ең сенімді инфрақұрылымдардың бірі. Әр мектептің деректерін тек өзі көреді.\n\nҚосымша сұрақ болса — ${wa}`;
  }
  return `Рақмет! Бұл сұраққа нақты жауап беру үшін WhatsApp-қа жазғаныңыз дұрыс — тез әрі толық жауап аласыз:\n\n${wa}\n\nНемесе төмендегі дайын сұрақтардың бірін таңдаңыз.`;
}
