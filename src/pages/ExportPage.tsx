// filepath: src/pages/ExportPage.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import excelIconUrl from "@/assets/icons/excel-icon.png";
import pdfIconUrl from "@/assets/icons/pdf-icon.png";
import printerIconUrl from "@/assets/icons/printer-icon.png";
import { Download, Printer, FileSpreadsheet, Sparkles, QrCode, ExternalLink, Award } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { btnP, btnG } from "@/components/shared/Form";
import { useData, useActiveVersion } from "@/store/dataStore";
import { useLang } from "@/contexts/LangContext";
import { buildTimeline, maxSlots, HOMEROOM_SUBJECT_ID, HOMEROOM_LABEL } from "@/algorithm/engine";
import { exportProfessionalExcel } from "@/lib/excelExport";
import { exportSchedulePDF } from "@/lib/pdfExport";
import { buildCertData, certUrl } from "@/lib/certificate";
import QRCode from "qrcode";
import docDecoUrl from "@/assets/deco-document.png";


export default function ExportPage() {
  const { classes, teachers, rooms, subjects, school, settings } = useData();
  const active = useActiveVersion();
  const { t } = useLang();
  const DAYS = ["", t("day.mon"), t("day.tue"), t("day.wed"), t("day.thu"), t("day.fri")];
  const [busyType, setBusyType] = useState<"excel" | "pdf" | null>(null);
  const [qrImg, setQrImg] = useState<string>("");
  const [certLink, setCertLink] = useState<string>("");
  const tl = buildTimeline(school);

  const tName = (id: string) => teachers.find((t) => t.id === id)?.name || "";
  const rName = (id: string) => rooms.find((r) => r.id === id)?.number || "";

  const exportExcel = async () => {
    if (!active) return;
    setBusyType("excel");
    try {
      await exportProfessionalExcel({
        school, classes, teachers, rooms, subjects, settings, result: active.result,
      });
    } catch (e) {
      console.error("Excel export қатесі:", e);
    } finally {
      setBusyType(null);
    }
  };

  // Нақты жүктелетін PDF файлы — баспа диалогынсыз, бір батырмамен
  const exportPDF = async () => {
    if (!active) return;
    setBusyType("pdf");
    try {
      await exportSchedulePDF({
        school, classes, teachers, rooms, subjects, settings, result: active.result,
      });
    } catch (e) {
      console.error("PDF export қатесі:", e);
    } finally {
      setBusyType(null);
    }
  };

  // Сапа сертификатының QR-кодын жасау
  const makeCert = async () => {
    if (!active) return;
    const data = buildCertData(active.result, school.name, {
      classes: classes.length,
      teachers: teachers.length,
      rooms: rooms.length,
    });
    const url = certUrl(data);
    setCertLink(url);
    try {
      const img = await QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: { dark: "#1a2230", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
      setQrImg(img);
    } catch (e) {
      console.error("QR жасау қатесі:", e);
    }
  };

  const printAll = async () => {
    if (!active) return;
    const w = window.open("", "_blank");
    if (!w) return;

    // Сапа сертификатының QR-кодын жасау (кесте астына қою үшін)
    let qrDataUrl = "";
    try {
      const cd = buildCertData(active.result, school.name, {
        classes: classes.length,
        teachers: teachers.length,
        rooms: rooms.length,
      });
      qrDataUrl = await QRCode.toDataURL(certUrl(cd), {
        width: 200,
        margin: 1,
        color: { dark: "#1a2230", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
    } catch (e) {
      console.error("QR жасау қатесі:", e);
    }

    // Кесте астындағы QR блогы (HTML)
    const qrBlock = qrDataUrl
      ? `<div class="qr-foot">
           <img src="${qrDataUrl}" class="qr-img" />
           <div class="qr-text">
             <div class="qr-title">${t("cert.title")}</div>
             <div class="qr-sub">${t("cert.printHint")}</div>
             <div class="qr-school">${school.name} · ${t("exp.statQuality")}: ${active.result.quality}/100</div>
           </div>
         </div>`
      : "";

    let html = `<html><head><meta charset="utf-8"><title>РАСПИС</title><style>
      body{font-family:Arial,sans-serif;font-size:11px;margin:16px}
      h2{margin:14px 0 6px;page-break-before:always} h2:first-of-type{page-break-before:auto}
      table{border-collapse:collapse;width:100%} td,th{border:1px solid #999;padding:4px;text-align:center}
      th{background:#eef} .r{background:#fde8e8}.y{background:#fdf6dc}.g{background:#e3f6e8}
      .qr-foot{display:flex;align-items:center;gap:14px;margin-top:14px;padding:12px 14px;border:1.5px solid #1a2230;border-radius:6px;page-break-inside:avoid}
      .qr-img{width:88px;height:88px;flex-shrink:0}
      .qr-text{font-family:'Times New Roman',serif}
      .qr-title{font-size:13px;font-weight:700;color:#1a2230;margin-bottom:3px}
      .qr-sub{font-size:10.5px;color:#5a5650;line-height:1.5;margin-bottom:4px}
      .qr-school{font-size:10px;color:#9a7d3a;font-style:italic}
    </style></head><body><h1>${school.name} — ${t("exp.weeklySchedule")}</h1>`;
    for (const c of classes) {
      html += `<h2>${c.name} ${t("exp.classWord")} (${c.shift}${t("exp.shiftWord")})</h2><table><tr><th>№</th><th>${t("exp.colTime")}</th>${DAYS.slice(1).map((d) => `<th>${d}</th>`).join("")}</tr>`;
      for (let slot = 1; slot <= maxSlots(c.grade, settings); slot++) {
        html += `<tr><td>${slot}</td><td>${tl[c.shift][slot].start}–${tl[c.shift][slot].end}</td>`;
        for (let day = 1; day <= 5; day++) {
          const o = active.result.slots.find((x) => x.classId === c.id && x.day === day && x.slot === slot && (!x.groupId || x.groupId === "Г1"));
          if (!o) { html += "<td>—</td>"; continue; }
          if (o.subjectId === HOMEROOM_SUBJECT_ID) { html += `<td style="font-style:italic;color:#64748b"><b>${HOMEROOM_LABEL}</b></td>`; continue; }
          const s = subjects.find((x) => x.id === o.subjectId)!;
          const cl = s.score >= 9 ? "r" : s.score >= 6 ? "y" : "g";
          html += `<td class="${cl}"><b>${s.name}${o.dpart ? " ×2" : ""}</b><br>${tName(o.teacherId)}<br>${rName(o.roomId)}</td>`;
        }
        html += "</tr>";
      }
      html += "</table>";
      html += qrBlock; // әр сынып кестесінің астына QR
    }
    html += "</body></html>";
    w.document.write(html);
    w.document.close();
    w.print();
  };

  if (!active)
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3">
        <p className="text-muted-c">{t("exp.noSchedule")}</p>
        <Link to="/generate" className="accent-c text-sm inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> {t("exp.toGenerate")} →</Link>
      </div>
    );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3 relative">
        <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center">
          <FileSpreadsheet className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("exp.title")}</h1>
          <p className="text-muted-c">{active.name} · {classes.length} {t("exp.statClasses")} · {t("exp.statQuality")} {active.result.quality}/100</p>
        </div>
        <img src={docDecoUrl} alt="" aria-hidden className="hidden sm:block absolute right-0 -top-2 w-16 -rotate-6 pointer-events-none" style={{ filter: "drop-shadow(0 6px 12px rgba(30,58,95,0.18))" }} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        <GlassCard hover={false}>
          <div className="flex items-center gap-3 mb-3">
            <img src={excelIconUrl} alt="Excel" className="w-11 h-11 object-contain shrink-0" />
            <div>
              <h3 className="font-semibold text-strong-c">{t("exp.excelTitle")}</h3>
              <p className="text-xs text-muted-c">.xlsx · Microsoft Excel</p>
            </div>
          </div>
          <p className="text-xs text-muted-c mb-4">{t("exp.excelDesc")}</p>
          <button className={btnP + " w-full flex items-center justify-center gap-2"} onClick={exportExcel} disabled={busyType !== null}>
            {busyType === "excel" ? <>{t("exp.preparing")}</> : <><Download className="w-4 h-4" /> {t("exp.excelButton")}</>}
          </button>
        </GlassCard>
        <GlassCard hover={false}>
          <div className="flex items-center gap-3 mb-3">
            <img src={pdfIconUrl} alt="PDF" className="w-11 h-11 object-contain shrink-0" />
            <div>
              <h3 className="font-semibold text-strong-c">{t("exp.pdfTitle")}</h3>
              <p className="text-xs text-muted-c">.pdf · {t("exp.pdfSub")}</p>
            </div>
          </div>
          <p className="text-xs text-muted-c mb-4">{t("exp.pdfDesc")}</p>
          <button className={btnP + " w-full flex items-center justify-center gap-2"} onClick={exportPDF} disabled={busyType !== null}>
            {busyType === "pdf" ? <>{t("exp.preparing")}</> : <><Download className="w-4 h-4" /> {t("exp.pdfButton")}</>}
          </button>
        </GlassCard>
        <GlassCard hover={false}>
          <div className="flex items-center gap-3 mb-3">
            <img src={printerIconUrl} alt="Принтер" className="w-11 h-11 object-contain shrink-0" />
            <div>
              <h3 className="font-semibold text-strong-c">{t("exp.printTitle")}</h3>
              <p className="text-xs text-muted-c">{t("exp.a4color")}</p>
            </div>
          </div>
          <p className="text-xs text-muted-c mb-4">{t("exp.printDesc")}</p>
          <button className={btnG + " w-full flex items-center justify-center gap-2"} onClick={printAll}>
            <Printer className="w-4 h-4" /> {t("exp.openPrint")}
          </button>
        </GlassCard>
      </div>

      {/* ── QR сапа сертификаты ── */}
      <GlassCard hover={false}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center border-2 border-accent" style={{ background: "rgba(74,144,217,0.08)" }}>
            <Award className="w-5 h-5 accent-c" />
          </div>
          <div>
            <h3 className="font-semibold text-strong-c">{t("cert.title")}</h3>
            <p className="text-xs text-muted-c">{t("cert.subtitle")}</p>
          </div>
        </div>
        <p className="text-xs text-muted-c mb-4">{t("cert.desc")}</p>

        {!qrImg ? (
          <button className={btnP + " w-full flex items-center justify-center gap-2"} onClick={makeCert}>
            <QrCode className="w-4 h-4" /> {t("cert.generate")}
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* QR сурет */}
            <div className="bg-white p-3 rounded-xl shrink-0" style={{ border: "1px solid var(--border)" }}>
              <img src={qrImg} alt="QR сертификат" style={{ width: 160, height: 160, display: "block" }} />
            </div>
            {/* Әрекеттер */}
            <div className="flex-1 w-full space-y-2.5">
              <p className="text-sm text-strong-c font-medium">{t("cert.ready")}</p>
              <p className="text-xs text-muted-c leading-relaxed">{t("cert.scanHint")}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a href={certLink} target="_blank" rel="noopener noreferrer" className={btnP + " flex items-center gap-2 text-sm"}>
                  <ExternalLink className="w-4 h-4" /> {t("cert.open")}
                </a>
                <a href={qrImg} download="raspis-certificate-qr.png" className={btnG + " flex items-center gap-2 text-sm"}>
                  <Download className="w-4 h-4" /> {t("cert.downloadQr")}
                </a>
              </div>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
