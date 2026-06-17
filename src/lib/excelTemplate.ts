// filepath: src/lib/excelTemplate.ts
// Excel үлгі генераторы + парсер (ЖИ-сіз, қатаң құрылымды)
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import type { Subject, Teacher, Room, Klass, RoomType } from "@/algorithm/engine";
import { seedSubjects } from "@/lib/seed";

const ROOM_TYPE_KZ_CAP: Record<RoomType, string> = {
  regular: "Қарапайым", physics: "Физика", chemistry: "Химия", computer: "Информатика", gym: "Спортзал",
};
const KZ_TO_ROOM: Record<string, RoomType> = {
  "қарапайым": "regular", "физика": "physics", "химия": "chemistry",
  "информатика": "computer", "спортзал": "gym",
};

const uid = () => Math.random().toString(36).slice(2, 10);

// Ұяшыққа түсініктеме (Excel comment) қосу — тақырыпқа меңзегенде шығады
function addNote(ws: ExcelJS.Worksheet, row: number, col: number, text: string) {
  ws.getCell(row, col).note = {
    texts: [{ font: { name: "Arial", size: 9, color: { argb: "FF1A2230" } }, text }],
    margins: { insetmode: "custom", inset: [0.1, 0.1, 0.1, 0.1] },
  };
}

/* ── КӘСІБИ ҮЛГІ ГЕНЕРАТОРЫ (exceljs, түсті, түсініктемелі) ── */

// Стиль көмекшілері
const HEADER_FILL = "FF2563EB";   // көк — тақырып
const EXAMPLE_FILL = "FFFEF9E7";  // ашық сары — мысал жолдар
const READY_FILL = "FFEAF2F8";    // ашық көк — дайын деректер
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFB0B8C0" } },
  left: { style: "thin", color: { argb: "FFB0B8C0" } },
  bottom: { style: "thin", color: { argb: "FFB0B8C0" } },
  right: { style: "thin", color: { argb: "FFB0B8C0" } },
};

// Тақырып жолын стильдеу
function styleHeader(ws: ExcelJS.Worksheet, colCount: number) {
  const row = ws.getRow(1);
  row.height = 28;
  for (let i = 1; i <= colCount; i++) {
    const cell = ws.getCell(1, i);
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = BORDER;
  }
}

// Дерек жолдарын стильдеу
function styleRows(ws: ExcelJS.Worksheet, startRow: number, endRow: number, colCount: number, fill: string) {
  for (let r = startRow; r <= endRow; r++) {
    for (let i = 1; i <= colCount; i++) {
      const cell = ws.getCell(r, i);
      cell.font = { name: "Arial", size: 10, color: { argb: "FF1A2230" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
      cell.alignment = { vertical: "middle" };
      cell.border = BORDER;
    }
  }
}

export async function downloadTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "РАСПИС";

  // ═══ Парақ 1 — СЫНЫПТАР ═══
  const ws1 = wb.addWorksheet("Сыныптар", { views: [{ state: "frozen", ySplit: 1 }] });
  ws1.columns = [{ width: 14 }, { width: 14 }, { width: 22 }, { width: 22 }];
  ws1.addRow(["Сынып атауы", "Оқушы саны", "Ауысым", "Бастауыш кабинеті"]);
  ws1.addRow(["5А", 28, "Таңғы", ""]);
  ws1.addRow(["5Б", 27, "Таңғы", ""]);
  ws1.addRow(["1А", 25, "Түстен кейінгі", "105"]);
  styleHeader(ws1, 4);
  styleRows(ws1, 2, 4, 4, EXAMPLE_FILL);
  addNote(ws1, 1, 1, "Сынып атауын жазыңыз: 5А, 7Б, 11В. Нешінші сынып екені атауынан анықталады.");
  addNote(ws1, 1, 3, "Таңғы (1-ауысым) немесе Түстен кейінгі (2-ауысым).");
  addNote(ws1, 1, 4, "Тек БАСТАУЫШ (1-4 сынып) үшін: балалар отыратын тұрақты кабинет нөмірі. Жоғары сыныптарға бос қалдырыңыз.");
  for (let r = 5; r <= 60; r++) {
    ws1.getCell(r, 2).dataValidation = { type: "whole", operator: "between", formulae: [1, 40], allowBlank: true };
    ws1.getCell(r, 3).dataValidation = { type: "list", allowBlank: true, formulae: ['"Таңғы,Түстен кейінгі"'] };
    for (let c = 1; c <= 4; c++) ws1.getCell(r, c).border = BORDER;
  }
  ws1.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 4 } };

  // ═══ Парақ 2 — МҰҒАЛІМДЕР ═══
  const ws2 = wb.addWorksheet("Мұғалімдер", { views: [{ state: "frozen", ySplit: 1 }] });
  ws2.columns = [{ width: 30 }, { width: 20 }, { width: 16 }, { width: 16 }, { width: 18 }];
  ws2.addRow(["Мұғалімнің аты-жөні", "Аптасына сағат", "Қай сыныптан", "Қай сыныпқа дейін", "Ауысым"]);
  ws2.addRow(["Ахметова Айгүл Қызы", 20, 5, 11, "Таңғы"]);
  ws2.addRow(["Серікбаева Нұргүл", 18, 5, 11, "Таңғы"]);
  ws2.addRow(["Лебедева Ирина", 12, 1, 7, "Екеуінде де"]);
  styleHeader(ws2, 5);
  styleRows(ws2, 2, 4, 5, EXAMPLE_FILL);
  addNote(ws2, 1, 1, "Мұғалімнің толық аты-жөні. Оқу жоспарында ДӘЛ осылай жазылуы керек.");
  addNote(ws2, 1, 2, "Аптасына неше сағат сабақ беруі керек (жүктеме нормасы).");
  addNote(ws2, 1, 3, "Мұғалім сабақ беретін ЕҢ КІШІ сынып (мысалы 5).");
  addNote(ws2, 1, 4, "Мұғалім сабақ беретін ЕҢ ҮЛКЕН сынып (мысалы 11).");
  addNote(ws2, 1, 5, "Таңғы, Түстен кейінгі, немесе Екеуінде де.");
  for (let r = 5; r <= 100; r++) {
    ws2.getCell(r, 2).dataValidation = { type: "whole", operator: "between", formulae: [1, 40], allowBlank: true };
    ws2.getCell(r, 3).dataValidation = { type: "whole", operator: "between", formulae: [1, 11], allowBlank: true };
    ws2.getCell(r, 4).dataValidation = { type: "whole", operator: "between", formulae: [1, 11], allowBlank: true };
    ws2.getCell(r, 5).dataValidation = { type: "list", allowBlank: true, formulae: ['"Таңғы,Түстен кейінгі,Екеуінде де"'] };
    for (let c = 1; c <= 5; c++) ws2.getCell(r, c).border = BORDER;
  }
  ws2.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 5 } };

  // ═══ Парақ 3 — ОҚУ ЖОСПАРЫ (ең маңызды) ═══
  const ws3 = wb.addWorksheet("Оқу жоспары", { views: [{ state: "frozen", ySplit: 1 }] });
  ws3.columns = [{ width: 14 }, { width: 22 }, { width: 30 }, { width: 16 }, { width: 16 }];
  ws3.addRow(["Сынып", "Пән", "Мұғалім", "Аптасына сағат", "Топқа бөлінеді ме"]);
  ws3.addRow(["5А", "Математика", "Ахметова Айгүл Қызы", 5, "Жоқ"]);
  ws3.addRow(["5А", "Қазақ тілі", "Серікбаева Нұргүл", 3, "Жоқ"]);
  ws3.addRow(["5А", "Ағылшын тілі", "Ахметова Айгүл Қызы", 3, "Иә"]);
  ws3.addRow(["5А", "Ағылшын тілі", "Серікбаева Нұргүл", 3, "Иә"]);
  styleHeader(ws3, 5);
  styleRows(ws3, 2, 5, 5, EXAMPLE_FILL);
  addNote(ws3, 1, 1, "Сынып атауы — «Сыныптар» парағындағымен дәл сәйкес болуы керек.");
  addNote(ws3, 1, 2, "Пән атауы — «Пәндер» парағындағымен дәл сәйкес болуы керек.");
  addNote(ws3, 1, 3, "Мұғалім аты-жөні — «Мұғалімдер» парағындағымен дәл сәйкес болуы керек.");
  addNote(ws3, 1, 4, "Сол пәннің сол сыныпта аптасына неше сағат өтетіні.");
  addNote(ws3, 1, 5, "Иә болса (ағылшын, информатика): сол сынып+пәнге ЕКІ жол жазыңыз — әр топқа бір мұғалім.");
  for (let r = 6; r <= 400; r++) {
    ws3.getCell(r, 4).dataValidation = { type: "whole", operator: "between", formulae: [1, 12], allowBlank: true };
    ws3.getCell(r, 5).dataValidation = { type: "list", allowBlank: true, formulae: ['"Иә,Жоқ"'] };
    for (let c = 1; c <= 5; c++) ws3.getCell(r, c).border = BORDER;
  }
  ws3.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 5 } };

  // ═══ Парақ 4 — КАБИНЕТТЕР (спортзал реттеуімен) ═══
  const ws5 = wb.addWorksheet("Кабинеттер", { views: [{ state: "frozen", ySplit: 1 }] });
  ws5.columns = [{ width: 24 }, { width: 18 }, { width: 14 }, { width: 28 }];
  ws5.addRow(["Кабинет нөмірі / атауы", "Кабинет түрі", "Сыйымдылық", "Спортзал: бір уақытта неше сынып"]);
  const roomsData: (string | number)[][] = [
    ["101", "Қарапайым", 30, ""],
    ["102", "Қарапайым", 30, ""],
    ["105", "Қарапайым", 30, ""],
    ["201", "Қарапайым", 30, ""],
    ["Физика кабинеті", "Физика", 26, ""],
    ["Химия кабинеті", "Химия", 26, ""],
    ["Информатика кабинеті", "Информатика", 20, ""],
    ["Үлкен спортзал", "Спортзал", 90, 3],
    ["Кіші спортзал", "Спортзал", 40, 1],
  ];
  roomsData.forEach((r) => ws5.addRow(r));
  styleHeader(ws5, 4);
  styleRows(ws5, 2, roomsData.length + 1, 4, READY_FILL);
  addNote(ws5, 1, 1, "Кабинет нөмірі (101, 205) немесе атауы (Спортзал). Нөмірдің бірінші саны = этаж (201 → 2-этаж).");
  addNote(ws5, 1, 2, "Қарапайым / Физика / Химия / Информатика / Спортзал.");
  addNote(ws5, 1, 3, "Кабинетке сыятын оқушы саны.");
  addNote(ws5, 1, 4, "ТЕК СПОРТЗАЛ үшін: бір уақытта неше сынып бірге сабақ өте алады (1-4). Басқа кабинеттерге бос қалдырыңыз.");
  for (let r = 2; r <= roomsData.length + 40; r++) {
    ws5.getCell(r, 2).dataValidation = { type: "list", allowBlank: true, formulae: ['"Қарапайым,Физика,Химия,Информатика,Спортзал"'] };
    ws5.getCell(r, 3).dataValidation = { type: "whole", operator: "between", formulae: [1, 200], allowBlank: true };
    ws5.getCell(r, 4).dataValidation = { type: "whole", operator: "between", formulae: [1, 4], allowBlank: true };
    if (r > roomsData.length + 1) for (let c = 1; c <= 4; c++) ws5.getCell(r, c).border = BORDER;
  }
  ws5.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 4 } };

  // ═══ Парақ 5 — ПӘНДЕР (ҚР пәндері ДАЙЫН, өзгертпесе де болады) ═══
  const ws4 = wb.addWorksheet("Пәндер", { views: [{ state: "frozen", ySplit: 1 }] });
  ws4.columns = [{ width: 24 }, { width: 22 }, { width: 22 }, { width: 18 }];
  ws4.addRow(["Пән атауы", "Пәннің ауырлығы (1-11)", "Арнайы кабинет", "Қатарынан 2 сағат бола ма"]);
  seedSubjects.forEach((s) => {
    ws4.addRow([s.name, s.score, s.room ? ROOM_TYPE_KZ_CAP[s.room] : "Қарапайым", s.canDouble ? "Иә" : "Жоқ"]);
  });
  styleHeader(ws4, 4);
  styleRows(ws4, 2, seedSubjects.length + 1, 4, READY_FILL);
  addNote(ws4, 1, 1, "Пән атауы. Оқу жоспарында ДӘЛ осылай жазылуы керек. ҚР пәндері дайын тұр.");
  addNote(ws4, 1, 2, "Пәннің ауырлығы: 1 (жеңіл — музыка) ... 11 (ауыр — математика). Ауыр пәндер таңертең қойылады.");
  addNote(ws4, 1, 3, "Қарапайым (арнайы емес) немесе Физика/Химия/Информатика/Спортзал.");
  addNote(ws4, 1, 4, "Иә болса, пән қатарынан 2 сағат (қос сабақ) бола алады.");
  for (let r = 2; r <= seedSubjects.length + 30; r++) {
    ws4.getCell(r, 2).dataValidation = { type: "whole", operator: "between", formulae: [1, 11], allowBlank: true };
    ws4.getCell(r, 3).dataValidation = { type: "list", allowBlank: true, formulae: ['"Қарапайым,Физика,Химия,Информатика,Спортзал"'] };
    ws4.getCell(r, 4).dataValidation = { type: "list", allowBlank: true, formulae: ['"Иә,Жоқ"'] };
    if (r > seedSubjects.length + 1) for (let c = 1; c <= 4; c++) ws4.getCell(r, c).border = BORDER;
  }
  ws4.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 4 } };

  // ═══ Парақ 6 — Нұсқаулық ═══
  const ws6 = wb.addWorksheet("Нұсқаулық");
  ws6.columns = [{ width: 90 }];
  ws6.mergeCells(1, 1, 1, 1);
  const t = ws6.getCell(1, 1);
  t.value = "РАСПИС — Excel импорт нұсқаулығы";
  t.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  t.alignment = { horizontal: "center", vertical: "middle" };
  ws6.getRow(1).height = 28;

  const help = [
    "",
    "ТҮСТЕР: сары жолдар — МЫСАЛ (өшіріп, өзіңіздікін жазыңыз). Көк жолдар — ДАЙЫН деректер.",
    "Әр баған тақырыбына тінтуірді апарсаңыз — толық түсініктеме шығады.",
    "",
    "1. «Сыныптар» парағы:",
    "   • Әр сыныпты бір жолға жазыңыз (5А, 5Б, ...)",
    "   • Ауысым: Таңғы немесе Түстен кейінгі (тізімнен таңдаңыз)",
    "   • Бастауыш кабинеті: тек 1-4 сыныпқа (балалар отыратын тұрақты кабинет)",
    "",
    "2. «Мұғалімдер» парағы:",
    "   • Мұғалімнің толық аты-жөні",
    "   • Аптасына сағат — мұғалімнің жүктеме нормасы",
    "   • Қай сыныптан / қай сыныпқа дейін — мысалы 5-тен 11-ге",
    "   • Ауысым: Таңғы / Түстен кейінгі / Екеуінде де",
    "   • МАҢЫЗДЫ: мұғалім қандай пән беретіні «Оқу жоспары» парағында жазылады",
    "",
    "3. «Оқу жоспары» парағы (ЕҢ МАҢЫЗДЫ):",
    "   • Әр сынып+пән тіркесімі — бір жол",
    "   • Сынып, Пән, Мұғалім атаулары басқа парақтармен ДӘЛ сәйкес болуы керек",
    "   • Аптасына сағат — сол пәннің сол сыныпта неше сағат өтетіні",
    "   • Топқа бөлінеді ме «Иә» болса: сол сынып+пәнге ЕКІ жол жазыңыз (әр топқа бір мұғалім)",
    "",
    "4. «Кабинеттер» парағы (типтік ДАЙЫН):",
    "   • Кабинет түрі: Қарапайым / Физика / Химия / Информатика / Спортзал",
    "   • Кабинет нөмірінің бірінші саны = этаж (мысалы 201 → 2-этаж)",
    "   • СПОРТЗАЛ үшін: «бір уақытта неше сынып» бағанын толтырыңыз (1-4)",
    "     Мысалы үлкен спортзал 3 сыныпты бірге қабылдаса — 3 деп жазыңыз",
    "",
    "5. «Пәндер» парағы (ҚР пәндерімен ДАЙЫН):",
    "   • Қаласаңыз өзгертіңіз немесе жаңа пән қосыңыз",
    "   • Пән атаулары «Оқу жоспарындағы» атаулармен сәйкес болуы керек",
    "   • Пәннің ауырлығы: ауыр пән (математика) 9-11, жеңіл пән 1-4",
    "",
    "6. Толтырған соң файлды сақтаңыз да, «Импорттау» батырмасына жүктеңіз.",
    "   Импорттан бұрын алдын-ала көрініс пен қателер тексеру көрсетіледі.",
    "",
    "МАҢЫЗДЫ: атаулар (пән, мұғалім, сынып) парақтар арасында ДӘЛ сәйкес болуы керек.",
    "Бас әріп пен кіші әріп ескерілмейді («Математика» = «математика»), бірақ сөздер бірдей болуы керек.",
  ];
  help.forEach((line, i) => {
    const cell = ws6.getCell(i + 2, 1);
    cell.value = line;
    const isBold = line.startsWith("ТҮСТЕР") || line.startsWith("МАҢЫЗДЫ") || /^\d\./.test(line);
    cell.font = { name: "Arial", size: 10, bold: isBold, color: { argb: isBold ? "FF1A2230" : "FF374151" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });

  // Жүктеу
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "РАСПИС_үлгі.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

/* ── ПАРСЕР ── */
export interface ParseError { sheet: string; row: number; message: string }
export interface ParsedData {
  classes: Klass[]; teachers: Teacher[]; rooms: Room[]; subjects: Subject[];
  errors: ParseError[];
  summary: { classes: number; teachers: number; rooms: number; subjects: number; curItems: number };
}

const norm = (v: unknown): string => String(v ?? "").trim();

// Қазақша ауысым мәнін санға айналдыру: "Таңғы"→1, "Түстен кейінгі"→2, "Екеуінде де"→3
const parseShift = (v: unknown): 1 | 2 | 3 => {
  const s = norm(v).toLowerCase();
  if (s === "түстен кейінгі" || s === "2") return 2;
  if (s === "екеуінде де" || s === "1-2" || s === "3") return 3;
  return 1; // "таңғы" немесе әдепкі
};
// Қазақша иә/жоқ → boolean
const parseYesNo = (v: unknown): boolean => {
  const s = norm(v).toLowerCase();
  return s === "иә" || s === "иа" || s === "yes" || s === "true";
};
const sheetRows = (wb: XLSX.WorkBook, name: string): unknown[][] => {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false }) as unknown[][];
};

export function parseWorkbook(buf: ArrayBuffer): ParsedData {
  const wb = XLSX.read(buf, { type: "array" });
  const errors: ParseError[] = [];

  // ── Пәндер (алдымен — басқалар осыған сүйенеді) ──
  // Бағандар: [Пән атауы, Ауырлығы (1-11), Арнайы кабинет, Қатарынан 2 сағат]
  const subjects: Subject[] = [];
  const subjByName = new Map<string, Subject>();
  const subjRows = sheetRows(wb, "Пәндер");
  subjRows.slice(1).forEach((r, i) => {
    const name = norm(r[0]);
    if (!name) return;
    const score = Number(r[1]) || 5;
    const roomKz = norm(r[2]).toLowerCase();
    // "қарапайым" = арнайы кабинет жоқ
    const room = (roomKz && roomKz !== "қарапайым") ? (KZ_TO_ROOM[roomKz] ?? null) : null;
    if (roomKz && roomKz !== "қарапайым" && !KZ_TO_ROOM[roomKz])
      errors.push({ sheet: "Пәндер", row: i + 2, message: `«${roomKz}» — белгісіз кабинет түрі (Қарапайым/Физика/Химия/Информатика/Спортзал)` });
    const canDouble = parseYesNo(r[3]);
    // идеал орын — пәннің ауырлығынан автоматты есептеледі (ауыр→таңертең)
    const ideal = score >= 9 ? [1, 2, 3] : score >= 6 ? [2, 3, 4] : [3, 4, 5, 6];
    const s: Subject = { id: name, name, score, coeff: 1, ideal, room, digital: room === "computer", corr: false, canDouble, black: [] };
    subjects.push(s); subjByName.set(name.toLowerCase(), s);
  });
  // Қазақ/Орыс өзара қара тізім (әдепкі ереже)
  const kz = subjByName.get("қазақ тілі"), ru = subjByName.get("орыс тілі");
  if (kz && ru) { kz.black.push("Орыс тілі"); ru.black.push("Қазақ тілі"); }

  // ── Кабинеттер ──
  // Бағандар: [Нөмір/атауы, Түрі, Сыйымдылық, Спортзал: бір уақытта неше сынып]
  const rooms: Room[] = [];
  const roomRows = sheetRows(wb, "Кабинеттер");
  roomRows.slice(1).forEach((r, i) => {
    const number = norm(r[0]);
    if (!number) return;
    const typeKz = norm(r[1]).toLowerCase();
    const type = KZ_TO_ROOM[typeKz];
    if (!type) {
      errors.push({ sheet: "Кабинеттер", row: i + 2, message: `«${typeKz}» — белгісіз түр (Қарапайым/Физика/Химия/Информатика/Спортзал)` });
      return;
    }
    const room: Room = { id: uid(), number, type, capacity: Number(r[2]) || 30 };
    if (type === "gym") {
      // Спортзал: пайдаланушы көрсеткен "бір уақытта неше сынып" мәнін оқимыз
      const gymMax = Number(r[3]);
      room.gymMax = (gymMax >= 1 && gymMax <= 4) ? gymMax : 2; // әдепкі 2
      room.gymGroups = [[1, 4], [5, 7], [8, 11]];
    }
    rooms.push(room);
  });

  // ── Мұғалімдер ──
  // Бағандар: [Аты-жөні, Аптасына сағат, Қай сыныптан, Қай сыныпқа дейін, Ауысым]
  // Пәндер енді бұл парақта емес — олар «Оқу жоспары» арқылы байланады.
  const teachers: Teacher[] = [];
  const teacherByName = new Map<string, Teacher>();
  const teacherRows = sheetRows(wb, "Мұғалімдер");
  teacherRows.slice(1).forEach((r, i) => {
    const name = norm(r[0]);
    if (!name) return;
    if (teacherByName.has(name.toLowerCase())) {
      errors.push({ sheet: "Мұғалімдер", row: i + 2, message: `«${name}» мұғалімі қайталанған` });
      return;
    }
    const t: Teacher = {
      id: uid(), name, norm: Number(r[1]) || 18,
      gradeMin: Number(r[2]) || 1, gradeMax: Number(r[3]) || 11,
      shift: parseShift(r[4]), unavailable: [], noInterShift: false,
    };
    teachers.push(t); teacherByName.set(name.toLowerCase(), t);
  });

  // ── Сыныптар ──
  // Бағандар: [Сынып атауы, Оқушы саны, Ауысым, Бастауыш кабинеті]
  // Нешінші сынып (grade) — атауынан анықталады (5А → 5).
  const classes: Klass[] = [];
  const classByName = new Map<string, Klass>();
  const classRows = sheetRows(wb, "Сыныптар");
  classRows.slice(1).forEach((r, i) => {
    const name = norm(r[0]);
    if (!name) return;
    const grade = Number(name.replace(/\D/g, "")) || 1; // атаудан: "5А"→5, "11Б"→11
    const shift: 1 | 2 = parseShift(r[2]) === 2 ? 2 : 1;
    if (classByName.has(name.toLowerCase())) {
      errors.push({ sheet: "Сыныптар", row: i + 2, message: `«${name}» сыныбы қайталанған` });
      return;
    }
    const cls: Klass = { id: uid(), name, grade, students: Number(r[1]) || 25, shift, curriculum: [] };
    // Бастауыш кабинеті (4-баған) — тек 1-4 сыныпқа, кабинет нөмірі бойынша табамыз
    const homeRoomNum = norm(r[3]);
    if (homeRoomNum && grade <= 4) {
      const hr = rooms.find((rm) => rm.number === homeRoomNum);
      if (hr) cls.homeRoomId = hr.id;
      else errors.push({ sheet: "Сыныптар", row: i + 2, message: `«${homeRoomNum}» кабинеті «Кабинеттер» парағында жоқ` });
    }
    classes.push(cls); classByName.set(name.toLowerCase(), cls);
  });

  // ── Оқу жоспары ──
  let curItems = 0;
  const curRows = sheetRows(wb, "Оқу жоспары");
  // топ бөлу үшін: сынып+пән бойынша топтау
  const splitGroups = new Map<string, { teachers: string[]; row: number }>();
  curRows.slice(1).forEach((r, i) => {
    const row = i + 2;
    const className = norm(r[0]);
    const subjName = norm(r[1]);
    if (!className && !subjName) return;
    const cls = classByName.get(className.toLowerCase());
    const subj = subjByName.get(subjName.toLowerCase());
    if (!cls) { errors.push({ sheet: "Оқу жоспары", row, message: `«${className}» сыныбы «Сыныптар» парағында жоқ` }); return; }
    if (!subj) { errors.push({ sheet: "Оқу жоспары", row, message: `«${subjName}» пәні «Пәндер» парағында жоқ` }); return; }
    const hours = Number(r[3]) || 0;
    if (hours < 1) { errors.push({ sheet: "Оқу жоспары", row, message: `«${className}/${subjName}»: сағат саны дұрыс емес` }); return; }
    const isSplit = parseYesNo(r[4]);
    const teacherName = norm(r[2]);
    const teacher = teacherName ? teacherByName.get(teacherName.toLowerCase()) : undefined;
    if (teacherName && !teacher)
      errors.push({ sheet: "Оқу жоспары", row, message: `«${teacherName}» мұғалімі «Мұғалімдер» парағында жоқ` });

    if (isSplit) {
      const key = `${cls.id}|${subj.id}`;
      const g = splitGroups.get(key) || { teachers: [], row };
      if (teacher) g.teachers.push(teacher.id);
      splitGroups.set(key, g);
      // топ жазбасын кейін қосамыз (бірінші кездескенде CurItem жасаймыз)
      if (!cls.curriculum.some((c) => c.subjectId === subj.id)) {
        cls.curriculum.push({ id: uid(), subjectId: subj.id, hours, isSplit: true, groups: [] });
        curItems++;
      }
    } else {
      cls.curriculum.push({ id: uid(), subjectId: subj.id, teacherId: teacher?.id, hours });
      curItems++;
    }
  });
  // топ мұғалімдерін CurItem-ге жалғау
  for (const [key, g] of splitGroups) {
    const [clsId, subjId] = key.split("|");
    const cls = classes.find((c) => c.id === clsId);
    const cu = cls?.curriculum.find((c) => c.subjectId === subjId);
    if (cu) {
      const ts = g.teachers.length >= 2 ? g.teachers : [...g.teachers, ...g.teachers].slice(0, 2);
      cu.groups = ts.slice(0, 2).map((tid) => ({ teacherId: tid }));
      if (cu.groups.length < 2)
        errors.push({ sheet: "Оқу жоспары", row: g.row, message: `Топқа бөлу үшін кемінде 2 мұғалім керек (сынып+пән бойынша 2 жол)` });
    }
  }

  return {
    classes, teachers, rooms, subjects, errors,
    summary: { classes: classes.length, teachers: teachers.length, rooms: rooms.length, subjects: subjects.length, curItems },
  };
}
