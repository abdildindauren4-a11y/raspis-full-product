// filepath: src/lib/seed.ts
// Бастапқы (seed) деректер — оқу жоспарларымен ТОЛЫҚ, генерацияға дайын
import type { Subject, Teacher, Room, Klass, School, Settings, CurItem } from "@/algorithm/engine";

let seedCounter = 0;
const uid = () => "sd" + String(++seedCounter).padStart(4, "0");

export const seedSchool: School = {
  name: "№12 Ғ. Мұстафин атындағы гимназия",
  shift1Start: "08:00", shift2Start: "14:00",
  lessonDuration: 40, shortBreak: 5, longBreak: 20, longBreakAfter: 2,
  interShiftGap: 40,
};
export const seedSettings: Settings = {
  maximin: true, maxIterations: 400,
  dayLimits: { g14: 25, g56: 35, g79: 45, g1011: 55 },
  fatigue: { g14: 25, g59: 35, g1011: 45 },
  coeffs: { hard: 4, medium: 3, easy: 2 },
  relax: { extraSlots: 2, extraScore: 20, allowFatigue: true, allowBlacklist: true, allowDigital: true },
  teacherComfort: 0,
};

const sub = (name: string, score: number, coeff: number, ideal: number[], room: Subject["room"] = null, o: Partial<Subject> = {}): Subject => ({
  id: name, name, score, coeff, ideal, room, primaryScore: o.primaryScore,
  digital: !!o.digital, corr: !!o.corr, canDouble: !!o.canDouble, black: o.black || [],
});

export const seedSubjects: Subject[] = [
  sub("Математика", 10, 1.2, [2, 3], null, { black: ["Физика"], canDouble: true, primaryScore: 8 }),
  sub("Алгебра", 10, 1.2, [2, 3], null, { black: ["Физика"], canDouble: true }),
  sub("Геометрия", 9, 1.2, [2, 3], null, { black: ["Физика"] }),
  sub("Физика", 9, 1.2, [2, 3], "physics", { black: ["Математика", "Алгебра", "Геометрия"] }),
  sub("Химия", 10, 1.2, [2, 3], "chemistry"),
  sub("Ағылшын тілі", 8, 1.0, [2, 3], null, { primaryScore: 7 }),
  sub("Информатика", 7, 1.0, [2, 3, 4], "computer", { digital: true }),
  sub("Биология", 7, 1.0, [2, 3, 4]),
  sub("Тарих", 6, 1.0, [1, 3, 4]),
  sub("Дүниежүзі тарихы", 6, 1.0, [1, 3, 4]),
  sub("Қазақ тілі", 7, 1.0, [1, 3, 4], null, { black: ["Орыс тілі"], canDouble: true, primaryScore: 7 }),
  sub("Орыс тілі", 7, 1.0, [1, 3, 4], null, { black: ["Қазақ тілі"], canDouble: true, primaryScore: 7 }),
  sub("Әдебиет", 5, 1.0, [1, 3, 4]),
  sub("География", 6, 1.0, [1, 3, 4]),
  sub("Жаратылыстану", 6, 1.0, [1, 3, 4]),
  sub("Дүниетану", 5, 1.0, [1, 3, 4]),
  sub("Дене шынықтыру", 5, 0.7, [5, 6, 7], "gym"),
  sub("Технология", 3, 0.7, [5, 6, 7]),
  sub("Музыка", 2, 0.7, [5, 6, 7]),
  sub("Өзін-өзі тану", 2, 0.7, [5, 6, 7]),
  sub("Көркем еңбек", 1, 0.7, [5, 6, 7]),
  sub("Коррекциялық сабақ", 2, 0.7, [5, 6, 7], null, { corr: true }),
];

/* ── Параллель бойынша оқу жоспары үлгілері (ҚР, 5 күн) ── */
function planFor(grade: number): [string, number][] {
  if (grade <= 2)
    return [["Математика", 4], ["Қазақ тілі", 4], ["Орыс тілі", 2], ["Ағылшын тілі", 1],
      ["Дүниетану", 1], ["Дене шынықтыру", 2], ["Музыка", 1], ["Көркем еңбек", 1]];
  if (grade <= 4)
    return [["Математика", 4], ["Қазақ тілі", 4], ["Орыс тілі", 2], ["Ағылшын тілі", 2],
      ["Дүниетану", 1], ["Жаратылыстану", 1], ["Дене шынықтыру", 2], ["Музыка", 1],
      ["Көркем еңбек", 1], ["Өзін-өзі тану", 1]];
  if (grade <= 6)
    return [["Математика", 5], ["Қазақ тілі", 3], ["Орыс тілі", 2], ["Әдебиет", 2],
      ["Ағылшын тілі", 3], ["Тарих", 2], ["Информатика", 1],
      ["Дене шынықтыру", 2], ["Музыка", 1], ["Көркем еңбек", 1], ["Өзін-өзі тану", 1],
      ...(grade === 5 ? [["Жаратылыстану", 2]] as [string, number][]
                      : [["Биология", 1], ["География", 2]] as [string, number][])];
  if (grade <= 8)
    return [["Алгебра", 3], ["Геометрия", 2], ["Қазақ тілі", 3], ["Орыс тілі", 2],
      ["Әдебиет", 2], ["Ағылшын тілі", 3], ["Физика", 2], ...(grade >= 8 ? [["Химия", 2]] as [string, number][] : []),
      ["Биология", 2], ["География", 1], ["Тарих", 2], ["Дүниежүзі тарихы", 1],
      ["Информатика", 1], ["Дене шынықтыру", 2], ["Өзін-өзі тану", 1]];
  return [["Алгебра", 3], ["Геометрия", 2], ["Қазақ тілі", 2], ["Орыс тілі", 2],
    ["Әдебиет", 2], ["Ағылшын тілі", 3], ["Физика", grade >= 10 ? 3 : 2], ["Химия", 2],
    ["Биология", 2], ["География", 1], ["Тарих", 2], ["Дүниежүзі тарихы", 1],
    ["Информатика", 2], ["Дене шынықтыру", 2], ["Өзін-өзі тану", 1]];
}

export interface SeedResult { classes: Klass[]; teachers: Teacher[]; rooms: Room[] }

export function buildSeed(): SeedResult {
  const teachers: Teacher[] = [];
  const rooms: Room[] = [];

  // Кабинеттер: 20 қарапайым + арнайылар + спортзал
  for (let i = 1; i <= 12; i++) rooms.push({ id: uid(), number: String(100 + i), type: "regular", capacity: 32 });
  for (let i = 1; i <= 8; i++) rooms.push({ id: uid(), number: String(200 + i), type: "regular", capacity: 32 });
  rooms.push({ id: uid(), number: "Физика зертханасы", type: "physics", capacity: 26 });
  rooms.push({ id: uid(), number: "Химия зертханасы", type: "chemistry", capacity: 26 });
  rooms.push({ id: uid(), number: "Информатика-1", type: "computer", capacity: 20 });
  rooms.push({ id: uid(), number: "Информатика-2", type: "computer", capacity: 20 });
  rooms.push({ id: uid(), number: "Спортзал", type: "gym", capacity: 60, gymMax: 2, gymGroups: [[1, 4], [5, 7], [8, 11]] });

  // ── 5-11 сыныптар (1-ауысым), әр параллельде 2 сынып ──
  const classes: Klass[] = [];
  const upper: Klass[] = [];
  for (let g = 5; g <= 11; g++)
    for (const L of ["А", "Б"])
      upper.push({ id: uid(), name: g + L, grade: g, students: 24 + ((g + L.charCodeAt(0)) % 8), shift: 1, curriculum: [] });

  // пән бойынша сұраныс → мұғалімдер пулы
  const demand: Record<string, number> = {};
  upper.forEach((c) => planFor(c.grade).forEach(([s, h]) => (demand[s] = (demand[s] || 0) + h)));
  const FAM = ["Ахметова", "Бектұрғанов", "Серікбаева", "Нұржанова", "Омаров", "Ибрагимова",
    "Петрова", "Қуанышев", "Алиева", "Ермеков", "Мұхамеджанова", "Сыздықов", "Рахимова",
    "Исаев", "Оразбаева", "Жанабаев", "Төлеубекова", "Мұсабеков", "Нұрмаханова", "Қасымова"];
  let fi = 0;
  const pool: Record<string, Teacher[]> = {};
  for (const [s, total] of Object.entries(demand)) {
    const n = Math.max(1, Math.ceil(total / 10));
    pool[s] = [];
    for (let i = 0; i < n; i++) {
      const t: Teacher = {
        id: uid(), name: `${FAM[fi % FAM.length]} ${String.fromCharCode(65 + (fi % 26))}.`,
        norm: 20, gradeMin: s === "Дене шынықтыру" || s === "Музыка" ? 1 : 5, gradeMax: 11,
        shift: s === "Дене шынықтыру" || s === "Музыка" ? 3 : 1,
        unavailable: [], noInterShift: false, subjects: [s],
      };
      fi++;
      teachers.push(t); pool[s].push(t);
    }
  }
  // ағылшын тілінен топ бөлуге қосымша мұғалім
  const extraEng: Teacher = { id: uid(), name: "Смит Дж.", norm: 20, gradeMin: 5, gradeMax: 11, shift: 1, unavailable: [], noInterShift: false, subjects: ["Ағылшын тілі"] };
  teachers.push(extraEng); pool["Ағылшын тілі"].push(extraEng);

  const load: Record<string, number> = {};
  const pick = (s: string, h: number): Teacher => {
    const t = pool[s].slice().sort((a, b) => (load[a.id] || 0) - (load[b.id] || 0))[0];
    load[t.id] = (load[t.id] || 0) + h;
    return t;
  };
  upper.forEach((c) => {
    c.curriculum = planFor(c.grade).map(([s, h]): CurItem => ({ id: uid(), subjectId: s, teacherId: pick(s, h).id, hours: h }));
  });
  // 5А Ағылшын тілін 2 топқа бөлу (демо)
  const c5a = upper.find((c) => c.name === "5А")!;
  const eng = c5a.curriculum.find((x) => x.subjectId === "Ағылшын тілі")!;
  const engTs = pool["Ағылшын тілі"].slice(0, 2);
  eng.isSplit = true; eng.teacherId = undefined;
  eng.groups = [{ teacherId: engTs[0].id }, { teacherId: engTs[1].id }];

  // ── 1-4 сыныптар (2-ауысым), сынып жетекшісі моделі ──
  const peTeachers: Teacher[] = ["Ермеков Т.", "Сапаров Е.", "Жұманов Қ.", "Әбенов Д."].map((nm) =>
    ({ id: uid(), name: `${nm} (дене, баст.)`, norm: 24, gradeMin: 1, gradeMax: 4, shift: 2, unavailable: [], noInterShift: false, subjects: ["Дене шынықтыру"] }));
  const musTeachers: Teacher[] = ["Лебедева И.", "Қайырова А.", "Нұрлан Б."].map((nm) =>
    ({ id: uid(), name: `${nm} (музыка, баст.)`, norm: 18, gradeMin: 1, gradeMax: 4, shift: 2, unavailable: [], noInterShift: false, subjects: ["Музыка"] }));
  teachers.push(...peTeachers, ...musTeachers);
  let peIdx = 0, musIdx = 0;
  // Бастауышқа арналған негізгі кабинеттер (1-этаж, тыныш бөлік)
  const primaryRooms = rooms.filter((r) => r.type === "regular" && /^1/.test(r.number));
  let prIdx = 0;
  for (let g = 1; g <= 4; g++)
    for (const L of ["А", "Б"]) {
      const homeRoom = primaryRooms[prIdx++ % primaryRooms.length];
      const cls: Klass = { id: uid(), name: g + L, grade: g, students: 24 + g, shift: 2, curriculum: [], homeRoomId: homeRoom.id };
      const home: Teacher = {
        id: uid(), name: `${FAM[fi % FAM.length]} ${String.fromCharCode(65 + (fi % 26))}. (бастауыш ${cls.name})`,
        norm: 22, gradeMin: 1, gradeMax: 4, shift: 2, unavailable: [], noInterShift: false,
      };
      fi++; teachers.push(home);
      cls.curriculum = planFor(g).map(([s, h]): CurItem => {
        if (s === "Дене шынықтыру") return { id: uid(), subjectId: s, teacherId: peTeachers[peIdx++ % peTeachers.length].id, hours: h };
        if (s === "Музыка") return { id: uid(), subjectId: s, teacherId: musTeachers[musIdx++ % musTeachers.length].id, hours: h };
        return { id: uid(), subjectId: s, teacherId: home.id, hours: h };
      });
      classes.push(cls);
    }
  classes.push(...upper);
  classes.sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));
  return { classes, teachers, rooms };
}
