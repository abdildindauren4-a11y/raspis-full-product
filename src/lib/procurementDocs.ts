// filepath: src/lib/procurementDocs.ts
// САТЫП АЛУ ҚҰЖАТТАРЫНЫҢ ГЕНЕРАТОРЫ — мектептерге жіберілетін ресми қағаздар,
// ҮШ ТІЛДЕ (қазақ / орыс / ағылшын):
//   1) Техникалық спецификация — ҚР Үкіметінің 06.05.2019 № 261 қаулысындағы
//      типтік нысан бойынша (орысша — ресми эталон);
//   2) Коммерциялық ұсыныс (КП) — стандартты іскерлік нысан.
// Әкімші панелінде тілді таңдап, мектеп атауы мен тарифті толтырып, бір
// батырмамен басып шығаруға (PDF) немесе Word (.doc) күйінде жүктеуге болады.
import { PLANS, LAUNCH_PROMO, formatKzt, effectivePrice, type PlanId } from "@/lib/plans";
import { PAYMENT } from "@/lib/payment";
import { DEFAULT_SIGNATURE } from "@/lib/defaultSignature";
import notoRegularUrl from "@/assets/fonts/NotoSans-Regular.ttf?url";
import notoBoldUrl from "@/assets/fonts/NotoSans-Bold.ttf?url";

export type DocLang = "kk" | "ru" | "en";

// ── ЖК реквизиттері (бір рет толтырылып, сақталады) ──
export interface DocRequisites {
  ipName: string;   // ЖК атауы: ШАМБИЛОВ
  iinBin: string;   // ЖСН/БИН
  address: string;
  iik: string;      // KZ... шот
  bank: string;     // банк атауы
  bik: string;
  kbe: string;      // КБе (бенефициар коды)
  signer: string;   // қол қоюшының аты-жөні
  // Сенімхат (доверенность) негізінде қол қою — иесі емес адам қол қойса
  byProxy?: boolean;
  proxyNo?: string;   // сенімхат №
  proxyDate?: string; // сенімхат күні
  signatureImg?: string;   // ҚОЛДАНЫЛАТЫН қолтаңба (data URL, факсимиле)
  signatures?: string[];   // сақталған қолтаңбалар галереясы (таңдауға)
  // Қолтаңбаны сызыққа дәл орналастыру (әр қол әртүрлі — жылжыту/өлшеу)
  sigDX?: number;  // көлденең ығысу (px)
  sigDY?: number;  // тік ығысу (px, оң = төмен)
  sigW?: number;   // қолтаңба ені (px)
}

// Әдепкі реквизиттер — ЖК ШАМБИЛОВ (құжаттарда автоматты шығады; завуч
// қаласа әкімші панелінен өзгерте алады, өзгеріс браузерде сақталады)
const DEFAULT_REQ: DocRequisites = {
  ipName: "ШАМБИЛОВ",
  iinBin: "020601500628",
  address: "Кызылординская обл., г. Кызылорда, ул. Абая Кунанбаева, дом 21/7",
  iik: "KZ14722S000052398311",
  bank: 'АО "Kaspi Bank"',
  bik: "CASPKZKA",
  kbe: "19",
  signer: "",
  byProxy: false,
  proxyNo: "",
  proxyDate: "",
  signatureImg: DEFAULT_SIGNATURE,
  signatures: [DEFAULT_SIGNATURE],
  sigDX: 0,
  sigDY: 0,
  sigW: 180,
};

const REQ_KEY = "raspis-doc-requisites";
export function loadRequisites(): DocRequisites {
  try {
    const saved = JSON.parse(localStorage.getItem(REQ_KEY) || "{}") as Partial<DocRequisites>;
    // Бос жолдар (мыс. толтырылмаған реквизит) әдепкіні баспайды; логикалық
    // (byProxy) және сурет (signatureImg) мәндері сақталады
    const keep = Object.fromEntries(Object.entries(saved).filter(([, v]) =>
      typeof v === "boolean" || typeof v === "number" || Array.isArray(v) || (typeof v === "string" && v.trim() !== "")));
    return { ...DEFAULT_REQ, ...keep };
  } catch {
    return { ...DEFAULT_REQ };
  }
}
export function saveRequisites(r: DocRequisites) {
  try { localStorage.setItem(REQ_KEY, JSON.stringify(r)); } catch { /* толса — елеусіз */ }
}

// ── Құжат параметрлері (әр мектепке жеке) ──
export interface DocParams {
  schoolName: string;
  directorName: string;
  plan: PlanId;
  price: number;
  outNo: string;
  date: string;
}

const fill = (v: string, w = 20) => (v && v.trim() ? v : "_".repeat(w));

// «Сенімхат негізінде» деген тіркес — иесі емес адам қол қойғанда
function proxyPhrase(req: DocRequisites, lang: DocLang): string {
  if (!req.byProxy) return "";
  const no = fill(req.proxyNo || "", 6);
  const dt = fill(req.proxyDate || "", 14);
  const who = fill(req.signer, 24);
  if (lang === "en") return `, represented by ${who}, acting under power of attorney No. ${no} dated ${dt}`;
  if (lang === "kk") return ` атынан ${who}, № ${no}, ${dt} сенімхат негізінде әрекет етуші`;
  return ` в лице ${who}, действующего на основании доверенности № ${no} от ${dt}`;
}

// Қол қою блогы — иесінің немесе сенімхаты бар өкілдің; қолтаңба суреті болса,
// оны сызық үстіне орналастырады (факсимиле). Барлық құжатқа ортақ.
function signBlock(req: DocRequisites, lang: DocLang, supplierWord: string, signatureWord: string, fioWord: string, dateStamp: string, stamp: string): string {
  const proxy = proxyPhrase(req, lang);
  const heading = `${supplierWord} «${fill(req.ipName)}»${proxy}`;
  // Қолтаңба суреті — сызық үстіне отырады; орны/өлшемі баптаулардан
  // (әр қол әртүрлі болғандықтан жылжытуға/өлшеуге болады).
  const dx = req.sigDX ?? 0, dy = req.sigDY ?? 0, sw = req.sigW ?? 180;
  const sig = req.signatureImg
    ? `<img src="${req.signatureImg}" alt="" style="position:absolute; left:calc(50% + ${dx}px); transform:translateX(-50%); bottom:${-11 + dy}px; width:${sw}px; height:auto; max-height:80px; object-fit:contain;">`
    : "";
  // Кесте: 1-баған — қолтаңба сызығы + «(подпись)»; 2-баған — «/ Ф.И.О. /» +
  // «(Ф.И.О.)». Жапсырмалар өз сызықтарының дәл астында тұрады.
  return `<div class="sign">
    ${heading}<br><br>
    <table style="border:none; width:auto; border-collapse:collapse;">
      <tr>
        <td style="border:none; padding:0; position:relative; width:210px; text-align:center; line-height:1;">${sig}______________________</td>
        <td style="border:none; padding:0 8px; vertical-align:bottom;">/</td>
        <td style="border:none; padding:0; min-width:210px; text-align:center; vertical-align:bottom;">${fill(req.signer, 28)}</td>
        <td style="border:none; padding:0 0 0 8px; vertical-align:bottom;">/</td>
      </tr>
      <tr style="font-size:10.5pt; color:#000;">
        <td style="border:none; padding:2px 0 0; text-align:center;">${signatureWord}</td>
        <td style="border:none;"></td>
        <td style="border:none; padding:2px 0 0; text-align:center;">${fioWord}</td>
        <td style="border:none;"></td>
      </tr>
    </table>
    <br>
    ${dateStamp}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${stamp}
  </div>`;
}

// Ай атаулары (күн жолын құру) — AdminPage осы арқылы тілге сай күн жасайды
const MONTH_NAMES: Record<DocLang, string[]> = {
  kk: ["қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым", "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"],
  ru: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
export function docDateStr(lang: DocLang, d = new Date()): string {
  const day = d.getDate(), mo = MONTH_NAMES[lang][d.getMonth()], y = d.getFullYear();
  if (lang === "en") return `${mo} ${day}, ${y}`;
  if (lang === "kk") return `${y} жылғы «${day}» ${mo}`;
  return `«${day}» ${mo} ${y} г.`;
}

// Тариф мерзімі — тілге сай
const DURATION: Record<DocLang, Record<PlanId, string>> = {
  kk: { free: "—", pro: "6 (алты) ай", premium: "36 ай (3 жыл)", super: "84 ай (7 жыл)" },
  ru: { free: "—", pro: "6 (шесть) месяцев", premium: "36 месяцев (3 года)", super: "84 месяца (7 лет)" },
  en: { free: "—", pro: "6 (six) months", premium: "36 months (3 years)", super: "84 months (7 years)" },
};
const MONTHS_WARR: Record<DocLang, Record<PlanId, string>> = {
  kk: { free: "—", pro: "6 ай", premium: "36 ай", super: "84 ай" },
  ru: { free: "—", pro: "6 месяцев", premium: "36 месяцев", super: "84 месяца" },
  en: { free: "—", pro: "6 months", premium: "36 months", super: "84 months" },
};

// Ортақ CSS (Times New Roman, A4, ресми түр)
// @page margin: 0 — браузер басып шығарғанда жиекке URL/күн/уақыт колонтитулын
// қоспауы үшін (олар жиек аймағына салынады). Құжаттың нақты жиегін body
// padding береді. Осылай жүктелген PDF-те артық сайт сілтемесі/күні болмайды.
const BASE_CSS = `
  @page { size: A4; margin: 0; }
  body { font-family: "Times New Roman", "Liberation Serif", serif; font-size: 12pt; color: #000; line-height: 1.45; margin: 24px; }
  @media print { body { margin: 0; padding: 18mm 15mm 18mm 22mm; } }
  table { border-collapse: collapse; width: 100%; font-size: 11.5pt; }
  ul { margin: 4px 0 6px 18px; padding: 0; }
  li { margin-bottom: 3px; }
  .sign { margin-top: 36px; }
`;

// ═══ Барлық мәтін жолдары — тіл бойынша ═══
interface TS { // техникалық спецификация жолдары
  docTitle: string; corner: string; h1: string; sub: string;
  purchaseNo: string; purchaseName: string; purchaseNameVal: string; customer: string;
  kLotNo: string; kLotName: string; kServiceName: string; kOrigin: string; originVal: string;
  kMaker: string; kYear: string; yearVal: string; kWarranty: string; warrTail: string;
  kDesc: string; serviceNameVal: (planName: string, dur: string) => string;
  sec1: string; sec2: string; sec3: string; sec4: string; sec5: string;
  func: string[]; tech: string[]; qual: string[];
  expl: (planName: string, quick: number, deep: number, dur: string) => string[];
  accomp: string[];
  kOther: string; otherVal: string;
  supplier: string; signatureWord: string; fioWord: string; dateStamp: string; stamp: string;
}
interface KP { // коммерциялық ұсыныс жолдары
  docTitle: string; h1: string;
  outNo: (no: string, date: string) => string; toDirector: string;
  intro: string;
  thNo: string; thName: string; thUnit: string; thQty: string; thPrice: string; thSum: string;
  rowName: (planName: string, dur: string) => string; unitVal: string; totalWord: string;
  promoNote: (percent: number, full: string) => string; noVatNote: string;
  includedTitle: string; included: string[];
  payTitle: string; payVal: string; termTitle: string; termVal: string; validTitle: string; validVal: string;
  supplier: string; signatureWord: string; fioWord: string; dateStamp: string; stamp: string;
}

const SITE = "raspis-full-product-ug2s.vercel.app";

const TS_STR: Record<DocLang, TS> = {
  ru: {
    docTitle: "Техническая спецификация",
    corner: "Приложение 2<br>к постановлению Правительства<br>Республики Казахстан<br>от «6» мая 2019 года № 261<br><br>Приложение 3<br>к Типовой конкурсной документации",
    h1: "Техническая спецификация закупаемых услуг",
    sub: "(представляется потенциальным поставщиком на каждый лот в отдельности)",
    purchaseNo: "№ закупки (конкурса)", purchaseName: "Наименование закупки:",
    purchaseNameVal: "Услуги по предоставлению доступа к программному обеспечению для автоматизированного составления школьного расписания",
    customer: "Заказчик:",
    kLotNo: "№ лота", kLotName: "Наименование лота",
    kServiceName: "Наименование услуги (с указанием марки, модели, типа и/или товарного знака либо знака обслуживания и т.д.)",
    kOrigin: "Страна происхождения", originVal: "Республика Казахстан",
    kMaker: "Производитель (поставщик)", kYear: "Год выпуска (версия)",
    yearVal: "2026 год (веб-платформа, обновления предоставляются автоматически в течение всего срока доступа)",
    kWarranty: "Гарантийный срок (при наличии) (в месяцах)",
    warrTail: " — техническая поддержка и обновления включены в стоимость на весь срок доступа",
    kDesc: "Описание функциональных, технических, качественных и эксплуатационных характеристик",
    serviceNameVal: (n, d) => `Предоставление доступа к автоматизированной веб-системе составления школьного расписания <b>«РАСПИС»</b> (${SITE}), тарифный план <b>«${n}»</b>, срок доступа — <b>${d}</b>`,
    sec1: "1. Функциональные характеристики:", sec2: "2. Технические характеристики:",
    sec3: "3. Качественные характеристики:", sec4: "4. Эксплуатационные характеристики:", sec5: "5. Сопутствующие услуги:",
    func: [
      "автоматическая генерация недельного расписания уроков без конфликтов (учитель/класс/кабинет) за секунды;",
      "соблюдение 18 жёстких правил составления и норм СанПиН: дневные лимиты уроков и баллов учебной нагрузки, кривая трудности, размещение сложных предметов (математика, алгебра, геометрия — в первых 4 уроках);",
      "режим «глубокого поиска»: построение до 300 вариантов расписания и автоматический выбор лучшего;",
      "режим «умного обновления»: при изменениях пересобираются только затронутые классы, расписание остальных сохраняется;",
      "адаптивный алгоритм «Хамелеон»: завуч сам включает, отключает и настраивает правила составления под свою школу, в том числе через ИИ-помощника голосом/текстом;",
      "гибкие ограничения по времени: запрет постановки конкретного предмета или учителя на выбранные дни и уроки в один клик по недельной сетке;",
      "ручная корректировка готового расписания перетаскиванием с автоматической проверкой правил;",
      "поддержка деления классов на группы, сдвоенных уроков, двух смен, закреплённых кабинетов начальных классов, классного часа;",
      "модуль замен отсутствующих учителей с автоматическим подбором;",
      "импорт данных из Excel по шаблону; экспорт в Excel и PDF, печать по классам, учителям и кабинетам;",
      "отчёт качества по каждому классу, стресс-тесты, QR-сертификат качества;",
      "хранение версий расписания с возможностью возврата и сравнения;",
      "интерфейс и экспортируемые документы на казахском, русском и английском языках.",
    ],
    tech: [
      "веб-приложение: работает в браузере (Chrome, Safari, Edge и др.) на компьютере, планшете и смартфоне; установка ПО не требуется;",
      "авторизация через защищённый Google-аккаунт;",
      "облачное хранение данных на инфраструктуре Google (Firebase) с разграничением доступа: данные школы доступны только её учётной записи;",
      "доступ с любого устройства, автоматическая синхронизация.",
    ],
    qual: [
      "каждое сформированное расписание автоматически проходит контрольные стресс-тесты (отсутствие конфликтов, «окон», соответствие нормам);",
      "система заранее диагностирует ошибки исходных данных и указывает способ их исправления.",
    ],
    expl: (n, q, d, dur) => [
      `тарифный план «${n}»: ${q} быстрых генераций и ${d} глубоких поисков; все функции системы открыты;`,
      `срок доступа — ${dur} с даты активации.`,
    ],
    accomp: [
      "демонстрация системы и обучение ответственного сотрудника (завуча);",
      "помощь при первичном вводе данных школы;",
      "руководство пользователя (37 страниц);",
      "консультационная поддержка по WhatsApp и во встроенном чате на весь срок доступа.",
    ],
    kOther: "Иные сведения, подтверждающие соответствие услуги требованиям конкурсной документации (технической спецификации)",
    otherVal: "Услуга оказывается дистанционно, в электронной форме. Доступ предоставляется в течение 1 (одного) рабочего дня после оплаты. Национальные и межгосударственные стандарты на данный вид услуг отсутствуют; в связи с этим указаны требуемые характеристики.",
    supplier: "Поставщик: ИП", signatureWord: "(подпись)", fioWord: "(Ф.И.О.)",
    dateStamp: "«____» ______________ 2026 г.", stamp: "М.П.",
  },
  kk: {
    docTitle: "Техникалық ерекшелік",
    corner: "Қазақстан Республикасы<br>Үкіметінің 2019 жылғы<br>«6» мамырдағы № 261<br>қаулысына 2-қосымша<br><br>Үлгілік конкурстық<br>құжаттамаға 3-қосымша",
    h1: "Сатып алынатын қызметтердің техникалық ерекшелігі",
    sub: "(әлеуетті өнім беруші әр лот бойынша жеке ұсынады)",
    purchaseNo: "Сатып алу (конкурс) №", purchaseName: "Сатып алу атауы:",
    purchaseNameVal: "Мектеп сабақ кестесін автоматтандырылған түрде құруға арналған бағдарламалық қамтамасыз етуге қол жеткізу қызметтері",
    customer: "Тапсырыс беруші:",
    kLotNo: "Лот №", kLotName: "Лот атауы",
    kServiceName: "Қызмет атауы (маркасы, моделі, түрі және/немесе тауар белгісі көрсетілген)",
    kOrigin: "Шыққан елі", originVal: "Қазақстан Республикасы",
    kMaker: "Өндіруші (өнім беруші)", kYear: "Шығарылған жылы (нұсқасы)",
    yearVal: "2026 жыл (веб-платформа, жаңартулар қолжетімділік мерзімі бойы автоматты беріледі)",
    kWarranty: "Кепілдік мерзімі (болса) (аймен)",
    warrTail: " — техникалық қолдау мен жаңартулар қолжетімділіктің бүкіл мерзіміне бағаға кіреді",
    kDesc: "Функционалдық, техникалық, сапалық және пайдалану сипаттамаларының сипаты",
    serviceNameVal: (n, d) => `Мектеп сабақ кестесін автоматтандырылған <b>«РАСПИС»</b> веб-жүйесіне қол жеткізу (${SITE}), тарифтік жоспар <b>«${n}»</b>, қолжетімділік мерзімі — <b>${d}</b>`,
    sec1: "1. Функционалдық сипаттамалары:", sec2: "2. Техникалық сипаттамалары:",
    sec3: "3. Сапалық сипаттамалары:", sec4: "4. Пайдалану сипаттамалары:", sec5: "5. Ілеспе қызметтер:",
    func: [
      "апталық сабақ кестесін секундтар ішінде қақтығыссыз (мұғалім/сынып/кабинет) автоматты құру;",
      "18 қатаң ереже мен СанПиН нормаларын сақтау: күндік сабақ пен оқу жүктемесі баллдарының лимиттері, қиындық қисығы, күрделі пәндерді (математика, алгебра, геометрия — алғашқы 4 сабақта) орналастыру;",
      "«терең іздеу» режимі: кестенің 300-ге дейін нұсқасын құрып, ең жақсысын автоматты таңдау;",
      "«ақылды жаңарту» режимі: өзгерістер болғанда тек өзгерген сыныптар қайта құрылады, қалғаны сақталады;",
      "бейімделгіш «Хамелеон» алгоритмі: завуч ережелерді өз мектебіне қарай өзі қосады, өшіреді, баптайды, оның ішінде ЖИ-көмекшісіне сөзбен/мәтінмен айтып;",
      "икемді уақыт шектеулері: белгілі бір пәнді немесе мұғалімді таңдалған күн мен сабаққа қоюға тыйымды апта торынан бір басумен салу;",
      "дайын кестені қолмен жылжытып түзету, ережелер автоматты тексеріледі;",
      "сыныпты топқа бөлу, қос сабақ, екі ауысым, бастауыш сыныптардың бекітілген кабинеті, сынып сағатын қолдау;",
      "жоқ мұғалімдерді автоматты іріктейтін алмастыру модулі;",
      "деректерді Excel үлгісінен импорттау; Excel және PDF экспорты, сынып/мұғалім/кабинет бойынша басып шығару;",
      "әр сынып бойынша сапа есебі, стресс-тесттер, сапаның QR-сертификаты;",
      "кесте нұсқаларын сақтау, қайтару және салыстыру мүмкіндігі;",
      "интерфейс пен экспортталатын құжаттар қазақ, орыс және ағылшын тілдерінде.",
    ],
    tech: [
      "веб-қосымша: браузерде (Chrome, Safari, Edge т.б.) компьютерде, планшетте, смартфонда жұмыс істейді; бағдарлама орнату қажет емес;",
      "қорғалған Google аккаунты арқылы авторизация;",
      "деректер Google (Firebase) инфрақұрылымында бұлтта сақталады, қолжетімділік бөлінген: мектеп деректері тек өз тіркелгісіне қолжетімді;",
      "кез келген құрылғыдан қолжетімділік, автоматты синхрондау.",
    ],
    qual: [
      "әр құрылған кесте автоматты түрде бақылау стресс-тесттерінен өтеді (қақтығыс, «терезе» жоқтығы, нормаларға сәйкестік);",
      "жүйе бастапқы деректер қателерін алдын ала анықтап, түзету жолын көрсетеді.",
    ],
    expl: (n, q, d, dur) => [
      `«${n}» тарифтік жоспары: ${q} жылдам генерация және ${d} терең іздеу; жүйенің барлық функциясы ашық;`,
      `қолжетімділік мерзімі — белсендіру күнінен бастап ${dur}.`,
    ],
    accomp: [
      "жүйені көрсету және жауапты қызметкерді (завучты) оқыту;",
      "мектеп деректерін алғаш енгізуге көмек;",
      "пайдаланушы нұсқаулығы (37 бет);",
      "WhatsApp пен кірістірілген чат арқылы қолжетімділіктің бүкіл мерзіміне кеңес беру.",
    ],
    kOther: "Қызметтің конкурстық құжаттама (техникалық ерекшелік) талаптарына сәйкестігін растайтын өзге де мәліметтер",
    otherVal: "Қызмет қашықтан, электрондық түрде көрсетіледі. Қол жеткізу төлемнен кейін 1 (бір) жұмыс күні ішінде беріледі. Осы қызмет түріне ұлттық және мемлекетаралық стандарттар жоқ; сондықтан талап етілетін сипаттамалар көрсетілген.",
    supplier: "Өнім беруші: ЖК", signatureWord: "(қолы)", fioWord: "(Т.А.Ә.)",
    dateStamp: "«____» ______________ 2026 ж.", stamp: "М.О.",
  },
  en: {
    docTitle: "Technical Specification",
    corner: "Appendix 2<br>to the Resolution of the Government<br>of the Republic of Kazakhstan<br>dated May 6, 2019 No. 261<br><br>Appendix 3<br>to the Model Tender Documentation",
    h1: "Technical specification of the services procured",
    sub: "(submitted by the potential supplier for each lot separately)",
    purchaseNo: "Procurement (tender) No.", purchaseName: "Procurement name:",
    purchaseNameVal: "Services providing access to software for automated composition of school timetables",
    customer: "Customer:",
    kLotNo: "Lot No.", kLotName: "Lot name",
    kServiceName: "Service name (indicating brand, model, type and/or trademark or service mark, etc.)",
    kOrigin: "Country of origin", originVal: "Republic of Kazakhstan",
    kMaker: "Manufacturer (supplier)", kYear: "Year of release (version)",
    yearVal: "2026 (web platform; updates are provided automatically throughout the access period)",
    kWarranty: "Warranty period (if any) (in months)",
    warrTail: " — technical support and updates are included in the price for the entire access period",
    kDesc: "Description of functional, technical, quality and operational characteristics",
    serviceNameVal: (n, d) => `Access to the automated web system for composing school timetables <b>“RASPIS”</b> (${SITE}), plan <b>“${n}”</b>, access period — <b>${d}</b>`,
    sec1: "1. Functional characteristics:", sec2: "2. Technical characteristics:",
    sec3: "3. Quality characteristics:", sec4: "4. Operational characteristics:", sec5: "5. Accompanying services:",
    func: [
      "automatic generation of a conflict-free weekly timetable (teacher/class/room) within seconds;",
      "compliance with 18 hard composition rules and SanPiN norms: daily lesson and workload-score limits, difficulty curve, placement of hard subjects (mathematics, algebra, geometry — within the first 4 lessons);",
      "“deep search” mode: building up to 300 timetable variants and automatically selecting the best;",
      "“smart update” mode: on changes, only affected classes are rebuilt while the rest is preserved;",
      "adaptive “Chameleon” engine: the head teacher enables, disables and configures composition rules for their school, including via an AI assistant by voice/text;",
      "flexible time restrictions: ban a specific subject or teacher from chosen days and lessons with one click on the weekly grid;",
      "manual adjustment of the finished timetable by drag-and-drop with automatic rule checking;",
      "support for splitting classes into groups, double lessons, two shifts, fixed primary-class rooms, and the homeroom period;",
      "substitute-teacher module with automatic matching;",
      "data import from an Excel template; export to Excel and PDF, printing by class, teacher and room;",
      "quality report per class, stress tests, quality QR certificate;",
      "timetable version history with rollback and comparison;",
      "interface and exported documents in Kazakh, Russian and English.",
    ],
    tech: [
      "web application: runs in a browser (Chrome, Safari, Edge, etc.) on a computer, tablet and smartphone; no software installation required;",
      "authorization via a secure Google account;",
      "cloud data storage on Google (Firebase) infrastructure with access separation: a school's data is available only to its own account;",
      "access from any device, automatic synchronization.",
    ],
    qual: [
      "every composed timetable automatically passes control stress tests (no conflicts, no “gaps”, compliance with norms);",
      "the system diagnoses input-data errors in advance and indicates how to fix them.",
    ],
    expl: (n, q, d, dur) => [
      `plan “${n}”: ${q} quick generations and ${d} deep searches; all system features are unlocked;`,
      `access period — ${dur} from the activation date.`,
    ],
    accomp: [
      "system demonstration and training of the responsible employee (head teacher);",
      "assistance with initial entry of school data;",
      "user manual (37 pages);",
      "consulting support via WhatsApp and the built-in chat for the entire access period.",
    ],
    kOther: "Other information confirming the service's compliance with the tender documentation (technical specification) requirements",
    otherVal: "The service is provided remotely, in electronic form. Access is granted within 1 (one) business day after payment. There are no national or interstate standards for this type of service; therefore the required characteristics are specified.",
    supplier: "Supplier: IE", signatureWord: "(signature)", fioWord: "(full name)",
    dateStamp: "“____” ______________ 2026", stamp: "Seal",
  },
};

const KP_STR: Record<DocLang, KP> = {
  ru: {
    docTitle: "Коммерческое предложение", h1: "КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ",
    outNo: (no, date) => `Исх. № ${no} от ${date}`, toDirector: "Директору",
    intro: "Настоящим предлагаем Вам услуги по предоставлению доступа к автоматизированной веб-системе составления школьного расписания <b>«РАСПИС»</b> — казахстанской разработке, формирующей недельное расписание уроков без конфликтов за секунды, с соблюдением норм СанПиН и педагогических требований.",
    thNo: "№", thName: "Наименование услуги", thUnit: "Ед. изм.", thQty: "Кол-во", thPrice: "Цена, тенге", thSum: "Сумма, тенге",
    rowName: (n, d) => `Предоставление доступа к системе автоматизированного составления школьного расписания «РАСПИС», тарифный план «${n}», срок доступа ${d} (обновления, техническая поддержка, обучение и руководство пользователя включены)`,
    unitVal: "услуга", totalWord: "Итого:",
    promoNote: (p, full) => `Цена указана с учётом скидки ${p}% в рамках акции для первых школ (полная стоимость — ${full} тенге). НДС не предусмотрен (поставщик не является плательщиком НДС).`,
    noVatNote: "НДС не предусмотрен (поставщик не является плательщиком НДС).",
    includedTitle: "В стоимость включено:",
    included: [
      "автоматическая генерация расписания без конфликтов, глубокий поиск лучшего варианта, «умное обновление» при изменениях в течение учебного года;",
      "адаптивный алгоритм «Хамелеон» с настройкой правил под школу и ИИ-помощником;",
      "импорт из Excel, экспорт в Excel/PDF, печать, отчёт качества и QR-сертификат;",
      "демонстрация системы, обучение сотрудника, помощь при вводе данных;",
      "руководство пользователя (37 стр.) и поддержка по WhatsApp на весь срок доступа.",
    ],
    payTitle: "Условия оплаты:", payVal: "100% предоплата на расчётный счёт поставщика на основании счёта на оплату.",
    termTitle: "Срок предоставления доступа:", termVal: "в течение 1 (одного) рабочего дня с момента поступления оплаты.",
    validTitle: "Срок действия предложения:", validVal: "30 календарных дней с даты составления.",
    supplier: "ИП", signatureWord: "(подпись)", fioWord: "(Ф.И.О.)",
    dateStamp: "«____» ______________ 2026 г.", stamp: "М.П.",
  },
  kk: {
    docTitle: "Коммерциялық ұсыныс", h1: "КОММЕРЦИЯЛЫҚ ҰСЫНЫС",
    outNo: (no, date) => `Шығыс № ${no}, ${date}`, toDirector: "Директорға",
    intro: "Осы арқылы Сізге мектеп сабақ кестесін автоматтандырылған <b>«РАСПИС»</b> веб-жүйесіне қол жеткізу қызметтерін ұсынамыз — бұл апталық сабақ кестесін секундтар ішінде қақтығыссыз, СанПиН нормалары мен педагогикалық талаптарды сақтай отырып құратын қазақстандық әзірлеме.",
    thNo: "№", thName: "Қызмет атауы", thUnit: "Өлш. бірл.", thQty: "Саны", thPrice: "Бағасы, теңге", thSum: "Сомасы, теңге",
    rowName: (n, d) => `Мектеп сабақ кестесін автоматтандырылған «РАСПИС» жүйесіне қол жеткізу, тарифтік жоспар «${n}», қолжетімділік мерзімі ${d} (жаңартулар, техникалық қолдау, оқыту және пайдаланушы нұсқаулығы қоса берілген)`,
    unitVal: "қызмет", totalWord: "Барлығы:",
    promoNote: (p, full) => `Баға алғашқы мектептерге арналған акция аясында ${p}% жеңілдікпен көрсетілген (толық құны — ${full} теңге). ҚҚС қарастырылмаған (өнім беруші ҚҚС төлеуші емес).`,
    noVatNote: "ҚҚС қарастырылмаған (өнім беруші ҚҚС төлеуші емес).",
    includedTitle: "Бағаға кіреді:",
    included: [
      "қақтығыссыз кестені автоматты құру, ең жақсы нұсқаны терең іздеу, оқу жылы ішіндегі өзгерістерге «ақылды жаңарту»;",
      "ережелерді мектепке баптайтын бейімделгіш «Хамелеон» алгоритмі мен ЖИ-көмекшісі;",
      "Excel-ден импорт, Excel/PDF экспорты, басып шығару, сапа есебі мен QR-сертификат;",
      "жүйені көрсету, қызметкерді оқыту, деректер енгізуге көмек;",
      "пайдаланушы нұсқаулығы (37 бет) және қолжетімділіктің бүкіл мерзіміне WhatsApp қолдауы.",
    ],
    payTitle: "Төлем шарттары:", payVal: "төлем шоты негізінде өнім берушінің есеп шотына 100% алдын ала төлем.",
    termTitle: "Қол жеткізу мерзімі:", termVal: "төлем түскен сәттен бастап 1 (бір) жұмыс күні ішінде.",
    validTitle: "Ұсыныстың қолданылу мерзімі:", validVal: "жасалған күнінен бастап 30 күнтізбелік күн.",
    supplier: "ЖК", signatureWord: "(қолы)", fioWord: "(Т.А.Ә.)",
    dateStamp: "«____» ______________ 2026 ж.", stamp: "М.О.",
  },
  en: {
    docTitle: "Commercial Offer", h1: "COMMERCIAL OFFER",
    outNo: (no, date) => `Ref. No. ${no} dated ${date}`, toDirector: "To the Director of",
    intro: "We hereby offer you access to the automated web system for composing school timetables <b>“RASPIS”</b> — a Kazakhstani product that builds a conflict-free weekly timetable within seconds while complying with SanPiN norms and pedagogical requirements.",
    thNo: "No.", thName: "Service name", thUnit: "Unit", thQty: "Qty", thPrice: "Price, KZT", thSum: "Amount, KZT",
    rowName: (n, d) => `Access to the automated school-timetable system “RASPIS”, plan “${n}”, access period ${d} (updates, technical support, training and user manual included)`,
    unitVal: "service", totalWord: "Total:",
    promoNote: (p, full) => `The price includes a ${p}% discount under the early-schools promotion (full price — ${full} KZT). VAT not applicable (the supplier is not a VAT payer).`,
    noVatNote: "VAT not applicable (the supplier is not a VAT payer).",
    includedTitle: "The price includes:",
    included: [
      "automatic conflict-free timetable generation, deep search for the best variant, “smart update” on changes during the school year;",
      "the adaptive “Chameleon” engine with per-school rule configuration and an AI assistant;",
      "import from Excel, export to Excel/PDF, printing, quality report and QR certificate;",
      "system demonstration, staff training, assistance with data entry;",
      "user manual (37 pages) and WhatsApp support for the entire access period.",
    ],
    payTitle: "Payment terms:", payVal: "100% prepayment to the supplier's settlement account based on an invoice.",
    termTitle: "Access provision term:", termVal: "within 1 (one) business day from receipt of payment.",
    validTitle: "Offer validity:", validVal: "30 calendar days from the date of issue.",
    supplier: "IE", signatureWord: "(signature)", fioWord: "(full name)",
    dateStamp: "“____” ______________ 2026", stamp: "Seal",
  },
};

// ── 1. ТЕХНИКАЛЫҚ СПЕЦИФИКАЦИЯ ──
export function tehSpecHtml(req: DocRequisites, p: DocParams, lang: DocLang = "ru"): string {
  const plan = PLANS[p.plan];
  const s = TS_STR[lang];
  const li = (arr: string[]) => arr.map((x) => `<li>${x}</li>`).join("");
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><title>${s.docTitle}</title><style>${BASE_CSS}
  .corner { text-align: right; font-size: 11pt; line-height: 1.35; }
  h1 { font-size: 13pt; text-align: center; font-weight: bold; margin: 22px 0 4px; }
  .sub { text-align: center; font-size: 11pt; margin: 0 0 16px; }
  td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
  td.k { width: 38%; }
  .sec { font-weight: bold; }
  </style></head><body>
  <div class="corner">${s.corner}</div>
  <h1>${s.h1}</h1>
  <p class="sub">${s.sub}</p>
  <p>${s.purchaseNo} ___________________________________<br>
  ${s.purchaseName} <b>${s.purchaseNameVal}</b><br>
  ${s.customer} <b>${fill(p.schoolName, 40)}</b></p>
  <table>
    <tr><td class="k">${s.kLotNo}</td><td>____________</td></tr>
    <tr><td class="k">${s.kLotName}</td><td>${s.purchaseNameVal}</td></tr>
    <tr><td class="k">${s.kServiceName}</td><td>${s.serviceNameVal(plan.name, DURATION[lang][p.plan])}</td></tr>
    <tr><td class="k">${s.kOrigin}</td><td>${s.originVal}</td></tr>
    <tr><td class="k">${s.kMaker}</td><td>${s.supplier.split(":").pop()!.trim()} «${fill(req.ipName)}», ${lang === "en" ? "BIN" : lang === "kk" ? "ЖСН/БСН" : "ИИН/БИН"} ${fill(req.iinBin)}</td></tr>
    <tr><td class="k">${s.kYear}</td><td>${s.yearVal}</td></tr>
    <tr><td class="k">${s.kWarranty}</td><td>${MONTHS_WARR[lang][p.plan]}${s.warrTail}</td></tr>
    <tr><td class="k">${s.kDesc}</td><td>
      <span class="sec">${s.sec1}</span><ul>${li(s.func)}</ul>
      <span class="sec">${s.sec2}</span><ul>${li(s.tech)}</ul>
      <span class="sec">${s.sec3}</span><ul>${li(s.qual)}</ul>
      <span class="sec">${s.sec4}</span><ul>${li(s.expl(plan.name, plan.quickGenerations, plan.deepSearches, DURATION[lang][p.plan]))}</ul>
      <span class="sec">${s.sec5}</span><ul>${li(s.accomp)}</ul>
    </td></tr>
    <tr><td class="k">${s.kOther}</td><td>${s.otherVal}</td></tr>
  </table>
  ${signBlock(req, lang, s.supplier, s.signatureWord, s.fioWord, s.dateStamp, s.stamp)}
  </body></html>`;
}

// ── 2. КОММЕРЦИЯЛЫҚ ҰСЫНЫС ──
export function kpHtml(req: DocRequisites, p: DocParams, lang: DocLang = "ru"): string {
  const plan = PLANS[p.plan];
  const s = KP_STR[lang];
  const priceStr = formatKzt(p.price).replace(" ₸", "");
  const isPromo = LAUNCH_PROMO.active && p.price === effectivePrice(plan.price, true) && plan.price > 0;
  const li = (arr: string[]) => arr.map((x) => `<li>${x}</li>`).join("");
  const iinLbl = lang === "en" ? "BIN" : lang === "kk" ? "ЖСН/БСН" : "ИИН/БИН";
  const addrLbl = lang === "en" ? "Address" : lang === "kk" ? "Мекенжай" : "Адрес";
  const iikLbl = lang === "en" ? "Account" : "ИИК";
  const inLbl = lang === "en" ? "at" : lang === "kk" ? "—" : "в";
  const bikLbl = lang === "en" ? "BIC" : "БИК";
  const kbeLbl = lang === "en" ? "BenCode" : "КБе";
  const telLbl = lang === "en" ? "Tel." : "Тел.";
  const siteLbl = lang === "en" ? "Web" : "Сайт";
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><title>${s.docTitle}</title><style>${BASE_CSS}
  body { line-height: 1.4; }
  .head { border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 6px; }
  .head b { font-size: 15pt; color: #1e3a5f; letter-spacing: 1px; }
  .head .req { font-size: 10.5pt; line-height: 1.35; margin-top: 3px; }
  .to { text-align: right; margin: 12px 0 16px; }
  h1 { font-size: 14pt; text-align: center; font-weight: bold; margin: 6px 0 12px; letter-spacing: .5px; }
  th, td { border: 1px solid #000; padding: 5px 8px; vertical-align: top; }
  th { font-weight: bold; text-align: center; background: #f2f2f2; }
  td.c { text-align: center; } td.r { text-align: right; }
  .cond p { margin: 3px 0; }
  .cond ul { margin: 3px 0 5px 18px; }
  p { margin: 8px 0; }
  /* Қол қою блогы бір бетте бөлінбей тұрсын әрі аса төмен тұрмасын */
  .sign { margin-top: 22px; page-break-inside: avoid; }
  </style></head><body>
  <div class="head"><b>${s.supplier} «${fill(req.ipName)}»</b>
    <div class="req">${iinLbl}: ${fill(req.iinBin)} · ${addrLbl}: ${fill(req.address, 40)}<br>
    ${iikLbl}: ${fill(req.iik, 24)} ${inLbl} ${fill(req.bank, 16)}, ${bikLbl}: ${fill(req.bik, 12)}, ${kbeLbl}: ${fill(req.kbe, 4)}<br>
    ${telLbl}: ${PAYMENT.kaspiPhone} · ${siteLbl}: ${SITE}</div></div>
  <p style="font-size:11pt">${s.outNo(fill(p.outNo, 6), fill(p.date, 26))}</p>
  <div class="to">${s.toDirector}<br>${fill(p.schoolName, 40)}<br>${fill(p.directorName, 32)}</div>
  <h1>${s.h1}</h1>
  <p>${s.intro}</p>
  <table>
    <tr><th style="width:6%">${s.thNo}</th><th>${s.thName}</th><th style="width:9%">${s.thUnit}</th><th style="width:9%">${s.thQty}</th><th style="width:15%">${s.thPrice}</th><th style="width:15%">${s.thSum}</th></tr>
    <tr><td class="c">1</td>
      <td>${s.rowName(plan.name, DURATION[lang][p.plan])}</td>
      <td class="c">${s.unitVal}</td><td class="c">1</td><td class="r">${priceStr}</td><td class="r">${priceStr}</td></tr>
    <tr><td colspan="5" class="r"><b>${s.totalWord}</b></td><td class="r"><b>${priceStr}</b></td></tr>
  </table>
  <p style="font-size:11pt">${isPromo ? s.promoNote(LAUNCH_PROMO.percent, formatKzt(plan.price).replace(" ₸", "")) : s.noVatNote}</p>
  <div class="cond">
    <p><b>${s.includedTitle}</b></p>
    <ul>${li(s.included)}</ul>
    <p><b>${s.payTitle}</b> ${s.payVal}</p>
    <p><b>${s.termTitle}</b> ${s.termVal}</p>
    <p><b>${s.validTitle}</b> ${s.validVal}</p>
  </div>
  ${signBlock(req, lang, s.supplier, s.signatureWord, s.fioWord, s.dateStamp, s.stamp)}
  </body></html>`;
}

// Жаңа терезеде ашып, баспа диалогын шақыру (PDF етіп сақтауға болады)
export function printDoc(html: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

// Word (.doc) күйінде жүктеу
export function downloadDoc(html: string, filename: string) {
  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════
// НАҚТЫ PDF ГЕНЕРАТОРЫ (jsPDF) — браузердің баспа диалогынсыз.
// Себебі: iOS Safari баспа/PDF-те бетке сайт сілтемесі, күн-уақыт және
// «Стр. X из Y» колонтитулын мәжбүрлеп қосады, оны CSS (@page margin:0)
// арқылы өшіру мүмкін емес. Сондықтан құжатты бірден .pdf файл етіп
// құрастырамыз — ешқандай колонтитул болмайды, әрі бет ажырауын өзіміз
// басқарамыз (қол қою блогы 3-бетке «жетім» болып ауыспайды).
// ═══════════════════════════════════════════════════════════════════

const PDF_FONT = "NotoSansRP";

async function bufToB64(buf: ArrayBuffer): Promise<string> {
  let bin = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}
let pdfFontCache: { regular: string; bold: string } | null = null;
async function loadPdfFonts() {
  if (pdfFontCache) return pdfFontCache;
  const [r, b] = await Promise.all([
    fetch(notoRegularUrl).then((x) => x.arrayBuffer()),
    fetch(notoBoldUrl).then((x) => x.arrayBuffer()),
  ]);
  pdfFontCache = { regular: await bufToB64(r), bold: await bufToB64(b) };
  return pdfFontCache;
}
// Суреттің табиғи ара-қатынасын алу (қолтаңбаны бұрмаламай орналастыру үшін)
function imgAspect(dataUrl: string): Promise<number> {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im.naturalHeight / im.naturalWidth || 0.3);
    im.onerror = () => res(0.3);
    im.src = dataUrl;
  });
}

// «<b>…</b>» белгісін сегменттерге бөлу (қалған тегтер алынып тасталады)
function parseRich(html: string): { text: string; bold: boolean }[] {
  const out: { text: string; bold: boolean }[] = [];
  const re = /<b>([\s\S]*?)<\/b>/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m.index > last) out.push({ text: html.slice(last, m.index), bold: false });
    out.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < html.length) out.push({ text: html.slice(last), bold: false });
  return out.map((s) => ({ text: s.text.replace(/<[^>]+>/g, ""), bold: s.bold }));
}

// jsPDF-те инлайн-қалың мәтінді жол-жолға тасымалдап жазу; жаңа y қайтарады
type JsPdf = import("jspdf").jsPDF;
function flowRich(doc: JsPdf, segs: { text: string; bold: boolean }[], x: number, y: number, maxW: number, fontSize: number, lh: number): number {
  doc.setFontSize(fontSize);
  const toks: { t: string; bold: boolean }[] = [];
  segs.forEach((s) => s.text.split(/\s+/).filter(Boolean).forEach((t) => toks.push({ t, bold: s.bold })));
  doc.setFont(PDF_FONT, "normal");
  const spaceW = doc.getTextWidth(" ");
  let cx = x;
  for (const tk of toks) {
    doc.setFont(PDF_FONT, tk.bold ? "bold" : "normal");
    const ww = doc.getTextWidth(tk.t);
    const sw = cx === x ? 0 : spaceW;
    if (cx + sw + ww > x + maxW && cx > x) { y += lh; cx = x; }
    else cx += sw;
    doc.text(tk.t, cx, y);
    cx += ww;
  }
  return y + lh;
}

const RGB_ACCENT: [number, number, number] = [30, 58, 95]; // #1e3a5f

// Ортақ бет параметрлері (A4 portrait, mm)
const PG = { w: 210, h: 297, L: 20, R: 195, top: 16, bottom: 18, cw: 175 };

async function newPdf() {
  const { jsPDF } = await import("jspdf");
  const fonts = await loadPdfFonts();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.addFileToVFS("NotoSans-Regular.ttf", fonts.regular);
  doc.addFont("NotoSans-Regular.ttf", PDF_FONT, "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", fonts.bold);
  doc.addFont("NotoSans-Bold.ttf", PDF_FONT, "bold");
  doc.setFont(PDF_FONT, "normal");
  doc.setTextColor(0, 0, 0);
  return doc;
}

// Қол қою блогын салу (иесінің/сенімхаты бар өкілдің қолы + факсимиле сурет)
async function drawSignBlock(doc: JsPdf, y: number, req: DocRequisites, lang: DocLang, supplierWord: string, signatureWord: string, fioWord: string, dateStamp: string, stamp: string): Promise<number> {
  // Блок биіктігін бағалап, сыймаса — жаңа бет (қол қою «жетім» болмасын)
  const EST = 46;
  if (y + EST > PG.h - PG.bottom) { doc.addPage(); y = PG.top; }
  const { L, R } = PG;
  // Тақырып: «Өнім беруші: ЖК «ШАМБИЛОВ»» + сенімхат тіркесі
  const heading = `${supplierWord} «${fill(req.ipName)}»${proxyPhrase(req, lang)}`;
  y = flowRich(doc, [{ text: heading, bold: false }], L, y, PG.cw, 11, 5) + 6;

  const lineY = y + 6;               // қол қою сызығының деңгейі
  const sigX2 = L + 62;              // сол баған (қолтаңба сызығы) L..sigX2
  doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
  doc.line(L, lineY, sigX2, lineY);
  // Факсимиле сурет — сызық үстіне, ортаға (әр қол әртүрлі — жылжыту/өлшеу)
  if (req.signatureImg) {
    const asp = await imgAspect(req.signatureImg);
    const wmm = Math.min(52, Math.max(24, (req.sigW ?? 180) * 0.24)); // px→mm шамамен
    const hmm = Math.min(18, wmm * asp);
    const cx = (L + sigX2) / 2 + (req.sigDX ?? 0) * 0.22;
    const bottom = lineY - 0.5 + (req.sigDY ?? 0) * 0.22;
    try { doc.addImage(req.signatureImg, "PNG", cx - wmm / 2, bottom - hmm, wmm, hmm, undefined, "FAST"); } catch { /* сурет қатесі — елеусіз */ }
  }
  // Т.А.Ә. бағаны: / signer /
  doc.setFont(PDF_FONT, "normal"); doc.setFontSize(11);
  const slashX = sigX2 + 4;
  doc.text("/", slashX, lineY - 0.5);
  const nameCX = (slashX + 6 + R) / 2;
  doc.text(fill(req.signer, 28), nameCX, lineY - 0.5, { align: "center" });
  doc.text("/", R, lineY - 0.5, { align: "right" });
  // Жапсырмалар — өз сызықтарының астында
  doc.setFontSize(9); doc.setTextColor(0, 0, 0);
  doc.text(signatureWord, (L + sigX2) / 2, lineY + 4.5, { align: "center" });
  doc.text(fioWord, nameCX, lineY + 4.5, { align: "center" });
  // Күн + мөр
  y = lineY + 13;
  doc.setFontSize(11);
  doc.text(dateStamp, L, y);
  doc.text(stamp, L + 92, y);
  return y;
}

// ── КП (коммерциялық ұсыныс) PDF ──
export async function kpPdf(req: DocRequisites, p: DocParams, lang: DocLang = "ru"): Promise<JsPdf> {
  const { autoTable } = await import("jspdf-autotable");
  const plan = PLANS[p.plan];
  const s = KP_STR[lang];
  const doc = await newPdf();
  const { L, R, cw } = PG;
  let y = PG.top + 4;

  // Шапка: жеткізуші атауы + реквизиттер
  doc.setFont(PDF_FONT, "bold"); doc.setFontSize(15); doc.setTextColor(...RGB_ACCENT);
  doc.text(`${s.supplier} «${fill(req.ipName)}»`, L, y);
  doc.setDrawColor(...RGB_ACCENT); doc.setLineWidth(0.6);
  doc.line(L, y + 2.5, R, y + 2.5);
  y += 7;
  doc.setFont(PDF_FONT, "normal"); doc.setFontSize(9.5); doc.setTextColor(0, 0, 0);
  const iinLbl = lang === "en" ? "BIN" : lang === "kk" ? "ЖСН/БСН" : "ИИН/БИН";
  const addrLbl = lang === "en" ? "Address" : lang === "kk" ? "Мекенжай" : "Адрес";
  const iikLbl = lang === "en" ? "Account" : "ИИК";
  const inLbl = lang === "en" ? "at" : lang === "kk" ? "—" : "в";
  const bikLbl = lang === "en" ? "BIC" : "БИК";
  const kbeLbl = lang === "en" ? "BenCode" : "КБе";
  const telLbl = lang === "en" ? "Tel." : "Тел.";
  doc.text(`${iinLbl}: ${fill(req.iinBin)}   ·   ${addrLbl}: ${fill(req.address, 40)}`, L, y); y += 4.4;
  doc.text(`${iikLbl}: ${fill(req.iik, 24)} ${inLbl} ${fill(req.bank, 16)}, ${bikLbl}: ${fill(req.bik, 12)}, ${kbeLbl}: ${fill(req.kbe, 4)}`, L, y); y += 4.4;
  doc.text(`${telLbl}: ${PAYMENT.kaspiPhone}`, L, y); y += 8;

  // Исх. № және күні
  doc.setFontSize(10.5);
  doc.text(s.outNo(fill(p.outNo, 6), fill(p.date, 26)), L, y); y += 7;
  // Директорға (оң жақ)
  doc.setFontSize(11);
  doc.text(s.toDirector, R, y, { align: "right" }); y += 5;
  doc.text(fill(p.schoolName, 40), R, y, { align: "right" }); y += 5;
  doc.text(fill(p.directorName, 32), R, y, { align: "right" }); y += 8;
  // Тақырып
  doc.setFont(PDF_FONT, "bold"); doc.setFontSize(14);
  doc.text(s.h1, PG.w / 2, y, { align: "center" }); y += 8;
  doc.setFont(PDF_FONT, "normal");
  // Кіріспе
  y = flowRich(doc, parseRich(s.intro), L, y, cw, 11, 5) + 3;

  // Кесте
  const priceStr = formatKzt(p.price).replace(" ₸", "");
  autoTable(doc, {
    startY: y,
    margin: { left: L, right: PG.w - R },
    styles: { font: PDF_FONT, fontSize: 9.5, cellPadding: 1.8, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], overflow: "linebreak" },
    headStyles: { font: PDF_FONT, fontStyle: "bold", fillColor: [242, 242, 242], textColor: [0, 0, 0], halign: "center" },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      2: { halign: "center", cellWidth: 16 },
      3: { halign: "center", cellWidth: 13 },
      4: { halign: "right", cellWidth: 27 },
      5: { halign: "right", cellWidth: 27 },
    },
    head: [[s.thNo, s.thName, s.thUnit, s.thQty, s.thPrice, s.thSum]],
    body: [
      ["1", s.rowName(plan.name, DURATION[lang][p.plan]), s.unitVal, "1", priceStr, priceStr],
      [{ content: s.totalWord, colSpan: 5, styles: { halign: "right", fontStyle: "bold" } } as never, { content: priceStr, styles: { halign: "right", fontStyle: "bold" } } as never],
    ],
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  // ҚҚС/акция ескертпесі
  const isPromo = LAUNCH_PROMO.active && p.price === effectivePrice(plan.price, true) && plan.price > 0;
  const note = isPromo ? s.promoNote(LAUNCH_PROMO.percent, formatKzt(plan.price).replace(" ₸", "")) : s.noVatNote;
  y = flowRich(doc, [{ text: note, bold: false }], L, y, cw, 10.5, 4.7) + 3;

  // Бағаға кіреді
  const ensure = (h: number) => { if (y + h > PG.h - PG.bottom) { doc.addPage(); y = PG.top; } };
  doc.setFont(PDF_FONT, "bold"); doc.setFontSize(11);
  ensure(6); doc.text(s.includedTitle, L, y); y += 5.5;
  doc.setFont(PDF_FONT, "normal");
  for (const it of s.included) {
    ensure(5);
    doc.setFontSize(11); doc.text("•", L + 1, y);
    y = flowRich(doc, [{ text: it, bold: false }], L + 6, y, cw - 6, 10.5, 4.7) + 1;
  }
  y += 2;
  // Төлем / мерзім / жарамдылық
  for (const [title, val] of [[s.payTitle, s.payVal], [s.termTitle, s.termVal], [s.validTitle, s.validVal]] as const) {
    ensure(6);
    y = flowRich(doc, [{ text: title, bold: true }, { text: " " + val, bold: false }], L, y, cw, 10.5, 4.7) + 1.5;
  }
  y += 6;

  await drawSignBlock(doc, y, req, lang, s.supplier, s.signatureWord, s.fioWord, s.dateStamp, s.stamp);
  return doc;
}

// ── Техникалық спецификация PDF ──
export async function tehSpecPdf(req: DocRequisites, p: DocParams, lang: DocLang = "ru"): Promise<JsPdf> {
  const { autoTable } = await import("jspdf-autotable");
  const plan = PLANS[p.plan];
  const s = TS_STR[lang];
  const doc = await newPdf();
  const { L, R, cw } = PG;
  let y = PG.top;

  // Оң жақ бұрыш (қосымша сілтемесі)
  doc.setFontSize(10); doc.setFont(PDF_FONT, "normal");
  const corner = s.corner.replace(/<br>/g, "\n").split("\n");
  for (const ln of corner) { doc.text(ln, R, y, { align: "right" }); y += 4.2; }
  y += 4;
  // Тақырып
  doc.setFont(PDF_FONT, "bold"); doc.setFontSize(13);
  doc.text(doc.splitTextToSize(s.h1, cw), PG.w / 2, y, { align: "center" }); y += 6;
  doc.setFont(PDF_FONT, "normal"); doc.setFontSize(10.5);
  doc.text(doc.splitTextToSize(s.sub, cw), PG.w / 2, y, { align: "center" }); y += 8;
  // Сатып алу мәліметтері
  doc.setFontSize(11);
  y = flowRich(doc, [{ text: `${s.purchaseNo} ______________________`, bold: false }], L, y, cw, 11, 5);
  y = flowRich(doc, [{ text: s.purchaseName + " ", bold: false }, { text: s.purchaseNameVal, bold: true }], L, y, cw, 11, 5);
  y = flowRich(doc, [{ text: s.customer + " ", bold: false }, { text: fill(p.schoolName, 40), bold: true }], L, y, cw, 11, 5) + 3;

  // Ұзын сипаттама ұясын мәтін етіп құрастыру (autoTable өзі беттерге бөледі)
  const bullets = (title: string, arr: string[]) => title + "\n" + arr.map((x) => "•  " + x).join("\n");
  const descParts = [
    bullets(s.sec1, s.func), "", bullets(s.sec2, s.tech), "",
    bullets(s.sec3, s.qual), "", bullets(s.sec4, s.expl(plan.name, plan.quickGenerations, plan.deepSearches, DURATION[lang][p.plan])), "",
    bullets(s.sec5, s.accomp),
  ].join("\n");
  const iinLbl = lang === "en" ? "BIN" : lang === "kk" ? "ЖСН/БСН" : "ИИН/БИН";
  const supName = s.supplier.split(":").pop()!.trim();
  const rows: [string, string][] = [
    [s.kLotNo, "____________"],
    [s.kLotName, s.purchaseNameVal],
    [s.kServiceName, s.serviceNameVal(plan.name, DURATION[lang][p.plan]).replace(/<[^>]+>/g, "")],
    [s.kOrigin, s.originVal],
    [s.kMaker, `${supName} «${fill(req.ipName)}», ${iinLbl} ${fill(req.iinBin)}`],
    [s.kYear, s.yearVal],
    [s.kWarranty, `${MONTHS_WARR[lang][p.plan]}${s.warrTail}`],
    [s.kDesc, descParts],
    [s.kOther, s.otherVal],
  ];
  autoTable(doc, {
    startY: y,
    margin: { left: L, right: PG.w - R, top: PG.top, bottom: PG.bottom },
    styles: { font: PDF_FONT, fontSize: 9.5, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], overflow: "linebreak", valign: "top" },
    columnStyles: { 0: { cellWidth: 62, fontStyle: "bold" }, 1: { cellWidth: cw - 62 } },
    body: rows,
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  await drawSignBlock(doc, y, req, lang, s.supplier, s.signatureWord, s.fioWord, s.dateStamp, s.stamp);
  return doc;
}

// Дайын PDF-ті жүктеу
export function savePdf(doc: JsPdf, filename: string) {
  doc.save(filename);
}
