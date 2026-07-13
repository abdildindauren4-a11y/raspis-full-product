// filepath: src/lib/exportLabels.ts
// Экспорт (Excel/PDF) ІШІНДЕГІ жапсырмалар — сайт тіліне сай. Пайдаланушы
// енгізген деректер (сынып/мұғалім/пән атаулары) сол күйінде қалады; тек
// құрылымдық мәтін (күн атаулары, «Мұғалім», «Уақыт», тақырыптар) аударылады.
import type { Lang } from "@/i18n/translations";

export interface ExportLabels {
  lang: Lang;
  days: string[];       // [_, дүйсенбі..жұма] (1-индекстен)
  daysShort: string[];  // [_, Дс..Жм]
  // Мұқаба
  brand: string;
  schoolSchedule: string;   // «Мектеп сабақ кестесі»
  autoSystem: string;       // «Мектеп кестесін автоматты құру жүйесі»
  cover: string;            // парақ аты «Мұқаба»
  contents: string;         // «МАЗМҰНЫ»
  // Статистика
  statClasses: string; statTeachers: string; statRooms: string;
  statLessons: string; statGaps: string; statUnplaced: string;
  statStress: string; statDate: string;
  // Парақтар мен кестелер
  teacherSheet: string;     // «Мұғалімдер кестесі»
  roomSheet: string;        // «Кабинеттер кестесі»
  workloadSummary: string;  // «Жүктеме қорытынды»
  weeklySchedule: string;   // «Апталық сабақ кестесі»
  backToCover: string;      // «← Мұқабаға оралу»
  footer: string;           // автоқұрылған туралы
  // Баған/ұяшық
  colNum: string; colTime: string; colTeacher: string;
  colLoad: string; colFill: string;
  free: string;             // «бос»
  doubleSuffix: string;     // « (қос)»
  // Кабинет түрлері
  roomTypes: { regular: string; physics: string; chemistry: string; computer: string; gym: string };
  // Сертификат
  certTitle: string; certScan: string;
  // PDF қосымша
  classWord: string;   // «сынып»
  shiftWord: string;   // «ауысым»
  group2: string;      // «2-топ»
  qualityWord: string; // «сапа»
  schoolYear: string;  // «оқу жылы»
}

const DICT: Record<Lang, Omit<ExportLabels, "lang">> = {
  kk: {
    days: ["", "Дүйсенбі", "Сейсенбі", "Сәрсенбі", "Бейсенбі", "Жұма"],
    daysShort: ["", "Дс", "Сс", "Ср", "Бс", "Жм"],
    brand: "РАСПИС",
    schoolSchedule: "Мектеп сабақ кестесі",
    autoSystem: "Мектеп кестесін автоматты құру жүйесі",
    cover: "Мұқаба",
    contents: "МАЗМҰНЫ",
    statClasses: "Сыныптар саны", statTeachers: "Мұғалімдер саны", statRooms: "Кабинеттер саны",
    statLessons: "Жалпы сабақ саны", statGaps: "Тесіктер (бос слот)", statUnplaced: "Орналаспаған сабақ",
    statStress: "Стресс-тесттер", statDate: "Экспорт күні",
    teacherSheet: "Мұғалімдер кестесі", roomSheet: "Кабинеттер кестесі",
    workloadSummary: "Жүктеме қорытынды", weeklySchedule: "Апталық сабақ кестесі",
    backToCover: "← Мұқабаға оралу",
    footer: "Бұл құжат РАСПИС жүйесімен автоматты құрылды.",
    colNum: "№", colTime: "Уақыт", colTeacher: "Мұғалім", colLoad: "Жүктеме", colFill: "Толу %",
    free: "бос", doubleSuffix: " (қос)",
    roomTypes: { regular: "қарапайым", physics: "физика", chemistry: "химия", computer: "информатика", gym: "спортзал" },
    certTitle: "Сапа сертификаты (QR)", certScan: "Растау үшін QR-кодты сканерлеңіз",
    classWord: "сынып", shiftWord: "ауысым", group2: "2-топ", qualityWord: "сапа", schoolYear: "оқу жылы",
  },
  ru: {
    days: ["", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница"],
    daysShort: ["", "Пн", "Вт", "Ср", "Чт", "Пт"],
    brand: "РАСПИС",
    schoolSchedule: "Школьное расписание",
    autoSystem: "Система автоматического составления расписания",
    cover: "Обложка",
    contents: "СОДЕРЖАНИЕ",
    statClasses: "Количество классов", statTeachers: "Количество учителей", statRooms: "Количество кабинетов",
    statLessons: "Всего уроков", statGaps: "Окна (пустые слоты)", statUnplaced: "Не размещено уроков",
    statStress: "Стресс-тесты", statDate: "Дата экспорта",
    teacherSheet: "Расписание учителей", roomSheet: "Расписание кабинетов",
    workloadSummary: "Сводка нагрузки", weeklySchedule: "Недельное расписание",
    backToCover: "← Вернуться к обложке",
    footer: "Документ автоматически создан системой РАСПИС.",
    colNum: "№", colTime: "Время", colTeacher: "Учитель", colLoad: "Нагрузка", colFill: "Заполн. %",
    free: "свободно", doubleSuffix: " (сдвоенный)",
    roomTypes: { regular: "обычный", physics: "физика", chemistry: "химия", computer: "информатика", gym: "спортзал" },
    certTitle: "Сертификат качества (QR)", certScan: "Отсканируйте QR-код для проверки",
    classWord: "класс", shiftWord: "смена", group2: "2-группа", qualityWord: "качество", schoolYear: "учебный год",
  },
  en: {
    days: ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    daysShort: ["", "Mon", "Tue", "Wed", "Thu", "Fri"],
    brand: "RASPIS",
    schoolSchedule: "School Timetable",
    autoSystem: "Automated school timetable system",
    cover: "Cover",
    contents: "CONTENTS",
    statClasses: "Classes", statTeachers: "Teachers", statRooms: "Rooms",
    statLessons: "Total lessons", statGaps: "Gaps (empty slots)", statUnplaced: "Unplaced lessons",
    statStress: "Stress tests", statDate: "Export date",
    teacherSheet: "Teachers timetable", roomSheet: "Rooms timetable",
    workloadSummary: "Workload summary", weeklySchedule: "Weekly timetable",
    backToCover: "← Back to cover",
    footer: "This document was generated automatically by RASPIS.",
    colNum: "#", colTime: "Time", colTeacher: "Teacher", colLoad: "Load", colFill: "Fill %",
    free: "free", doubleSuffix: " (double)",
    roomTypes: { regular: "regular", physics: "physics", chemistry: "chemistry", computer: "computer", gym: "gym" },
    certTitle: "Quality certificate (QR)", certScan: "Scan the QR code to verify",
    classWord: "class", shiftWord: "shift", group2: "Group 2", qualityWord: "quality", schoolYear: "school year",
  },
};

export function getExportLabels(lang: Lang): ExportLabels {
  return { lang, ...DICT[lang] };
}
