// filepath: src/pages/ExportPage.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { ExcelIcon, PrintIcon } from "@/components/shared/BrandIcons";
import { Download, Printer, FileSpreadsheet, Sparkles } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { btnP, btnG } from "@/components/shared/Form";
import { useData, useActiveVersion } from "@/store/dataStore";
import { useLang } from "@/contexts/LangContext";
import { buildTimeline, maxSlots } from "@/algorithm/engine";
import { exportProfessionalExcel } from "@/lib/excelExport";

const DAYS = ["", "Дүйсенбі", "Сейсенбі", "Сәрсенбі", "Бейсенбі", "Жұма"];

export default function ExportPage() {
  const { classes, teachers, rooms, subjects, school } = useData();
  const active = useActiveVersion();
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const tl = buildTimeline(school);

  const tName = (id: string) => teachers.find((t) => t.id === id)?.name || "";
  const rName = (id: string) => rooms.find((r) => r.id === id)?.number || "";

  const exportExcel = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await exportProfessionalExcel({
        school, classes, teachers, rooms, subjects, result: active.result,
      });
    } catch (e) {
      console.error("Excel export қатесі:", e);
    } finally {
      setBusy(false);
    }
  };

  const printAll = () => {
    if (!active) return;
    const w = window.open("", "_blank");
    if (!w) return;
    let html = `<html><head><meta charset="utf-8"><title>РАСПИС</title><style>
      body{font-family:Arial,sans-serif;font-size:11px;margin:16px}
      h2{margin:14px 0 6px;page-break-before:always} h2:first-of-type{page-break-before:auto}
      table{border-collapse:collapse;width:100%} td,th{border:1px solid #999;padding:4px;text-align:center}
      th{background:#eef} .r{background:#fde8e8}.y{background:#fdf6dc}.g{background:#e3f6e8}
    </style></head><body><h1>${school.name} — апталық кесте</h1>`;
    for (const c of classes) {
      html += `<h2>${c.name} сыныбы (${c.shift}-ауысым)</h2><table><tr><th>№</th><th>Уақыт</th>${DAYS.slice(1).map((d) => `<th>${d}</th>`).join("")}</tr>`;
      for (let slot = 1; slot <= maxSlots(c.grade); slot++) {
        html += `<tr><td>${slot}</td><td>${tl[c.shift][slot].start}–${tl[c.shift][slot].end}</td>`;
        for (let day = 1; day <= 5; day++) {
          const o = active.result.slots.find((x) => x.classId === c.id && x.day === day && x.slot === slot && (!x.groupId || x.groupId === "Г1"));
          if (!o) { html += "<td>—</td>"; continue; }
          const s = subjects.find((x) => x.id === o.subjectId)!;
          const cl = s.score >= 9 ? "r" : s.score >= 6 ? "y" : "g";
          html += `<td class="${cl}"><b>${s.name}${o.dpart ? " ×2" : ""}</b><br>${tName(o.teacherId)}<br>${rName(o.roomId)}</td>`;
        }
        html += "</tr>";
      }
      html += "</table>";
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
        <Link to="/generate" className="accent-c text-sm inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Генерация →</Link>
      </div>
    );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center">
          <FileSpreadsheet className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("exp.title")}</h1>
          <p className="text-muted-c">{active.name} · {classes.length} сынып · сапа {active.result.quality}/100</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        <GlassCard hover={false}>
          <div className="flex items-center gap-3 mb-3">
            <ExcelIcon size={44} />
            <div>
              <h3 className="font-semibold text-strong-c">Excel кестесі</h3>
              <p className="text-xs text-muted-c">.xlsx · Microsoft Excel</p>
            </div>
          </div>
          <p className="text-xs text-muted-c mb-4">{t("exp.excelDesc")}</p>
          <button className={btnP + " w-full flex items-center justify-center gap-2"} onClick={exportExcel} disabled={busy}>
            {busy ? <>{t("exp.preparing")}</> : <><Download className="w-4 h-4" /> {t("exp.excelButton")}</>}
          </button>
        </GlassCard>
        <GlassCard hover={false}>
          <div className="flex items-center gap-3 mb-3">
            <PrintIcon size={44} />
            <div>
              <h3 className="font-semibold text-strong-c">{t("exp.printTitle")}</h3>
              <p className="text-xs text-muted-c">A4 · түрлі-түсті</p>
            </div>
          </div>
          <p className="text-xs text-muted-c mb-4">{t("exp.printDesc")}</p>
          <button className={btnG + " w-full flex items-center justify-center gap-2"} onClick={printAll}>
            <Printer className="w-4 h-4" /> Ашу және басып шығару
          </button>
        </GlassCard>
      </div>
    </div>
  );
}
