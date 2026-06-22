// filepath: src/lib/bigSeed.ts
// Нақты ірі мектеп деректері — №165 ЖОБ мектебі, Алматы
// ҚР МЖМБС 2022 оқу жоспарына сәйкес, 3 параллель (А,Б,В), 1–11 сынып
import type { Subject, Teacher, Room, Klass, School, Settings, CurItem } from "@/algorithm/engine";

let _c = 0;
const uid = () => "bg" + String(++_c).padStart(4, "0");

export const bigSchool: School = {
  name: "№165 Жалпы орта білім беретін мектеп, Алматы",
  shift1Start: "08:00",
  shift2Start: "13:30",
  lessonDuration: 45,
  shortBreak: 10,
  longBreak: 20,
  longBreakAfter: 3,
  interShiftGap: 40,
};

export const bigSettings: Settings = {
  maximin: true,
  maxIterations: 400,
  dayLimits: { g14: 28, g56: 36, g79: 46, g1011: 56 },
  fatigue: { g14: 28, g59: 36, g1011: 46 },
  coeffs: { hard: 4, medium: 3, easy: 2 },
  relax: { extraSlots: 2, extraScore: 20, allowFatigue: true, allowBlacklist: true, allowDigital: true },
  teacherComfort: 0,
};

// ── Пәндер (ҚР МЖМБС 2022) ──
const S = (name: string, score: number, coeff: number, ideal: number[], room: Subject["room"] = null, o: Partial<Subject> = {}): Subject => ({
  id: name, name, score, coeff, ideal, room,
  primaryScore: o.primaryScore,
  digital: !!o.digital, corr: !!o.corr, canDouble: !!o.canDouble, black: o.black || [],
});

export const bigSubjects: Subject[] = [
  S("Математика",       10, 1.2, [2,3], null,      { black: ["Физика"], canDouble: true, primaryScore: 8 }),
  S("Алгебра",          10, 1.2, [2,3], null,      { black: ["Физика","Геометрия"], canDouble: true }),
  S("Геометрия",         9, 1.2, [2,3], null,      { black: ["Физика","Алгебра"] }),
  S("Физика",            9, 1.2, [2,3], "physics", { black: ["Математика","Алгебра","Геометрия"] }),
  S("Химия",             9, 1.2, [2,3], "chemistry"),
  S("Биология",          7, 1.0, [2,3,4]),
  S("Информатика",       7, 1.0, [2,3,4], "computer", { digital: true }),
  S("Қазақ тілі",        7, 1.0, [1,3,4], null,    { black: ["Орыс тілі"], canDouble: true, primaryScore: 7 }),
  S("Қазақ әдебиеті",    5, 1.0, [1,3,4]),
  S("Орыс тілі",         7, 1.0, [1,3,4], null,    { black: ["Қазақ тілі"], canDouble: true, primaryScore: 7 }),
  S("Орыс әдебиеті",     5, 1.0, [1,3,4]),
  S("Ағылшын тілі",      8, 1.0, [2,3], null,      { primaryScore: 6 }),
  S("Қазақстан тарихы",  6, 1.0, [1,3,4]),
  S("Дүниежүзі тарихы",  6, 1.0, [1,3,4]),
  S("География",          6, 1.0, [1,3,4]),
  S("Жаратылыстану",      6, 1.0, [1,3,4]),
  S("Дүниетану",          5, 1.0, [1,3,4]),
  S("Дене шынықтыру",     5, 0.7, [5,6,7], "gym"),
  S("Музыка",             2, 0.7, [5,6,7]),
  S("Бейнелеу өнері",     2, 0.7, [5,6,7]),
  S("Технология",         3, 0.7, [5,6,7]),
  S("Өзін-өзі тану",      2, 0.7, [5,6,7]),
  S("Коррекциялық сабақ", 2, 0.7, [5,6,7], null, { corr: true }),
];

// ── Оқу жоспары (апталық сағат саны, ҚР нормативіне сәйкес) ──
function planFor(grade: number): [string, number][] {
  // 1-сынып
  if (grade === 1)
    return [
      ["Математика", 4], ["Қазақ тілі", 4], ["Орыс тілі", 2], ["Ағылшын тілі", 1],
      ["Дүниетану", 2], ["Дене шынықтыру", 3], ["Музыка", 1], ["Бейнелеу өнері", 1],
    ];
  // 2-сынып
  if (grade === 2)
    return [
      ["Математика", 4], ["Қазақ тілі", 4], ["Орыс тілі", 2], ["Ағылшын тілі", 2],
      ["Дүниетану", 2], ["Дене шынықтыру", 3], ["Музыка", 1], ["Бейнелеу өнері", 1],
    ];
  // 3-сынып
  if (grade === 3)
    return [
      ["Математика", 4], ["Қазақ тілі", 4], ["Орыс тілі", 2], ["Ағылшын тілі", 2],
      ["Жаратылыстану", 2], ["Дүниетану", 1], ["Дене шынықтыру", 3], ["Музыка", 1], ["Бейнелеу өнері", 1],
    ];
  // 4-сынып
  if (grade === 4)
    return [
      ["Математика", 4], ["Қазақ тілі", 4], ["Орыс тілі", 2], ["Ағылшын тілі", 3],
      ["Жаратылыстану", 2], ["Дүниетану", 1], ["Дене шынықтыру", 3], ["Музыка", 1], ["Бейнелеу өнері", 1],
    ];
  // 5-сынып
  if (grade === 5)
    return [
      ["Математика", 5], ["Қазақ тілі", 3], ["Қазақ әдебиеті", 2],
      ["Орыс тілі", 2], ["Орыс әдебиеті", 2],
      ["Ағылшын тілі", 3], ["Жаратылыстану", 2],
      ["Қазақстан тарихы", 1], ["Информатика", 1],
      ["Дене шынықтыру", 3], ["Музыка", 1], ["Өзін-өзі тану", 1],
    ];
  // 6-сынып (26с, ҚР МЖМ нег.)
  if (grade === 6)
    return [
      ["Математика", 5], ["Қазақ тілі", 3], ["Қазақ әдебиеті", 1],
      ["Орыс тілі", 2], ["Орыс әдебиеті", 1],
      ["Ағылшын тілі", 3], ["Биология", 2], ["География", 2],
      ["Қазақстан тарихы", 2], ["Информатика", 1],
      ["Дене шынықтыру", 2], ["Өзін-өзі тану", 1], ["Музыка", 1],
    ];
  // 7-сынып
  if (grade === 7)
    return [
      ["Алгебра", 3], ["Геометрия", 2],
      ["Қазақ тілі", 3], ["Қазақ әдебиеті", 2],
      ["Орыс тілі", 2], ["Орыс әдебиеті", 2],
      ["Ағылшын тілі", 3], ["Физика", 2], ["Биология", 2], ["География", 2],
      ["Қазақстан тарихы", 2], ["Дүниежүзі тарихы", 1],
      ["Информатика", 1], ["Дене шынықтыру", 3], ["Өзін-өзі тану", 1],
    ];
  // 8-сынып
  if (grade === 8)
    return [
      ["Алгебра", 3], ["Геометрия", 2],
      ["Қазақ тілі", 3], ["Қазақ әдебиеті", 2],
      ["Орыс тілі", 2], ["Орыс әдебиеті", 2],
      ["Ағылшын тілі", 3], ["Физика", 2], ["Химия", 2], ["Биология", 2], ["География", 1],
      ["Қазақстан тарихы", 2], ["Дүниежүзі тарихы", 1],
      ["Информатика", 1], ["Дене шынықтыру", 2], ["Өзін-өзі тану", 1],
    ];
  // 9-сынып (31с, ҚР МЖМ)
  if (grade === 9)
    return [
      ["Алгебра", 3], ["Геометрия", 2],
      ["Қазақ тілі", 2], ["Қазақ әдебиеті", 2],
      ["Орыс тілі", 2], ["Орыс әдебиеті", 2],
      ["Ағылшын тілі", 3], ["Физика", 3], ["Химия", 2], ["Биология", 2],
      ["Қазақстан тарихы", 2], ["Дүниежүзі тарихы", 1],
      ["Информатика", 2], ["Дене шынықтыру", 2], ["Өзін-өзі тану", 1],
    ];
  // 10-сынып
  if (grade === 10)
    return [
      ["Алгебра", 3], ["Геометрия", 2],
      ["Қазақ тілі", 2], ["Қазақ әдебиеті", 2],
      ["Орыс тілі", 2], ["Орыс әдебиеті", 2],
      ["Ағылшын тілі", 3], ["Физика", 3], ["Химия", 2], ["Биология", 2], ["География", 1],
      ["Қазақстан тарихы", 2], ["Дүниежүзі тарихы", 1],
      ["Информатика", 2], ["Дене шынықтыру", 2], ["Өзін-өзі тану", 1],
    ];
  // 11-сынып
  return [
    ["Алгебра", 4], ["Геометрия", 2],
    ["Қазақ тілі", 2], ["Қазақ әдебиеті", 2],
    ["Орыс тілі", 2], ["Орыс әдебиеті", 2],
    ["Ағылшын тілі", 3], ["Физика", 3], ["Химия", 2], ["Биология", 2],
    ["Қазақстан тарихы", 2], ["Дүниежүзі тарихы", 1],
    ["Информатика", 2], ["Дене шынықтыру", 2], ["Өзін-өзі тану", 1],
  ];
}

// ── Нақты мұғалімдер тізімі (типтік алматылық мектеп) ──
// Тегі, аты-жөні нақты қазақстандық формада
const TEACHERS_RAW: {
  name: string; subjects: string[]; gradeMin: number; gradeMax: number;
  shift: 1|2|3; norm: number;
}[] = [
  // Математика (5-11)
  { name: "Сейткали Б.Т.", subjects: ["Алгебра","Геометрия"], gradeMin: 7, gradeMax: 11, shift: 1, norm: 22 },
  { name: "Ахметова Г.М.",  subjects: ["Алгебра","Геометрия"], gradeMin: 7, gradeMax: 11, shift: 1, norm: 22 },
  { name: "Нұрлыбаева А.С.", subjects: ["Математика","Алгебра"], gradeMin: 5, gradeMax: 9, shift: 1, norm: 22 },
  { name: "Ержанова Д.Б.",  subjects: ["Математика"], gradeMin: 5, gradeMax: 6, shift: 1, norm: 18 },

  // Қазақ тілі мен әдебиеті (5-11)
  { name: "Байжанова Р.Қ.", subjects: ["Қазақ тілі","Қазақ әдебиеті"], gradeMin: 5, gradeMax: 11, shift: 1, norm: 22 },
  { name: "Мұсаева З.А.",   subjects: ["Қазақ тілі","Қазақ әдебиеті"], gradeMin: 5, gradeMax: 11, shift: 1, norm: 22 },
  { name: "Тілеуова К.М.",  subjects: ["Қазақ тілі","Қазақ әдебиеті"], gradeMin: 5, gradeMax: 11, shift: 1, norm: 20 },
  { name: "Дюсенова А.Б.",  subjects: ["Қазақ тілі","Қазақ әдебиеті"], gradeMin: 5, gradeMax: 9, shift: 1, norm: 18 },

  // Орыс тілі мен әдебиеті (5-11) — 84 сағат → 5 мұғалім (буфермен)
  { name: "Иванова Н.В.",   subjects: ["Орыс тілі","Орыс әдебиеті"], gradeMin: 5, gradeMax: 11, shift: 1, norm: 22 },
  { name: "Петрова С.И.",   subjects: ["Орыс тілі","Орыс әдебиеті"], gradeMin: 5, gradeMax: 11, shift: 1, norm: 22 },
  { name: "Соколова Т.Е.",  subjects: ["Орыс тілі","Орыс әдебиеті"], gradeMin: 5, gradeMax: 9,  shift: 1, norm: 22 },
  { name: "Кириленко О.В.", subjects: ["Орыс тілі","Орыс әдебиеті"], gradeMin: 5, gradeMax: 11, shift: 1, norm: 20 },
  { name: "Морозова Е.А.",  subjects: ["Орыс тілі","Орыс әдебиеті"], gradeMin: 5, gradeMax: 8,  shift: 1, norm: 16 },

  // Ағылшын тілі (5-11) — 21 сынып × 3с = 63 сағат → 3 мұғалім жеткілікті
  { name: "Смитова Г.Р.",      subjects: ["Ағылшын тілі"], gradeMin: 5, gradeMax: 11, shift: 1, norm: 22 },
  { name: "Абдрахманова С.К.", subjects: ["Ағылшын тілі"], gradeMin: 5, gradeMax: 11, shift: 1, norm: 22 },
  { name: "Ким А.П.",          subjects: ["Ағылшын тілі"], gradeMin: 5, gradeMax: 11, shift: 1, norm: 22 },

  // Физика (7-11)
  { name: "Рысқалиев М.Ж.", subjects: ["Физика"], gradeMin: 7, gradeMax: 11, shift: 1, norm: 20 },
  { name: "Ғаббасов Е.Т.",  subjects: ["Физика"], gradeMin: 7, gradeMax: 11, shift: 1, norm: 18 },

  // Химия (8-11)
  { name: "Сатыбалдина Ш.Н.", subjects: ["Химия"], gradeMin: 8, gradeMax: 11, shift: 1, norm: 18 },
  { name: "Қасымбекова Г.Б.", subjects: ["Химия"], gradeMin: 8, gradeMax: 11, shift: 1, norm: 16 },

  // Биология (6-11)
  { name: "Байқонырова М.С.", subjects: ["Биология"], gradeMin: 6, gradeMax: 11, shift: 1, norm: 20 },
  { name: "Оспанова Д.А.",   subjects: ["Биология"], gradeMin: 6, gradeMax: 11, shift: 1, norm: 18 },

  // География (6-11)
  { name: "Асқарова Н.Қ.",  subjects: ["География"], gradeMin: 6, gradeMax: 11, shift: 1, norm: 18 },
  { name: "Нұрмаханов С.Б.", subjects: ["География"], gradeMin: 6, gradeMax: 10, shift: 1, norm: 14 },

  // Тарих (5-11) — 54 сағат → 4 мұғалім (слот буферімен)
  { name: "Сейтқалиев Б.Ж.", subjects: ["Қазақстан тарихы","Дүниежүзі тарихы"], gradeMin: 5, gradeMax: 11, shift: 1, norm: 22 },
  { name: "Маусымбекова Г.Д.", subjects: ["Қазақстан тарихы","Дүниежүзі тарихы"], gradeMin: 5, gradeMax: 11, shift: 1, norm: 22 },
  { name: "Бекова Ж.Т.",    subjects: ["Қазақстан тарихы","Дүниежүзі тарихы"], gradeMin: 5, gradeMax: 11, shift: 1, norm: 20 },
  { name: "Мамытов А.Б.",   subjects: ["Қазақстан тарихы","Дүниежүзі тарихы"], gradeMin: 7, gradeMax: 11, shift: 1, norm: 16 },

  // Информатика (5-11)
  { name: "Сейтжан А.Б.",   subjects: ["Информатика"], gradeMin: 5, gradeMax: 11, shift: 1, norm: 20 },
  { name: "Нұрболат Е.Қ.",  subjects: ["Информатика"], gradeMin: 5, gradeMax: 11, shift: 1, norm: 20 },

  // Жаратылыстану (5-6)
  { name: "Тлеубаева А.М.", subjects: ["Жаратылыстану"], gradeMin: 5, gradeMax: 6, shift: 1, norm: 14 },

  // Дене шынықтыру (1-11) — 21 жоғары сынып × орт.2.4с = ~51 сағат → 3 мұғалім (1-ауысым)
  { name: "Сатыбалдин Е.С.", subjects: ["Дене шынықтыру"], gradeMin: 5, gradeMax: 11, shift: 1, norm: 24 },
  { name: "Алмасбеков Д.Қ.", subjects: ["Дене шынықтыру"], gradeMin: 5, gradeMax: 11, shift: 1, norm: 24 },
  { name: "Жақсыбай Н.Т.",   subjects: ["Дене шынықтыру"], gradeMin: 5, gradeMax: 11, shift: 1, norm: 24 },
  { name: "Темірбек Р.Б.",   subjects: ["Дене шынықтыру"], gradeMin: 1, gradeMax: 4,  shift: 2, norm: 24 },
  { name: "Қыдырбаев Т.М.",  subjects: ["Дене шынықтыру"], gradeMin: 1, gradeMax: 4,  shift: 2, norm: 24 },

  // Музыка (1-6) — 18 сынып × 1с = 18с → 2 мұғалім
  { name: "Жанпейісова А.М.", subjects: ["Музыка"], gradeMin: 1, gradeMax: 6, shift: 3, norm: 18 },
  { name: "Байболова Р.С.",   subjects: ["Музыка"], gradeMin: 1, gradeMax: 6, shift: 3, norm: 18 },

  // Бейнелеу өнері (1-4)
  { name: "Нұрғалиева Г.Н.", subjects: ["Бейнелеу өнері"], gradeMin: 1, gradeMax: 4, shift: 2, norm: 14 },

  // Өзін-өзі тану (5-11)
  { name: "Жанатова Л.М.",  subjects: ["Өзін-өзі тану"], gradeMin: 5, gradeMax: 11, shift: 1, norm: 18 },
  { name: "Рахимова Д.Б.",  subjects: ["Өзін-өзі тану"], gradeMin: 5, gradeMax: 11, shift: 1, norm: 16 },

  // Бастауыш сынып жетекшілері (1-4, 2-ауысым) — 3 параллель × 4 сынып = 12 мұғалім
  { name: "Омарова Ж.Б.",    subjects: ["Математика","Қазақ тілі","Орыс тілі","Ағылшын тілі","Жаратылыстану","Дүниетану","Бейнелеу өнері"], gradeMin: 1, gradeMax: 4, shift: 2, norm: 22 },
  { name: "Есенова К.Н.",    subjects: ["Математика","Қазақ тілі","Орыс тілі","Ағылшын тілі","Жаратылыстану","Дүниетану","Бейнелеу өнері"], gradeMin: 1, gradeMax: 4, shift: 2, norm: 22 },
  { name: "Мирзахмедова А.С.", subjects: ["Математика","Қазақ тілі","Орыс тілі","Ағылшын тілі","Жаратылыстану","Дүниетану","Бейнелеу өнері"], gradeMin: 1, gradeMax: 4, shift: 2, norm: 22 },
  { name: "Дүйсенбаева Р.А.", subjects: ["Математика","Қазақ тілі","Орыс тілі","Ағылшын тілі","Жаратылыстану","Дүниетану","Бейнелеу өнері"], gradeMin: 1, gradeMax: 4, shift: 2, norm: 22 },
  { name: "Сәрсенбаева Г.С.", subjects: ["Математика","Қазақ тілі","Орыс тілі","Ағылшын тілі","Жаратылыстану","Дүниетану","Бейнелеу өнері"], gradeMin: 1, gradeMax: 4, shift: 2, norm: 22 },
  { name: "Жұматова М.К.",   subjects: ["Математика","Қазақ тілі","Орыс тілі","Ағылшын тілі","Жаратылыстану","Дүниетану","Бейнелеу өнері"], gradeMin: 1, gradeMax: 4, shift: 2, norm: 22 },
  { name: "Иманова Н.А.",    subjects: ["Математика","Қазақ тілі","Орыс тілі","Ағылшын тілі","Жаратылыстану","Дүниетану","Бейнелеу өнері"], gradeMin: 1, gradeMax: 4, shift: 2, norm: 22 },
  { name: "Бейсенова А.Т.",  subjects: ["Математика","Қазақ тілі","Орыс тілі","Ағылшын тілі","Жаратылыстану","Дүниетану","Бейнелеу өнері"], gradeMin: 1, gradeMax: 4, shift: 2, norm: 22 },
  { name: "Әбдіхалықова Г.М.", subjects: ["Математика","Қазақ тілі","Орыс тілі","Ағылшын тілі","Жаратылыстану","Дүниетану","Бейнелеу өнері"], gradeMin: 1, gradeMax: 4, shift: 2, norm: 22 },
  { name: "Нурмаганбетова С.Е.", subjects: ["Математика","Қазақ тілі","Орыс тілі","Ағылшын тілі","Жаратылыстану","Дүниетану","Бейнелеу өнері"], gradeMin: 1, gradeMax: 4, shift: 2, norm: 22 },
  { name: "Тоқтарова А.Б.",  subjects: ["Математика","Қазақ тілі","Орыс тілі","Ағылшын тілі","Жаратылыстану","Дүниетану","Бейнелеу өнері"], gradeMin: 1, gradeMax: 4, shift: 2, norm: 22 },
  { name: "Сүлейменова Д.Р.", subjects: ["Математика","Қазақ тілі","Орыс тілі","Ағылшын тілі","Жаратылыстану","Дүниетану","Бейнелеу өнері"], gradeMin: 1, gradeMax: 4, shift: 2, norm: 22 },
];

export interface BigSeedResult { classes: Klass[]; teachers: Teacher[]; rooms: Room[] }

export function buildBigSeed(): BigSeedResult {
  // ── Кабинеттер ──
  const rooms: Room[] = [];
  // 1-этаж: бастауыш (12 каб)
  for (let i = 1; i <= 12; i++)
    rooms.push({ id: uid(), number: `1-${String(i).padStart(2,"0")}`, type: "regular", capacity: 30 });
  // 2-этаж (12 каб)
  for (let i = 1; i <= 12; i++)
    rooms.push({ id: uid(), number: `2-${String(i).padStart(2,"0")}`, type: "regular", capacity: 32 });
  // 3-этаж (12 каб)
  for (let i = 1; i <= 12; i++)
    rooms.push({ id: uid(), number: `3-${String(i).padStart(2,"0")}`, type: "regular", capacity: 32 });
  // Арнайы кабинеттер
  rooms.push({ id: uid(), number: "Физика зертх. №1", type: "physics", capacity: 26 });
  rooms.push({ id: uid(), number: "Физика зертх. №2", type: "physics", capacity: 26 });
  rooms.push({ id: uid(), number: "Химия зертханасы", type: "chemistry", capacity: 24 });
  rooms.push({ id: uid(), number: "Информатика №1",   type: "computer", capacity: 20 });
  rooms.push({ id: uid(), number: "Информатика №2",   type: "computer", capacity: 20 });
  rooms.push({ id: uid(), number: "Информатика №3",   type: "computer", capacity: 20 });
  rooms.push({
    id: uid(), number: "Спортзал (үлкен)", type: "gym", capacity: 80,
    gymMax: 2, gymGroups: [[1,4],[5,7],[8,11]]
  });
  rooms.push({
    id: uid(), number: "Спортзал (кіші)", type: "gym", capacity: 40,
    gymMax: 2, gymGroups: [[1,4],[5,7],[8,11]]
  });

  // ── Мұғалімдер нысандарын жасаймыз ──
  const teachers: Teacher[] = TEACHERS_RAW.map(t => ({
    id: uid(),
    name: t.name,
    norm: t.norm,
    gradeMin: t.gradeMin,
    gradeMax: t.gradeMax,
    shift: t.shift,
    unavailable: [],
    noInterShift: false,
  }));

  // Пән → мұғалім(дер) сәйкестігі
  const subjectToTeachers: Record<string, Teacher[]> = {};
  TEACHERS_RAW.forEach((raw, idx) => {
    raw.subjects.forEach(subj => {
      if (!subjectToTeachers[subj]) subjectToTeachers[subj] = [];
      subjectToTeachers[subj].push(teachers[idx]);
    });
  });

  // Жүктеме балансы
  const load: Record<string, number> = {};
  const pick = (subj: string, grade: number, h: number): Teacher | null => {
    const pool = (subjectToTeachers[subj] || []).filter(
      t => t.gradeMin <= grade && t.gradeMax >= grade
    );
    if (!pool.length) return null;
    const t = pool.slice().sort((a, b) => (load[a.id]||0) - (load[b.id]||0))[0];
    load[t.id] = (load[t.id]||0) + h;
    return t;
  };

  // ── Сыныптар ──
  const classes: Klass[] = [];
  const primary14: Klass[] = [];
  const upper511: Klass[] = [];

  // Бастауыш (1-4 сынып, 2-ауысым) — 3 параллель
  const primaryRooms = rooms.filter(r => r.type === "regular" && r.number.startsWith("1-"));
  let prIdx = 0;
  // Бастауыш жетекшілер пулы
  const primaryTeachers = teachers.filter((_, i) => TEACHERS_RAW[i].subjects.includes("Дүниетану"));
  let ptIdx = 0;
  const peT2  = teachers.filter((_, i) => TEACHERS_RAW[i].subjects.includes("Дене шынықтыру") && TEACHERS_RAW[i].shift !== 1);
  const musT2 = teachers.filter((_, i) => TEACHERS_RAW[i].subjects.includes("Музыка") && TEACHERS_RAW[i].shift !== 1);
  let peIdx2 = 0, musIdx2 = 0;

  for (let g = 1; g <= 4; g++) {
    for (const L of ["А","Б","В"]) {
      const homeRoom = primaryRooms[prIdx++ % primaryRooms.length];
      const cls: Klass = {
        id: uid(), name: `${g}${L}`, grade: g, students: 26 + (g % 4),
        shift: 2, curriculum: [], homeRoomId: homeRoom.id,
      };
      const homeT = primaryTeachers[ptIdx++ % primaryTeachers.length];
      const plan = planFor(g);
      cls.curriculum = plan.map(([subj, h]): CurItem => {
        if (subj === "Дене шынықтыру")
          return { id: uid(), subjectId: subj, teacherId: peT2[peIdx2++ % Math.max(1,peT2.length)]?.id, hours: h };
        if (subj === "Музыка")
          return { id: uid(), subjectId: subj, teacherId: musT2[musIdx2++ % Math.max(1,musT2.length)]?.id, hours: h };
        return { id: uid(), subjectId: subj, teacherId: homeT.id, hours: h };
      });
      primary14.push(cls);
    }
  }

  // Жоғары (5-11 сынып, 1-ауысым) — 3 параллель
  for (let g = 5; g <= 11; g++) {
    for (const L of ["А","Б","В"]) {
      const cls: Klass = {
        id: uid(), name: `${g}${L}`, grade: g, students: 28 + (g % 6),
        shift: 1, curriculum: [],
      };
      const plan = planFor(g);
      cls.curriculum = plan.map(([subj, h]): CurItem => {
        const t = pick(subj, g, h);
        return { id: uid(), subjectId: subj, teacherId: t?.id, hours: h };
      });
      upper511.push(cls);
    }
  }

  classes.push(...primary14, ...upper511);
  classes.sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));

  return { classes, teachers, rooms };
}
