// filepath: src/pages/CertificatePage.tsx
// Сапа сертификаты — QR арқылы ашылатын ресми құжат.
// Кәсіби: нақты логотип (letterhead), мөр, ресми реквизиттер. Бір A4 бетке сыяды.

import { useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { decodeCert, type CertData } from "@/lib/certificate";
import logoUrl from "@/assets/logo.png";

export default function CertificatePage() {
  const [params] = useSearchParams();
  const data = useMemo<CertData | null>(() => {
    const d = params.get("d");
    return d ? decodeCert(d) : null;
  }, [params]);

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#e8e6e1", fontFamily: "'Times New Roman', Times, serif", padding: 24 }}>
        <div style={{ background: "#fff", padding: "48px 40px", maxWidth: 480, textAlign: "center", border: "1px solid #c9c4ba" }}>
          <p style={{ fontSize: 18, color: "#1a2230", marginBottom: 12, fontWeight: 700 }}>Сертификат табылмады</p>
          <p style={{ fontSize: 14, color: "#5a5650", lineHeight: 1.6 }}>QR-кодтағы дерек толық емес немесе бұзылған. Сертификатты қайта жасап көріңіз.</p>
        </div>
      </div>
    );
  }

  const date = new Date(data.date);
  const months = ["қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым", "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"];
  const dateStr = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} ж.`;
  const testsPct = Math.round((data.testsPass / Math.max(1, data.testsTotal)) * 100);

  const grade =
    data.quality >= 85 ? { kk: "ҮЗДІК", color: "#1b6b3a" } :
    data.quality >= 70 ? { kk: "ЖОҒАРЫ", color: "#1b5b6b" } :
    data.quality >= 55 ? { kk: "ЖАҚСЫ", color: "#8a6d1b" } :
    { kk: "ОРТАША", color: "#8a4a1b" };

  const downloadPdf = () => window.print();
  const sc: React.CSSProperties = { letterSpacing: "0.18em", textTransform: "uppercase" };

  const rows: [string, string, string, string][] = [
    ["Сыныптар саны", `${data.classes}`, "Жалпы сабақ саны", `${data.lessons}`],
    ["Мұғалімдер саны", `${data.teachers}`, "Сынып сапасы (орташа)", `${data.avgClass}%`],
    ["Кабинеттер саны", `${data.rooms}`, "Апталық теңгерім", `${data.balance}%`],
    ["Мұғалім жайлылығы", `${data.comfort}%`, "Мұғалім терезелері", `${data.windows}`],
  ];
  const checks: [string, string, boolean][] = [
    ["Конфликтер", data.conflicts === 0 ? "ЖОҚ" : `${data.conflicts}`, data.conflicts === 0],
    ["Бос терезелер", data.gaps === 0 ? "ЖОҚ" : `${data.gaps}`, data.gaps === 0],
    ["Стресс-тест", `${data.testsPass}/${data.testsTotal}`, testsPct >= 90],
    ["СанПиН", testsPct >= 80 ? "СӘЙКЕС" : "ТЕКСЕР", testsPct >= 80],
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#e8e6e1", padding: "28px 16px", fontFamily: "'Times New Roman', Times, serif" }}>
      <style>{`
        @media print {
          html, body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .cert-actions { display: none !important; }
          .cert-sheet {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
            min-height: auto !important;
            height: auto !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page { size: A4; margin: 0; }
        }
        .cert-sheet { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>

      <div className="cert-actions" style={{ maxWidth: "210mm", margin: "0 auto 18px", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={downloadPdf} style={{ fontFamily: "'Times New Roman', serif", fontSize: 15, padding: "10px 24px", background: "#1e3a5f", color: "#fff", border: "none", cursor: "pointer", letterSpacing: "0.3px" }}>
          PDF жүктеу / Басып шығару
        </button>
      </div>

      <div className="cert-sheet" style={{ width: "210mm", minHeight: "296mm", margin: "0 auto", background: "#ffffff", position: "relative", boxShadow: "0 4px 30px rgba(0,0,0,0.15)", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg, rgba(30,58,95,0.015) 0, rgba(30,58,95,0.015) 1px, transparent 1px, transparent 10px), repeating-linear-gradient(-45deg, rgba(30,58,95,0.015) 0, rgba(30,58,95,0.015) 1px, transparent 1px, transparent 10px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: "8mm", border: "2.5px solid #1e3a5f" }} />
        <div style={{ position: "absolute", inset: "10mm", border: "0.75px solid #9a7d3a" }} />

        <div style={{ position: "absolute", top: "12mm", left: "15mm", right: "15mm", bottom: "12mm", display: "flex", flexDirection: "column" }}>

          {/* Шапка: логотип + ұйым + реквизит */}
          <table style={{ width: "100%", borderBottom: "1.5px solid #1e3a5f", paddingBottom: "4mm", marginBottom: "1mm" }}>
            <tbody><tr>
              <td style={{ width: "26mm", verticalAlign: "middle" }}>
                <img src={logoUrl} alt="РАСПИС" style={{ width: "24mm", height: "24mm", display: "block" }} />
              </td>
              <td style={{ verticalAlign: "middle", paddingLeft: "4mm" }}>
                <div style={{ ...sc, fontSize: "7pt", color: "#9a7d3a", letterSpacing: "0.25em", marginBottom: "1mm" }}>School Scheduling System</div>
                <div style={{ fontSize: "19pt", fontWeight: 700, color: "#1e3a5f", letterSpacing: "0.08em", lineHeight: 1 }}>Р А С П И С</div>
                <div style={{ fontSize: "7pt", color: "#5a5650", letterSpacing: "0.1em", marginTop: "1.5mm" }}>Автоматтандырылған мектеп кестесі жүйесі</div>
              </td>
              <td style={{ verticalAlign: "top", textAlign: "right", width: "44mm", paddingTop: "1mm" }}>
                <div style={{ fontSize: "6.5pt", color: "#7a766e", lineHeight: 1.6 }}>
                  <div style={{ ...sc, letterSpacing: "0.15em" }}>Тіркеу нөмірі</div>
                  <div style={{ fontSize: "9.5pt", fontWeight: 700, color: "#1a1a1a", letterSpacing: "0.08em", fontFamily: "'Courier New', monospace", marginBottom: "1.5mm" }}>{data.id}</div>
                  <div style={{ ...sc, letterSpacing: "0.15em" }}>Берілген күні</div>
                  <div style={{ fontSize: "9pt", fontWeight: 700, color: "#1a1a1a" }}>{dateStr}</div>
                </div>
              </td>
            </tr></tbody>
          </table>

          {/* Тақырып */}
          <div style={{ textAlign: "center", marginTop: "6mm", marginBottom: "2mm" }}>
            <div style={{ ...sc, fontSize: "8.5pt", color: "#9a7d3a", letterSpacing: "0.35em", marginBottom: "2mm" }}>Ресми құжат · Official Document</div>
            <h1 style={{ fontSize: "27pt", fontWeight: 700, color: "#1e3a5f", letterSpacing: "0.05em", lineHeight: 1, margin: 0 }}>САПА СЕРТИФИКАТЫ</h1>
            <div style={{ fontSize: "9.5pt", color: "#7a766e", fontStyle: "italic", letterSpacing: "0.06em", marginTop: "1.5mm" }}>Certificate of Schedule Quality Compliance</div>
          </div>

          {/* Бөлгіш */}
          <div style={{ textAlign: "center", margin: "4mm 0 5mm" }}>
            <span style={{ display: "inline-block", width: "35mm", height: "1px", background: "linear-gradient(90deg, transparent, #9a7d3a)", verticalAlign: "middle" }} />
            <span style={{ color: "#9a7d3a", fontSize: "11pt", margin: "0 4mm", verticalAlign: "middle" }}>❖</span>
            <span style={{ display: "inline-block", width: "35mm", height: "1px", background: "linear-gradient(90deg, #9a7d3a, transparent)", verticalAlign: "middle" }} />
          </div>

          {/* Негізгі мәтін */}
          <div style={{ textAlign: "center", fontSize: "11pt", lineHeight: 1.75, color: "#2a2a2a", marginBottom: "5mm" }}>
            Осы сертификат
            <div style={{ fontSize: "16pt", fontWeight: 700, color: "#1e3a5f", margin: "2.5mm 0", letterSpacing: "0.02em" }}>«{data.school}»</div>
            білім беру мекемесінің оқу кестесі РАСПИС автоматтандырылған жүйесімен<br />
            жасалып, төмендегі сапа стандарттарына сәйкестігін куәландырады.
          </div>

          {/* Балл + вердикт */}
          <table style={{ width: "100%", marginBottom: "5mm" }}>
            <tbody><tr>
              <td style={{ width: "50%", textAlign: "center", borderRight: "1px solid #d8d0bc", padding: "1mm 0" }}>
                <div style={{ fontSize: "50pt", fontWeight: 700, color: "#1e3a5f", lineHeight: 0.85, fontFamily: "Georgia, serif" }}>{data.quality}<span style={{ fontSize: "17pt", color: "#9a9488" }}>/100</span></div>
                <div style={{ ...sc, fontSize: "7pt", color: "#7a766e", letterSpacing: "0.15em", marginTop: "1.5mm" }}>Жиынтық сапа көрсеткіші</div>
              </td>
              <td style={{ width: "50%", textAlign: "center", padding: "1mm 0" }}>
                <div style={{ fontSize: "24pt", fontWeight: 700, color: grade.color, lineHeight: 1, fontFamily: "Georgia, serif" }}>{grade.kk}</div>
                <div style={{ ...sc, fontSize: "7pt", color: "#7a766e", letterSpacing: "0.15em", marginTop: "2mm" }}>Сәйкестік деңгейі</div>
                <div style={{ display: "inline-block", marginTop: "2mm", padding: "1mm 4mm", border: `1px solid ${grade.color}`, fontSize: "7pt", color: grade.color, letterSpacing: "0.12em" }}>СТАНДАРТҚА СӘЙКЕС</div>
              </td>
            </tr></tbody>
          </table>

          {/* Параметрлер */}
          <div style={{ ...sc, fontSize: "8pt", color: "#9a7d3a", letterSpacing: "0.22em", borderBottom: "0.75px solid #c9c0a8", paddingBottom: "1.5mm", marginBottom: "2.5mm" }}>I · Кесте параметрлері</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5pt", marginBottom: "5mm" }}>
            <tbody>
              {rows.map((row, i) => {
                const last = i === rows.length - 1;
                const bb = last ? "none" : "0.5px solid #ece7da";
                return (
                  <tr key={i}>
                    <td style={{ padding: "2mm 2mm 2mm 0", color: "#5a5650", borderBottom: bb }}>{row[0]}</td>
                    <td style={{ padding: "2mm 5mm 2mm 0", textAlign: "right", fontWeight: 700, color: "#1a1a1a", borderBottom: bb }}>{row[1]}</td>
                    <td style={{ padding: "2mm 2mm 2mm 7mm", color: "#5a5650", borderLeft: "0.5px solid #ece7da", borderBottom: bb }}>{row[2]}</td>
                    <td style={{ padding: "2mm 0", textAlign: "right", fontWeight: 700, color: "#1a1a1a", borderBottom: bb }}>{row[3]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Тексерістер */}
          <div style={{ ...sc, fontSize: "8pt", color: "#9a7d3a", letterSpacing: "0.22em", borderBottom: "0.75px solid #c9c0a8", paddingBottom: "1.5mm", marginBottom: "2.5mm" }}>II · Сәйкестік тексерістері</div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "auto" }}>
            <tbody><tr>
              {checks.map(([label, val, ok], i) => (
                <td key={i} style={{ width: "25%", textAlign: "center", padding: "2.5mm 1mm", border: "0.5px solid #d8d0bc" }}>
                  <div style={{ ...sc, fontSize: "7pt", color: "#7a766e", letterSpacing: "0.1em", marginBottom: "1.5mm" }}>{label}</div>
                  <div style={{ fontSize: "11.5pt", fontWeight: 700, color: (ok ? "#1b6b3a" : "#8a4a1b") }}>{val}</div>
                </td>
              ))}
            </tr></tbody>
          </table>

          {/* Аяқ: қолтаңба + мөр */}
          <table style={{ width: "100%", marginTop: "6mm" }}>
            <tbody><tr>
              <td style={{ width: "55%", verticalAlign: "bottom" }}>
                <div style={{ borderBottom: "1px solid #1a1a1a", width: "58mm", marginBottom: "1.5mm" }} />
                <div style={{ fontSize: "8pt", color: "#5a5650", lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 700, color: "#1a1a1a", fontSize: "9pt" }}>РАСПИС жүйесі</div>
                  <div>Автоматты сапа бақылау бөлімі</div>
                  <div style={{ fontSize: "7pt", color: "#9a948a", marginTop: "1mm", fontStyle: "italic" }}>Бұл құжат электронды түрде жасалды</div>
                </div>
              </td>
              <td style={{ width: "45%", textAlign: "right", verticalAlign: "bottom" }}>
                <svg width="32mm" height="32mm" viewBox="0 0 200 200" style={{ display: "inline-block" }}>
                  <circle cx="100" cy="100" r="95" fill="none" stroke="#1e3a5f" strokeWidth="3" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#1e3a5f" strokeWidth="1" />
                  <defs>
                    <path id="sT" d="M 100,100 m -87,0 a 87,87 0 0,1 174,0" fill="none" />
                    <path id="sB" d="M 100,100 m -87,0 a 87,87 0 0,0 174,0" fill="none" />
                  </defs>
                  <text fontSize="10.5" fontWeight="bold" fill="#1e3a5f" letterSpacing="2"><textPath href="#sT" startOffset="50%" textAnchor="middle">РАСПИС · САПА ЖҮЙЕСІ</textPath></text>
                  <text fontSize="8.5" fill="#1e3a5f" letterSpacing="1.5"><textPath href="#sB" startOffset="50%" textAnchor="middle">VERIFIED QUALITY 2026</textPath></text>
                  <text x="100" y="46" fontSize="11" fill="#9a7d3a" textAnchor="middle">★ ★ ★</text>
                  <g transform="translate(100,108)">
                    <path d="M -28,-30 L 28,-30 L 28,5 Q 28,28 0,38 Q -28,28 -28,5 Z" fill="none" stroke="#1e3a5f" strokeWidth="2.5" />
                    <path d="M -28,-30 L 28,-30 L 28,5 Q 28,28 0,38 Q -28,28 -28,5 Z" fill="#1e3a5f" opacity="0.06" />
                    <g stroke="#1e3a5f" strokeWidth="1.8" fill="none">
                      <rect x="-17" y="-20" width="34" height="26" rx="1.5" />
                      <line x1="-17" y1="-11" x2="17" y2="-11" />
                      <line x1="-17" y1="-2" x2="17" y2="-2" />
                      <line x1="-5.7" y1="-20" x2="-5.7" y2="6" />
                      <line x1="5.7" y1="-20" x2="5.7" y2="6" />
                    </g>
                    <rect x="-5.7" y="-11" width="11.4" height="9" fill="#9a7d3a" opacity="0.8" />
                    <text x="0" y="30" fontSize="14" fill="#9a7d3a" textAnchor="middle">★</text>
                  </g>
                </svg>
              </td>
            </tr></tbody>
          </table>

          <div style={{ textAlign: "center", marginTop: "3mm", fontSize: "5pt", color: "#b8b2a4", letterSpacing: "0.15em", overflow: "hidden", whiteSpace: "nowrap" }}>
            RASPIS·RASPIS·RASPIS·RASPIS·RASPIS·RASPIS·RASPIS·RASPIS·RASPIS·RASPIS·RASPIS·RASPIS·RASPIS·RASPIS·RASPIS·RASPIS·RASPIS·RASPIS·RASPIS·RASPIS·RASPIS·RASPIS
          </div>

        </div>
      </div>

      <div className="cert-actions" style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "#9a948a", fontFamily: "'Times New Roman', serif" }}>
        Растау үшін QR-кодты қайта сканерлеңіз · raspis
      </div>
    </div>
  );
}
