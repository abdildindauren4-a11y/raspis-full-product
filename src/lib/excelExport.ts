// filepath: src/lib/excelExport.ts
// Кәсіби Excel экспорты (exceljs) — мұқаба (мазмұны + жалпы статистика) +
// топтап сыныптар + толық мұғалім/кабинет кестелері + жүктеме қорытынды.
// Әр парақ мұқабаға сілтеме арқылы оралады, баспа үшін колонтитул мен
// бет нөмірі бар.
import ExcelJS from "exceljs";
import type { AlgoResult, Klass, Teacher, Room, Subject, School, Settings, Komplekt } from "@/algorithm/engine";
import { maxSlots, buildTimeline, HOMEROOM_SUBJECT_ID } from "@/algorithm/engine";
import { getExportLabels, type ExportLabels } from "@/lib/exportLabels";

// Модуль деңгейіндегі жапсырмалар — экспорт басында ctx.labels-тен орнатылады
// (экспорт бір-бірлеп жүреді, сондықтан қатер жоқ). Әдепкі — қазақша.
let L: ExportLabels = getExportLabels("kk");
const DAYS = () => L.days;
const COVER_SHEET = () => L.cover;

function subjectColor(subj: Subject | undefined): string {
  if (!subj) return "FFFFFF";
  const s = subj.score;
  if (subj.room === "gym") return "D5F5E3";
  if (subj.room === "computer") return "D6EAF8";
  if (subj.room === "physics" || subj.room === "chemistry") return "E8DAEF";
  if (s >= 9) return "FADBD8";
  if (s >= 6) return "FEF9E7";
  return "EAF2F8";
}

function academicYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return m >= 5 ? `${y}–${y + 1}` : `${y - 1}–${y}`;
}

interface ExportCtx {
  school: School; classes: Klass[]; teachers: Teacher[];
  rooms: Room[]; subjects: Subject[]; settings?: Settings; result: AlgoResult;
  labels?: ExportLabels; // сайт тілі (болмаса — қазақша әдепкі)
}

const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFB0B8C0" } },
  left: { style: "thin", color: { argb: "FFB0B8C0" } },
  bottom: { style: "thin", color: { argb: "FFB0B8C0" } },
  right: { style: "thin", color: { argb: "FFB0B8C0" } },
};

const GROUPS = (): { title: string; min: number; max: number }[] => {
  const g = L.lang === "ru" ? ["1-4 классы", "5-9 классы", "10-12 классы"]
    : L.lang === "en" ? ["Grades 1-4", "Grades 5-9", "Grades 10-12"]
    : ["1-4 сыныптар", "5-9 сыныптар", "10-12 сыныптар"];
  return [{ title: g[0], min: 1, max: 4 }, { title: g[1], min: 5, max: 9 }, { title: g[2], min: 10, max: 12 }];
};

// Парақ түрлері бойынша қойынды түсі — навигацияны жеңілдетеді
const TAB_COLORS: Record<string, string> = {
  cover: "FFD4AF37", classes: "FF2563EB", teachers: "FF16A34A", rooms: "FF9333EA", summary: "FFEA580C",
};

function sShort(name: string): string {
  const map: Record<string, string> = { "Дене шынықтыру": "Дене шын.", "Жаратылыстану": "Жаратылыс." };
  return map[name] || name;
}
function shortName(name: string): string {
  const clean = name.split("(")[0].trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`;
  return clean;
}

// Баспаға арналған колонтитул: мектеп аты сол жақта, бет №/жалпы саны оң жақта, күні ортада
function setHeaderFooter(ws: ExcelJS.Worksheet, schoolName: string) {
  ws.headerFooter = {
    oddHeader: `&L&8&"Arial"${schoolName}&C&8&"Arial"${L.brand} · ${L.weeklySchedule}&R&8&"Arial"&D`,
    oddFooter: `&L&7&"Arial"${L.footer}&C&7&"Arial"&P / &N&R&7&"Arial"ABDILDIN DAUREN`,
    differentFirst: false, differentOddEven: false,
  };
}

// Парақ басына "← Мұқабаға оралу" сілтемесі
function addBackLink(ws: ExcelJS.Worksheet, row: number) {
  const cell = ws.getCell(row, 1);
  cell.value = { text: L.backToCover, hyperlink: `#'${COVER_SHEET()}'!A1` };
  cell.font = { name: "Arial", size: 9, color: { argb: "FF2563EB" }, underline: true };
  ws.getRow(row).height = 16;
  return row + 1;
}

// Бір сабақ блогының тақырыбы мен кесте торын салатын көмекші
function writeGridHeader(ws: ExcelJS.Worksheet, row: number, title: string, lastCol: number): number {
  ws.mergeCells(row, 1, row, lastCol);
  const tc = ws.getCell(row, 1);
  tc.value = title;
  tc.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  tc.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  tc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
  ws.getRow(row).height = 20;
  row++;
  const headers = [L.colNum, L.colTime, ...DAYS().slice(1, 6)];
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = h;
    cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF374151" } };
    cell.border = BORDER;
  });
  ws.getRow(row).height = 18;
  return row + 1;
}

export async function exportProfessionalExcel(ctx: ExportCtx): Promise<void> {
  const { school, classes, teachers, rooms, subjects, settings, result } = ctx;
  L = ctx.labels || getExportLabels("kk"); // сайт тілін орнату
  const locale = L.lang === "ru" ? "ru-RU" : L.lang === "en" ? "en-US" : "kk-KZ";
  const tl = buildTimeline(school);
  const S: Record<string, Subject> = {}; subjects.forEach((x) => (S[x.id] = x));
  const T: Record<string, Teacher> = {}; teachers.forEach((x) => (T[x.id] = x));
  const R: Record<string, Room> = {}; rooms.forEach((x) => (R[x.id] = x));
  const year = academicYear();

  const wb = new ExcelJS.Workbook();
  wb.creator = L.brand;
  wb.company = `${L.brand} — ${L.autoSystem}`;
  wb.title = `${school.name} — ${L.weeklySchedule} ${year}`;
  wb.subject = L.schoolSchedule;
  wb.keywords = `${L.brand}, ${L.schoolSchedule}`;
  wb.category = L.lang === "ru" ? "Образование" : L.lang === "en" ? "Education" : "Білім беру";
  wb.description = `${L.autoSystem}. ${result.quality}/100.`;
  wb.created = new Date();

  const sheetLinks: { title: string; sheet: string }[] = [];

  // ═══ МҰҚАБА: мазмұны + жалпы статистика ═══
  // Баған схемасы: A/F — жиек, B-C — статистика (белгі/мән)
  const cover = wb.addWorksheet(COVER_SHEET(), {
    properties: { tabColor: { argb: TAB_COLORS.cover } },
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, horizontalCentered: true },
  });
  cover.columns = [{ width: 4 }, { width: 26 }, { width: 16 }, { width: 3 }, { width: 30 }, { width: 4 }];
  cover.mergeCells("B2:E2");
  const titleCell = cover.getCell("B2");
  titleCell.value = L.brand;
  titleCell.font = { name: "IBM Plex Sans", size: 26, bold: true, color: { argb: "FF1E3A5F" } };
  cover.mergeCells("B3:E3");
  const subCell = cover.getCell("B3");
  subCell.value = L.autoSystem;
  subCell.font = { name: "Arial", size: 11, italic: true, color: { argb: "FF64748B" } };
  cover.mergeCells("B5:E5");
  const schoolCell = cover.getCell("B5");
  schoolCell.value = school.name;
  schoolCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FF1A2230" } };
  cover.mergeCells("B6:E6");
  cover.getCell("B6").value = `${year} · ${L.weeklySchedule}`;
  cover.getCell("B6").font = { name: "Arial", size: 10, color: { argb: "FF64748B" } };

  cover.mergeCells("B8:E8");
  const qCell = cover.getCell("B8");
  qCell.value = `${L.lang === "ru" ? "Показатель качества" : L.lang === "en" ? "Quality score" : "Сапа көрсеткіші"}: ${result.quality} / 100`;
  qCell.font = { name: "Arial", size: 13, bold: true, color: { argb: result.quality >= 70 ? "FF16A34A" : result.quality >= 50 ? "FFCA8A04" : "FFDC2626" } };

  // ── Статистика (B/C бағандары, 11-жолдан бастап; 10-жол — таза саңылау) ──
  const STAT_TOP = 11;
  const statRows: [string, string | number][] = [
    [L.statClasses, classes.length],
    [L.statTeachers, teachers.length],
    [L.statRooms, rooms.length],
    [L.statLessons, result.stats.total],
    [L.statGaps, result.gaps.length],
    [L.statUnplaced, result.unplaced.reduce((s, u) => s + u.need - u.placed, 0)],
    [L.statStress, `${result.tests.filter((t) => t.passed).length}/${result.tests.length}`],
    [L.statDate, new Date().toLocaleDateString(locale)],
  ];
  statRows.forEach(([label, val], i) => {
    const rr = STAT_TOP + i;
    cover.getCell(rr, 2).value = label;
    cover.getCell(rr, 2).font = { name: "Arial", size: 9.5, color: { argb: "FF64748B" } };
    cover.getCell(rr, 3).value = val;
    cover.getCell(rr, 3).font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FF1A2230" } };
  });
  const statBottom = STAT_TOP + statRows.length - 1; // 18

  const tocStartRow = statBottom + 3;
  cover.mergeCells(tocStartRow, 2, tocStartRow, 5);
  const tocTitle = cover.getCell(tocStartRow, 2);
  tocTitle.value = L.contents;
  tocTitle.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  tocTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
  tocTitle.alignment = { vertical: "middle", indent: 1 };
  cover.getRow(tocStartRow).height = 20;
  // Мазмұн тізімі мен төменгі ескерту кейінірек (парақтар құрылғаннан кейін,
  // sheetLinks толық белгілі болғанда) толтырылады — орынын есте сақтаймыз.
  const tocLinkStartRow = tocStartRow + 1;

  // ═══ 1-БӨЛІМ: СЫНЫПТАР (топтап) ═══
  for (const grp of GROUPS()) {
    const grpClasses = classes.filter((c) => c.grade >= grp.min && c.grade <= grp.max).sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));
    if (!grpClasses.length) continue;
    const ws = wb.addWorksheet(grp.title, {
      properties: { tabColor: { argb: TAB_COLORS.classes } },
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, horizontalCentered: true, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
      views: [{ state: "frozen", ySplit: 1, xSplit: 2, showGridLines: false }],
    });
    setHeaderFooter(ws, school.name);
    sheetLinks.push({ title: grp.title, sheet: grp.title });
    ws.getColumn(1).width = 5; ws.getColumn(2).width = 12;
    for (let i = 3; i <= 7; i++) ws.getColumn(i).width = 24;

    let curRow = addBackLink(ws, 1);
    for (const c of grpClasses) {
      const slotCount = maxSlots(c.grade, settings);
      curRow = writeGridHeader(ws, curRow, `${c.name} · ${school.name} · ${year}`, 7);
      for (let slot = 1; slot <= slotCount; slot++) {
        const r = curRow; ws.getRow(r).height = 38;
        const numCell = ws.getCell(r, 1);
        numCell.value = slot;
        numCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF374151" } };
        numCell.alignment = { horizontal: "center", vertical: "middle" };
        numCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        numCell.border = BORDER;
        const timeCell = ws.getCell(r, 2);
        timeCell.value = `${tl[c.shift][slot].start}\n${tl[c.shift][slot].end}`;
        timeCell.font = { name: "Arial", size: 8, color: { argb: "FF64748B" } };
        timeCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        timeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        timeCell.border = BORDER;
        for (let day = 1; day <= 5; day++) {
          const cell = ws.getCell(r, 2 + day);
          const os = result.slots.filter((o) => o.classId === c.id && o.day === day && o.slot === slot);
          const main = os.find((o) => !o.groupId || o.groupId === "Г1");
          const g2 = os.find((o) => o.groupId === "Г2");
          if (main && main.subjectId === HOMEROOM_SUBJECT_ID) {
            cell.value = L.homeroom;
            cell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF64748B" } };
            cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
          } else if (main) {
            const subj = S[main.subjectId], tch = T[main.teacherId], room = R[main.roomId];
            const lines = [sShort(subj?.name || "") + (main.dpart ? " (қос)" : "")];
            lines.push(`${shortName(tch?.name || "")} · ${room?.number || ""}`);
            if (g2) { const g2t = T[g2.teacherId], g2r = R[g2.roomId]; lines.push(`2-топ: ${shortName(g2t?.name || "")} · ${g2r?.number || ""}`); }
            cell.value = lines.join("\n");
            cell.font = { name: "Arial", size: 9, color: { argb: "FF1A2230" } };
            cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + subjectColor(subj) } };
          } else {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
          }
          cell.border = BORDER;
        }
        curRow++;
      }
      curRow += 1;
    }
  }

  // ═══ 2-БӨЛІМ: МҰҒАЛІМДЕР КЕСТЕСІ (толық) ═══
  {
    const ws = wb.addWorksheet(L.teacherSheet, {
      properties: { tabColor: { argb: TAB_COLORS.teachers } },
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, horizontalCentered: true },
      views: [{ state: "frozen", ySplit: 1, xSplit: 2, showGridLines: false }],
    });
    setHeaderFooter(ws, school.name);
    sheetLinks.push({ title: L.teacherSheet, sheet: L.teacherSheet });
    ws.getColumn(1).width = 5; ws.getColumn(2).width = 12;
    for (let i = 3; i <= 7; i++) ws.getColumn(i).width = 22;
    const activeTeachers = teachers.filter((t) => result.slots.some((o) => o.teacherId === t.id));
    let curRow = addBackLink(ws, 1);
    for (const t of activeTeachers) {
      const total = result.slots.filter((o) => o.teacherId === t.id).length;
      curRow = writeGridHeader(ws, curRow, `${t.name}  ·  Жүктеме: ${total}/${t.norm} сағат`, 7);
      const tSh = t.shift === 2 ? 2 : 1;
      for (let slot = 1; slot <= 8; slot++) {
        const r = curRow; ws.getRow(r).height = 30;
        ws.getCell(r, 1).value = slot;
        ws.getCell(r, 1).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF374151" } };
        ws.getCell(r, 1).alignment = { horizontal: "center", vertical: "middle" };
        ws.getCell(r, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        ws.getCell(r, 1).border = BORDER;
        ws.getCell(r, 2).value = tl[tSh][slot] ? tl[tSh][slot].start : "";
        ws.getCell(r, 2).font = { name: "Arial", size: 8, color: { argb: "FF64748B" } };
        ws.getCell(r, 2).alignment = { horizontal: "center", vertical: "middle" };
        ws.getCell(r, 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        ws.getCell(r, 2).border = BORDER;
        for (let day = 1; day <= 5; day++) {
          const cell = ws.getCell(r, 2 + day);
          const o = result.slots.find((x) => x.teacherId === t.id && x.day === day && x.slot === slot);
          if (o) {
            const subj = S[o.subjectId], cls = classes.find((c) => c.id === o.classId), room = R[o.roomId];
            cell.value = `${sShort(subj?.name || "")}\n${cls?.name || ""} · ${room?.number || ""}`;
            cell.font = { name: "Arial", size: 9, color: { argb: "FF1A2230" } };
            cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + subjectColor(subj) } };
          } else {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
          }
          cell.border = BORDER;
        }
        curRow++;
      }
      curRow += 1;
    }
  }

  // ═══ 3-БӨЛІМ: КАБИНЕТТЕР КЕСТЕСІ (толық) ═══
  {
    const ws = wb.addWorksheet(L.roomSheet, {
      properties: { tabColor: { argb: TAB_COLORS.rooms } },
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, horizontalCentered: true },
      views: [{ state: "frozen", ySplit: 1, xSplit: 2, showGridLines: false }],
    });
    setHeaderFooter(ws, school.name);
    sheetLinks.push({ title: L.roomSheet, sheet: L.roomSheet });
    ws.getColumn(1).width = 5; ws.getColumn(2).width = 12;
    for (let i = 3; i <= 7; i++) ws.getColumn(i).width = 22;
    const activeRooms = rooms.filter((rm) => result.slots.some((o) => o.roomId === rm.id));
    const typeKz: Record<string, string> = L.roomTypes;
    let curRow = addBackLink(ws, 1);
    for (const rm of activeRooms) {
      // Бір кабинет екі ауысымда да қолданылуы мүмкін (1-ауысым таңертең, 2-ауысым түстен кейін).
      // Слот индексі екі ауысымда бірдей болғандықтан, оларды бір жолға қоссақ — бір уақытта
      // 2 сынып отырғандай жалған қақтығыс көрінеді. Сондықтан әр ауысымды бөлек кесте етіп,
      // өз уақытымен көрсетеміз.
      const usedShifts = ([1, 2] as const).filter((sh) => result.slots.some((o) => o.roomId === rm.id && o.shift === sh));
      for (const sh of usedShifts) {
        const shiftLabel = usedShifts.length > 1 ? `  ·  ${sh}-ауысым` : "";
        curRow = writeGridHeader(ws, curRow, `${rm.number}-кабинет  ·  ${typeKz[rm.type]}${shiftLabel}`, 7);
        for (let slot = 1; slot <= 8; slot++) {
          const r = curRow; ws.getRow(r).height = 28;
          ws.getCell(r, 1).value = slot;
          ws.getCell(r, 1).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF374151" } };
          ws.getCell(r, 1).alignment = { horizontal: "center", vertical: "middle" };
          ws.getCell(r, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
          ws.getCell(r, 1).border = BORDER;
          ws.getCell(r, 2).value = tl[sh][slot] ? tl[sh][slot].start : "";
          ws.getCell(r, 2).font = { name: "Arial", size: 8, color: { argb: "FF64748B" } };
          ws.getCell(r, 2).alignment = { horizontal: "center", vertical: "middle" };
          ws.getCell(r, 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
          ws.getCell(r, 2).border = BORDER;
          for (let day = 1; day <= 5; day++) {
            const cell = ws.getCell(r, 2 + day);
            const occ = result.slots.filter((x) => x.roomId === rm.id && x.day === day && x.slot === slot && x.shift === sh);
            if (occ.length) {
              const lines = occ.slice(0, 2).map((o) => {
                const subj = S[o.subjectId], cls = classes.find((c) => c.id === o.classId);
                return `${cls?.name || ""} ${sShort(subj?.name || "")}`;
              });
              cell.value = lines.join("\n");
              cell.font = { name: "Arial", size: 9, color: { argb: "FF1A2230" } };
              cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF2F8" } };
            } else {
              cell.value = L.free;
              cell.font = { name: "Arial", size: 8, italic: true, color: { argb: "FFB0B8C0" } };
              cell.alignment = { horizontal: "center", vertical: "middle" };
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
            }
            cell.border = BORDER;
          }
          curRow++;
        }
        curRow += 1;
      }
    }
  }

  // ═══ 4-БӨЛІМ: ЖҮКТЕМЕ ҚОРЫТЫНДЫ ═══
  {
    const ws = wb.addWorksheet(L.workloadSummary, {
      properties: { tabColor: { argb: TAB_COLORS.summary } },
      views: [{ state: "frozen", ySplit: 2, showGridLines: false }],
      pageSetup: { fitToPage: true, fitToWidth: 1, horizontalCentered: true },
    });
    setHeaderFooter(ws, school.name);
    sheetLinks.push({ title: L.workloadSummary, sheet: L.workloadSummary });
    const headerRow = addBackLink(ws, 1);
    ws.columns = [{ width: 28 }, { width: 12 }, { width: 12 }, { width: 6 }, { width: 6 }, { width: 6 }, { width: 6 }, { width: 6 }];
    ws.getRow(headerRow).values = [L.colTeacher, L.colLoad, L.colFill, ...L.daysShort.slice(1, 6)];
    ws.getRow(headerRow).eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF374151" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = BORDER;
    });
    let dataRow = headerRow + 1;
    teachers.forEach((t) => {
      const total = result.slots.filter((o) => o.teacherId === t.id).length;
      if (total === 0) return;
      const perDay = [1, 2, 3, 4, 5].map((d) => result.slots.filter((o) => o.teacherId === t.id && o.day === d).length);
      const pct = t.norm > 0 ? Math.round((total / t.norm) * 100) : 0;
      const row = ws.getRow(dataRow);
      row.values = [t.name, `${total}/${t.norm}`, pct / 100, perDay[0] || "", perDay[1] || "", perDay[2] || "", perDay[3] || "", perDay[4] || ""];
      row.eachCell((cell, col) => {
        cell.border = BORDER;
        cell.alignment = { horizontal: col === 1 ? "left" : "center", vertical: "middle" };
        cell.font = { name: "Arial", size: 9 };
      });
      row.getCell(3).numFmt = "0%";
      dataRow++;
    });
    ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: 8 } };
    // Толу % бағанына деректер жолағы (data bar) — Excel құралы, жүктемені бірден көзбен көру үшін
    if (dataRow > headerRow + 1) {
      ws.addConditionalFormatting({
        ref: `C${headerRow + 1}:C${dataRow - 1}`,
        rules: [{ type: "dataBar", priority: 1, gradient: false, minLength: 0, maxLength: 100,
          color: { argb: "FF4A90D9" },
          cfvo: [{ type: "num", value: 0 }, { type: "num", value: 1.2 }] } as unknown as ExcelJS.DataBarRuleType],
      });
    }
  }

  // ═══ Мазмұнды толтыру (барлық парақ жасалғаннан кейін, сілтемелермен) ═══
  sheetLinks.forEach((link, i) => {
    const row = tocLinkStartRow + i;
    cover.mergeCells(row, 2, row, 5);
    const cell = cover.getCell(row, 2);
    cell.value = { text: `📄  ${link.title}`, hyperlink: `#'${link.sheet}'!A1` };
    cell.font = { name: "Arial", size: 10.5, color: { argb: "FF2563EB" }, underline: true };
    cover.getRow(row).height = 18;
  });
  const footerRow = tocLinkStartRow + sheetLinks.length + 2;
  cover.mergeCells(footerRow, 2, footerRow, 5);
  cover.getCell(footerRow, 2).value = L.footer;
  cover.getCell(footerRow, 2).font = { name: "Arial", size: 8, italic: true, color: { argb: "FFB0B8C0" } };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${L.brand}_${school.name.slice(0, 25)}_${year}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// ЕНГІЗІЛГЕН ДЕРЕКТЕРДІ ЭКСПОРТТАУ (кесте құрылмаса да жұмыс істейді)
// Завуч өзі енгізген барлық деректі Excel-ге түсіреді: мектеп параметрлері,
// пәндер, мұғалімдер, кабинеттер, сыныптардың оқу жоспары және ШЖМ комплектілері.
// Сақтық көшірме әрі тексеру үшін — генерациядан тәуелсіз.
// ─────────────────────────────────────────────────────────────────────────────
interface InputExportCtx {
  school: School; classes: Klass[]; teachers: Teacher[]; rooms: Room[];
  subjects: Subject[]; settings?: Settings; komplekts?: Komplekt[];
  labels?: ExportLabels;
}

export async function exportInputDataExcel(ctx: InputExportCtx): Promise<void> {
  L = ctx.labels || getExportLabels("kk");
  const { school, classes, teachers, rooms, subjects, komplekts } = ctx;
  const isShzhm = school.type === "shzhm";
  const tr = (kk: string, ru: string, en: string) => (L.lang === "ru" ? ru : L.lang === "en" ? en : kk);
  const year = academicYear();

  const roomTypeLabel: Record<string, string> = {
    regular: tr("Қарапайым", "Обычный", "Regular"),
    physics: tr("Физика", "Физика", "Physics"),
    chemistry: tr("Химия", "Химия", "Chemistry"),
    computer: tr("Информатика", "Информатика", "Computer"),
    gym: tr("Спортзал", "Спортзал", "Gym"),
  };
  const yes = tr("иә", "да", "yes"), dash = "—";
  const sName = (id: string) => subjects.find((s) => s.id === id)?.name || dash;
  const tName = (id?: string) => (id ? teachers.find((t) => t.id === id)?.name || dash : dash);
  const rName = (id?: string) => (id ? rooms.find((r) => r.id === id)?.number || dash : dash);
  const cName = (id: string) => classes.find((c) => c.id === id)?.name || dash;

  const wb = new ExcelJS.Workbook();
  wb.creator = L.brand;
  wb.created = new Date();

  // Кестені жазатын әмбебап көмекші: тақырып жолағы + бас жол + деректер жолдары
  const writeTable = (
    ws: ExcelJS.Worksheet, startRow: number, title: string,
    headers: string[], rows: (string | number)[][], widths: number[], tabColor: string,
  ): number => {
    ws.properties.tabColor = { argb: tabColor };
    const last = headers.length;
    ws.mergeCells(startRow, 1, startRow, last);
    const tc = ws.getCell(startRow, 1);
    tc.value = title;
    tc.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    tc.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    tc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    ws.getRow(startRow).height = 22;
    let row = startRow + 1;
    headers.forEach((h, i) => {
      const cell = ws.getCell(row, i + 1);
      cell.value = h;
      cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF374151" } };
      cell.border = BORDER;
      if (widths[i]) ws.getColumn(i + 1).width = widths[i];
    });
    ws.getRow(row).height = 20;
    row++;
    for (const r of rows) {
      r.forEach((v, i) => {
        const cell = ws.getCell(row, i + 1);
        cell.value = v;
        cell.font = { name: "Arial", size: 9, color: { argb: "FF1F2937" } };
        cell.alignment = { horizontal: i === 0 ? "left" : "center", vertical: "middle", wrapText: true, indent: i === 0 ? 1 : 0 };
        cell.border = BORDER;
        if (row % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F6FB" } };
      });
      row++;
    }
    return row + 1; // келесі блокқа бос жол
  };

  // ── 1. Мектеп параметрлері ──
  const wsSchool = wb.addWorksheet(tr("Мектеп", "Школа", "School"));
  wsSchool.getColumn(1).width = 34;
  wsSchool.getColumn(2).width = 30;
  {
    const rows: [string, string | number][] = [
      [tr("Мектеп атауы", "Название школы", "School name"), school.name],
      [tr("Оқу жылы", "Учебный год", "Academic year"), year],
      [tr("Мектеп түрі", "Тип школы", "School type"), isShzhm ? tr("Шағын жинақты (ШЖМ)", "Малокомплектная", "Small (ungraded)") : tr("Қарапайым", "Обычная", "Regular")],
      [tr("1-ауысым басы", "Начало 1 смены", "Shift 1 start"), school.shift1Start],
      [tr("2-ауысым басы", "Начало 2 смены", "Shift 2 start"), school.shift2Start],
      [tr("Сабақ ұзақтығы (мин)", "Длит. урока (мин)", "Lesson length (min)"), school.lessonDuration],
      [tr("Қысқа үзіліс (мин)", "Малая перемена (мин)", "Short break (min)"), school.shortBreak],
      [tr("Ұзақ үзіліс (мин)", "Большая перемена (мин)", "Long break (min)"), school.longBreak],
      [tr("Ұзақ үзіліс қай сабақтан кейін", "Большая перемена после урока", "Long break after lesson"), school.longBreakAfter],
      [tr("Ауысым аралық үзіліс (мин)", "Перерыв между сменами (мин)", "Inter-shift gap (min)"), school.interShiftGap],
    ];
    writeTable(wsSchool, 1, tr("МЕКТЕП ПАРАМЕТРЛЕРІ", "ПАРАМЕТРЫ ШКОЛЫ", "SCHOOL SETTINGS"),
      [tr("Параметр", "Параметр", "Parameter"), tr("Мән", "Значение", "Value")],
      rows, [34, 30], "FFD4AF37");
  }

  // ── 2. Пәндер ──
  const wsSubj = wb.addWorksheet(tr("Пәндер", "Предметы", "Subjects"));
  {
    const headers = [
      tr("Пән", "Предмет", "Subject"),
      tr("Балл (СанПиН)", "Балл (СанПиН)", "Score (SanPiN)"),
      tr("Кабинет", "Кабинет", "Room"),
      tr("Қос сабақ", "Сдвоенный", "Double"),
      tr("Цифрлық", "Цифровой", "Digital"),
    ];
    if (isShzhm) headers.push(tr("Өзіндік жұмыс", "Самост. работа", "Self-study"));
    const rows = subjects.map((s) => {
      const r: (string | number)[] = [
        s.name, s.score, s.room ? roomTypeLabel[s.room] : dash,
        s.canDouble ? yes : dash, s.digital ? yes : dash,
      ];
      if (isShzhm) r.push(s.selfStudy ? yes : dash);
      return r;
    });
    const widths = isShzhm ? [26, 12, 14, 10, 10, 13] : [28, 12, 15, 11, 11];
    writeTable(wsSubj, 1, tr("ПӘНДЕР ЖӘНЕ ҚИЫНДЫҚ БАЛЛЫ", "ПРЕДМЕТЫ И БАЛЛ СЛОЖНОСТИ", "SUBJECTS & DIFFICULTY"),
      headers, rows, widths, "FF2563EB");
  }

  // ── 3. Мұғалімдер ──
  const wsTea = wb.addWorksheet(tr("Мұғалімдер", "Учителя", "Teachers"));
  {
    const headers = [
      tr("Мұғалім", "Учитель", "Teacher"),
      tr("Пәндері", "Предметы", "Subjects"),
      tr("Норма (сағ)", "Норма (ч)", "Norm (h)"),
      tr("Сыныптар", "Классы", "Grades"),
      tr("Ауысым", "Смена", "Shift"),
    ];
    const rows = teachers.map((t) => [
      t.name,
      t.subjects && t.subjects.length ? t.subjects.join(", ") : tr("барлығы", "все", "all"),
      t.norm,
      `${t.gradeMin}–${t.gradeMax}`,
      t.shift === 3 ? tr("екеуі", "обе", "both") : String(t.shift),
    ]);
    writeTable(wsTea, 1, tr("МҰҒАЛІМДЕР", "УЧИТЕЛЯ", "TEACHERS"),
      headers, rows, [24, 34, 11, 12, 10], "FF16A34A");
  }

  // ── 4. Кабинеттер ──
  const wsRoom = wb.addWorksheet(tr("Кабинеттер", "Кабинеты", "Rooms"));
  {
    const headers = [
      tr("Кабинет", "Кабинет", "Room"),
      tr("Түрі", "Тип", "Type"),
      tr("Сыйымдылық", "Вместимость", "Capacity"),
    ];
    const rows = rooms.map((r) => [r.number, roomTypeLabel[r.type] || r.type, r.capacity ?? dash]);
    writeTable(wsRoom, 1, tr("КАБИНЕТТЕР", "КАБИНЕТЫ", "ROOMS"),
      headers, rows, [24, 18, 14], "FF9333EA");
  }

  // ── 5. Сыныптар және оқу жоспары ──
  const wsCls = wb.addWorksheet(tr("Оқу жоспары", "Учебный план", "Curriculum"));
  {
    const headers = [
      tr("Сынып", "Класс", "Class"),
      tr("Пән", "Предмет", "Subject"),
      tr("Сағат/апта", "Часов/нед", "Hours/wk"),
      tr("Мұғалім", "Учитель", "Teacher"),
      tr("Кабинет", "Кабинет", "Room"),
    ];
    const rows: (string | number)[][] = [];
    for (const c of [...classes].sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name))) {
      const cur = c.curriculum || [];
      if (!cur.length) { rows.push([`${c.name} (${c.shift}${tr("-ауысым", "-я см.", " sh.")})`, dash, dash, dash, dash]); continue; }
      cur.forEach((cu, i) => {
        const subj = subjects.find((s) => s.id === cu.subjectId);
        const teacher = cu.isSplit && cu.groups?.length
          ? cu.groups.map((g) => tName(g.teacherId)).join(" / ")
          : tName(cu.teacherId);
        rows.push([
          i === 0 ? `${c.name} (${c.shift}${tr("-ауысым", "-я см.", " sh.")})` : "",
          sName(cu.subjectId),
          cu.hours,
          teacher,
          subj?.room ? roomTypeLabel[subj.room] : dash,
        ]);
      });
    }
    writeTable(wsCls, 1, tr("СЫНЫПТАРДЫҢ ОҚУ ЖОСПАРЫ", "УЧЕБНЫЙ ПЛАН КЛАССОВ", "CLASS CURRICULA"),
      headers, rows, [16, 26, 11, 24, 14], "FFEA580C");
  }

  // ── 6. Комплектілер (тек ШЖМ) ──
  if (isShzhm && komplekts && komplekts.length) {
    const wsK = wb.addWorksheet(tr("Комплектілер", "Комплекты", "Komplekts"));
    const headers = [
      tr("Комплект", "Комплект", "Komplekt"),
      tr("Сыныптар", "Классы", "Classes"),
      tr("Мұғалім", "Учитель", "Teacher"),
      tr("Кабинет", "Кабинет", "Room"),
    ];
    const rows = komplekts.map((k) => [
      k.name, k.classIds.map((id) => cName(id)).join(" + "), tName(k.teacherId), rName(k.roomId),
    ]);
    writeTable(wsK, 1, tr("КЛАСС-КОМПЛЕКТІЛЕР (ШЖМ)", "КЛАСС-КОМПЛЕКТЫ", "CLASS KOMPLEKTS"),
      headers, rows, [20, 24, 24, 16], "FF0891B2");
  }

  // Әр параққа баспа колонтитулы
  wb.eachSheet((ws) => setHeaderFooter(ws, school.name));

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${L.brand}_${tr("деректер", "данные", "data")}_${school.name.slice(0, 20)}_${year}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
