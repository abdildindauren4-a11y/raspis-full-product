// filepath: src/lib/excelExport.ts
// Кәсіби Excel экспорты (exceljs) — топтап сыныптар + толық мұғалім/кабинет кестелері
import ExcelJS from "exceljs";
import type { AlgoResult, Klass, Teacher, Room, Subject, School } from "@/algorithm/engine";
import { maxSlots, buildTimeline } from "@/algorithm/engine";

const DAYS = ["", "Дүйсенбі", "Сейсенбі", "Сәрсенбі", "Бейсенбі", "Жұма"];

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
  rooms: Room[]; subjects: Subject[]; result: AlgoResult;
}

const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFB0B8C0" } },
  left: { style: "thin", color: { argb: "FFB0B8C0" } },
  bottom: { style: "thin", color: { argb: "FFB0B8C0" } },
  right: { style: "thin", color: { argb: "FFB0B8C0" } },
};

const GROUPS: { title: string; min: number; max: number }[] = [
  { title: "1-4 сыныптар", min: 1, max: 4 },
  { title: "5-9 сыныптар", min: 5, max: 9 },
  { title: "10-12 сыныптар", min: 10, max: 12 },
];

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
  const headers = ["№", "Уақыт", ...DAYS.slice(1, 6)];
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
  const { school, classes, teachers, rooms, subjects, result } = ctx;
  const tl = buildTimeline(school);
  const S: Record<string, Subject> = {}; subjects.forEach((x) => (S[x.id] = x));
  const T: Record<string, Teacher> = {}; teachers.forEach((x) => (T[x.id] = x));
  const R: Record<string, Room> = {}; rooms.forEach((x) => (R[x.id] = x));
  const year = academicYear();

  const wb = new ExcelJS.Workbook();
  wb.creator = "РАСПИС";
  wb.created = new Date();

  // ═══ 1-БӨЛІМ: СЫНЫПТАР (топтап) ═══
  for (const grp of GROUPS) {
    const grpClasses = classes.filter((c) => c.grade >= grp.min && c.grade <= grp.max).sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));
    if (!grpClasses.length) continue;
    const ws = wb.addWorksheet(grp.title, {
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.4, header: 0.3, footer: 0.3 } },
      views: [{ state: "frozen", ySplit: 0, xSplit: 2 }],
    });
    ws.getColumn(1).width = 5; ws.getColumn(2).width = 12;
    for (let i = 3; i <= 7; i++) ws.getColumn(i).width = 24;

    let curRow = 1;
    for (const c of grpClasses) {
      const slotCount = maxSlots(c.grade);
      curRow = writeGridHeader(ws, curRow, `${c.name} сынып · ${school.name} · ${year} оқу жылы`, 7);
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
          if (main) {
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
    const ws = wb.addWorksheet("Мұғалімдер кестесі", {
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
      views: [{ state: "frozen", xSplit: 2 }],
    });
    ws.getColumn(1).width = 5; ws.getColumn(2).width = 12;
    for (let i = 3; i <= 7; i++) ws.getColumn(i).width = 22;
    const activeTeachers = teachers.filter((t) => result.slots.some((o) => o.teacherId === t.id));
    let curRow = 1;
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
    const ws = wb.addWorksheet("Кабинеттер кестесі", {
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
      views: [{ state: "frozen", xSplit: 2 }],
    });
    ws.getColumn(1).width = 5; ws.getColumn(2).width = 12;
    for (let i = 3; i <= 7; i++) ws.getColumn(i).width = 22;
    const activeRooms = rooms.filter((rm) => result.slots.some((o) => o.roomId === rm.id));
    const typeKz: Record<string, string> = { regular: "қарапайым", physics: "физика", chemistry: "химия", computer: "информатика", gym: "спортзал" };
    let curRow = 1;
    for (const rm of activeRooms) {
      curRow = writeGridHeader(ws, curRow, `${rm.number}-кабинет  ·  ${typeKz[rm.type]}`, 7);
      for (let slot = 1; slot <= 8; slot++) {
        const r = curRow; ws.getRow(r).height = 28;
        ws.getCell(r, 1).value = slot;
        ws.getCell(r, 1).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF374151" } };
        ws.getCell(r, 1).alignment = { horizontal: "center", vertical: "middle" };
        ws.getCell(r, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        ws.getCell(r, 1).border = BORDER;
        ws.getCell(r, 2).value = tl[1][slot] ? tl[1][slot].start : "";
        ws.getCell(r, 2).font = { name: "Arial", size: 8, color: { argb: "FF64748B" } };
        ws.getCell(r, 2).alignment = { horizontal: "center", vertical: "middle" };
        ws.getCell(r, 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        ws.getCell(r, 2).border = BORDER;
        for (let day = 1; day <= 5; day++) {
          const cell = ws.getCell(r, 2 + day);
          const occ = result.slots.filter((x) => x.roomId === rm.id && x.day === day && x.slot === slot);
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
            cell.value = "бос";
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

  // ═══ 4-БӨЛІМ: ЖҮКТЕМЕ ҚОРЫТЫНДЫ ═══
  {
    const ws = wb.addWorksheet("Жүктеме қорытынды", { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = [
      { header: "Мұғалім", key: "t", width: 28 }, { header: "Жүктеме", key: "load", width: 12 },
      { header: "Дс", key: "d1", width: 6 }, { header: "Сс", key: "d2", width: 6 },
      { header: "Ср", key: "d3", width: 6 }, { header: "Бс", key: "d4", width: 6 }, { header: "Жм", key: "d5", width: 6 },
    ];
    ws.getRow(1).eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF374151" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = BORDER;
    });
    teachers.forEach((t) => {
      const total = result.slots.filter((o) => o.teacherId === t.id).length;
      if (total === 0) return;
      const perDay = [1, 2, 3, 4, 5].map((d) => result.slots.filter((o) => o.teacherId === t.id && o.day === d).length);
      const row = ws.addRow({ t: t.name, load: `${total}/${t.norm}`, d1: perDay[0] || "", d2: perDay[1] || "", d3: perDay[2] || "", d4: perDay[3] || "", d5: perDay[4] || "" });
      row.eachCell((cell, col) => {
        cell.border = BORDER;
        cell.alignment = { horizontal: col === 1 ? "left" : "center", vertical: "middle" };
        cell.font = { name: "Arial", size: 9 };
      });
    });
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 7 } };
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `РАСПИС_${school.name.slice(0, 25)}_${year}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
