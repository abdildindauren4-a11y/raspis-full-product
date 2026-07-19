// filepath: src/algorithm/engine.ts
// РАСПИС — кесте құру алгоритмі (Greedy + Maximin), жоспар v4.0 бойынша
// Таза TypeScript — React-сыз, Web Worker ішінде орындалады.

export type RoomType = "regular" | "physics" | "chemistry" | "computer" | "gym";

export interface Subject {
  id: string; name: string; score: number; coeff: number;
  ideal: number[]; room: RoomType | null; primaryScore?: number;
  // КАБИНЕТТІК ЖҮЙЕ (settings.cabinetSystem): пән әрдайым осы НАҚТЫ кабинетте
  // өтеді (әр пәннің өз кабинеті). Берілсе әрі cabinetSystem қосулы болса,
  // findRoom тек осы кабинетті қайтарады (бос болса). Болмаса — түр/қарапайым
  // кабинет пулынан таңдалады (әдепкі «пәндік» жүйе).
  roomId?: string;
  digital: boolean; corr: boolean; canDouble: boolean; black: string[];
  // Пәннің ЕҢ КЕШ сабақ нөмірі (қатаң шек). Берілмесе — математика/алгебра/
  // геометрия атауынан автоматты 4 деп танылады (педагогикалық норма:
  // ауыр нақты пәндер алғашқы 4 сабақта; жұмсақ режимде +1 → 5-ке рұқсат).
  maxSlot?: number;
  // Электив (факультатив): күндік балл лимиті мен шаршау есебіне кірмейді
  // (eff()=0), сондықтан приоритет кезегінде ең соңында, негізгі пәндер
  // орналасқаннан кейінгі бос слоттарға ғана орналасады.
  elective?: boolean;
  // «Икстап тастау» торы: пән қойылмайтын ұяшықтар ("day-slot", мыс. "1-1").
  // Хамелеон (v2) subject-slot-matrix ережесі қолданады.
  bannedSlots?: string[];
  // ШЖМ: пән өзіндік жұмысқа қолайлы ма (бала мұғалімсіз істей алады —
  // сурет, еңбек, оқу). Комплект слотында бір сынып ауыр пән алса, екіншісіне
  // осындай пәнді жұптайды. Белгіленбесе (undefined) — қозғалтқыш баллдан
  // автоматты анықтайды; завуч осы белгімен қолмен басқарады.
  selfStudy?: boolean;
}
export interface Teacher {
  id: string; name: string; norm: number;
  gradeMin: number; gradeMax: number;
  shift: 1 | 2 | 3; // 3 = екі ауысымда да
  unavailable: string[]; // "day-slot"
  noInterShift: boolean;
  // Мұғалім беретін ПӘН АТАУЛАРЫ. Бос/жоқ = шектеусіз (кез келген пән) —
  // ескі деректермен үйлесімді. Сынып жоспарында мұғалім таңдағанда осы
  // тізімге қарап сүзіледі; автотағайындау да ескереді.
  subjects?: string[];
}
export interface Room {
  id: string; number: string; type: RoomType; capacity?: number;
  gymMax?: number; gymGroups?: number[][];
}
export interface GroupDef { teacherId: string; roomId?: string }
export interface CurItem {
  id: string; subjectId: string; teacherId?: string; hours: number;
  isSplit?: boolean; groups?: GroupDef[];
}
export interface Klass {
  id: string; name: string; grade: number; students: number;
  shift: 1 | 2; curriculum: CurItem[];
  homeRoomId?: string; // бастауыш сынып үшін бекітілген негізгі кабинет
}

// ── ШЖМ (шағын жинақты мектеп) ──
// Класс-комплект: 2 сыныптың бір мұғалім, бір кабинетте, бір мезгілде оқитын
// біріктірілген тобы (docs/SHZHM-RESEARCH-AND-DESIGN.md). Аралас мектеп:
// комплектіге кірмеген сыныптар — жеке (қарапайымдай) оқиды.
export interface Komplekt {
  id: string;
  name: string;         // мыс. «1-3 комплект»
  classIds: string[];   // біріктірілген сыныптар (2 сынып)
  teacherId?: string;   // комплектіні толық ұстайтын мұғалім
  roomId?: string;      // бекітілген кабинет
}
export interface School {
  name: string; shift1Start: string; shift2Start: string;
  lessonDuration: number; shortBreak: number; longBreak: number;
  longBreakAfter: number; interShiftGap: number;
  // Мектеп түрі: «regular» — қарапайым (әдепкі), «shzhm» — шағын жинақты
  // (біріктірілген комплектілер). ШЖМ таңдалса сайт комплект логикасына көшеді.
  type?: "regular" | "shzhm";
}
export interface Settings {
  maximin: boolean; maxIterations: number;
  // Пән баллдары РЕСМИ СанПиН шкаласында (1-11, ҚР ДСМ-76 4-қосымша) тұр ма.
  // true болса: UI-да ресми баллдар көрінеді, ал генерация кезінде қозғалтқыш
  // оларды ішкі калибрленген шкалаға автоматты келтіреді (lib/sanpinScale).
  sanpinScale?: boolean;
  // 1-сыныптың бейімделу («сатылы») режимі — СанПиН (ҚР ДСМ-76): қыркүйек-қазанда
  // 1-сынып күніне 3 сабақ (35 минуттан). true болса maxSlots(1)=3 болады.
  grade1Stepped?: boolean;
  // КАБИНЕТТІК ЖҮЙЕ: true болса әр пән өз бекітілген кабинетінде (Subject.roomId)
  // өтеді — сынып кабинетке барады. false (әдепкі) — «пәндік» жүйе (кабинеттер
  // түрі бойынша ортақ пулдан таңдалады).
  cabinetSystem?: boolean;
  // Күндік балл лимиттері — параллель топтары бойынша [1-4, 5-6, 7-9, 10-11]
  dayLimits: { g14: number; g56: number; g79: number; g1011: number };
  // Күндік САБАҚ САНЫ лимиті (СанПиН) — сынып деңгейі бойынша.
  // Болмаса — әдепкі maxSlots мәндері (1-сынып:4, 2-4:5, 5-6:6, 7-9:7, 10-11:8).
  maxLessons?: { g1: number; g24: number; g56: number; g79: number; g1011: number };
  // Шаршау шектері
  fatigue: { g14: number; g59: number; g1011: number };
  // Орналасу коэффициенттері (қашықтық айыппұлы): ауыр/орташа/жеңіл
  coeffs: { hard: number; medium: number; easy: number };
  // Жұмсақ режим шкалалары — әр қалаулы ереже қаншаға жұмсартылатынын реттейді.
  // Болмаса — әдепкі мәндер қолданылады.
  relax?: {
    extraSlots: number;   // күндік сабақ лимитінен неше сабаққа асуға болады (0-3)
    extraScore: number;   // күндік ауыртпалықтан неше баллға асуға болады (0-30)
    allowFatigue: boolean; // ауыр пән шаршау шегінен асуына рұқсат
    allowBlacklist: boolean; // қара тізім жұбына (Қазақ+Орыс қатар) рұқсат
    allowDigital: boolean; // информатикадан кейін жеңіл пәнге рұқсат
  };
  // Мұғалім жайлылығы деңгейі (терезелерді азайту күші):
  // 1 = қалыпты (сапа басымдық), 2 = жоғары (теңдестірілген),
  // 3 = ең жоғары (терезе минимум, өзара реттеумен сапа сақталады).
  // Мұғалім жайлылығы (swap деңгейі) — терезелерді азайту күші:
  // 0 = өшірулі (тез, сапа максимум), 1 = жұмсақ (қауіпсіз),
  // 2 = орташа (теңдестірілген), 3 = агрессивті (терезе минимум).
  // Swap физика заңын (конфликт, тесік, бір күн бір пән) ЕШҚАШАН бұзбайды.
  teacherComfort?: 0 | 1 | 2 | 3;
  // Мұғалімнің апталық сағатын күндерге ТЕҢ бөлу деңгейі (teacherComfort-тан
  // тәуелсіз): 0 = өшірулі, 1 = жұмсақ, 2 = орташа, 3 = агрессивті. Мақсаты —
  // терезе емес, күндік сағат саны (мыс. дүйсенбіде 6, бейсенбіде 1 болмасын).
  teacherDayBalance?: 0 | 1 | 2 | 3;
  // Сынып сағаты (homeroom): апталық 1 рет, таңдалған күні, әр сыныптың
  // сол күнгі СОҢҒЫ сабағынан кейін автоматты қосылатын резервтелген слот.
  // Мұғалім/кабинет талап етілмейді, күндік балл лимитіне кірмейді.
  homeroom?: { enabled: boolean; day: number };
}
export interface AlgoInput {
  school: School; subjects: Subject[]; classes: Klass[];
  teachers: Teacher[]; rooms: Room[]; settings: Settings;
  komplekts?: Komplekt[]; // ШЖМ: біріктірілген класс-комплектілер (v3 қозғалтқышы)
  // Ішінара режим: тек classIds сыныптары қайта құрылады, baseSlots ішіндегі
  // қалған сыныптардың сабақтары құлыпталып сол күйінде қалады.
  // anchor=true (ақылды жаңарту): қайта құрылатын сыныптардың өзінде де ескі
  // сабақтар жаңа деректе жарамды болса дәл сол күн/слотында қалдырылады —
  // тек жарамсыздары (кеткен мұғалім, өзгерген сағат) жаңадан орналасады.
  partial?: { classIds: string[]; baseSlots: Slot[]; anchor?: boolean };
  seed?: number; // әртүрлі нұсқа үшін кездейсоқтық тұқымы (multi-run)
  softFill?: boolean; // жұмсақ режим: сыймаған сабақтарды қалаулы ережелерді жұмсартып орналастыру
}
export interface Slot {
  key: string; classId: string; subjectId: string; teacherId: string;
  roomId: string; groupId?: string; dpart?: 1 | 2;
  day: number; slot: number; shift: 1 | 2; score: number; locked?: boolean;
}
export interface StressTest { name: string; passed: boolean; details: string }
export interface Unplaced { className: string; subject: string; placed: number; need: number; reason: string }
export interface GapInfo { className: string; day: number; slot: number; reason: string }
export interface AlgoResult {
  success: boolean;
  error?: { message: string; details: string };
  slots: Slot[]; quality: number;
  classScores: Record<string, number>;
  tests: StressTest[]; unplaced: Unplaced[]; warnings: string[];
  gaps: GapInfo[];
  stats: { timeMs: number; iters: number; total: number; comfort: number; balance: number; avgClass: number;
    // Педагогикалық ережелердің бұзылу саны (алг+гео/орыс бір күн, тіл қатар,
    // 3 қиын қатар) — нұсқа таңдауда (runScore) минимумға тартылады.
    pedViol?: number };
}
export type ProgressFn = (pct: number, stage: number) => void;
// Сынып сағаты слоттарын белгілейтін тұрақты sentinel ID (нақты Subject емес —
// экспорт/кесте беттері осы ID-ды көрсе "Сынып сағаты" деп арнайы көрсетеді).
export const HOMEROOM_SUBJECT_ID = "__homeroom__";
export const HOMEROOM_LABEL = "Сынып сағаты";

/* ── уақыт ── */
const DAY_KZ = ["", "Дс", "Сс", "Ср", "Бс", "Жм"];
const pT = (s: string) => { const [a, b] = s.split(":").map(Number); return a * 60 + b; };
const fT = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export interface TL { startMin: number; endMin: number; start: string; end: string }
export function buildTimeline(sc: School): Record<1 | 2, TL[]> {
  const make = (startStr: string): TL[] => {
    const arr: TL[] = [{ startMin: 0, endMin: 0, start: "", end: "" }]; // 0-индекс бос
    let cur = pT(startStr);
    for (let s = 1; s <= 8; s++) {
      arr.push({ startMin: cur, endMin: cur + sc.lessonDuration, start: fT(cur), end: fT(cur + sc.lessonDuration) });
      cur += sc.lessonDuration + (s === sc.longBreakAfter ? sc.longBreak : sc.shortBreak);
    }
    return arr;
  };
  return { 1: make(sc.shift1Start), 2: make(sc.shift2Start) };
}

/* ── СанПиН ережелері ── */
// Ресми балл (ҚР ДСМ-76, 4-қосымша: 1..11) — қозғалтқышта ДӘЛ құжаттағыдай
// қолданылады (БІРЕГЕЙ кескін). Бұрын баллдар 1..9-ға қысылып, Физика(9) мен
// Шетел(10) «8»-ге, Тарих(8) мен ана тілі(7) «6»-ға бірігіп, ауыр пәндер
// позициялық тартымын жоғалтып, 1-сабаққа/5-7-ге ығысатын. Енді шикі 11-балл
// шкаласы тікелей оқылады, ал күндік лимиттер sanpinScale режимінде
// пропорционал үлкейтіледі (SANPIN_LIMIT_SCALE) — сол себепті ештеңе аспайды.
export const OFFICIAL_TO_INTERNAL: Record<number, number> = {
  11: 11, 10: 10, 9: 9, 8: 8, 7: 7, 6: 6, 5: 5, 4: 4, 3: 3, 2: 2, 1: 1,
};
export const officialToInternal = (p: number): number =>
  OFFICIAL_TO_INTERNAL[Math.max(1, Math.min(11, Math.round(p)))] ?? 5;

// Пәннің қалаулы сабақ терезесі («ideal») баллдан ТУЫНДАТЫЛАДЫ — завуч 200+
// пәнге қолмен қоймайды, тек құжат баллын енгізсе жеткілікті. СанПиН қисығы:
// жұмысқа қабілет 1-сабақта төмен, 2-4-те шыңында, 5-тен кейін құлдырайды.
export const idealForScore = (score: number): number[] =>
  score >= 9 ? [2, 3, 4] : score >= 6 ? [2, 3, 4, 5] : [5, 6, 7];

// settings.sanpinScale қосулы болса — пән баллдарын ресми шкалада қалдырып
// (өзгеріссіз), қалаулы сабақ терезесін баллдан туындатамыз. UI-дағы ресми
// баллдар өзгермейді; бұл — генерация алдындағы бір-ақ қадам.
export const calibrateSubjects = (subjects: Subject[], st?: Settings): Subject[] =>
  st?.sanpinScale
    ? subjects.map((s) => ({
        ...s,
        score: officialToInternal(s.score),
        primaryScore: s.primaryScore != null ? officialToInternal(s.primaryScore) : s.primaryScore,
        // ideal бос немесе баллмен қайшы болса — құжат баллынан туындатамыз
        ideal: s.ideal && s.ideal.length ? s.ideal : idealForScore(officialToInternal(s.score)),
      }))
    : subjects;

export const DEFAULT_DAY_LIMITS = { g14: 25, g56: 35, g79: 45, g1011: 55 };
// Күндік сабақ саны лимиті (СанПиН). settings.maxLessons болса — соны, әйтпесе әдепкі.
// Модуль деңгейіндегі _activeSettings generate() басында орнатылады, сонда барлық
// maxSlots(g) шақырулары settings-сіз де дұрыс лимитті қолданады.
let _activeSettings: Settings | undefined;
export const maxSlots = (g: number, st?: Settings) => {
  const s = st || _activeSettings;
  // 1-сыныптың бейімделу режимі (СанПиН): күніне 3 сабақ — басқа баптаудан басым
  if (g === 1 && s?.grade1Stepped) return 3;
  const m = s?.maxLessons;
  if (m) {
    if (g === 1) return m.g1;
    if (g <= 4) return m.g24;
    if (g <= 6) return m.g56;
    if (g <= 9) return m.g79;
    return m.g1011;
  }
  // әдепкі (СанПиН негізі)
  // Көп мектепте күндік максимум 7 сабақ (8-сабақ іс жүзінде қолданылмайды).
  // Мектеп қажет етсе — settings.maxLessons арқылы өзгерте алады.
  return g === 1 ? 4 : g <= 4 ? 5 : g <= 6 ? 6 : 7;
};
// Әдепкі сабақ лимиттері (UI бастапқы мәні үшін)
export const DEFAULT_MAX_LESSONS = { g1: 4, g24: 5, g56: 6, g79: 7, g1011: 7 };
// Нақты СанПиН баллы (1..11) ішкі демо шкаладан (1..10, ауырлары ~9) жоғары
// болғандықтан, sanpinScale режимінде күндік балл лимиті мен шаршау шегі осы
// коэффициентке үлкейеді — сонда шикі баллдар лимиттен аспайды (эмпирикалық
// тексерілген: орналаспаған сабақ саны өспейді).
export const SANPIN_LIMIT_SCALE = 1.35;
export const dayLimitS = (g: number, st?: Settings) => {
  const d = st?.dayLimits || DEFAULT_DAY_LIMITS;
  const base = g <= 4 ? d.g14 : g <= 6 ? d.g56 : g <= 9 ? d.g79 : d.g1011;
  return st?.sanpinScale ? base * SANPIN_LIMIT_SCALE : base;
};
// артқа үйлесімділік (UI-да көрсету үшін)
export const dayLimit = (g: number) => dayLimitS(g);
export const DEFAULT_FATIGUE = { g14: 25, g59: 35, g1011: 45 };
export const fatThrS = (g: number, st?: Settings) => {
  const f = st?.fatigue || DEFAULT_FATIGUE;
  const base = g <= 4 ? f.g14 : g <= 9 ? f.g59 : f.g1011;
  return st?.sanpinScale ? base * SANPIN_LIMIT_SCALE : base;
};
export const fatThr = (g: number) => fatThrS(g);
export const DEFAULT_COEFFS = { hard: 4, medium: 3, easy: 2 };
const coeffOfS = (s: number, st?: Settings) => {
  const c = st?.coeffs || DEFAULT_COEFFS;
  return s >= 9 ? c.hard : s >= 6 ? c.medium : c.easy;
};
const SLOT_K = [0, 1.0, 1.0, 1.1, 1.3, 1.4, 1.5, 1.6, 1.7];
export const pScore = (subj: Subject, slot: number, st?: Settings) => {
  const d = Math.min(...subj.ideal.map((i) => Math.abs(slot - i)));
  return Math.max(0, Math.round((10 - d * coeffOfS(subj.score, st)) * 10) / 10);
};
const weekOrder = (score: number) =>
  score >= 9 ? [3, 2, 4, 1, 5] : score >= 6 ? [1, 4, 2, 3, 5] : [5, 4, 1, 2, 3];

type Mat = (string | null)[][][]; // [shift][day][slot] 1..2 / 1..5 / 1..8
const mkMat = (): Mat => Array.from({ length: 3 }, () => Array.from({ length: 6 }, () => Array<string | null>(9).fill(null)));

interface Task {
  cls: Klass; cu: CurItem; s: Subject; pr: number;
  order: number[]; singles: number; doubles: number;
}

export function generate(input: AlgoInput, onProgress?: ProgressFn): AlgoResult {
  const t0 = Date.now();
  const prog = (p: number, st: number) => onProgress && onProgress(p, st);
  const { school, classes, teachers, rooms, settings } = input;
  // СанПиН режимі: ресми баллдар (1-11) ішкі калибрленген шкалаға келтіріледі
  const subjects = calibrateSubjects(input.subjects, settings);
  _activeSettings = settings; // maxSlots күндік лимитті осыдан алады (СанПиН)
  // Детерминді кездейсоқ генератор (seed болса — әртүрлі нұсқа; болмаса — тұрақты)
  const seed = input.seed ?? 0;
  let rngState = (seed * 2654435761) >>> 0 || 1;
  const rng = () => {
    // xorshift32 — жылдам әрі детерминді
    rngState ^= rngState << 13; rngState >>>= 0;
    rngState ^= rngState >> 17;
    rngState ^= rngState << 5; rngState >>>= 0;
    return rngState / 4294967296;
  };
  const S: Record<string, Subject> = {}; subjects.forEach((x) => (S[x.id] = x));
  const T: Record<string, Teacher> = {}; teachers.forEach((x) => (T[x.id] = x));
  const C: Record<string, Klass> = {}; classes.forEach((x) => (C[x.id] = x));
  const R: Record<string, Room> = {}; rooms.forEach((x) => (R[x.id] = x));
  const tl = buildTimeline(school);
  const gym = rooms.find((r) => r.type === "gym");
  const ROOM_LABEL: Record<RoomType, string> = { regular: "қарапайым", physics: "физика", chemistry: "химия", computer: "информатика", gym: "спортзал" };
  const fail = (message: string, details: string): AlgoResult => ({
    success: false, error: { message, details }, slots: [], quality: 0,
    classScores: {}, tests: [], unplaced: [], warnings: [], gaps: [],
    stats: { timeMs: Date.now() - t0, iters: 0, total: 0, comfort: 0, balance: 0, avgClass: 0 },
  });

  const eff = (cls: Klass, s: Subject) =>
    s.elective ? 0 : cls.grade <= 4 && s.primaryScore != null ? s.primaryScore : s.score;

  // Пәннің «ең кеш сабақ» шегі: Subject.maxSlot берілсе — сол; әйтпесе
  // математика/алгебра/геометрия атауынан автоматты 6 (күннің СОҢҒЫ сабағынан
  // басқа кез келген жерге; көп мектепте күн макс 7 сабақ). Позициялық
  // артықшылық (pScore) математиканы әйтеуір ерте сабаққа тартады, сондықтан
  // ол көбіне 2-4-те тұрады; бірақ қатаң «тек 1-4» ережесі тығыз мектепте
  // сабақты орналастыруға кедергі болып, сабақтар сыймай қалатын — сол себепті
  // 6-ға көтерілді (жұмсақ режимде 7-ге дейін). Басқа пәндерге шек жоқ.
  // МАҢЫЗДЫ: бір-ақ рет алдын ала есептеледі — hardCheck ыстық жолында
  // toLowerCase/includes шақыру генерацияны айтарлықтай баяулатады.
  // Математика ЕКІ ДЕҢГЕЙЛІ: негізгі орналастыруда тек 1-4 (MATH_PREFERRED),
  // 1-4-ке сыймағаны ғана кейін 5-6-ға (MATH_OVERFLOW, mathOverflow фазасы).
  const MATH_PREFERRED = 4, MATH_OVERFLOW = 6;
  const LATE_LIMIT: Record<string, number | undefined> = {};
  const MATH_SET = new Set<string>();
  for (const s of subjects) {
    if (s.maxSlot) { LATE_LIMIT[s.id] = s.maxSlot; continue; }
    const n = s.name.toLowerCase();
    if (n.includes("математика") || n.includes("алгебра") || n.includes("геометрия")) {
      LATE_LIMIT[s.id] = MATH_PREFERRED; MATH_SET.add(s.id);
    } else LATE_LIMIT[s.id] = undefined;
  }
  let mathOverflow = false; // true болғанда математика 5-6-ға да қойыла алады
  const lateLimitOf = (s: Subject): number | undefined => {
    const b = LATE_LIMIT[s.id];
    if (b === undefined) return undefined;
    return mathOverflow && MATH_SET.has(s.id) ? MATH_OVERFLOW : b;
  };

  // ── Пән тип-флагтары (педагогикалық ережелер үшін, бір рет) ──
  const FL: Record<string, { alg: boolean; geo: boolean; rusLang: boolean; rusLit: boolean; lng: boolean }> = {};
  for (const s of subjects) {
    const n = s.name.toLowerCase();
    const rus = n.includes("орыс") || n.includes("русск");
    const lit = n.includes("әдеб") || n.includes("литер");
    FL[s.id] = { alg: n.includes("алгебра"), geo: n.includes("геометрия"),
      rusLang: rus && n.includes("тіл") && !lit, rusLit: rus && lit,
      // ТІЛ пәні (қазақ/орыс/ағылшын/ана тілі...): екеуі қатар қойылмайды
      lng: /тіл|язык|english/.test(n) };
  }
  const isHardId = (id: string) => S[id].score >= 9; // қиын пән (СанПиН 9-11: математика тобы, физика, химия, био, информатика, шетел)
  // Сынып бойынша алгебра/геометрия/орыс тілі/әдебиеті апталық сағаттары
  const clsHours = (cid: string, pred: (f: typeof FL[string]) => boolean): number => {
    let h = 0; for (const cu of C[cid].curriculum) { const s = S[cu.subjectId]; if (s && pred(FL[s.id])) h += cu.hours; }
    return h;
  };
  const algH: Record<string, number> = {}, geoH: Record<string, number> = {}, rlH: Record<string, number> = {}, rlitH: Record<string, number> = {};
  for (const c of classes) {
    algH[c.id] = clsHours(c.id, (f) => f.alg); geoH[c.id] = clsHours(c.id, (f) => f.geo);
    rlH[c.id] = clsHours(c.id, (f) => f.rusLang); rlitH[c.id] = clsHours(c.id, (f) => f.rusLit);
  }
  const dayHas = (cid: string, day: number, pred: (f: typeof FL[string]) => boolean): boolean => {
    for (let sl = 1; sl <= 8; sl++) { const id = cm[cid][day][sl]; if (id && pred(FL[id])) return true; }
    return false;
  };
  const sharedDays = (cid: string, pa: (f: typeof FL[string]) => boolean, pb: (f: typeof FL[string]) => boolean): number => {
    let n = 0; for (let d = 1; d <= 5; d++) if (dayHas(cid, d, pa) && dayHas(cid, d, pb)) n++;
    return n;
  };
  // ҚҰРЫЛЫМДЫҚ педагогикалық ережелер — ҚАТАҢ да, ЖҰМСАҚ режимде де сақталады
  // (тек ең соңғы кепіл-пасстар елемейді): алгебра+геометрия бөлек күн,
  // орыс тілі+әдебиеті бөлек күн, екі ТІЛ пәні қатар қойылмайды (мыс.
  // ағылшыннан кейін бірден орыс тілі — арасында басқа сабақ болуы керек).
  const structuralViolation = (cls: Klass, subj: Subject, day: number, slot: number): string | null => {
    const f = FL[subj.id];
    if (f.alg || f.geo) {
      const partner = f.alg ? (x: typeof FL[string]) => x.geo : (x: typeof FL[string]) => x.alg;
      if (dayHas(cls.id, day, partner)) {
        const allowed = Math.max(0, algH[cls.id] + geoH[cls.id] - 5);
        if (sharedDays(cls.id, (x) => x.alg, (x) => x.geo) + 1 > allowed) return "алгебра мен геометрия бір күнде";
      }
    }
    if (f.rusLang || f.rusLit) {
      const partner = f.rusLang ? (x: typeof FL[string]) => x.rusLit : (x: typeof FL[string]) => x.rusLang;
      if (dayHas(cls.id, day, partner)) {
        const allowed = Math.max(0, rlH[cls.id] + rlitH[cls.id] - 5);
        if (sharedDays(cls.id, (x) => x.rusLang, (x) => x.rusLit) + 1 > allowed) return "орыс тілі мен әдебиеті бір күнде";
      }
    }
    if (f.lng) {
      const p = cm[cls.id][day][slot - 1], nx = slot < 8 ? cm[cls.id][day][slot + 1] : null;
      if ((p && FL[p].lng) || (nx && FL[nx].lng)) return "екі тіл пәні қатар";
    }
    return null;
  };
  // Қиын-соң-қиын тексерісі (бөлек көмекші — кепіл-пасстардың 1-айналымында да
  // қолданылады): 3 қиын қатар / күн басында 2 қиын қатар — тыйым.
  const hardRunViolation = (cls: Klass, subj: Subject, day: number, slot: number): string | null => {
    if (subj.score < 9) return null;
    let left = 0; for (let s2 = slot - 1; s2 >= 1 && cm[cls.id][day][s2] && isHardId(cm[cls.id][day][s2]!); s2--) left++;
    let right = 0; for (let s2 = slot + 1; s2 <= 8 && cm[cls.id][day][s2] && isHardId(cm[cls.id][day][s2]!); s2++) right++;
    const run = left + 1 + right, start = slot - left;
    if (run >= 3) return "үш қиын пән қатар";
    if (run === 2 && start === 1) return "күн басында екі қиын пән қатар";
    return null;
  };

  /* ЭТАП 0 — precheck */
  prog(3, 0);
  const targetClasses = input.partial ? classes.filter((c) => input.partial!.classIds.includes(c.id)) : classes;
  for (const c of targetClasses)
    for (const cu of c.curriculum) {
      const s = S[cu.subjectId];
      if (!s || !cu.hours) continue;
      if (s.room && !rooms.some((r) => r.type === s.room))
        return fail(`«${s.name}» пәніне ${ROOM_LABEL[s.room]} кабинеті жоқ`, "Кабинеттер бетінде арнайы кабинет қосыңыз — алгоритм тоқтатылды.");
      if (cu.hours > 5 && !s.canDouble)
        return fail(`${c.name}: «${s.name}» аптасына ${cu.hours} сағ — қос сабақ рұқсаты жоқ`, "Пәндер бетінде «қос сабақ» қосыңыз немесе сағатты 5-ке дейін азайтыңыз.");
      if (cu.isSplit) {
        if (!cu.groups || cu.groups.length < 2 || cu.groups.some((g) => !T[g.teacherId]))
          return fail(`${c.name}: «${s.name}» топтары толық емес`, "Әр топқа мұғалім тағайындаңыз.");
      } else if (!cu.teacherId || !T[cu.teacherId])
        return fail(`${c.name}: «${s.name}» пәніне мұғалім тағайындалмаған`, "Оқу жоспарында мұғалім таңдаңыз.");
    }

  /* ЭТАП 1 — матрицалар */
  prog(8, 1);
  const tm: Record<string, Mat> = {}; teachers.forEach((t) => (tm[t.id] = mkMat()));
  const rm: Record<string, Mat> = {}; rooms.forEach((r) => (rm[r.id] = mkMat()));
  const cm: Record<string, (string | null)[][]> = {};
  const ds: Record<string, Set<string>[]> = {};
  const dScore: Record<string, number[]> = {};
  const dayList: Record<string, { slot: number; score: number }[][]> = {};
  classes.forEach((c) => {
    cm[c.id] = Array.from({ length: 6 }, () => Array<string | null>(9).fill(null));
    ds[c.id] = Array.from({ length: 6 }, () => new Set<string>());
    dScore[c.id] = [0, 0, 0, 0, 0, 0];
    dayList[c.id] = Array.from({ length: 6 }, () => []);
  });
  // Күндік квота: сабақтарды 5 күнге тең + қалдық қиын күнге [Ср,Сс,Бс,Дс,Жм]
  const dayQuota: Record<string, number[]> = {};
  for (const c of targetClasses) {
    const total = c.curriculum.reduce((s, cu) => {
      const su = S[cu.subjectId];
      return s + (su && cu.hours ? cu.hours : 0);
    }, 0);
    const base = Math.floor(total / 5);
    let rem = total % 5;
    const q = [0, base, base, base, base, base]; // [_,Дс,Сс,Ср,Бс,Жм]
    for (const d of [3, 2, 4, 1, 5]) { if (rem <= 0) break; q[d]++; rem--; }
    // максимум сабақ санынан аспау (физикалық шек)
    for (let d = 1; d <= 5; d++) q[d] = Math.min(q[d], maxSlots(c.grade));
    dayQuota[c.id] = q;
  }

  const gymOcc: string[][][][] = Array.from({ length: 3 }, () =>
    Array.from({ length: 6 }, () => Array.from({ length: 9 }, () => [] as string[])));

  const fatigueAt = (cid: string, day: number, target: number) => {
    let f = 0;
    const arr = dayList[cid][day].filter((x) => x.slot < target).sort((a, b) => a.slot - b.slot);
    for (const x of arr)
      f = Math.max(0, f + x.score * SLOT_K[x.slot] - (x.slot === school.longBreakAfter ? 4.0 : 1.5)); // үзіліс рельефі: калибрленген
    return f;
  };

  /* мұғалімнің сол күнгі БАСҚА ауысымдағы сабақтары (№14 ереже) */
  const interShiftOk = (t: Teacher, shift: 1 | 2, day: number) => {
    const other: 1 | 2 = shift === 1 ? 2 : 1;
    const sl = tm[t.id][other][day];
    const used: number[] = [];
    for (let s = 1; s <= 8; s++) if (sl[s] !== null) used.push(s);
    if (!used.length) return true;
    if (t.noInterShift) return false;
    // 1-ауысым сабақтарының соңы мен 2-ауысым сабақтарының басы арасы >= interShiftGap
    if (shift === 2) {
      const lastEnd1 = Math.max(...used.map((s) => tl[1][s].endMin));
      return tl[2][1].startMin - lastEnd1 >= school.interShiftGap;
    }
    const firstStart2 = Math.min(...used.map((s) => tl[2][s].startMin));
    return firstStart2 - tl[1][8].endMin >= school.interShiftGap;
  };

  // hardCheck — ережелерді тексереді.
  // soft=false (қатаң): барлық ереже сақталады.
  // soft=true (жұмсақ): тек ФИЗИКА ЗАҢЫ (конфликт) сақталады,
  //   қалаулы ережелер (лимит, баланс, қара тізім) елемейді —
  //   олардың бұзылуы softViolations арқылы белгіленеді.
  // Қайтарады: қатаң бұзылса — себеп жолы; әйтпесе null.
  const hardCheck = (cls: Klass, tid: string, subj: Subject, day: number, slot: number, skipDayRule = false, soft = false): string | null => {
    // ═══ ҚАТАҢ ЕРЕЖЕЛЕР — ЕШҚАШАН бұзылмайды (жұмсақ режимде де) ═══
    if (cm[cls.id][day][slot] !== null) return "сынып бос емес";
    // "Бір күн — бір пән" — ҚАТАҢ ереже: пән аптасына макс 5 сағат, апта 5 күн,
    // сондықтан әр күні 1 рет = дәл сыяды. Бір күні 2 рет — педагогикалық қате.
    // (Жалғыз ерекшелік — қос сабақ, ол skipDayRule арқылы реттеледі.)
    if (!skipDayRule && ds[cls.id][day].has(subj.id)) return "бір күн — бір пән";
    const t = T[tid];
    if (!t) return "мұғалім жоқ";
    if (tm[tid][cls.shift][day][slot] !== null) return "мұғалім бос емес";
    if (cls.grade < t.gradeMin || cls.grade > t.gradeMax) return "мұғалім диапазоны";
    if (t.shift !== 3 && t.shift !== cls.shift) return "мұғалім басқа ауысымда";
    if (t.unavailable.includes(`${day}-${slot}`)) return "мұғалім шектеуі";
    if (!interShiftOk(t, cls.shift, day)) return "ауысым аралық үзіліс (40 мин)";
    // Пәннің «икстап тастау» торы — қатаң (жұмсақ режимде де): завуч осы
    // уақытқа пәнді қоюға тыйым салған
    if (subj.bannedSlots && subj.bannedSlots.includes(`${day}-${slot}`)) return "пәнге бұл уақытқа тыйым салынған";

    // ═══ ЖҰМСАҚ ЕРЕЖЕЛЕР — қажет болса шкала бойынша жұмсартылады ═══
    if (soft) {
      // Жұмсақ режимде де шкаладан АСҚАН жағдайлар бұзылмайды (шектеулі жұмсарту).
      const rx = settings.relax;
      const exSlots = rx ? rx.extraSlots : 2;   // әдепкі: +2 сабақ
      const exScore = rx ? rx.extraScore : 20;  // әдепкі: +20 балл
      if (slot > maxSlots(cls.grade) + exSlots) return "күндік сабақ лимиті (шкаладан тыс)";
      // Математика тектес пән: жұмсақ режимде де ең көбі +1 сабаққа ғана кешігеді (4→5)
      const lateLim = lateLimitOf(subj);
      if (lateLim && slot > lateLim + 1) return "пәннің кеш сабақ шегі (жұмсақ +1-ден тыс)";
      if (dScore[cls.id][day] + eff(cls, subj) > dayLimitS(cls.grade, settings) + exScore) return "күндік ауыртпалық (шкаладан тыс)";
      if (rx && !rx.allowFatigue && eff(cls, subj) > 4 && fatigueAt(cls.id, day, slot) > fatThrS(cls.grade, settings)) return "шаршау шегі";
      if (rx && !rx.allowBlacklist) {
        const p = cm[cls.id][day][slot - 1], n = slot < 8 ? cm[cls.id][day][slot + 1] : null;
        if (p && (subj.black.includes(S[p].name) || S[p].black.includes(subj.name))) return "қара тізім жұбы";
        if (n && (subj.black.includes(S[n].name) || S[n].black.includes(subj.name))) return "қара тізім жұбы";
      }
      // Құрылымдық ережелер ЖҰМСАҚ режимде де сақталады (алгебра+геометрия,
      // орыс тілі+әдебиеті, екі тіл қатар) — тек соңғы кепіл-пасстар елемейді
      { const sv = structuralViolation(cls, subj, day, slot); if (sv) return sv; }
      return null;
    }

    if (slot > maxSlots(cls.grade)) return "күндік сабақ лимиті";
    // Математика/алгебра/геометрия — алғашқы 4 сабақтан кеш қойылмайды
    // (қатаң; тек жұмсақ режимде 5-сабаққа рұқсат)
    const lateLim = lateLimitOf(subj);
    if (lateLim && slot > lateLim) return "пән кеш сабаққа қойылмайды";
    if (eff(cls, subj) > 4 && fatigueAt(cls.id, day, slot) > fatThrS(cls.grade, settings)) return "шаршау шегі";
    const prev = cm[cls.id][day][slot - 1];
    const next = slot < 8 ? cm[cls.id][day][slot + 1] : null;
    const bl = subj.black;
    if (prev && (bl.includes(S[prev].name) || S[prev].black.includes(subj.name))) return "қара тізім жұбы";
    if (next && (bl.includes(S[next].name) || S[next].black.includes(subj.name))) return "қара тізім жұбы";
    if (prev && S[prev].digital && subj.score > 5) return "информатикадан кейін жеңіл пән";
    if (next && subj.digital && S[next].score > 5) return "информатикадан кейін жеңіл пән";
    if (subj.corr && slot <= 3) return "түзету сабағы — 4+ слот";
    // ── Құрылымдық ережелер: алгебра+геометрия / орыс тілі+әдебиеті бөлек
    // күн, екі тіл пәні қатар емес (structuralViolation — жұмсақ режимде де) ──
    { const sv = structuralViolation(cls, subj, day, slot); if (sv) return sv; }
    // ── Қиын соң қиын (дерекке калибрленген: күніне ~2 қиын, макс ~3):
    // 3 қиын қатар — тыйым; күн басында 2 қиын қатар — тыйым («жылыну»).
    // М-Қ-Қ рұқсат, Қ-О-Қ рұқсат. Сыймаса — авто-жұмсақ фаза босатады.
    { const hv = hardRunViolation(cls, subj, day, slot); if (hv) return hv; }
    if (dScore[cls.id][day] + eff(cls, subj) > dayLimitS(cls.grade, settings)) return "күндік балл лимиті";
    return null;
  };

  // Жұмсақ режимде сабақ қойғанда ҚАНДАЙ қалаулы ереже бұзылғанын анықтайды.
  // Қайтарады: бұзылған ережелердің тізімі (бос болса — таза орналасты).
  const softViolations = (cls: Klass, subj: Subject, day: number, slot: number): string[] => {
    const v: string[] = [];
    if (slot > maxSlots(cls.grade)) v.push(`${cls.name}: күндік сабақ лимитінен асты (${slot}-сабақ)`);
    {
      const lim = lateLimitOf(subj);
      if (lim && slot > lim) v.push(`${cls.name} ${DAY_KZ[day]}: «${subj.name}» ${slot}-сабаққа қойылды (норма — алғашқы ${lim}, жеңілдетумен рұқсат)`);
    }
    if (eff(cls, subj) > 4 && fatigueAt(cls.id, day, slot) > fatThrS(cls.grade, settings)) v.push(`${cls.name} ${DAY_KZ[day]}: ауыр пән шаршау шегінен тыс (${subj.name})`);
    const prev = cm[cls.id][day][slot - 1];
    if (prev && (subj.black.includes(S[prev].name) || S[prev].black.includes(subj.name))) v.push(`${cls.name} ${DAY_KZ[day]}: ${S[prev].name} + ${subj.name} қатар`);
    if (dScore[cls.id][day] + eff(cls, subj) > dayLimitS(cls.grade, settings)) v.push(`${cls.name} ${DAY_KZ[day]}: күндік ауыртпалық жоғары`);
    return v;
  };

  // Кабинет нөмірінен этажды анықтау: "101"→1, "203"→2, "Спортзал"→0 (этажсыз)
  // Нөмірдің бірінші цифры = этаж. Цифрмен басталмаса (атау) — 0 (бейтарап).
  const roomFloor = (roomId: string): number => {
    const room = R[roomId];
    if (!room) return 0;
    const m = room.number.match(/^(\d)/);
    return m ? parseInt(m[1], 10) : 0;
  };

  // Сыйымдылық ескертулері: "сынып|оқушы|кабинет сыйымдылығы" — сынып сыймаған жағдайлар
  const capWarn = new Set<string>();

  const findRoom = (cls: Klass, subj: Subject, day: number, slot: number, exclude?: Set<string>): string | null => {
    if (subj.room === "gym") {
      if (!gym) return null;
      const occ = gymOcc[cls.shift][day][slot];
      if (occ.length >= (gym.gymMax || 1)) return null;
      const groups = gym.gymGroups && gym.gymGroups.length ? gym.gymGroups : [[1, 11]];
      const grp = groups.find((g) => g[0] <= cls.grade && cls.grade <= g[1]);
      if (!grp) return null;
      for (const oc of occ) { const ocl = C[oc]; if (!(grp[0] <= ocl.grade && ocl.grade <= grp[1])) return null; }
      return gym.id;
    }
    // КАБИНЕТТІК ЖҮЙЕ: пәннің бекітілген кабинеті БІРІНШІ кезекте. Кабинет бос
    // болса — сол. Бос болмаса — НАҚТЫ МЕКТЕПТЕГІДЕЙ жалпы пулдан бос кабинет
    // алынады (overflow): жоғары сұранысты пән (мыс. Қазақ тілі 1-ауысымда
    // ~90% тығыздық) жалғыз кабинетке физикалық сыймайды — қатаң тыйым сабақты
    // мүлде орналастырмай тастайтын. Топ бөлінген сабақтың 2-тобы да (exclude)
    // осы жолмен басқа бөлме алады.
    if (settings.cabinetSystem && subj.roomId && R[subj.roomId]) {
      const rid = subj.roomId;
      if (rm[rid][cls.shift][day][slot] === null && (!exclude || !exclude.has(rid))) return rid;
      // кабинет бос емес — төмендегі жалпы пулға түсеміз (overflow)
    }
    if (subj.room) {
      const r = rooms.find((r) => r.type === subj.room && rm[r.id][cls.shift][day][slot] === null && (!exclude || !exclude.has(r.id)));
      return r ? r.id : null;
    }
    // БАСТАУЫШ СЫНЫП: негізгі кабинет бекітілген болса, қарапайым пәндер СОЛ кабинетте
    // (бастауыш балалар кабинет ауыстырмайды; тек арнайы пәндер — дене/информатика — бөлек).
    if (cls.homeRoomId && rm[cls.homeRoomId] && rm[cls.homeRoomId][cls.shift][day][slot] === null && (!exclude || !exclude.has(cls.homeRoomId))) {
      return cls.homeRoomId;
    }
    // Қарапайым кабинет: сол сыныптың сол күнгі сабақтары қай этажда көп болса,
    // соған ЖАҚЫН кабинетті таңдаймыз (этаж ауысуын азайту үшін).
    let candidates = rooms.filter((r) => r.type === "regular" && rm[r.id][cls.shift][day][slot] === null && (!exclude || !exclude.has(r.id)));
    if (!candidates.length) return null;
    // СЫЙЫМДЫЛЫҚ: сыныптың оқушысы сыятын кабинеттерді басымдыққа қоямыз.
    // (capacity берілмеген кабинет шектеусіз деп саналады.)
    const fitting = candidates.filter((r) => !r.capacity || r.capacity >= cls.students);
    if (fitting.length) {
      // сыятындары бар — солардың ішінен таңдаймыз
      candidates = fitting;
    } else {
      // ешқайсы сыймайды — ең үлкенін аламыз (бос қалғаннан гөрі), бірақ ескерту
      candidates = candidates.slice().sort((a, b) => (b.capacity || 9999) - (a.capacity || 9999));
      if (capWarn && candidates[0]) {
        capWarn.add(`${cls.name}|${cls.students}|${candidates[0].capacity || 0}`);
      }
    }
    // сол күнгі осы сыныптың басым этажын табамыз
    const dayRooms = slots.filter((o) => o.classId === cls.id && o.day === day && (!o.groupId || o.groupId === "Г1")).map((o) => roomFloor(o.roomId)).filter((f) => f > 0);
    if (!dayRooms.length) return candidates[0].id; // әлі сабақ жоқ — кез келген (сыятын)
    // ең жиі этаж
    const freq: Record<number, number> = {};
    dayRooms.forEach((f) => (freq[f] = (freq[f] || 0) + 1));
    const domFloor = Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]);
    // басым этажға ең жақын кабинетті таңдаймыз (тек сыятындар арасынан)
    candidates.sort((a, b) => Math.abs(roomFloor(a.id) - domFloor) - Math.abs(roomFloor(b.id) - domFloor));
    return candidates[0].id;
  };

  let seq = 0;
  const slots: Slot[] = [];
  const scoreCache: Record<string, number | null> = {};
  const place = (o: Omit<Slot, "key">, opts?: { skipDaySet?: boolean }) => {
    const slot: Slot = { ...o, key: "s" + ++seq };
    slots.push(slot);
    tm[o.teacherId][o.shift][o.day][o.slot] = o.classId;
    if (gym && o.roomId === gym.id) gymOcc[o.shift][o.day][o.slot].push(o.classId);
    else rm[o.roomId][o.shift][o.day][o.slot] = o.classId;
    if (!o.groupId || o.groupId === "Г1") {
      cm[o.classId][o.day][o.slot] = o.subjectId;
      if (!opts?.skipDaySet) ds[o.classId][o.day].add(o.subjectId);
      dScore[o.classId][o.day] += eff(C[o.classId], S[o.subjectId]);
      dayList[o.classId][o.day].push({ slot: o.slot, score: eff(C[o.classId], S[o.subjectId]) });
    }
    scoreCache[o.classId] = null;
    return slot;
  };
  const removeSlot = (o: Slot) => {
    slots.splice(slots.indexOf(o), 1);
    tm[o.teacherId][o.shift][o.day][o.slot] = null;
    if (gym && o.roomId === gym.id) {
      const a = gymOcc[o.shift][o.day][o.slot]; a.splice(a.indexOf(o.classId), 1);
    } else rm[o.roomId][o.shift][o.day][o.slot] = null;
    cm[o.classId][o.day][o.slot] = null;
    ds[o.classId][o.day].delete(o.subjectId);
    dScore[o.classId][o.day] -= eff(C[o.classId], S[o.subjectId]);
    const dl = dayList[o.classId][o.day];
    const i = dl.findIndex((x) => x.slot === o.slot);
    if (i >= 0) dl.splice(i, 1);
    scoreCache[o.classId] = null;
  };

  /* Partial: басқа сыныптардың слоттарын құлыптап орналастыру.
     Ескі нұсқадағы слот қазіргі деректе жоқ нәрсеге сілтесе (сынып/мұғалім/
     пән/кабинет өшірілген) — оны құлыптамай тастаймыз, әйтпесе place()
     жоқ кілтке жазып құлайды. Сынып сағаты (homeroom, teacherId="") да
     осында сүзіледі — оны ЭТАП 9 өзі қайта қосады. */
  if (input.partial) {
    const targetSet = new Set(input.partial.classIds);
    for (const b of input.partial.baseSlots) {
      if (targetSet.has(b.classId)) continue;
      if (b.subjectId === HOMEROOM_SUBJECT_ID) continue;
      if (!C[b.classId] || !T[b.teacherId] || !S[b.subjectId]) continue;
      if (!(gym && b.roomId === gym.id) && !R[b.roomId]) continue;
      place({ ...b, locked: true }, { skipDaySet: b.dpart === 2 });
    }
  }

  /* ЭТАП 2 — приоритет кезегі */
  prog(15, 2);
  const tasks: Task[] = [];
  // СанПиН (№ ҚР ДСМ-76): бастауыш сыныптарда қос сабақ өткізуге болмайды.
  // Қатаң тыйым емес — ескерту (мыс. «Сауат ашу» 6 сағ/апта қос сабақсыз сыймайды),
  // шешімді завуч қабылдайды: сағатты азайту не пәннің қос сабағын өшіру.
  const sanpinWarnings: string[] = [];
  for (const c of targetClasses)
    for (const cu of c.curriculum) {
      const s = S[cu.subjectId];
      if (!s || !cu.hours) continue;
      const doubles = s.canDouble && cu.hours > 5 ? cu.hours - 5 : 0;
      if (doubles > 0 && c.grade <= 4)
        sanpinWarnings.push(`${c.name}: «${s.name}» қос сабақпен қойылады — СанПиН бастауышта қос сабаққа рұқсат бермейді (сағатын азайтыңыз немесе пәннің «қос сабақ» белгісін алыңыз)`);
      tasks.push({
        cls: c, cu, s,
        pr: (s.room ? 100 : 0) + (s.room === "gym" ? 90 : 0) + (cu.isSplit ? 80 : 0) + cu.hours * 10 + s.score,
        order: weekOrder(s.score), singles: cu.hours - doubles * 2, doubles,
      });
    }
  tasks.sort((a, b) => b.pr - a.pr || a.cls.id.localeCompare(b.cls.id));

  /* топ бөлу тексеруі */
  const checkSplit = (tk: Task, day: number, slot: number): { teacherId: string; roomId: string }[] | null => {
    const { cls, s } = tk;
    if (slot > maxSlots(cls.grade)) return null;
    if (cm[cls.id][day][slot] !== null) return null;
    if (ds[cls.id][day].has(s.id)) return null;
    if (s.bannedSlots && s.bannedSlots.includes(`${day}-${slot}`)) return null;
    if (eff(cls, s) > 4 && fatigueAt(cls.id, day, slot) > fatThrS(cls.grade, settings)) return null;
    if (dScore[cls.id][day] + eff(cls, s) > dayLimitS(cls.grade, settings)) return null;
    const prev = cm[cls.id][day][slot - 1];
    if (prev && (s.black.includes(S[prev].name) || S[prev].black.includes(s.name))) return null;
    if (prev && S[prev].digital && s.score > 5) return null;
    const res: { teacherId: string; roomId: string }[] = [];
    const usedR = new Set<string>(); const usedT = new Set<string>();
    for (const g of tk.cu.groups || []) {
      const t = T[g.teacherId];
      if (!t || usedT.has(g.teacherId)) return null;
      if (tm[g.teacherId][cls.shift][day][slot] !== null) return null;
      if (cls.grade < t.gradeMin || cls.grade > t.gradeMax) return null;
      if (t.shift !== 3 && t.shift !== cls.shift) return null;
      if (t.unavailable.includes(`${day}-${slot}`)) return null;
      if (!interShiftOk(t, cls.shift, day)) return null;
      usedT.add(g.teacherId);
      let roomId: string | null = null;
      if (g.roomId) {
        const r = rooms.find((x) => x.id === g.roomId);
        if (r && r.type !== "gym" && rm[r.id][cls.shift][day][slot] === null && !usedR.has(r.id)) roomId = r.id;
      }
      if (!roomId) roomId = findRoom(cls, { ...s, room: null }, day, slot, usedR);
      if (!roomId) return null;
      usedR.add(roomId);
      res.push({ teacherId: g.teacherId, roomId });
    }
    return res.length >= 2 ? res : null;
  };

  /* қос сабақ жұбын тексеру */
  const checkDouble = (tk: Task, day: number, slot: number): string | null => {
    const { cls, s } = tk;
    if (slot + 1 > maxSlots(cls.grade)) return null;
    // кеш сабақ шегі: жұптың екінші жартысы да шектен аспауы керек
    { const lim = lateLimitOf(s); if (lim && slot + 1 > lim) return null; }
    const e1 = hardCheck(cls, tk.cu.teacherId!, s, day, slot);
    if (e1) return null;
    if (cm[cls.id][day][slot + 1] !== null) return null;
    if (tm[tk.cu.teacherId!][cls.shift][day][slot + 1] !== null) return null;
    if (T[tk.cu.teacherId!].unavailable.includes(`${day}-${slot + 1}`)) return null;
    if (s.bannedSlots && s.bannedSlots.includes(`${day}-${slot + 1}`)) return null;
    if (dScore[cls.id][day] + eff(cls, s) * 2 > dayLimitS(cls.grade, settings)) return null;
    if (s.score > 4 && fatigueAt(cls.id, day, slot) + s.score * SLOT_K[slot] > fatThrS(cls.grade, settings) + s.score) {
      // екінші бөлік шаршауы шамамен — қатаң тексеру:
    }
    const next2 = slot + 2 <= 8 ? cm[cls.id][day][slot + 2] : null;
    if (next2 && (s.black.includes(S[next2].name) || S[next2].black.includes(s.name))) return null;
    const r1 = findRoom(cls, s, day, slot);
    if (!r1) return null;
    // сол кабинет екінші слотта да бос ба
    if (s.room === "gym") {
      if (gymOcc[cls.shift][day][slot + 1].length >= (gym?.gymMax || 1)) return null;
    } else if (rm[r1][cls.shift][day][slot + 1] !== null) return null;
    return r1;
  };

  /* ЯКОРЬ (ақылды жаңарту): қайта құрылатын сыныптардың ескі сабақтары
     жаңа деректе әлі жарамды болса, дәл сол күн/слотына алдын ала қойылады —
     кесте бұрынғы нұсқаға барынша ұқсас қалады. Жарамсыздары (кеткен мұғалім,
     азайған сағат, бос емес уақыт) тасталады, орнын төмендегі greedy толтырады.
     Мұғалім ауысқан пәнде де ОРНЫ сақталуы мүмкін — жаңа мұғалім сол уақытта
     бос болса. Слоттар құлыпталмайды: тесік жамау/жайлылық кезеңдері қажет
     болса ғана жылжыта алады. */
  if (input.partial?.anchor) {
    const targetSet = new Set(input.partial.classIds);
    const oldByKey = new Map<string, Slot[]>();
    for (const b of input.partial.baseSlots) {
      if (!targetSet.has(b.classId) || b.subjectId === HOMEROOM_SUBJECT_ID) continue;
      const k = `${b.classId}|${b.subjectId}`;
      const arr = oldByKey.get(k);
      if (arr) arr.push(b); else oldByKey.set(k, [b]);
    }
    for (const tk of tasks) {
      const oldSlots = (oldByKey.get(`${tk.cls.id}|${tk.s.id}`) || [])
        .slice().sort((a, b) => a.day - b.day || a.slot - b.slot);
      if (!oldSlots.length) continue;

      if (tk.cu.isSplit) {
        // Топ бөлінген пән: Г1 слоты — күн/слот маркері; топтарды (қазіргі
        // мұғалім/кабинетпен) checkSplit өзі құрады
        for (const o of oldSlots) {
          if (tk.singles <= 0) break;
          if (o.groupId !== "Г1") continue;
          const gs = checkSplit(tk, o.day, o.slot);
          if (!gs) continue;
          gs.forEach((g, i) =>
            place({ classId: tk.cls.id, subjectId: tk.s.id, teacherId: g.teacherId, roomId: g.roomId, groupId: "Г" + (i + 1), day: o.day, slot: o.slot, shift: tk.cls.shift, score: pScore(tk.s, o.slot, settings) }));
          tk.singles--;
        }
        continue;
      }

      // Қос сабақ жұптары (dpart 1+2) — жұп күйінде сақтауға тырысамыз
      for (const o of oldSlots) {
        if (tk.doubles <= 0) break;
        if (o.dpart !== 1) continue;
        const r = checkDouble(tk, o.day, o.slot);
        if (!r) continue;
        place({ classId: tk.cls.id, subjectId: tk.s.id, teacherId: tk.cu.teacherId!, roomId: r, day: o.day, slot: o.slot, shift: tk.cls.shift, score: pScore(tk.s, o.slot, settings), dpart: 1 });
        place({ classId: tk.cls.id, subjectId: tk.s.id, teacherId: tk.cu.teacherId!, roomId: r, day: o.day, slot: o.slot + 1, shift: tk.cls.shift, score: pScore(tk.s, o.slot + 1, settings), dpart: 2 }, { skipDaySet: true });
        tk.doubles--;
      }

      // Жеке сағаттар — ескі кабинеті бос болса сонда, әйтпесе жаңа кабинет
      for (const o of oldSlots) {
        if (tk.singles <= 0) break;
        if (o.dpart === 2) continue; // жұптың екінші жартысы жеке есептелмейді
        if (hardCheck(tk.cls, tk.cu.teacherId!, tk.s, o.day, o.slot)) continue;
        const oldRoom = R[o.roomId];
        let roomId: string | null = null;
        if (oldRoom && oldRoom.type !== "gym"
          && (tk.s.room ? oldRoom.type === tk.s.room : true)
          && rm[oldRoom.id][tk.cls.shift][o.day][o.slot] === null) roomId = oldRoom.id;
        if (!roomId) roomId = findRoom(tk.cls, tk.s, o.day, o.slot);
        if (!roomId) continue;
        place({ classId: tk.cls.id, subjectId: tk.s.id, teacherId: tk.cu.teacherId!, roomId, day: o.day, slot: o.slot, shift: tk.cls.shift, score: pScore(tk.s, o.slot, settings) });
        tk.singles--;
      }
    }
  }

  /* ЭТАП 3-4 — greedy */
  prog(25, 3);
  const unplaced: Unplaced[] = [];
  const dayCount = (cid: string, day: number) =>
    slots.filter((o) => o.classId === cid && o.day === day && (!o.groupId || o.groupId === "Г1")).length;
  const bestInDay = (tk: Task, day: number, ignoreQuota = false): { slot: number; sc: number } | null => {
    if (!ignoreQuota && dayCount(tk.cls.id, day) >= dayQuota[tk.cls.id][day]) return null;
    let best: { slot: number; sc: number } | null = null;
    for (let slot = 1; slot <= maxSlots(tk.cls.grade); slot++) {
      let ok = false;
      if (tk.cu.isSplit) ok = !!checkSplit(tk, day, slot);
      else ok = !hardCheck(tk.cls, tk.cu.teacherId!, tk.s, day, slot) && !!findRoom(tk.cls, tk.s, day, slot);
      if (ok) {
        const sc = pScore(tk.s, slot, settings);
        if (!best || sc > best.sc) best = { slot, sc };
      }
    }
    return best;
  };
  const doPlace = (tk: Task, day: number, slot: number): boolean => {
    if (tk.cu.isSplit) {
      const gs = checkSplit(tk, day, slot);
      if (!gs) return false;
      gs.forEach((g, i) =>
        place({ classId: tk.cls.id, subjectId: tk.s.id, teacherId: g.teacherId, roomId: g.roomId, groupId: "Г" + (i + 1), day, slot, shift: tk.cls.shift, score: pScore(tk.s, slot, settings) }));
      return true;
    }
    const roomId = findRoom(tk.cls, tk.s, day, slot);
    if (!roomId) return false;
    place({ classId: tk.cls.id, subjectId: tk.s.id, teacherId: tk.cu.teacherId!, roomId, day, slot, shift: tk.cls.shift, score: pScore(tk.s, slot, settings) });
    return true;
  };

  let done = 0;
  const shortList: { tk: Task; left: number }[] = [];
  for (const tk of tasks) {
    let placedD = 0, placedS = 0;
    for (const day of tk.order) {
      if (placedD >= tk.doubles) break;
      if (ds[tk.cls.id][day].has(tk.s.id)) continue;
      let bestSlot = -1, bestSc = -1, bestRoom = "";
      for (let slot = 1; slot < maxSlots(tk.cls.grade); slot++) {
        const r = checkDouble(tk, day, slot);
        if (r) { const sc = (pScore(tk.s, slot, settings) + pScore(tk.s, slot + 1, settings)) / 2; if (sc > bestSc) { bestSc = sc; bestSlot = slot; bestRoom = r; } }
      }
      if (bestSlot > 0) {
        place({ classId: tk.cls.id, subjectId: tk.s.id, teacherId: tk.cu.teacherId!, roomId: bestRoom, day, slot: bestSlot, shift: tk.cls.shift, score: pScore(tk.s, bestSlot, settings), dpart: 1 });
        place({ classId: tk.cls.id, subjectId: tk.s.id, teacherId: tk.cu.teacherId!, roomId: bestRoom, day, slot: bestSlot + 1, shift: tk.cls.shift, score: pScore(tk.s, bestSlot + 1, settings), dpart: 2 }, { skipDaySet: true });
        placedD++;
      }
    }
    while (placedS < tk.singles) {
      // 1-кезек: квотаны құрметтеп (күнге тең бөлу). Толса — квотасыз фолбэк.
      const tryRound = (ignoreQuota: boolean) => {
        let best: { day: number; slot: number; val: number } | null = null;
        tk.order.forEach((day, idx) => {
          if (ds[tk.cls.id][day].has(tk.s.id)) return;
          const b = bestInDay(tk, day, ignoreQuota);
          if (!b) return;
          // квота қалдығы: толмаған күн артық ұпай алады (тең бөлу стимулы)
          const room = dayQuota[tk.cls.id][day] - dayCount(tk.cls.id, day);
          const head = (dayLimit(tk.cls.grade) - dScore[tk.cls.id][day]) / dayLimit(tk.cls.grade);
          const val = b.sc + head * 2 + room * 2.5 - idx * 0.4
            + (seed === 0 ? 0 : (rng() - 0.5) * 1.5); // әртүрлі нұсқа үшін ұсақ шу
          if (!best || val > best.val) best = { day, slot: b.slot, val };
        });
        return best;
      };
      const pick = tryRound(false) || tryRound(true);
      if (!pick) break;
      const ok: { day: number; slot: number; val: number } = pick;
      if (!doPlace(tk, ok.day, ok.slot)) break;
      placedS++;
    }
    // СОҢҒЫ ӘРЕКЕТ: квотаны елемей, ЕҢ БОС (балл) күнге қою (тең жүктеу)
    while (placedS < tk.singles) {
      const days = [1, 2, 3, 4, 5]
        .filter((d) => !ds[tk.cls.id][d].has(tk.s.id))
        .sort((a, b) => dScore[tk.cls.id][a] - dScore[tk.cls.id][b]);
      let done2 = false;
      for (const day of days) {
        const b = bestInDay(tk, day, true);
        if (b && doPlace(tk, day, b.slot)) { placedS++; done2 = true; break; }
      }
      if (!done2) break;
    }
    const left = tk.singles + tk.doubles - placedS - placedD;
    if (left > 0) shortList.push({ tk, left });
    done++;
    if (done % 10 === 0) prog(25 + Math.round((done / tasks.length) * 25), 3);
  }

  /* ЭТАП 5.5 — REPAIR: кедергі сабақты жылжытып, орнына дефицитті қою */
  prog(52, 3);
  for (const st of shortList) {
    const { tk } = st;
    if (tk.cu.isSplit || tk.doubles > 0) continue; // топ/қос — repair-сыз
    const cls = tk.cls, subj = tk.s;
    let guard = 0;
    while (st.left > 0 && guard++ < 30) {
      let fixed = false;
      for (let day = 1; day <= 5 && !fixed; day++) {
        if (ds[cls.id][day].has(subj.id)) continue;
        for (let slot = 1; slot <= maxSlots(cls.grade) && !fixed; slot++) {
          const occ = slots.find((o) => o.classId === cls.id && o.day === day && o.slot === slot && !o.groupId && !o.dpart && !o.locked);
          if (!occ) continue;
          const oSub = S[occ.subjectId];
          const snapshot = { ...occ };
          removeSlot(occ);
          // кедергіні басқа орынға көшіруге тырысамыз
          let movedSlot: Slot | null = null;
          for (let d2 = 1; d2 <= 5 && !movedSlot; d2++) {
            if (ds[cls.id][d2].has(snapshot.subjectId)) continue;
            for (let s2 = 1; s2 <= maxSlots(cls.grade) && !movedSlot; s2++) {
              if (d2 === day && s2 === slot) continue;
              if (hardCheck(cls, snapshot.teacherId, oSub, d2, s2)) continue;
              const r2 = findRoom(cls, oSub, d2, s2);
              if (!r2) continue;
              movedSlot = place({ classId: snapshot.classId, subjectId: snapshot.subjectId, teacherId: snapshot.teacherId, roomId: r2, day: d2, slot: s2, shift: snapshot.shift, score: pScore(oSub, s2, settings) });
            }
          }
          if (!movedSlot) { place(snapshot); continue; }
          // енді дефицитті босаған ұяға қоямыз
          if (!hardCheck(cls, tk.cu.teacherId!, subj, day, slot)) {
            const r = findRoom(cls, subj, day, slot);
            if (r) {
              place({ classId: cls.id, subjectId: subj.id, teacherId: tk.cu.teacherId!, roomId: r, day, slot, shift: cls.shift, score: pScore(subj, slot, settings) });
              st.left--; fixed = true; continue;
            }
          }
          // болмады — бәрін кері қайтарамыз
          removeSlot(movedSlot);
          place(snapshot);
        }
      }
      if (!fixed) break;
    }
  }

  /* ЭТАП 5.6 — МАТЕМАТИКА OVERFLOW: 1-4-ке сыймаған математика/алгебра/
     геометрия сабақтарын 5-6-ға қоямыз (күннің соңы емес). Негізгі
     орналастыру 1-4-те теңгерімді жинады; бұл — тек сол сыймай қалғандар. */
  mathOverflow = true;
  for (const st of shortList) {
    if (st.left <= 0 || !MATH_SET.has(st.tk.s.id) || st.tk.cu.isSplit || st.tk.doubles > 0) continue;
    const cls = st.tk.cls, subj = st.tk.s, tid = st.tk.cu.teacherId!;
    for (let day = 1; day <= 5 && st.left > 0; day++) {
      if (ds[cls.id][day].has(subj.id)) continue;
      for (let slot = MATH_PREFERRED + 1; slot <= MATH_OVERFLOW && st.left > 0; slot++) {
        if (hardCheck(cls, tid, subj, day, slot)) continue;
        const room = findRoom(cls, subj, day, slot);
        if (!room) continue;
        place({ classId: cls.id, subjectId: subj.id, teacherId: tid, roomId: room, day, slot, shift: cls.shift, score: pScore(subj, slot, settings) });
        st.left--;
      }
    }
  }
  mathOverflow = false;

  /* ЭТАП 5.65 — АВТО ЖҰМСАРТУ: жаңа педагогикалық ережелерге (алгебра+геометрия,
     орыс тілі+әдебиеті, қиын-соң-қиын) байланысты 1-4/қатаң режимде сыймай
     қалған сабақтарды жұмсақ режимде орналастырамыз. Конфликт (физика заңы)
     ӘРҚАШАН сақталады — тек қалаулы ережелер босаңсиды. Осылай жаңа ережелер
     сыятын жерде қатаң сақталады, ал сыймаса — сабақ жоғалмайды (регрессия жоқ). */
  for (const st of shortList) {
    if (st.left <= 0 || st.tk.cu.isSplit || st.tk.doubles > 0) continue;
    const cls = st.tk.cls, subj = st.tk.s, tid = st.tk.cu.teacherId!;
    for (let day = 1; day <= 5 && st.left > 0; day++) {
      if (ds[cls.id][day].has(subj.id)) continue;
      for (let slot = 1; slot <= maxSlots(cls.grade) && st.left > 0; slot++) {
        if (hardCheck(cls, tid, subj, day, slot, false, true)) continue; // soft=true
        const room = findRoom(cls, subj, day, slot);
        if (!room) continue;
        place({ classId: cls.id, subjectId: subj.id, teacherId: tid, roomId: room, day, slot, shift: cls.shift, score: pScore(subj, slot, settings) });
        st.left--;
      }
    }
  }

  /* ЭТАП 5.68 — СОҢҒЫ КЕПІЛ (тек конфликт): жаңа педагогикалық ережелер де,
     қалаулы лимиттер де сыйғыза алмаған сабақ қалса — тек ФИЗИКА ЗАҢЫН
     (сынып/мұғалім/кабинет бос, бір күн — бір пән) тексеріп орналастырамыз.
     Мұнсыз жаңа ережелер тығыз кестеде сабақ жоғалтуы мүмкін еді (регрессия). */
  // ЕКІ АЙНАЛЫМ: 1-айналымда құрылымдық + қиын-қатар ережелеріне САЙ бос ұя
  // іздейміз; табылмаса ғана 2-айналымда кез келген конфликтсіз ұяға қоямыз.
  const guaranteePlace = (cls: Klass, subj: Subject, tid: string): boolean => {
    const tt = T[tid]; if (!tt) return false;
    if (cls.grade < tt.gradeMin || cls.grade > tt.gradeMax) return false;
    if (tt.shift !== 3 && tt.shift !== cls.shift) return false;
    for (const respectRules of [true, false]) {
      for (let day = 1; day <= 5; day++) {
        if (ds[cls.id][day].has(subj.id)) continue;
        for (let slot = 1; slot <= maxSlots(cls.grade); slot++) {
          if (cm[cls.id][day][slot] !== null) continue;
          if (tm[tid][cls.shift][day][slot] !== null) continue;
          if (tt.unavailable.includes(`${day}-${slot}`)) continue;
          if (!interShiftOk(tt, cls.shift, day)) continue;
          if (subj.bannedSlots && subj.bannedSlots.includes(`${day}-${slot}`)) continue;
          if (respectRules && (structuralViolation(cls, subj, day, slot) || hardRunViolation(cls, subj, day, slot))) continue;
          const room = findRoom(cls, subj, day, slot);
          if (!room) continue;
          place({ classId: cls.id, subjectId: subj.id, teacherId: tid, roomId: room, day, slot, shift: cls.shift, score: pScore(subj, slot, settings) });
          return true;
        }
      }
    }
    return false;
  };
  for (const st of shortList) {
    if (st.tk.cu.isSplit || st.tk.doubles > 0) continue;
    while (st.left > 0 && guaranteePlace(st.tk.cls, st.tk.s, st.tk.cu.teacherId!)) st.left--;
  }

  for (const st of shortList)
    if (st.left > 0)
      unplaced.push({ className: st.tk.cls.name, subject: st.tk.s.name, placed: st.tk.cu.hours - st.left, need: st.tk.cu.hours, reason: "орын табылмады (repair-дан кейін де)" });

  /* ЭТАП 5.7 — ЖҰМСАҚ ТОЛТЫРУ (softFill)
     Қатаң режимде сыймаған сабақтарды қалаулы ережелерді нүктелі
     жұмсартып орналастырамыз. Физика заңы (конфликт) сақталады —
     тек лимит/баланс/қара тізім сияқты қалаулы ережелер жұмсартылады.
     Бұзылған әр ереже softWarnings-ке қызыл ескерту ретінде жазылады. */
  const softWarnings: string[] = [];
  if (input.softFill && unplaced.length > 0) {
    const stillUnplaced: Unplaced[] = [];
    for (const u of unplaced) {
      const st = shortList.find((s) => s.tk.cls.name === u.className && s.tk.s.name === u.subject && s.left > 0);
      if (!st) { stillUnplaced.push(u); continue; }
      const cls = st.tk.cls, subj = st.tk.s, tid = st.tk.cu.teacherId;
      if (!tid || st.tk.cu.isSplit) { stillUnplaced.push(u); continue; }

      while (st.left > 0) {
        let placed = false;
        const maxExtra = settings.relax ? settings.relax.extraSlots : 2;
        outer:
        for (let day = 1; day <= 5; day++) {
          for (let slot = 1; slot <= maxSlots(cls.grade) + maxExtra; slot++) {
            // soft=true (қалаулы ережелерді жұмсарт), бірақ skipDayRule=false
            // ("бір күн — бір пән" мен конфликт сақталады — олар қатаң).
            if (hardCheck(cls, tid, subj, day, slot, false, true)) continue;
            const room = findRoom(cls, subj, day, slot);
            if (!room) continue;
            const viols = softViolations(cls, subj, day, slot);
            place({ classId: cls.id, subjectId: subj.id, teacherId: tid, roomId: room, day, slot, shift: cls.shift, score: pScore(subj, slot, settings) });
            viols.forEach((v) => softWarnings.push(`⚠ ${v}`));
            st.left--; placed = true;
            break outer;
          }
        }
        if (!placed) break;
      }
      if (st.left > 0) stillUnplaced.push({ ...u, placed: u.need - st.left, reason: "конфликтсіз орын жоқ (физика шегі)" });
    }
    unplaced.length = 0;
    unplaced.push(...stillUnplaced);
    if (softWarnings.length > 0) {
      softWarnings.unshift(`Жұмсақ режим: кейбір сабақтар қалаулы ережелерді жұмсартып орналастырылды.`);
    }
  }

  /* ЭТАП 6 — maximin (кэшпен) */
  prog(58, 4);
  const classScore = (cid: string): number => {
    if (scoreCache[cid] != null) return scoreCache[cid]!;
    // locked слоттар да есептеледі: partial режимде қозғалмаған сыныптардың
    // кестесі толығымен locked — оларсыз сапа есебінде 0% көрініп қалады.
    // (Maximin тек targetClasses-пен жұмыс істейді, оларда locked слот жоқ —
    // сондықтан оптимизацияға әсер етпейді.)
    const arr = slots.filter((o) => o.classId === cid && (!o.groupId || o.groupId === "Г1"));
    if (!arr.length) { scoreCache[cid] = 0; return 0; }
    const avg = arr.reduce((s, o) => s + o.score, 0) / arr.length;
    const dsc = [1, 2, 3, 4, 5].map((d) => dScore[cid][d]);
    const m = dsc.reduce((a, b) => a + b, 0) / 5;
    const v = dsc.reduce((a, b) => a + (b - m) * (b - m), 0) / 5;
    const res = Math.round(avg * 10 * 0.6 + Math.max(0, 100 - v * 2) * 0.4);
    scoreCache[cid] = res;
    return res;
  };
  let iters = 0;
  if (settings.maximin) {
    const maxIt = settings.maxIterations || 400;
    while (iters < maxIt) {
      const sorted = targetClasses.slice().sort((a, b) => classScore(a.id) - classScore(b.id));
      const worst = sorted[0];
      if (!worst || classScore(worst.id) >= 70) break;
      const cand = slots
        .filter((o) => o.classId === worst.id && !o.groupId && !o.dpart && !o.locked)
        .sort((a, b) => a.score - b.score).slice(0, 5);
      let improved = false;
      for (const o of cand) {
        const subj = S[o.subjectId];
        removeSlot(o);
        let best: { day: number; slot: number; ns: number; roomId: string } | null = null;
        for (let day = 1; day <= 5; day++) {
          if (ds[worst.id][day].has(o.subjectId)) continue;
          for (let slot = 1; slot <= maxSlots(worst.grade); slot++) {
            const ns = pScore(subj, slot, settings);
            if (ns <= o.score) continue;
            if (hardCheck(worst, o.teacherId, subj, day, slot)) continue;
            const roomId = findRoom(worst, subj, day, slot);
            if (!roomId) continue;
            if (!best || ns > best.ns) best = { day, slot, ns, roomId };
          }
        }
        if (best) {
          place({ classId: o.classId, subjectId: o.subjectId, teacherId: o.teacherId, roomId: best.roomId, day: best.day, slot: best.slot, shift: o.shift, score: best.ns });
          improved = true; iters++; break;
        } else place(o);
      }
      if (!improved) break;
      if (iters % 20 === 0) prog(58 + Math.min(15, Math.round(iters / maxIt * 15)), 4);
    }
  }

  /* ЭТАП 7 — мұғалім терезелері */
  prog(76, 5);
  for (const t of teachers)
    for (const sh of [1, 2] as const)
      for (let day = 1; day <= 5; day++) {
        const ts = slots.filter((o) => o.teacherId === t.id && o.shift === sh && o.day === day && !o.groupId && !o.dpart && !o.locked).sort((a, b) => a.slot - b.slot);
        for (let i = 0; i < ts.length - 1; i++) {
          const a = ts[i], b = ts[i + 1];
          if (b.slot - a.slot <= 1) continue;
          const target = a.slot + 1, cls = C[a.classId], subj = S[a.subjectId];
          if (pScore(subj, target, settings) < a.score) continue;
          removeSlot(a);
          if (!hardCheck(cls, a.teacherId, subj, day, target)) {
            const roomId = findRoom(cls, subj, day, target);
            if (roomId) { place({ classId: a.classId, subjectId: a.subjectId, teacherId: a.teacherId, roomId, day, slot: target, shift: a.shift, score: pScore(subj, target, settings) }); continue; }
          }
          place(a);
        }
      }

  /* ЭТАП 7.5 — КҮНІШІЛІК BACKTRACKING: тесіксіз орналастыру.
     Әр сынып-күн үшін: сол күнгі барлық сабақты жинап, 1..N ұяларға
     ТЫҒЫЗ (тесіксіз) әрі барлық ережеге сай орналастыратын тәртіпті
     іздейміз. Backtracking барлық нұсқаны сынайды; тесіксіз шешім бар
     болса — табады. Болмаса (шынайы ресурс шегі) — бар күйінде қалады. */
  prog(82, 5);

  interface DayUnit {
    keys: string[];        // осы сабақтың слот объектілерінің key-лері (топ: 2, қос: 2)
    teacherIds: string[];  // барлық мұғалім (топта 2)
    roomIds: string[];     // бастапқы кабинеттер
    subjectId: string;
    isDouble: boolean;     // қос сабақ па (2 қатар ұя алады)
    isSplit: boolean;
  }

  const rebuildDay = (c: Klass, day: number, windowAware = false) => {
    const dayItems = slots.filter((o) => o.classId === c.id && o.day === day);
    if (dayItems.length < 2) return;

    // тесік бар ма — болмаса тиіспейміз
    const occ0 = dayItems.filter((o) => !o.groupId || o.groupId === "Г1").map((o) => o.slot).sort((a, b) => a - b);
    const maxO0 = occ0[occ0.length - 1];
    let hasGap = false;
    for (let sl = 1; sl < maxO0; sl++) if (!occ0.includes(sl)) { hasGap = true; break; }
    if (!hasGap) return;

    // слот бойынша топтап, DayUnit тізімін құрамыз
    const bySlot = new Map<number, Slot[]>();
    for (const o of dayItems) { const a = bySlot.get(o.slot) || []; a.push(o); bySlot.set(o.slot, a); }
    const units: DayUnit[] = [];
    const handledDoubleSlots = new Set<number>();
    for (const sl of [...bySlot.keys()].sort((a, b) => a - b)) {
      const grp = bySlot.get(sl)!;
      const dp = grp.find((o) => o.dpart);
      if (dp) {
        // қос сабақ: dpart=1 слотынан ғана бір unit жасаймыз
        if (dp.dpart === 2 || handledDoubleSlots.has(sl)) continue;
        const partner = bySlot.get(sl + 1)?.filter((o) => o.dpart === 2 && o.subjectId === dp.subjectId) || [];
        handledDoubleSlots.add(sl + 1);
        units.push({
          keys: [...grp.map((o) => o.key), ...partner.map((o) => o.key)],
          teacherIds: [grp[0].teacherId], roomIds: [grp[0].roomId],
          subjectId: dp.subjectId, isDouble: true, isSplit: false,
        });
      } else {
        const isSplit = grp.length > 1 || grp.some((o) => o.groupId);
        units.push({
          keys: grp.map((o) => o.key),
          teacherIds: grp.map((o) => o.teacherId),
          roomIds: grp.map((o) => o.roomId),
          subjectId: grp[0].subjectId, isDouble: false, isSplit,
        });
      }
    }

    const N = units.length;
    // осы күн-ауысымдағы осы сыныптың мұғалімдерінің терезе саны (жеңіл бағалау)
    const dayTeacherWindows = (): number => {
      const tIds = new Set<string>();
      units.forEach((u) => u.teacherIds.forEach((id) => tIds.add(id)));
      let w = 0;
      for (const tid of tIds) {
        const ss = [...new Set(slots.filter((o) => o.teacherId === tid && o.shift === c.shift && o.day === day).map((o) => o.slot))].sort((a, b) => a - b);
        if (ss.length < 2) continue;
        w += ss[ss.length - 1] - ss[0] + 1 - ss.length;
      }
      return w;
    };
    const lessonCount = units.reduce((s, u) => s + (u.isDouble ? 2 : 1), 0);
    if (lessonCount > maxSlots(c.grade)) return; // сыймайды — тиіспейміз

    // объект key → бастапқы Slot (өшіру/қою үшін)
    const snapByKey = new Map<string, Slot>();
    for (const o of dayItems) snapByKey.set(o.key, { ...o });
    // барлығын өшіреміз
    for (const o of dayItems) removeSlot(o);

    // unit-ті берілген slot-қа қоюға БОЛА МА (place жасамай тексеру)
    const canPlace = (u: DayUnit, slot: number): { rooms: Map<string, string> } | null => {
      const slotsNeeded = u.isDouble ? [slot, slot + 1] : [slot];
      if (slot + (u.isDouble ? 1 : 0) > maxSlots(c.grade)) return null;
      const g1key = u.keys[0];
      const subj = S[u.subjectId];
      // hard ереже (бірінші слот, бір-күн-бір-пән елемейміз — бәрі бір күн)
      for (const sl of slotsNeeded)
        if (hardCheck(c, snapByKey.get(g1key)!.teacherId, subj, day, sl, true)) return null;
      const roomAssign = new Map<string, string>();
      const usedR = new Set<string>();
      // топтың әр мүшесі (немесе қос сабақтың 1-бөлігі)
      const members = u.isSplit
        ? u.keys.map((k) => snapByKey.get(k)!)
        : [snapByKey.get(g1key)!];
      for (const m of members) {
        // мұғалім барлық қажет слотта бос па
        for (const sl of slotsNeeded)
          if (tm[m.teacherId][c.shift][day][sl] !== null) return null;
        // кабинет
        let room: string | null = null;
        if (gym && m.roomId === gym.id) {
          for (const sl of slotsNeeded) if (gymOcc[c.shift][day][sl].length >= (gym.gymMax || 1)) return null;
          // спортзал топ үйлесімі (findRoom-мен бірдей): залды бөлісетін сыныптар
          // бір жас-тобында болуы керек — әйтпесе тесік жабу «Спортзал ережелерін»
          // бұзады. Бұрын grp тек ТАБЫЛАТЫН, бірақ бар сыныптармен САЛЫСТЫРЫЛМАЙТЫН.
          const groups = gym.gymGroups && gym.gymGroups.length ? gym.gymGroups : [[1, 11]];
          const grp = groups.find((g) => g[0] <= c.grade && c.grade <= g[1]);
          if (!grp) return null;
          for (const sl of slotsNeeded)
            for (const oc of gymOcc[c.shift][day][sl]) {
              const ocl = C[oc];
              if (ocl && !(grp[0] <= ocl.grade && ocl.grade <= grp[1])) return null;
            }
          room = gym.id;
        } else if (settings.cabinetSystem && subj.roomId && R[subj.roomId]
          && !usedR.has(subj.roomId) && slotsNeeded.every((sl) => rm[subj.roomId!][c.shift][day][sl] === null)) {
          // КАБИНЕТТІК ЖҮЙЕ: өз кабинеті бос болса — сол; әйтпесе төмендегі
          // жалпы іздеуге түседі (findRoom overflow-мен бірдей мінез)
          room = subj.roomId;
        } else {
          // бастапқы кабинет барлық слотта бос па
          const origFree = slotsNeeded.every((sl) => rm[m.roomId][c.shift][day][sl] === null) && !usedR.has(m.roomId);
          if (origFree) room = m.roomId;
          else {
            // басқа бос кабинет тап (арнайы→сол тип, әйтпесе regular)
            const cand = rooms.find((r) =>
              (subj.room ? r.type === subj.room : r.type === "regular") &&
              !usedR.has(r.id) &&
              slotsNeeded.every((sl) => rm[r.id][c.shift][day][sl] === null));
            if (!cand) return null;
            room = cand.id;
          }
        }
        roomAssign.set(m.key, room);
        if (room !== gym?.id) usedR.add(room);
      }
      return { rooms: roomAssign };
    };

    // backtracking: units-ті 1..lessonCount ұяларына ТЕСІКСІЗ орналастыру.
    // Бірнеше тесіксіз нұсқаны тауып, мұғалімге ЕҢ ЫҢҒАЙЛЫСЫН (терезесі азын)
    // таңдаймыз. Сынып тесіксіздігі — әрқашан кепілді (тек тесіксіздер жиналады).
    const order: { unit: DayUnit; slot: number; rooms: Map<string, string> }[] = [];
    const usedUnits = new Set<number>();
    // ең үздік нұсқа: units реті (slot бойынша) + кабинеттер + мұғалім терезе саны
    type Solution = { seq: { uIdx: number; slot: number; rooms: Map<string, string> }[]; windows: number };
    const bestHolder: { sol: Solution | null } = { sol: null };
    let tries = 0;
    const MAX_TRIES = windowAware ? 150 : 1; // windowAware: мұғалімге ыңғайлы нұсқа іздеу // бірнеше тесіксіз нұсқаны салыстырып, мұғалімге ыңғайлысын таңдау

    const applySeq = (seq: { uIdx: number; slot: number; rooms: Map<string, string> }[]): Slot[] => {
      const placed: Slot[] = [];
      for (const step of seq) {
        const u = units[step.uIdx];
        const members = u.isSplit ? u.keys.map((k) => snapByKey.get(k)!) : [snapByKey.get(u.keys[0])!];
        if (u.isDouble) {
          const m = snapByKey.get(u.keys[0])!;
          const room = step.rooms.get(m.key)!;
          placed.push(place({ ...m, slot: step.slot, roomId: room, score: pScore(S[u.subjectId], step.slot, settings), dpart: 1 }));
          placed.push(place({ ...m, slot: step.slot + 1, roomId: room, score: pScore(S[u.subjectId], step.slot + 1, settings), dpart: 2 }, { skipDaySet: true }));
        } else {
          members.forEach((m, mi) => {
            const room = step.rooms.get(m.key)!;
            placed.push(place({ ...m, slot: step.slot, roomId: room, score: pScore(S[u.subjectId], step.slot, settings) }, { skipDaySet: mi > 0 }));
          });
        }
      }
      return placed;
    };

    const solve = (nextSlot: number) => {
      if (bestHolder.sol && bestHolder.sol.windows === 0) return; // мінсіз табылды — тоқта
      // тесіксіз шешім ТАБЫЛҒАНША шек қойылмайды; табылған соң ғана MAX_TRIES шектейді
      if (bestHolder.sol && tries > MAX_TRIES) return;
      if (order.length === N) {
        // толық тесіксіз нұсқа — мұғалім терезесін бағалаймыз
        tries++;
        const w = dayTeacherWindows();
        if (!bestHolder.sol || w < bestHolder.sol.windows)
          bestHolder.sol = { seq: order.map((o) => ({ uIdx: units.indexOf(o.unit), slot: o.slot, rooms: o.rooms })), windows: w };
        return;
      }
      if (nextSlot > maxSlots(c.grade)) return;
      const idxs = units
        .map((_, i) => i)
        .filter((i) => !usedUnits.has(i))
        .sort((a, b) => eff(c, S[units[b].subjectId]) - eff(c, S[units[a].subjectId]));
      for (const i of idxs) {
        const u = units[i];
        const res = canPlace(u, nextSlot);
        if (!res) continue;
        const members = u.isSplit ? u.keys.map((k) => snapByKey.get(k)!) : [snapByKey.get(u.keys[0])!];
        const placedSlots: Slot[] = [];
        if (u.isDouble) {
          const m = snapByKey.get(u.keys[0])!;
          const room = res.rooms.get(m.key)!;
          placedSlots.push(place({ ...m, slot: nextSlot, roomId: room, score: pScore(S[u.subjectId], nextSlot, settings), dpart: 1 }));
          placedSlots.push(place({ ...m, slot: nextSlot + 1, roomId: room, score: pScore(S[u.subjectId], nextSlot + 1, settings), dpart: 2 }, { skipDaySet: true }));
        } else {
          members.forEach((m, mi) => {
            const room = res.rooms.get(m.key)!;
            placedSlots.push(place({ ...m, slot: nextSlot, roomId: room, score: pScore(S[u.subjectId], nextSlot, settings) }, { skipDaySet: mi > 0 }));
          });
        }
        order.push({ unit: u, slot: nextSlot, rooms: res.rooms });
        usedUnits.add(i);
        const advance = u.isDouble ? nextSlot + 2 : nextSlot + 1;
        solve(advance);
        placedSlots.forEach((ps) => removeSlot(ps));
        order.pop();
        usedUnits.delete(i);
        if (bestHolder.sol && bestHolder.sol.windows === 0) return;
      }
    };

    solve(1);
    if (bestHolder.sol) {
      // ең ыңғайлы тесіксіз нұсқаны қолданамыз
      applySeq(bestHolder.sol.seq);
    } else {
      // тесіксіз шешім табылмады — бастапқы күйді қалпына келтіреміз
      for (const snap of snapByKey.values()) {
        const exists = slots.some((o) => o.key === snap.key);
        if (!exists) place(snap, { skipDaySet: snap.groupId === "Г2" || snap.dpart === 2 });
      }
    }
  };

  // rebuildDay таза тесіксіз режимде (сынып тесіксіздігі — 100% басымдық).
  // Терезе-азайту (windowAware) сынақтан өтті, бірақ ол реттік тәуелділіктен
  // кейбір сыныпта тесік тудырады; сондықтан қолданылмайды.
  for (const c of targetClasses)
    for (let day = 1; day <= 5; day++) rebuildDay(c, day, false);
  // қорғаныс өтуі: кез келген қалған тесікті жабу
  const hasGapQuick = (cid: string, day: number): boolean => {
    const occ = slots.filter((o) => o.classId === cid && o.day === day && (!o.groupId || o.groupId === "Г1")).map((o) => o.slot).sort((a, b) => a - b);
    if (occ.length < 2) return false;
    const mx = occ[occ.length - 1];
    for (let sl = 1; sl < mx; sl++) if (!occ.includes(sl)) return true;
    return false;
  };
  for (let pass = 0; pass < 3; pass++) {
    let fixed = false;
    for (const c of targetClasses)
      for (let day = 1; day <= 5; day++)
        if (hasGapQuick(c.id, day)) { rebuildDay(c, day, false); fixed = true; }
    if (!fixed) break;
  }

  /* ЭТАП 7.7 — МІНСІЗ SWAP: мұғалім терезелерін ақылды азайту (4 деңгей).
     Деңгей 0: өшірулі (тез, сапа максимум).
     Деңгей 1: жұмсақ — терезе азайса ӘРІ сапа түспесе.
     Деңгей 2: орташа — терезе азайса, сапа сәл түссе де (1.5×).
     Деңгей 3: агрессивті — терезені барынша азайтады (3×).

     SWAP СЫНЫПАРАЛЫҚ: екі түрлі сынып сабақтарын да ауыстыра алады
     (бірдей слот-күнде емес, кез келген екі қарапайым сабақ).

     ЕРЕЖЕЛЕРГЕ БАҒЫНУ:
     • ЕШҚАШАН бұзылмайды: мұғалім/кабинет/сынып конфликті, СЫНЫП ТЕСІГІ,
       бір күн бір пән, мұғалім ауысымы/диапазоны/қолжетімсіздігі.
     • Деңгеймен реттеледі: идеал орын (сапа баллы).

     ЖЫЛДАМДЫҚ: инкременталды — swap тек 2 ұяны жаңартады (толық қайта
     құрусыз). Тексеру де жергілікті. Сондықтан көп swap-ты тез өңдейді.

     МІНСІЗДІК: swap қабылданбаса, дәл кері ауыстырып, күй бұзылмайды. */
  const comfortLevel = settings.teacherComfort ?? 0;
  // Мұғалімнің апталық сағатын күндерге тең бөлу деңгейі (0=өшірулі, 1=жұмсақ,
  // 2=орташа, 3=агрессивті) — comfortLevel-ден ТӘУЕЛСІЗ баптау.
  const dayBalanceLevel = settings.teacherDayBalance ?? 0;

  if (comfortLevel >= 1 || dayBalanceLevel >= 1) {
    // Мұғалімнің бір күндегі терезе саны (tm матрицасынан — жылдам)
    const tWindows = (tid: string, sh: number, day: number): number => {
      const row = tm[tid]?.[sh]?.[day];
      if (!row) return 0;
      let first = -1, last = -1, cnt = 0;
      for (let sl = 1; sl <= 8; sl++) {
        if (row[sl]) { if (first < 0) first = sl; last = sl; cnt++; }
      }
      if (cnt < 2) return 0;
      return (last - first + 1) - cnt; // аралықтағы бос ұялар
    };

    // Сыныптың бір күнде тесігі бар ма (slots-тан — сенімді)
    const cHasGap = (cid: string, day: number): boolean => {
      const occ: boolean[] = new Array(9).fill(false);
      for (const o of slots) {
        if (o.classId === cid && o.day === day && (!o.groupId || o.groupId === "Г1")) occ[o.slot] = true;
      }
      let last = 0;
      for (let sl = 1; sl <= 8; sl++) if (occ[sl]) last = sl;
      for (let sl = 1; sl <= last; sl++) if (!occ[sl]) return true;
      return false;
    };

    // Мұғалімнің күндік сабақ саны (инкременталды) — day-balance swap-ы үшін.
    // slots-ты толық сканерлемей O(1) оқу мүмкін болу үшін алдын ала есептейміз.
    const tdCount: Record<string, number[]> = {};
    for (const t of teachers) tdCount[t.id] = [0, 0, 0, 0, 0, 0];
    for (const o of slots) tdCount[o.teacherId][o.day]++;

    // Бір ұяны матрицада қою/алу (инкременталды).
    // dScore/dayList да жаңарады — әйтпесе күн ауыстырған swap-тан кейін
    // күндік балл есебі ескіріп, лимит тексерулері мен апта балансы бұзылады.
    const setCell = (o: Slot, on: boolean) => {
      const v = on ? o.classId : null;
      tdCount[o.teacherId][o.day] += on ? 1 : -1;
      tm[o.teacherId][o.shift][o.day][o.slot] = v;
      if (gym && o.roomId === gym.id) {
        const arr = gymOcc[o.shift][o.day][o.slot];
        if (on) arr.push(o.classId); else { const i = arr.indexOf(o.classId); if (i >= 0) arr.splice(i, 1); }
      } else {
        rm[o.roomId][o.shift][o.day][o.slot] = v;
      }
      if (!o.groupId || o.groupId === "Г1") {
        cm[o.classId][o.day][o.slot] = on ? o.subjectId : null;
        if (on) ds[o.classId][o.day].add(o.subjectId); else ds[o.classId][o.day].delete(o.subjectId);
        const effV = eff(C[o.classId], S[o.subjectId]);
        if (on) {
          dScore[o.classId][o.day] += effV;
          dayList[o.classId][o.day].push({ slot: o.slot, score: effV });
        } else {
          dScore[o.classId][o.day] -= effV;
          const dl = dayList[o.classId][o.day];
          const i = dl.findIndex((x) => x.slot === o.slot);
          if (i >= 0) dl.splice(i, 1);
        }
      }
      scoreCache[o.classId] = null;
    };

    // Слоттың жаңа орында конфликтсіз бе (матрицада тексеру — жылдам)
    const cellFree = (cls: Klass, tid: string, subj: Subject, sh: number, day: number, slot: number, roomId: string, ignoreA: Slot, ignoreB: Slot): boolean => {
      // мұғалім бос па
      const tCell = tm[tid][sh][day][slot];
      if (tCell && tCell !== ignoreA.classId && tCell !== ignoreB.classId) return false;
      // дәлірек: сол ұяда басқа сабақ (ignore-лардан өзге) бар ма.
      // Топ (Г1/Г2) сабақтары да мұғалімді алады — оларды да қараймыз.
      const occupied = slots.some((o) => o !== ignoreA && o !== ignoreB && o.day === day && o.slot === slot && o.shift === sh && o.teacherId === tid);
      if (occupied) return false;
      // сынып бос па
      const clsOcc = slots.some((o) => o !== ignoreA && o !== ignoreB && o.classId === cls.id && o.day === day && o.slot === slot && (!o.groupId || o.groupId === "Г1"));
      if (clsOcc) return false;
      // кабинет бос па (спортзал әдепкісі — 1, findRoom-мен бірдей)
      if (gym && roomId === gym.id) {
        const others = gymOcc[sh][day][slot].filter((cid) => cid !== ignoreA.classId && cid !== ignoreB.classId);
        if (others.length >= (gym.gymMax || 1)) return false;
        // ЖАС-ТОБЫ (findRoom-мен бірдей): залды бөлісетін сыныптар бір топта болуы
        // керек — әйтпесе своп «Спортзал ережелерін» бұзады.
        const groups = gym.gymGroups && gym.gymGroups.length ? gym.gymGroups : [[1, 11]];
        const grp = groups.find((g) => g[0] <= cls.grade && cls.grade <= g[1]);
        if (!grp) return false;
        for (const oc of others) { const ocl = C[oc]; if (ocl && !(grp[0] <= ocl.grade && ocl.grade <= grp[1])) return false; }
      } else {
        const rCell = rm[roomId][sh][day][slot];
        if (rCell && rCell !== ignoreA.classId && rCell !== ignoreB.classId) {
          // Топ (Г2) сабағы да кабинетті алады — сүзгісіз қараймыз.
          const rOcc = slots.some((o) => o !== ignoreA && o !== ignoreB && o.roomId === roomId && o.day === day && o.slot === slot && o.shift === sh);
          if (rOcc) return false;
        }
      }
      // бір күн бір пән (сол сынып, сол күн, сол пән — ignore-лардан өзге)
      const dup = slots.some((o) => o !== ignoreA && o !== ignoreB && o.classId === cls.id && o.day === day && o.subjectId === subj.id && (!o.groupId || o.groupId === "Г1"));
      if (dup) return false;
      // мұғалім ауысым/диапазон/қолжетімсіздік
      const t = T[tid];
      if (!t || cls.grade < t.gradeMin || cls.grade > t.gradeMax) return false;
      if (t.shift !== 3 && t.shift !== sh) return false;
      if (t.unavailable.includes(`${day}-${slot}`)) return false;
      // слот сынып ауысымына сай ма
      if (sh !== cls.shift && t.shift !== 3) return false;
      // Қара тізім (қатар келмейтін пәндер) — деңгей 1-2-де ҚАТАҢ сақталады.
      // Деңгей 3-те жұмсартылады (терезеге басымдық).
      if (comfortLevel <= 2) {
        const prev = slot > 1 ? cm[cls.id][day][slot - 1] : null;
        const next = slot < 8 ? cm[cls.id][day][slot + 1] : null;
        for (const adj of [prev, next]) {
          if (adj && adj !== ignoreA.subjectId && adj !== ignoreB.subjectId) {
            const adjSubj = S[adj];
            if (adjSubj && (subj.black.includes(adjSubj.name) || adjSubj.black.includes(subj.name))) return false;
          }
        }
      }
      return true;
    };

    // Күн ішінде сынып тесіксіздігін тексеру (slots-та, swap болжамымен)
    const classGapAfter = (cid: string, day: number): boolean => {
      const occ: boolean[] = new Array(9).fill(false);
      for (const o of slots) {
        if (o.classId === cid && o.day === day && (!o.groupId || o.groupId === "Г1")) occ[o.slot] = true;
      }
      let last = 0;
      for (let sl = 1; sl <= 8; sl++) if (occ[sl]) last = sl;
      for (let sl = 1; sl <= last; sl++) if (!occ[sl]) return true; // ортада бос — тесік
      return false;
    };

  if (comfortLevel >= 1) {
    /* МІНСІЗ SWAP (мұғалім жайлылығы — терезе): a мен b сабақтарын ауыстырады
       (сыныпаралық та). Инкременталды: 2 ұя ғана жаңарады. Қабылданбаса — кері. */
    const trySwap = (a: Slot, b: Slot): boolean => {
      if (a.groupId || a.dpart || a.locked || b.groupId || b.dpart || b.locked) return false;
      if (a === b) return false;
      if (a.day === b.day && a.slot === b.slot && a.shift === b.shift) return false; // бір ұя
      // бірдей сынып+пән мағынасыз (бір күн бір пән бұзылмас үшін де)
      if (a.classId === b.classId && a.subjectId === b.subjectId) return false;

      const clsA = C[a.classId], clsB = C[b.classId];
      const subjA = S[a.subjectId], subjB = S[b.subjectId];

      // әсер ететін мұғалім-күндер (терезе өлшеу)
      const affected = [
        { tid: a.teacherId, sh: a.shift, day: a.day }, { tid: a.teacherId, sh: a.shift, day: b.day },
        { tid: b.teacherId, sh: b.shift, day: b.day }, { tid: b.teacherId, sh: b.shift, day: a.day },
      ];
      const uniq = new Map<string, { tid: string; sh: number; day: number }>();
      for (const p of affected) uniq.set(`${p.tid}|${p.sh}|${p.day}`, p);
      const aff = [...uniq.values()];
      const wBefore = aff.reduce((s, p) => s + tWindows(p.tid, p.sh, p.day), 0);
      const cBefore = a.score + b.score;

      // бастапқы орындар
      const A = { day: a.day, slot: a.slot, room: a.roomId, score: a.score, shift: a.shift };
      const B = { day: b.day, slot: b.slot, room: b.roomId, score: b.score, shift: b.shift };

      // Слот лимиті (СанПиН): жаңа орын сынып лимитінен аспауы керек
      if (B.slot > maxSlots(clsA.grade)) return false;
      if (A.slot > maxSlots(clsB.grade)) return false;
      // Күндік балл лимиті — swap-қа ДЕЙІНГІ мәндер (асқанын жаңадан асырмау үшін)
      const dayLimBefore: Record<string, number> = {};
      for (const [cid, d] of [[a.classId, A.day], [a.classId, B.day], [b.classId, A.day], [b.classId, B.day]] as const)
        dayLimBefore[`${cid}|${d}`] = dScore[cid][d];

      // А B-ның орнына, B А-ның орнына сыя ма (slots-та тексеру, екеуін елемей)
      // Алдымен матрицадан екеуін аламыз
      setCell(a, false); setCell(b, false);

      // А → B орны (B-ның ауысымында), B → А орны
      const aShiftNew = clsA.shift, bShiftNew = clsB.shift; // сынып ауысымы тұрақты
      // кабинет: А үшін B орнында, B үшін А орнында
      const roomA = findRoom(clsA, subjA, B.day, B.slot);
      const roomB = findRoom(clsB, subjB, A.day, A.slot);
      const restore = () => { setCell(a, true); setCell(b, true); };
      if (!roomA || !roomB) { restore(); return false; }

      const okA = cellFree(clsA, a.teacherId, subjA, aShiftNew, B.day, B.slot, roomA, a, b);
      const okB = cellFree(clsB, b.teacherId, subjB, bShiftNew, A.day, A.slot, roomB, a, b);
      if (!okA || !okB) { restore(); return false; }
      // ПЕДАГОГИКАЛЫҚ ережелер де сақталуы керек (қара тізім, тіл қатарлығы,
      // алгебра+геометрия, кеш сабақ шегі...) — бұрын своптар оларды тексермей,
      // орналастыруда сақталған ережелерді кейін бұзып қоятын (ағып кету).
      if (hardCheck(clsA, a.teacherId, subjA, B.day, B.slot) || hardCheck(clsB, b.teacherId, subjB, A.day, A.slot)) { restore(); return false; }

      // ── Ауыстырамыз (slots объектілерін + матрица) ──
      a.day = B.day; a.slot = B.slot; a.roomId = roomA; a.shift = aShiftNew; a.score = pScore(subjA, B.slot, settings);
      b.day = A.day; b.slot = A.slot; b.roomId = roomB; b.shift = bShiftNew; b.score = pScore(subjB, A.slot, settings);
      setCell(a, true); setCell(b, true);

      // Күндік балл лимиті (СанПиН): swap лимиттен асырса — қабылданбайды.
      // (Бұрын асып тұрған күнге — softFill ізі — одан әрі көбейтуге болмайды.)
      let dayOver = false;
      for (const [cid, d, grade] of [
        [a.classId, A.day, clsA.grade], [a.classId, B.day, clsA.grade],
        [b.classId, A.day, clsB.grade], [b.classId, B.day, clsB.grade],
      ] as const) {
        const lim = Math.max(dayLimitS(grade, settings), dayLimBefore[`${cid}|${d}`]);
        if (dScore[cid][d] > lim) { dayOver = true; break; }
      }
      // Сынып тесігі (әсер еткен сыныптар мен күндер)
      const gap = dayOver ||
                  classGapAfter(a.classId, a.day) || classGapAfter(a.classId, B.day) ||
                  classGapAfter(b.classId, b.day) || classGapAfter(b.classId, A.day) ||
                  classGapAfter(a.classId, A.day) || classGapAfter(b.classId, B.day);
      if (gap) {
        // қайтару
        setCell(a, false); setCell(b, false);
        a.day = A.day; a.slot = A.slot; a.roomId = A.room; a.shift = A.shift; a.score = A.score;
        b.day = B.day; b.slot = B.slot; b.roomId = B.room; b.shift = B.shift; b.score = B.score;
        setCell(a, true); setCell(b, true);
        return false;
      }

      const wAfter = aff.reduce((s, p) => s + tWindows(p.tid, p.sh, p.day), 0);
      const windowGain = wBefore - wAfter;
      const scoreLoss = cBefore - (a.score + b.score);
      let accept = false;
      if (comfortLevel === 1) accept = windowGain > 0 && scoreLoss <= 0;
      else if (comfortLevel === 2) accept = windowGain > 0 && scoreLoss <= windowGain * 1.5;
      else accept = windowGain > 0 && scoreLoss <= windowGain * 3;

      if (accept) return true;
      // қайтару
      setCell(a, false); setCell(b, false);
      a.day = A.day; a.slot = A.slot; a.roomId = A.room; a.shift = A.shift; a.score = A.score;
      b.day = B.day; b.slot = B.slot; b.roomId = B.room; b.shift = B.shift; b.score = B.score;
      setCell(a, true); setCell(b, true);
      return false;
    };

    // ── Өту циклдары ──
    const passes = comfortLevel === 3 ? 5 : comfortLevel === 2 ? 4 : 3;
    prog(88, 4);
    // барлық қарапайым сабақтар (сыныпаралық swap үшін)
    for (let pass = 0; pass < passes; pass++) {
      let improved = 0;
      const movable = slots.filter((o) => !o.groupId && !o.dpart && !o.locked);
      for (let i = 0; i < movable.length; i++) {
        const a = movable[i];
        // тек терезесі бар мұғалім-күндердегі сабақтарға басымдық (жылдамдату)
        if (tWindows(a.teacherId, a.shift, a.day) === 0) continue;
        for (let j = 0; j < movable.length; j++) {
          if (i === j) continue;
          const b = movable[j];
          if (a.day === b.day && a.slot === b.slot) continue;
          if (trySwap(a, b)) { improved++; break; }
        }
      }
      if (improved === 0) break;
    }
  }

  /* ЭТАП 7.8 — МҰҒАЛІМ АПТАЛЫҚ ТЕҢГЕРІМІ: әр мұғалімнің апталық сағаты
     күндерге мүмкіндігінше ТЕҢ бөлінеді (мыс. дүйсенбіде 6 сағат, бейсенбіде
     1 сағат болмас үшін). teacherComfort (терезе азайту) секілді swap
     механизмі, бірақ мақсаты басқа: терезе емес, КҮНДІК САҒАТ ТАРАЛУЫ.
     Тәуелсіз баптау (settings.teacherDayBalance) — comfort өшірулі болса да
     жұмыс істейді. ЕШҚАШАН бұзылмайды: конфликт, сынып тесігі, күндік балл
     лимиті, мұғалім ауысымы/диапазоны/қолжетімсіздігі (comfort-пен бірдей
     cellFree/classGapAfter арқылы). */
  if (dayBalanceLevel >= 1) {
    // Мұғалімнің әр күндегі сабақ саны — tdCount арқылы O(1) (setCell
    // инкременталды жаңартады, slots-ты сканерлемейді).
    const teacherDayCounts = (tid: string): number[] => tdCount[tid];
    // Квадраттар қосындысы: тұрақты қосынды үшін теңдей бөлінгенде ЕҢ АЗ болады
    // (QM-AM теңсіздігі) — вариансты есептемей-ақ теңгерім өлшемі ретінде қолданамыз.
    const spreadScore = (counts: number[]): number => counts.slice(1).reduce((s, c) => s + c * c, 0);

    const tryDayBalanceSwap = (a: Slot, b: Slot): boolean => {
      if (a.groupId || a.dpart || a.locked || b.groupId || b.dpart || b.locked) return false;
      if (a === b || a.day === b.day) return false; // бір күнде ауыстыру теңгерімге әсер етпейді
      if (a.teacherId === b.teacherId) return false; // бір мұғалім — өз ішінде ауыстыру мағынасыз
      if (a.classId === b.classId && a.subjectId === b.subjectId) return false;

      const clsA = C[a.classId], clsB = C[b.classId];
      const subjA = S[a.subjectId], subjB = S[b.subjectId];

      const before = spreadScore(teacherDayCounts(a.teacherId)) + spreadScore(teacherDayCounts(b.teacherId));
      const cScoreBefore = a.score + b.score;

      const A = { day: a.day, slot: a.slot, room: a.roomId, score: a.score };
      const B = { day: b.day, slot: b.slot, room: b.roomId, score: b.score };

      if (B.slot > maxSlots(clsA.grade, settings)) return false;
      if (A.slot > maxSlots(clsB.grade, settings)) return false;
      const dayLimBefore: Record<string, number> = {};
      for (const [cid, d] of [[a.classId, A.day], [a.classId, B.day], [b.classId, A.day], [b.classId, B.day]] as const)
        dayLimBefore[`${cid}|${d}`] = dScore[cid][d];

      setCell(a, false); setCell(b, false);

      const roomA = findRoom(clsA, subjA, B.day, B.slot);
      const roomB = findRoom(clsB, subjB, A.day, A.slot);
      const restore = () => { setCell(a, true); setCell(b, true); };
      if (!roomA || !roomB) { restore(); return false; }

      const okA = cellFree(clsA, a.teacherId, subjA, clsA.shift, B.day, B.slot, roomA, a, b);
      const okB = cellFree(clsB, b.teacherId, subjB, clsB.shift, A.day, A.slot, roomB, a, b);
      if (!okA || !okB) { restore(); return false; }
      // Педагогикалық ережелер своп кезінде де сақталады (ағып кетуді жабу)
      if (hardCheck(clsA, a.teacherId, subjA, B.day, B.slot) || hardCheck(clsB, b.teacherId, subjB, A.day, A.slot)) { restore(); return false; }

      a.day = B.day; a.slot = B.slot; a.roomId = roomA; a.score = pScore(subjA, B.slot, settings);
      b.day = A.day; b.slot = A.slot; b.roomId = roomB; b.score = pScore(subjB, A.slot, settings);
      setCell(a, true); setCell(b, true);

      let dayOver = false;
      for (const [cid, d, grade] of [
        [a.classId, A.day, clsA.grade], [a.classId, B.day, clsA.grade],
        [b.classId, A.day, clsB.grade], [b.classId, B.day, clsB.grade],
      ] as const) {
        const lim = Math.max(dayLimitS(grade, settings), dayLimBefore[`${cid}|${d}`]);
        if (dScore[cid][d] > lim) { dayOver = true; break; }
      }
      const gap = dayOver ||
                  classGapAfter(a.classId, a.day) || classGapAfter(a.classId, B.day) ||
                  classGapAfter(b.classId, b.day) || classGapAfter(b.classId, A.day) ||
                  classGapAfter(a.classId, A.day) || classGapAfter(b.classId, B.day);
      if (gap) {
        setCell(a, false); setCell(b, false);
        a.day = A.day; a.slot = A.slot; a.roomId = A.room; a.score = A.score;
        b.day = B.day; b.slot = B.slot; b.roomId = B.room; b.score = B.score;
        setCell(a, true); setCell(b, true);
        return false;
      }

      const after = spreadScore(teacherDayCounts(a.teacherId)) + spreadScore(teacherDayCounts(b.teacherId));
      const spreadGain = before - after; // оң болса — теңгерім жақсарды
      const scoreLoss = cScoreBefore - (a.score + b.score);
      let accept = false;
      if (dayBalanceLevel === 1) accept = spreadGain > 0 && scoreLoss <= 0;
      else if (dayBalanceLevel === 2) accept = spreadGain > 0 && scoreLoss <= spreadGain * 1.5;
      else accept = spreadGain > 0 && scoreLoss <= spreadGain * 3;

      if (accept) return true;
      setCell(a, false); setCell(b, false);
      a.day = A.day; a.slot = A.slot; a.roomId = A.room; a.score = A.score;
      b.day = B.day; b.slot = B.slot; b.roomId = B.room; b.score = B.score;
      setCell(a, true); setCell(b, true);
      return false;
    };

    // Мұғалімнің сол күні «шың» ба (ол аптада ЕҢ КӨП сабағы бар күн(дер)і) —
    // тек сол сабақтарды жылжытуға тырысамыз (tWindows===0 жеткізу секілді
    // арзан алдын-ала сүзгі): басқа сабақты жылжыту теңгерімге көмектеспейді,
    // әрі cellFree/findRoom (slots сканерлеуі бар, қымбат) шақыруын үнемдейді.
    const isPeakDay = (tid: string, day: number): boolean => {
      const c = tdCount[tid];
      const mx = Math.max(c[1], c[2], c[3], c[4], c[5]);
      return mx > 0 && c[day] === mx;
    };

    const dbPasses = dayBalanceLevel === 3 ? 5 : dayBalanceLevel === 2 ? 4 : 3;
    for (let pass = 0; pass < dbPasses; pass++) {
      let improved = 0;
      const movable = slots.filter((o) => !o.groupId && !o.dpart && !o.locked);
      for (let i = 0; i < movable.length; i++) {
        const a = movable[i];
        if (!isPeakDay(a.teacherId, a.day)) continue;
        for (let j = 0; j < movable.length; j++) {
          if (i === j) continue;
          const b = movable[j];
          if (a.teacherId === b.teacherId || a.day === b.day) continue;
          if (tryDayBalanceSwap(a, b)) { improved++; break; }
        }
      }
      if (improved === 0) break;
    }
  }

    // Екі swap кезеңінен де (comfort + day-balance) кейін тесіксіздікті
    // қайта кепілдейміз (сақтық) — cHasGap/rebuildDay сыртқы блокта анықталған.
    for (const c of targetClasses) {
      for (let day = 1; day <= 5; day++) {
        if (cHasGap(c.id, day)) rebuildDay(c, day, false);
      }
    }
  }

  /* Апта балансын түзету: Жұманың жеңіл сабағын Сәрсенбіге жылжыту.
     Жеңіл сабақ (әсіресе eff()=0 электив) күн ІШІНДЕ тұрса, оны алып тастау
     Жұмада тесік қалдыруы мүмкін — сондықтан жылжытқаннан кейін Жұманы
     тексереміз, тесік қалса — бас тартып, орнына қайтарамыз. */
  const dayHasGapNow = (cid: string, day: number): boolean => {
    const occ: boolean[] = new Array(9).fill(false);
    for (const o of slots) if (o.classId === cid && o.day === day && (!o.groupId || o.groupId === "Г1")) occ[o.slot] = true;
    let last = 0;
    for (let sl = 1; sl <= 8; sl++) if (occ[sl]) last = sl;
    for (let sl = 1; sl <= last; sl++) if (!occ[sl]) return true;
    return false;
  };
  for (const c of targetClasses) {
    let guard = 0;
    while (dScore[c.id][3] < dScore[c.id][5] && guard++ < 4) {
      const fri = slots
        .filter((o) => o.classId === c.id && o.day === 5 && !o.groupId && !o.dpart && !o.locked)
        .sort((a, b) => eff(c, S[a.subjectId]) - eff(c, S[b.subjectId]));
      let moved = false;
      for (const o of fri) {
        const subj = S[o.subjectId];
        if (ds[c.id][3].has(o.subjectId)) continue;
        removeSlot(o);
        let ok = false;
        let placed: Slot | null = null;
        for (const d2 of [3, 2, 4, 1]) {
          if (ok) break;
          if (ds[c.id][d2].has(o.subjectId)) continue;
          for (let slot = 1; slot <= maxSlots(c.grade) && !ok; slot++) {
            if (hardCheck(c, o.teacherId, subj, d2, slot)) continue;
            const roomId = findRoom(c, subj, d2, slot);
            if (!roomId) continue;
            placed = place({ classId: o.classId, subjectId: o.subjectId, teacherId: o.teacherId, roomId, day: d2, slot, shift: o.shift, score: pScore(subj, slot, settings) });
            ok = true; moved = true;
          }
        }
        if (ok && dayHasGapNow(c.id, 5)) {
          // Жұмада тесік қалдырды — бас тартамыз, бастапқы орнына қайтарамыз
          if (placed) removeSlot(placed);
          place(o);
          ok = false; moved = false;
          continue;
        }
        if (!ok) place(o); else break;
      }
      if (!moved) break;
    }
  }

  /* Соңғы тесіксіздік кепілі: апта балансы немесе swap тесік қалдырса,
     әр сыныптың әр күнін қайта тығыздаймыз (1-слоттан бастап). */
  for (const c of targetClasses) {
    for (let day = 1; day <= 5; day++) {
      const occ: boolean[] = new Array(9).fill(false);
      for (const o of slots) if (o.classId === c.id && o.day === day && (!o.groupId || o.groupId === "Г1")) occ[o.slot] = true;
      let last = 0;
      for (let sl = 1; sl <= 8; sl++) if (occ[sl]) last = sl;
      let hasGap = false;
      for (let sl = 1; sl <= last; sl++) if (!occ[sl]) { hasGap = true; break; }
      if (hasGap) rebuildDay(c, day, false);
    }
  }

  /* Тесік құтқару: rebuildDay бір күннің ІШІНДЕ сабақтарды қайта таратып
     жаба алмаған тесіктер қалуы мүмкін — себебі кейде тесікті тек СОЛ
     күннің сабақтарын араластырып жабу мүмкін емес (қажетті мұғалім/
     кабинет сол сәтте бос емес). Мұндайда сол сыныптың БАСҚА күнінен бір
     сабақты осы тесікке "импорттап", содан кейін донор күнді rebuildDay-мен
     қайта тығыздап көреміз. Екі күн де тесіксіз шықпаса — дәл бастапқы
     қалпына (snapshot) қайтарамыз, ешбір жанама әсер қалмайды. */
  const dayGapSlot = (cid: string, day: number): number | null => {
    const occ: boolean[] = new Array(9).fill(false);
    for (const o of slots) if (o.classId === cid && o.day === day && (!o.groupId || o.groupId === "Г1")) occ[o.slot] = true;
    let last = 0;
    for (let sl = 1; sl <= 8; sl++) if (occ[sl]) last = sl;
    for (let sl = 1; sl <= last; sl++) if (!occ[sl]) return sl;
    return null;
  };
  for (const c of targetClasses) {
    for (let day = 1; day <= 5; day++) {
      const gapSlot = dayGapSlot(c.id, day);
      if (gapSlot === null) continue;
      let rescued = false;
      for (let donorDay = 1; donorDay <= 5 && !rescued; donorDay++) {
        if (donorDay === day) continue;
        const donorLessons = slots.filter((o) => o.classId === c.id && o.day === donorDay && !o.groupId && !o.dpart && !o.locked);
        for (const o of donorLessons) {
          const subj = S[o.subjectId];
          if (ds[c.id][day].has(o.subjectId)) continue;
          if (hardCheck(c, o.teacherId, subj, day, gapSlot)) continue;
          const roomId = findRoom(c, subj, day, gapSlot);
          if (!roomId) continue;
          const snapA = slots.filter((x) => x.classId === c.id && x.day === day).map((x) => ({ ...x }));
          const snapB = slots.filter((x) => x.classId === c.id && x.day === donorDay).map((x) => ({ ...x }));
          removeSlot(o);
          place({ classId: o.classId, subjectId: o.subjectId, teacherId: o.teacherId, roomId, day, slot: gapSlot, shift: o.shift, score: pScore(subj, gapSlot, settings) });
          rebuildDay(c, donorDay, false);
          if (dayGapSlot(c.id, day) === null && dayGapSlot(c.id, donorDay) === null) {
            rescued = true;
            break;
          }
          // сәтсіз — екі күнді де дәл бастапқы қалпына қайтарамыз
          for (const x of slots.filter((y) => y.classId === c.id && (y.day === day || y.day === donorDay))) removeSlot(x);
          for (const snap of [...snapA, ...snapB]) place(snap, { skipDaySet: snap.groupId === "Г2" || snap.dpart === 2 });
        }
      }
    }
  }

  /* ЭТАП 7.6 — СОЛҒА ТАРТУ (қауіпсіз тесік тығыздау)
     Жоғарыдағы фазалардан кейін қалған ішкі тесіктерді ТЕК бар слоттарды
     жылжыту арқылы жабады — сабақ саны ӨЗГЕРМЕЙДІ (ешбір сабақ жойылмайды не
     қосылмайды). Тесіктен кейінгі БІРІНШІ жеке сабақты тесік ұясына толық
     тексеріп (hardCheck + findRoom — зал тобы да тексеріледі) көшіреді.
     Қос сабақ/топ бөлінген/locked слоттар қозғалмайды (қауіпсіздік үшін);
     ондай сабақ кездессе, сол күнді тыныш қалдырамыз. */
  // ЖЫЛДАМ: тесік бар-жоғын cm матрицасынан O(1) оқимыз (глобалды slots
  // сканерлемей). Тесіксіз күндер (көпшілігі) бірден өтеді; slots-ты тек нақты
  // жылжыту қажет болғанда (тесік бар күнде) бір рет сүземіз. lastOccOf/gapOf —
  // cm жолы бойынша (O(8)).
  const cmRowLast = (cid: string, day: number): number => {
    const rowd = cm[cid][day];
    let last = 0;
    for (let s = 1; s <= 8; s++) if (rowd[s] !== null) last = s;
    return last;
  };
  const cmGap = (cid: string, day: number): number => {
    const rowd = cm[cid][day];
    const last = cmRowLast(cid, day);
    for (let s = 1; s <= last; s++) if (rowd[s] === null) return s;
    return -1;
  };
  for (const c of targetClasses) {
    const cid = c.id;
    for (let day = 1; day <= 5; day++) {
      let guard = 0;
      while (guard++ < 8) {
        const g = cmGap(cid, day);
        if (g < 0) break;
        // тесіктен кейінгі БІРІНШІ бос емес слот (cm жолынан)
        let srcSlot = -1;
        for (let s = g + 1; s <= 8; s++) if (cm[cid][day][s] !== null) { srcSlot = s; break; }
        if (srcSlot < 0) break;
        // нақты слот объектісі (тек жылжыту қажет болғанда — сирек)
        const at = slots.filter((o) => o.classId === cid && o.day === day && o.slot === srcSlot);
        // тек ЖЕКЕ сабақ жылжытылады (қос/топ/locked — тимейміз)
        if (at.length !== 1 || at[0].groupId || at[0].dpart || at[0].locked) break;
        const src = at[0];
        const subj = S[src.subjectId];
        const snap = { ...src };
        removeSlot(src);
        // (1) СОЛ КҮН ІШІНДЕ тесік ұясына жылжыту (бір-күн-бір-пән елемейміз —
        //     сол сабақ сол күн ішінде жылжып тұр)
        if (!hardCheck(c, snap.teacherId, subj, day, g, true)) {
          const room = findRoom(c, subj, day, g);
          if (room) {
            place({ classId: snap.classId, subjectId: snap.subjectId, teacherId: snap.teacherId, roomId: room, day, slot: g, shift: snap.shift, score: pScore(subj, g, settings) });
            continue;
          }
        }
        // (2) Сол күнде жылжымаса: src кеткенде осы КҮН ТЕСІКСІЗ болса (яғни src —
        //     жалғыз кеш сабақ, тесіктің себебі), оны БАСҚА күннің соңына тіркеп
        //     көшіреміз — екі күн де тесіксіз, сабақ саны сол қалпы.
        if (cmGap(cid, day) < 0) {
          let relocated = false;
          for (let d2 = 1; d2 <= 5 && !relocated; d2++) {
            if (d2 === day || ds[cid][d2].has(snap.subjectId)) continue;
            const target = cmRowLast(cid, d2) + 1;
            if (target > maxSlots(c.grade)) continue;
            if (hardCheck(c, snap.teacherId, subj, d2, target)) continue;
            const room = findRoom(c, subj, d2, target);
            if (!room) continue;
            place({ classId: snap.classId, subjectId: snap.subjectId, teacherId: snap.teacherId, roomId: room, day: d2, slot: target, shift: snap.shift, score: pScore(subj, target, settings) });
            relocated = true;
          }
          if (relocated) continue;
        }
        place(snap); break; // ешбір қауіпсіз жылжыту болмады — кері қойып тоқтаймыз
      }
    }
  }

  /* ЭТАП 7.8 — ТҮГЕНДЕУ: кестедегі нақты сабақ санын оқу жоспарымен салыстыру.
     Кейінгі фазалардың (rebuild/құтқару/тығыздау) сирек шеткі жағдайында сабақ
     үнсіз түсіп қалуы мүмкін — мұнда әрқайсысы қайта орналастырылады (тек
     физика заңымен), болмаса unplaced-ке АДАЛ тіркеледі. Осылай «Оқу жоспары
     орындалды» тесі мен unplaced тізімі әрқашан өзара сәйкес. */
  {
    const placedCnt = new Map<string, number>();
    for (const o of slots) {
      if (o.subjectId === HOMEROOM_SUBJECT_ID) continue;
      if (o.groupId && o.groupId !== "Г1") continue;
      const k = o.classId + "|" + o.subjectId;
      placedCnt.set(k, (placedCnt.get(k) || 0) + 1);
    }
    const oldReason = new Map(unplaced.map((u) => [u.className + "|" + u.subject, u.reason]));
    unplaced.length = 0;
    for (const c of targetClasses)
      for (const cu of c.curriculum) {
        const subj = S[cu.subjectId];
        if (!subj || !cu.hours) continue;
        let missing = cu.hours - (placedCnt.get(c.id + "|" + cu.subjectId) || 0);
        if (missing <= 0) continue;
        // жеке (топсыз) сабақты қайта орналастыру: алдымен ережеге сай ұя,
        // болмаса кез келген конфликтсіз ұя (guaranteePlace — екі айналым)
        if (!cu.isSplit && cu.teacherId)
          while (missing > 0 && guaranteePlace(c, subj, cu.teacherId)) missing--;
        if (missing > 0)
          unplaced.push({ className: c.name, subject: subj.name, placed: cu.hours - missing, need: cu.hours, reason: oldReason.get(c.name + "|" + subj.name) || "қорытынды түгендеу: орын табылмады" });
      }
  }

  /* ЭТАП 8 — стресс-тесттер */
  prog(88, 6);
  const tests: StressTest[] = [];
  const add = (name: string, passed: boolean, details = "") => tests.push({ name, passed, details });
  {
    let n = 0;
    for (const t of teachers) {
      const seen = new Set<string>();
      for (const o of slots.filter((o) => o.teacherId === t.id)) {
        const k = `${o.shift}-${o.day}-${o.slot}`;
        if (seen.has(k)) n++; seen.add(k);
      }
    }
    add("Мұғалім конфликті жоқ", n === 0, n ? `${n} конфликт` : "");
  }
  {
    let n = 0;
    for (const r of rooms.filter((r) => r.type !== "gym")) {
      const seen = new Set<string>();
      for (const o of slots.filter((o) => o.roomId === r.id)) {
        const k = `${o.shift}-${o.day}-${o.slot}`;
        if (seen.has(k)) n++; seen.add(k);
      }
    }
    if (gym) for (const sh of [1, 2]) for (let d = 1; d <= 5; d++) for (let s = 1; s <= 8; s++)
      if (gymOcc[sh][d][s].length > (gym.gymMax || 1)) n++;
    add("Кабинет конфликті жоқ", n === 0, n ? `${n} конфликт` : "");
  }
  {
    const bad: string[] = [];
    for (const c of classes.filter((c) => c.grade <= 4 && c.shift === 1)) {
      const mx = Math.max(0, ...slots.filter((o) => o.classId === c.id).map((o) => o.slot));
      if (mx && tl[1][mx].endMin > pT("12:00")) bad.push(c.name);
    }
    add("Бастауыш (1-ауысым) 12:00-ге дейін", bad.length === 0, bad.join(", "));
  }
  // 1-сыныптың бейімделу режимі (СанПиН) — тек режим қосулы болғанда тексеріледі
  if (settings.grade1Stepped) {
    const bad: string[] = [];
    for (const c of classes.filter((c) => c.grade === 1)) {
      let mx = 0;
      for (let d = 1; d <= 5; d++) {
        const cnt = slots.filter((o) => o.classId === c.id && o.day === d && (!o.groupId || o.groupId === "Г1")).length;
        if (cnt > mx) mx = cnt;
      }
      if (mx > 3) bad.push(`${c.name} (${mx})`);
    }
    add("1-сынып бейімделу режимі (күніне ≤3 сабақ)", bad.length === 0, bad.join(", "));
  }
  {
    let n = 0; const M = ["Математика", "Алгебра", "Геометрия"];
    for (const c of classes) for (let d = 1; d <= 5; d++) for (let s = 1; s <= 7; s++) {
      const a = cm[c.id][d][s], b = cm[c.id][d][s + 1];
      if (a && b) {
        const an = S[a].name, bn = S[b].name;
        if ((M.includes(an) && bn === "Физика") || (an === "Физика" && M.includes(bn))) n++;
      }
    }
    add("Математика + Физика қатар емес", n === 0, n ? `${n} жағдай` : "");
  }
  {
    let n = 0;
    for (const c of classes) for (let d = 1; d <= 5; d++) for (let s = 1; s <= 7; s++) {
      const a = cm[c.id][d][s], b = cm[c.id][d][s + 1];
      if (a && b) {
        const p = [S[a].name, S[b].name];
        if (p.includes("Қазақ тілі") && p.includes("Орыс тілі")) n++;
      }
    }
    add("Қазақ тілі + Орыс тілі қатар емес", n === 0, n ? `${n} жағдай` : "");
  }
  // Педагогикалық ережелердің қорытынды есебі (pedViol → нұсқа таңдауда minимум)
  let pedViol = 0;
  {
    let sep = 0; // алг+гео / орыс тілі+әдебиеті бөлек күн ережесі
    for (const c of classes) {
      const shAG = sharedDays(c.id, (f) => f.alg, (f) => f.geo);
      const alAG = Math.max(0, algH[c.id] + geoH[c.id] - 5);
      if (shAG > alAG) sep += shAG - alAG;
      const shR = sharedDays(c.id, (f) => f.rusLang, (f) => f.rusLit);
      const alR = Math.max(0, rlH[c.id] + rlitH[c.id] - 5);
      if (shR > alR) sep += shR - alR;
    }
    add("Алгебра/геометрия және орыс тілі/әдебиеті бөлек күндерде", sep === 0, sep ? `${sep} бұзу` : "");
    let adj = 0; // тіл пәндері қатар
    for (const c of classes) for (let d = 1; d <= 5; d++) for (let s = 1; s <= 7; s++) {
      const a = cm[c.id][d][s], b = cm[c.id][d][s + 1];
      if (a && b && FL[a].lng && FL[b].lng) adj++;
    }
    add("Тіл пәндері қатар емес", adj === 0, adj ? `${adj} жағдай` : "");
    let runs = 0; // 3 қиын қатар
    for (const c of classes) for (let d = 1; d <= 5; d++) {
      let run = 0;
      for (let s = 1; s <= 8; s++) {
        const id = cm[c.id][d][s];
        if (id && isHardId(id)) { run++; if (run >= 3) runs++; } else run = 0;
      }
    }
    add("Үш қиын пән қатар емес", runs === 0, runs ? `${runs} жағдай` : "");
    pedViol = sep + adj + runs;
  }
  {
    const bad: string[] = [];
    for (const c of classes) if (dScore[c.id][3] < dScore[c.id][5]) bad.push(c.name);
    add("Апта балансы (Ср ≥ Жм)", bad.length === 0, bad.slice(0, 6).join(", "));
  }
  {
    const bad: string[] = [];
    for (const c of targetClasses) for (const cu of c.curriculum) {
      const s = S[cu.subjectId];
      if (!s || !cu.hours) continue;
      const cnt = slots.filter((o) => o.classId === c.id && o.subjectId === cu.subjectId && (!o.groupId || o.groupId === "Г1")).length;
      if (cnt < Math.min(cu.hours, s.canDouble ? cu.hours : 5)) bad.push(`${c.name}/${s.name} ${cnt}/${cu.hours}`);
    }
    add("Оқу жоспары орындалды", bad.length === 0, bad.slice(0, 6).join(", "));
  }
  {
    let n = 0;
    if (gym) {
      const groups = gym.gymGroups && gym.gymGroups.length ? gym.gymGroups : [[1, 11]];
      for (const sh of [1, 2]) for (let d = 1; d <= 5; d++) for (let s = 1; s <= 8; s++) {
        const occ = gymOcc[sh][d][s];
        if (occ.length > 1) {
          const grades = occ.map((id) => C[id].grade);
          if (!groups.some((g) => grades.every((gr) => g[0] <= gr && gr <= g[1]))) n++;
        }
      }
    }
    add("Спортзал ережелері", n === 0, n ? `${n} бұзу` : "");
  }
  {
    let n = 0;
    for (const c of classes) for (let d = 1; d <= 5; d++) {
      const arr = slots.filter((o) => o.classId === c.id && o.day === d && (!o.groupId || o.groupId === "Г1") && o.dpart !== 2).map((o) => o.subjectId);
      if (new Set(arr).size !== arr.length) n++;
    }
    add("Бір күн — бір пән (қос сабақ ескерілген)", n === 0, n ? `${n} бұзу` : "");
  }
  {
    const bad: string[] = [];
    for (const c of classes) for (let d = 1; d <= 5; d++)
      if (dScore[c.id][d] > dayLimitS(c.grade, settings)) bad.push(`${c.name} ${d}-күн`);
    add("Күндік балл лимиттері", bad.length === 0, bad.slice(0, 6).join(", "));
  }
  {
    // Тесік (бос ұя) жоқ: әр сынып күнінде сабақтар 1-слоттан үзіліссіз
    const bad: string[] = [];
    for (const c of classes)
      for (let d = 1; d <= 5; d++) {
        const occ = slots.filter((o) => o.classId === c.id && o.day === d && (!o.groupId || o.groupId === "Г1")).map((o) => o.slot).sort((a, b) => a - b);
        if (occ.length < 2) continue;
        const maxO = occ[occ.length - 1];
        for (let sl = 1; sl < maxO; sl++) if (!occ.includes(sl)) { bad.push(`${c.name} ${["", "Дс", "Сс", "Ср", "Бс", "Жм"][d]}`); break; }
      }
    add("Тесіктер минималды (тек ресурс шегінде)", bad.length <= 8, bad.length ? `${bad.length} күн: ${bad.slice(0, 5).join(", ")}` : "тесік жоқ");
  }
  // Этаж ауысу нормасы: күніне 2 рет — норма, 3 — шектеулі, 4+ — жаман
  {
    const bad: string[] = [];
    let totalChanges = 0;
    for (const c of classes) {
      for (let day = 1; day <= 5; day++) {
        const dayLessons = slots
          .filter((o) => o.classId === c.id && o.day === day && (!o.groupId || o.groupId === "Г1"))
          .sort((a, b) => a.slot - b.slot);
        let changes = 0;
        for (let i = 1; i < dayLessons.length; i++) {
          const f1 = roomFloor(dayLessons[i - 1].roomId);
          const f2 = roomFloor(dayLessons[i].roomId);
          if (f1 > 0 && f2 > 0 && f1 !== f2) changes++;
        }
        totalChanges += changes;
        if (changes > 3) bad.push(`${c.name} ${["", "Дс", "Сс", "Ср", "Бс", "Жм"][day]} (${changes} рет)`);
      }
    }
    add("Этаж ауысу нормада (≤3/күн)", bad.length === 0, bad.length ? bad.slice(0, 5).join(", ") : `барлығы ${totalChanges} ауысу`);
  }

  /* ЭТАП 9 — сапа */
  prog(95, 6);
  const classScores: Record<string, number> = {};
  classes.forEach((c) => (classScores[c.name] = classScore(c.id)));
  const vals = Object.values(classScores).filter((v) => v > 0);
  const avgC = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const minC = vals.length ? Math.min(...vals) : 0;
  const balance = avgC ? (minC / avgC) * 100 : 100;
  let wins = 0, span = 0;
  for (const t of teachers) for (const sh of [1, 2]) for (let d = 1; d <= 5; d++) {
    const ss = [...new Set(slots.filter((o) => o.teacherId === t.id && o.shift === sh && o.day === d).map((o) => o.slot))];
    if (ss.length < 2) continue;
    const mn = Math.min(...ss), mx = Math.max(...ss);
    wins += mx - mn + 1 - ss.length; span += mx - mn + 1;
  }
  const comfort = span ? Math.max(0, 100 - (wins / span) * 100) : 100;
  const stressPct = (tests.filter((t) => t.passed).length / tests.length) * 100;
  const missedHours = unplaced.reduce((s, u) => s + (u.need - u.placed), 0);
  const quality = Math.max(0, Math.round(avgC * 0.35 + balance * 0.25 + comfort * 0.2 + stressPct * 0.2) - Math.min(25, missedHours));
  const warnings = [...sanpinWarnings, ...softWarnings, ...unplaced.map((u) => `${u.className} — ${u.subject}: ${u.placed}/${u.need} орналасты (${u.reason})`)];
  // Сыйымдылық ескертулері: сынып тар кабинетке сыймаған жағдайлар
  for (const cw of capWarn) {
    const [clsName, students, cap] = cw.split("|");
    warnings.push(`${clsName} (${students} оқушы) сыятын бос кабинет табылмады — ${cap} орындық кабинетке қойылды. Шешім: үлкенірек кабинет қосыңыз.`);
  }

  /* ТЕСІК ДИАГНОСТИКАСЫ: әр тесіктің НАҚТЫ себебін анықтау.
     Тесіктен кейінгі сабақтарды тексеріп, оларды неге gap-қа
     жылжыта алмағанымызды (мұғалім бос емес пе, арнайы кабинет/
     спортзал бос емес пе) адам тілінде түсіндіреміз. */
  const DAYN = ["", "Дүйсенбі", "Сейсенбі", "Сәрсенбі", "Бейсенбі", "Жұма"];
  const gaps: GapInfo[] = [];
  for (const c of targetClasses)
    for (let day = 1; day <= 5; day++) {
      const occ = slots.filter((o) => o.classId === c.id && o.day === day && (!o.groupId || o.groupId === "Г1")).map((o) => o.slot).sort((a, b) => a - b);
      if (occ.length < 2) continue;
      const maxO = occ[occ.length - 1];
      for (let g = 1; g < maxO; g++) {
        if (occ.includes(g)) continue;
        // осы тесікке кейінгі сабақтардың бірін жылжыта алмау себептері
        const cands = slots.filter((o) => o.classId === c.id && o.day === day && o.slot > g && (!o.groupId || o.groupId === "Г1"));
        const reasons = new Set<string>();
        for (const o of cands) {
          const subj = S[o.subjectId];
          if (o.dpart) { reasons.add(`«${subj.name}» — қос сабақ (бөлуге болмайды)`); continue; }
          // мұғалім gap-та бос па
          if (tm[o.teacherId][c.shift][day][g] !== null) {
            const other = tm[o.teacherId][c.shift][day][g]!;
            const ocl = C[other]?.name || "?";
            reasons.add(`«${subj.name}» мұғалімі (${T[o.teacherId]?.name}) бұл уақытта ${ocl} сыныбында сабақ беруде`);
            continue;
          }
          // арнайы кабинет / спортзал
          if (subj.room === "gym") {
            if (!gym || gymOcc[c.shift][day][g].length >= (gym.gymMax || 1)) { reasons.add(`«${subj.name}» — спортзал бұл уақытта бос емес`); continue; }
          } else if (subj.room) {
            const free = rooms.some((r) => r.type === subj.room && rm[r.id][c.shift][day][g] === null);
            if (!free) { reasons.add(`«${subj.name}» — арнайы кабинет (${ROOM_LABEL[subj.room]}) бұл уақытта бос емес`); continue; }
          }
          // hard ереже (шаршау/қара тізім/т.б.)
          const hc = hardCheck(c, o.teacherId, subj, day, g);
          if (hc) { reasons.add(`«${subj.name}» — ${hc}`); continue; }
          reasons.add(`«${subj.name}» — техникалық себеп`);
        }
        const reasonText = reasons.size
          ? [...reasons].slice(0, 2).join("; ")
          : "себебі анықталмады";
        gaps.push({ className: c.name, day, slot: g, reason: reasonText });
      }
    }
  // тесіктерді ескертулерге де қосамыз (нақты себеппен)
  for (const gp of gaps)
    warnings.push(`Тесік: ${gp.className}, ${DAYN[gp.day]} ${gp.slot}-сабақ бос — ${gp.reason}. Шешім: қосымша мұғалім немесе кабинет қажет.`);

  for (const t of teachers) {
    const h = slots.filter((o) => o.teacherId === t.id).length;
    if (h > t.norm) warnings.push(`${t.name}: жүктеме ${h} сағ > норма ${t.norm}`);
  }

  /* СЫНЫП САҒАТЫ: барлық тесік/сапа есебі аяқталғаннан КЕЙІН қосамыз —
     нағыз пән емес, ешбір қатаң ереже/тесік тексерісіне қатыспайды.
     Әр сыныптың сол күнгі соңғы сабағынан кейінгі слотқа қойылады, сондықтан
     құрылымы бойынша ешқашан тесік тудырмайды (сыныптар арасында саны әр
     түрлі болуы мүмкін — бұл қалыпты, әркімге өз кестесінен кейінгі орын). */
  if (settings.homeroom?.enabled) {
    const hd = settings.homeroom.day;
    // Барлық сынып бойынша (partial режимде құлыпталған сыныптардың да сынып
    // сағаты қайта қосылады — олардың базалық homeroom слоттары құлыптауда сүзілген)
    for (const c of classes) {
      const dayItems = slots.filter((o) => o.classId === c.id && o.day === hd && (!o.groupId || o.groupId === "Г1"));
      if (!dayItems.length) continue;
      const last = Math.max(...dayItems.map((o) => o.slot));
      const cap = maxSlots(c.grade, settings);
      if (last >= cap) continue;
      slots.push({
        key: `hr-${c.id}-${hd}`, classId: c.id, subjectId: HOMEROOM_SUBJECT_ID,
        teacherId: "", roomId: c.homeRoomId || "", day: hd, slot: last + 1,
        shift: c.shift, score: 0,
      });
    }
  }

  prog(100, 6);
  return {
    success: true, slots, quality, classScores, tests, unplaced, warnings, gaps,
    stats: {
      timeMs: Date.now() - t0, iters,
      total: slots.filter((o) => (!o.groupId || o.groupId === "Г1") && o.subjectId !== HOMEROOM_SUBJECT_ID).length,
      comfort: Math.round(comfort), balance: Math.round(balance), avgClass: Math.round(avgC),
      pedViol,
    },
  };
}

/* ════════════════════════════════════════════════════════════
   MULTI-RUN: бірнеше нұсқа жасап, ЕҢ ТИІМДІСІН таңдау.
   Әр нұсқа басқа seed-пен → басқа орналасу. Ең жақсысы:
   тесік аз → орналаспаған аз → сапа жоғары.
   ════════════════════════════════════════════════════════════ */
export type MultiProgressFn = (done: number, total: number, bestQuality: number) => void;

// Нұсқаның "жақсылық" ұпайы (салыстыру үшін)
function runScore(r: AlgoResult): number {
  if (!r.success) return -1e9;
  // тесіксіздік пен толықтық — басым; педагогикалық ережелер — екінші; сапа — үшінші
  return (r.gaps.length === 0 && r.unplaced.length === 0 ? 100000 : 0)
    - r.unplaced.length * 1000
    - r.gaps.length * 500
    - (r.stats.pedViol ?? 0) * 400 // ереже бұзушылығы аз нұсқа басым
    + r.quality * 10
    + r.stats.comfort; // тең болса — мұғалімге ыңғайлысы
}

// ЖЫЛДАМ РЕЖИМ+ (авто-қайталау): бір әрекет тесік/орналаспаған қалдырса —
// тағы бірнеше seed байқап, ең тазасын аламыз. Кесте құру ретке сезімтал:
// бір seed 4 тесік қалдырса, екіншісі 0-мен шығуы мүмкін (эмпирикалық
// дәлелденген). Әр әрекет ~0.1-0.2с — barлығы бәрібір лезде. Пайдаланушы
// нақты seed берсе (нұсқа генерациясы) — қайталамай, сол күйінде қайтарамыз.
export function generateAuto(input: AlgoInput, onProgress?: ProgressFn, maxTries = 8): AlgoResult {
  if (input.seed != null) return generate(input, onProgress);
  const t0 = Date.now();
  // Уақыт бюджеті: үлкен мектепте 8 әрекет тым ұзаққа кетпеуі үшін — бюджет
  // біткен соң қолда бардың ең жақсысын қайтарамыз (кіші мектеп бәрібір
  // 8-ін де үлгереді). Прогресс: 1-әрекет 0-90%, қалғандары 91-99% — бар
  // ешқашан 100%-да «қатып» тұрмайды (100% тек нәтижемен бірге).
  const BUDGET_MS = 2500;
  let best: AlgoResult | null = null;
  let bestScore = -Infinity;
  for (let i = 0; i < maxTries; i++) {
    const wrapped: ProgressFn | undefined = onProgress
      ? i === 0
        ? (p, st) => onProgress(Math.min(p, 90), st)
        : () => onProgress(Math.min(90 + i, 99), 6)
      : undefined;
    const r = generate({ ...input, seed: i === 0 ? 0 : i }, wrapped);
    const sc = runScore(r);
    if (sc > bestScore) { bestScore = sc; best = r; }
    // мінсіз (тесіксіз, толық, педагогикалық бұзусыз) — бірден тоқтаймыз
    if (r.success && r.gaps.length === 0 && r.unplaced.length === 0 && !r.stats.pedViol) break;
    if (Date.now() - t0 > BUDGET_MS) break; // бюджет бітті — ең жақсысын береміз
  }
  return best!;
}

export interface MultiResult {
  best: AlgoResult;
  bestSeed: number;
  triedCount: number;
  qualityRange: { min: number; max: number };
  cleanCount: number; // 0-тесік әрі 0-орналаспаған нұсқалар саны
}

export function generateMulti(
  input: AlgoInput,
  count: number,
  onProgress?: MultiProgressFn
): MultiResult {
  let best: AlgoResult | null = null;
  let bestSeed = 0;
  let bestScore = -Infinity;
  let minQ = 101, maxQ = -1, cleanCount = 0;
  let tried = 0;
  let lastImprove = 0; // ең соңғы жақсарған итерация индексі

  // ЕРТЕ ТОҚТАУ (жылдамдық). Екі шарт:
  //  (а) ТАЗА кесте (0 тесік + 0 орналаспаған) — «терең» режимнің басты мақсаты
  //      орындалса, floor-дан кейін тоқтаймыз;
  //  (б) PLATEAU — ең жақсы нәтиже соңғы `patience` нұсқада жақсармаса
  //      (ары қарай жүгірту сирек көмектеседі — диминишинг). Кез келген
  //      мектепке жарайды (таза шешім мүлде болмаса да).
  const floor = Math.min(count, Math.max(12, Math.ceil(count * 0.25))); // ең аз орындалатын сан
  const patience = Math.max(10, Math.ceil(count * 0.25));
  const cleanNeeded = 4;

  for (let i = 0; i < count; i++) {
    // seed=1..count (0 — әдепкі детерминді, оны да қосамыз бірінші)
    const seed = i === 0 ? 0 : i;
    const r = generate({ ...input, seed });
    tried++;
    const sc = runScore(r);
    if (r.success) {
      minQ = Math.min(minQ, r.quality);
      maxQ = Math.max(maxQ, r.quality);
      if (r.gaps.length === 0 && r.unplaced.length === 0 && !r.stats.pedViol) cleanCount++;
    }
    if (sc > bestScore) { bestScore = sc; best = r; bestSeed = seed; lastImprove = i; }
    if (onProgress) onProgress(i + 1, count, best?.quality ?? 0);
    if (tried < floor) continue; // ең азын міндетті орындаймыз
    if (cleanCount >= cleanNeeded) break;          // (а) жеткілікті таза
    if (i - lastImprove >= patience) break;         // (б) жақсару тоқтады
  }

  return {
    best: best!,
    bestSeed,
    triedCount: tried,
    qualityRange: { min: minQ === 101 ? 0 : minQ, max: maxQ === -1 ? 0 : maxQ },
    cleanCount,
  };
}
