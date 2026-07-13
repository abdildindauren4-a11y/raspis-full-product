// filepath: src/lib/pdfExport.ts
// Нақты жүктелетін PDF экспорты (jsPDF + autoTable) — баспа диалогынсыз,
// бір батырмамен дайын .pdf файл алу үшін. Қаріп: Noto Sans (қазақ/орыс
// кириллицасының толық жиынтығымен, PDF-ке ендіріледі).
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import QRCode from "qrcode";
import type { AlgoResult, Klass, Teacher, Room, Subject, School, Settings } from "@/algorithm/engine";
import { maxSlots, buildTimeline, HOMEROOM_SUBJECT_ID } from "@/algorithm/engine";
import { buildCertData, certUrl } from "@/lib/certificate";
import { getExportLabels, type ExportLabels } from "@/lib/exportLabels";
import notoRegularUrl from "@/assets/fonts/NotoSans-Regular.ttf?url";
import notoBoldUrl from "@/assets/fonts/NotoSans-Bold.ttf?url";

const FONT = "NotoSansRP";

interface ExportCtx {
  school: School; classes: Klass[]; teachers: Teacher[];
  rooms: Room[]; subjects: Subject[]; settings?: Settings; result: AlgoResult;
  labels?: ExportLabels; // сайт тілі (болмаса — қазақша әдепкі)
}

function subjectColorRGB(subj: Subject | undefined): [number, number, number] {
  if (!subj) return [255, 255, 255];
  if (subj.room === "gym") return [213, 245, 227];
  if (subj.room === "computer") return [214, 234, 248];
  if (subj.room === "physics" || subj.room === "chemistry") return [232, 218, 239];
  if (subj.score >= 9) return [250, 219, 216];
  if (subj.score >= 6) return [254, 249, 231];
  return [234, 242, 248];
}

function academicYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return m >= 5 ? `${y}–${y + 1}` : `${y - 1}–${y}`;
}

async function bufToBase64(buf: ArrayBuffer): Promise<string> {
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

let fontCache: { regular: string; bold: string } | null = null;
async function loadFonts() {
  if (fontCache) return fontCache;
  const [rBuf, bBuf] = await Promise.all([
    fetch(notoRegularUrl).then((r) => r.arrayBuffer()),
    fetch(notoBoldUrl).then((r) => r.arrayBuffer()),
  ]);
  fontCache = { regular: await bufToBase64(rBuf), bold: await bufToBase64(bBuf) };
  return fontCache;
}

export async function exportSchedulePDF(ctx: ExportCtx): Promise<void> {
  const { school, classes, teachers, rooms, subjects, settings, result } = ctx;
  const L = ctx.labels || getExportLabels("kk");
  const DAYS = L.days;
  const fonts = await loadFonts();
  const tl = buildTimeline(school);
  const T = new Map(teachers.map((t) => [t.id, t]));
  const R = new Map(rooms.map((r) => [r.id, r]));
  const S = new Map(subjects.map((s) => [s.id, s]));
  const tName = (id: string) => T.get(id)?.name || "";
  const rName = (id: string) => R.get(id)?.number || "";
  const year = academicYear();

  // Сапа сертификатының QR-коды — әр бет соңында
  let qrDataUrl = "";
  try {
    const cd = buildCertData(result, school.name, { classes: classes.length, teachers: teachers.length, rooms: rooms.length });
    qrDataUrl = await QRCode.toDataURL(certUrl(cd), { width: 240, margin: 1, color: { dark: "#1a2230", light: "#ffffff" }, errorCorrectionLevel: "M" });
  } catch (e) {
    console.error("QR жасау қатесі:", e);
  }

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.addFileToVFS("NotoSans-Regular.ttf", fonts.regular);
  doc.addFont("NotoSans-Regular.ttf", FONT, "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", fonts.bold);
  doc.addFont("NotoSans-Bold.ttf", FONT, "bold");
  doc.setFont(FONT, "normal");
  doc.setProperties({ title: `${L.brand} — ${school.name}`, subject: L.weeklySchedule, creator: L.brand, author: school.name });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;

  classes.forEach((c, idx) => {
    if (idx > 0) doc.addPage();

    doc.setFont(FONT, "bold");
    doc.setFontSize(14);
    doc.setTextColor(26, 34, 48);
    doc.text(school.name, margin, 14);
    doc.setFontSize(11);
    doc.text(`${c.name} ${L.classWord} (${c.shift}-${L.shiftWord})`, margin, 21);
    doc.setFont(FONT, "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`${L.qualityWord}: ${result.quality}/100  ·  ${year} ${L.schoolYear}`, pageW - margin, 14, { align: "right" });

    const slotCount = maxSlots(c.grade, settings);
    const head = [[L.colNum, L.colTime, ...DAYS.slice(1)]];
    const body: string[][] = [];
    const meta: ({ color: [number, number, number] } | null)[][] = [];
    for (let slot = 1; slot <= slotCount; slot++) {
      const row = [String(slot), `${tl[c.shift][slot].start}\n${tl[c.shift][slot].end}`];
      const rowMeta: ({ color: [number, number, number] } | null)[] = [null, null];
      for (let day = 1; day <= 5; day++) {
        const os = result.slots.filter((o) => o.classId === c.id && o.day === day && o.slot === slot);
        const main = os.find((o) => !o.groupId || o.groupId === "Г1");
        const g2 = os.find((o) => o.groupId === "Г2");
        if (!main) { row.push("—"); rowMeta.push(null); continue; }
        if (main.subjectId === HOMEROOM_SUBJECT_ID) { row.push(L.homeroom); rowMeta.push({ color: [226, 232, 240] }); continue; }
        const subj = S.get(main.subjectId);
        let cellText = `${subj?.name || ""}${main.dpart ? L.doubleSuffix : ""}\n${tName(main.teacherId)} · ${rName(main.roomId)}`;
        if (g2) cellText += `\n${L.group2}: ${tName(g2.teacherId)} · ${rName(g2.roomId)}`;
        row.push(cellText);
        rowMeta.push({ color: subjectColorRGB(subj) });
      }
      body.push(row); meta.push(rowMeta);
    }

    autoTable(doc, {
      startY: 26, margin: { left: margin, right: margin, bottom: 30 },
      head, body,
      styles: { font: FONT, fontSize: 8, cellPadding: 2, valign: "middle", halign: "center", lineColor: [176, 184, 192], lineWidth: 0.1, textColor: [26, 34, 48] },
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: "bold", fontSize: 8.5 },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 18 } },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const m = meta[data.row.index]?.[data.column.index];
        if (m) data.cell.styles.fillColor = m.color;
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable?.finalY ?? 26;
    const qrY = Math.min(finalY + 6, pageH - 32);
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, "PNG", margin, qrY, 22, 22);
      doc.setFont(FONT, "bold"); doc.setFontSize(9); doc.setTextColor(26, 34, 48);
      doc.text(L.certTitle, margin + 26, qrY + 6);
      doc.setFont(FONT, "normal"); doc.setFontSize(8); doc.setTextColor(90, 86, 80);
      doc.text(L.certScan, margin + 26, qrY + 11);
      doc.text(`${school.name} · ${L.qualityWord} ${result.quality}/100`, margin + 26, qrY + 16);
    }

    doc.setFont(FONT, "normal"); doc.setFontSize(8); doc.setTextColor(150, 150, 150);
    doc.text(`${idx + 1} / ${classes.length}`, pageW - margin, pageH - 6, { align: "right" });
  });

  doc.save(`РАСПИС_${school.name.slice(0, 25)}_${year}.pdf`);
}
