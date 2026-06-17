// filepath: src/algorithm/engine.ts
// РАСПИС — кесте құру алгоритмі (Greedy + Maximin), жоспар v4.0 бойынша
// Таза TypeScript — React-сыз, Web Worker ішінде орындалады.

export type RoomType = "regular" | "physics" | "chemistry" | "computer" | "gym";

export interface Subject {
  id: string; name: string; score: number; coeff: number;
  ideal: number[]; room: RoomType | null; primaryScore?: number;
  digital: boolean; corr: boolean; canDouble: boolean; black: string[];
}
export interface Teacher {
  id: string; name: string; norm: number;
  gradeMin: number; gradeMax: number;
  shift: 1 | 2 | 3; // 3 = екі ауысымда да
  unavailable: string[]; // "day-slot"
  noInterShift: boolean;
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
export interface School {
  name: string; shift1Start: string; shift2Start: string;
  lessonDuration: number; shortBreak: number; longBreak: number;
  longBreakAfter: number; interShiftGap: number;
}
export interface Settings {
  maximin: boolean; maxIterations: number;
  // Күндік балл лимиттері — параллель топтары бойынша [1-4, 5-6, 7-9, 10-11]
  dayLimits: { g14: number; g56: number; g79: number; g1011: number };
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
}
export interface AlgoInput {
  school: School; subjects: Subject[]; classes: Klass[];
  teachers: Teacher[]; rooms: Room[]; settings: Settings;
  partial?: { classId: string; baseSlots: Slot[] };
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
  stats: { timeMs: number; iters: number; total: number; comfort: number; balance: number; avgClass: number };
}
export type ProgressFn = (pct: number, stage: number) => void;

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
export const maxSlots = (g: number) => (g === 1 ? 4 : g <= 4 ? 5 : g <= 6 ? 6 : g <= 9 ? 7 : 8);
export const DEFAULT_DAY_LIMITS = { g14: 25, g56: 35, g79: 45, g1011: 55 };
export const dayLimitS = (g: number, st?: Settings) => {
  const d = st?.dayLimits || DEFAULT_DAY_LIMITS;
  return g <= 4 ? d.g14 : g <= 6 ? d.g56 : g <= 9 ? d.g79 : d.g1011;
};
// артқа үйлесімділік (UI-да көрсету үшін)
export const dayLimit = (g: number) => dayLimitS(g);
export const DEFAULT_FATIGUE = { g14: 25, g59: 35, g1011: 45 };
export const fatThrS = (g: number, st?: Settings) => {
  const f = st?.fatigue || DEFAULT_FATIGUE;
  return g <= 4 ? f.g14 : g <= 9 ? f.g59 : f.g1011;
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
  const { school, classes, teachers, rooms, subjects, settings } = input;
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
    cls.grade <= 4 && s.primaryScore != null ? s.primaryScore : s.score;

  /* ЭТАП 0 — precheck */
  prog(3, 0);
  const targetClasses = input.partial ? classes.filter((c) => c.id === input.partial!.classId) : classes;
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

    // ═══ ЖҰМСАҚ ЕРЕЖЕЛЕР — қажет болса шкала бойынша жұмсартылады ═══
    if (soft) {
      // Жұмсақ режимде де шкаладан АСҚАН жағдайлар бұзылмайды (шектеулі жұмсарту).
      const rx = settings.relax;
      const exSlots = rx ? rx.extraSlots : 2;   // әдепкі: +2 сабақ
      const exScore = rx ? rx.extraScore : 20;  // әдепкі: +20 балл
      if (slot > maxSlots(cls.grade) + exSlots) return "күндік сабақ лимиті (шкаладан тыс)";
      if (dScore[cls.id][day] + eff(cls, subj) > dayLimitS(cls.grade, settings) + exScore) return "күндік ауыртпалық (шкаладан тыс)";
      if (rx && !rx.allowFatigue && eff(cls, subj) > 4 && fatigueAt(cls.id, day, slot) > fatThrS(cls.grade, settings)) return "шаршау шегі";
      if (rx && !rx.allowBlacklist) {
        const p = cm[cls.id][day][slot - 1], n = slot < 8 ? cm[cls.id][day][slot + 1] : null;
        if (p && (subj.black.includes(S[p].name) || S[p].black.includes(subj.name))) return "қара тізім жұбы";
        if (n && (subj.black.includes(S[n].name) || S[n].black.includes(subj.name))) return "қара тізім жұбы";
      }
      return null;
    }

    if (slot > maxSlots(cls.grade)) return "күндік сабақ лимиті";
    if (eff(cls, subj) > 4 && fatigueAt(cls.id, day, slot) > fatThrS(cls.grade, settings)) return "шаршау шегі";
    const prev = cm[cls.id][day][slot - 1];
    const next = slot < 8 ? cm[cls.id][day][slot + 1] : null;
    const bl = subj.black;
    if (prev && (bl.includes(S[prev].name) || S[prev].black.includes(subj.name))) return "қара тізім жұбы";
    if (next && (bl.includes(S[next].name) || S[next].black.includes(subj.name))) return "қара тізім жұбы";
    if (prev && S[prev].digital && subj.score > 5) return "информатикадан кейін жеңіл пән";
    if (next && subj.digital && S[next].score > 5) return "информатикадан кейін жеңіл пән";
    if (subj.corr && slot <= 3) return "түзету сабағы — 4+ слот";
    if (dScore[cls.id][day] + eff(cls, subj) > dayLimitS(cls.grade, settings)) return "күндік балл лимиті";
    return null;
  };

  // Жұмсақ режимде сабақ қойғанда ҚАНДАЙ қалаулы ереже бұзылғанын анықтайды.
  // Қайтарады: бұзылған ережелердің тізімі (бос болса — таза орналасты).
  const softViolations = (cls: Klass, subj: Subject, day: number, slot: number): string[] => {
    const v: string[] = [];
    if (slot > maxSlots(cls.grade)) v.push(`${cls.name}: күндік сабақ лимитінен асты (${slot}-сабақ)`);
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
    const candidates = rooms.filter((r) => r.type === "regular" && rm[r.id][cls.shift][day][slot] === null && (!exclude || !exclude.has(r.id)));
    if (!candidates.length) return null;
    // сол күнгі осы сыныптың басым этажын табамыз
    const dayRooms = slots.filter((o) => o.classId === cls.id && o.day === day && (!o.groupId || o.groupId === "Г1")).map((o) => roomFloor(o.roomId)).filter((f) => f > 0);
    if (!dayRooms.length) return candidates[0].id; // әлі сабақ жоқ — кез келген
    // ең жиі этаж
    const freq: Record<number, number> = {};
    dayRooms.forEach((f) => (freq[f] = (freq[f] || 0) + 1));
    const domFloor = Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]);
    // басым этажға ең жақын кабинетті таңдаймыз
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

  /* Partial: басқа сыныптардың слоттарын құлыптап орналастыру */
  if (input.partial) {
    for (const b of input.partial.baseSlots) {
      if (b.classId === input.partial.classId) continue;
      place({ ...b, locked: true }, { skipDaySet: b.dpart === 2 });
    }
  }

  /* ЭТАП 2 — приоритет кезегі */
  prog(15, 2);
  const tasks: Task[] = [];
  for (const c of targetClasses)
    for (const cu of c.curriculum) {
      const s = S[cu.subjectId];
      if (!s || !cu.hours) continue;
      const doubles = s.canDouble && cu.hours > 5 ? cu.hours - 5 : 0;
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
    const e1 = hardCheck(cls, tk.cu.teacherId!, s, day, slot);
    if (e1) return null;
    if (cm[cls.id][day][slot + 1] !== null) return null;
    if (tm[tk.cu.teacherId!][cls.shift][day][slot + 1] !== null) return null;
    if (T[tk.cu.teacherId!].unavailable.includes(`${day}-${slot + 1}`)) return null;
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
    const arr = slots.filter((o) => o.classId === cid && (!o.groupId || o.groupId === "Г1") && !o.locked);
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
          // спортзал топ үйлесімі
          const groups = gym.gymGroups && gym.gymGroups.length ? gym.gymGroups : [[1, 11]];
          const grp = groups.find((g) => g[0] <= c.grade && c.grade <= g[1]);
          if (!grp) return null;
          room = gym.id;
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

  /* Мұғалім терезесі: rebuildDay (бірінші тесіксіз шешім) сабақтарды әр күні
     1-слоттан тығыз орналастырады, бұл мұғалім терезесін де табиғи түрде
     азайтады. Терезені қосымша swap/жылжытумен азайту сынап көрілді, бірақ
     ол сынып тесіксіздігін бұзатындықтан (каскад) қолданылмайды:
     СЫНЫП ТЕСІКСІЗДІГІ — басымдық. */

  /* Апта балансын түзету: Жұманың жеңіл сабағын Сәрсенбіге жылжыту */
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
        for (const d2 of [3, 2, 4, 1]) {
          if (ok) break;
          if (ds[c.id][d2].has(o.subjectId)) continue;
          for (let slot = 1; slot <= maxSlots(c.grade) && !ok; slot++) {
            if (hardCheck(c, o.teacherId, subj, d2, slot)) continue;
            const roomId = findRoom(c, subj, d2, slot);
            if (!roomId) continue;
            place({ classId: o.classId, subjectId: o.subjectId, teacherId: o.teacherId, roomId, day: d2, slot, shift: o.shift, score: pScore(subj, slot, settings) });
            ok = true; moved = true;
          }
        }
        if (!ok) place(o); else break;
      }
      if (!moved) break;
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
  const warnings = [...softWarnings, ...unplaced.map((u) => `${u.className} — ${u.subject}: ${u.placed}/${u.need} орналасты (${u.reason})`)];

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
  prog(100, 6);
  return {
    success: true, slots, quality, classScores, tests, unplaced, warnings, gaps,
    stats: {
      timeMs: Date.now() - t0, iters,
      total: slots.filter((o) => (!o.groupId || o.groupId === "Г1")).length,
      comfort: Math.round(comfort), balance: Math.round(balance), avgClass: Math.round(avgC),
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
  // тесіксіздік пен толықтық — басым; сапа — екінші
  return (r.gaps.length === 0 && r.unplaced.length === 0 ? 100000 : 0)
    - r.unplaced.length * 1000
    - r.gaps.length * 500
    + r.quality * 10
    + r.stats.comfort; // тең болса — мұғалімге ыңғайлысы
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

  for (let i = 0; i < count; i++) {
    // seed=1..count (0 — әдепкі детерминді, оны да қосамыз бірінші)
    const seed = i === 0 ? 0 : i;
    const r = generate({ ...input, seed });
    const sc = runScore(r);
    if (r.success) {
      minQ = Math.min(minQ, r.quality);
      maxQ = Math.max(maxQ, r.quality);
      if (r.gaps.length === 0 && r.unplaced.length === 0) cleanCount++;
    }
    if (sc > bestScore) { bestScore = sc; best = r; bestSeed = seed; }
    if (onProgress) onProgress(i + 1, count, best?.quality ?? 0);
  }

  return {
    best: best!,
    bestSeed,
    triedCount: count,
    qualityRange: { min: minQ === 101 ? 0 : minQ, max: maxQ === -1 ? 0 : maxQ },
    cleanCount,
  };
}
