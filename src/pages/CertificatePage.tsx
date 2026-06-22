// filepath: src/pages/CertificatePage.tsx
// Сапа сертификаты — QR арқылы ашылатын ресми құжат.
// Times New Roman, Қазақстандық/халықаралық ресми құжат стилі.
// Логинсіз ашылады (қорғаныссыз маршрут).

import { useSearchParams } from "react-router-dom";
import { useMemo, useRef } from "react";
import { decodeCert, type CertData } from "@/lib/certificate";

export default function CertificatePage() {
  const [params] = useSearchParams();
  const docRef = useRef<HTMLDivElement>(null);
  const data = useMemo<CertData | null>(() => {
    const d = params.get("d");
    return d ? decodeCert(d) : null;
  }, [params]);

  // Дерек жоқ/бұзылған жағдай
  if (!data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#e8e6e1", fontFamily: "'Times New Roman', Times, serif", padding: 24 }}>
        <div style={{ background: "#fff", padding: "48px 40px", maxWidth: 480, textAlign: "center", border: "1px solid #c9c4ba", boxShadow: "0 2px 20px rgba(0,0,0,0.08)" }}>
          <p style={{ fontSize: 18, color: "#1a2230", marginBottom: 12, fontWeight: 700 }}>Сертификат табылмады</p>
          <p style={{ fontSize: 14, color: "#5a5650", lineHeight: 1.6 }}>QR-кодтағы дерек толық емес немесе бұзылған. Сертификатты қайта жасап көріңіз.</p>
        </div>
      </div>
    );
  }

  const date = new Date(data.date);
  const dateStr = `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
  const testsPct = Math.round((data.testsPass / Math.max(1, data.testsTotal)) * 100);

  // Сапа деңгейінің сөзбен бағасы
  const grade =
    data.quality >= 85 ? { kk: "Үздік", color: "#1b6b3a" } :
    data.quality >= 70 ? { kk: "Жоғары", color: "#1b5b6b" } :
    data.quality >= 55 ? { kk: "Қанағаттанарлық", color: "#8a6d1b" } :
    { kk: "Орташа", color: "#8a4a1b" };

  // PDF жүктеу (браузердің басып шығаруы арқылы — PDF сақтау)
  const downloadPdf = () => window.print();

  return (
    <div style={{ minHeight: "100vh", background: "#e8e6e1", padding: "32px 16px", fontFamily: "'Times New Roman', Times, serif" }}>
      {/* Басып шығару стилі */}
      <style>{`
        @media print {
          body { background: #fff !important; }
          .cert-actions { display: none !important; }
          .cert-page { box-shadow: none !important; margin: 0 !important; border: none !important; }
          @page { size: A4; margin: 12mm; }
        }
        .cert-page { font-feature-settings: "liga" 1; }
      `}</style>

      {/* Әрекет батырмалары (басып шығарғанда жасырылады) */}
      <div className="cert-actions" style={{ maxWidth: 794, margin: "0 auto 20px", display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button onClick={downloadPdf} style={{ fontFamily: "'Times New Roman', serif", fontSize: 15, padding: "10px 22px", background: "#1a2230", color: "#fff", border: "none", cursor: "pointer", letterSpacing: "0.3px" }}>
          PDF жүктеу / Басып шығару
        </button>
      </div>

      {/* A4 парақ (794px ≈ 210mm @96dpi) */}
      <div
        ref={docRef}
        className="cert-page"
        style={{
          maxWidth: 794, margin: "0 auto", background: "#fffdf8",
          padding: "0", boxShadow: "0 4px 30px rgba(0,0,0,0.12)", position: "relative",
        }}
      >
        {/* Қос рамка — ресми құжат стилі */}
        <div style={{ border: "2px solid #1a2230", margin: 10, padding: 0 }}>
          <div style={{ border: "0.5px solid #9a7d3a", margin: 4, padding: "44px 52px 36px" }}>

            {/* ── Жоғарғы реквизит ── */}
            <div style={{ textAlign: "center", borderBottom: "0.5px solid #c9c4ba", paddingBottom: 18, marginBottom: 24 }}>
              <div style={{ fontSize: 10.5, letterSpacing: "2.5px", color: "#5a5650", textTransform: "uppercase", marginBottom: 6 }}>
                Автоматтандырылған мектеп кестесі жүйесі
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#1a2230", letterSpacing: "4px", fontFamily: "'Times New Roman', serif" }}>
                Р А С П И С
              </div>
              <div style={{ fontSize: 9.5, letterSpacing: "1.5px", color: "#9a7d3a", marginTop: 4 }}>
                RASPIS · SCHEDULE QUALITY ASSURANCE SYSTEM
              </div>
            </div>

            {/* ── Тақырып ── */}
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1a2230", margin: "0 0 4px", letterSpacing: "1px" }}>
                САПА СЕРТИФИКАТЫ
              </h1>
              <div style={{ fontSize: 12, color: "#7a766e", letterSpacing: "1px", fontStyle: "italic" }}>
                Certificate of Schedule Quality
              </div>
            </div>

            {/* ── Декоративті бөлгіш ── */}
            <div style={{ textAlign: "center", margin: "16px 0 22px", color: "#9a7d3a", fontSize: 14, letterSpacing: "8px" }}>
              ❧ ⸻⸻ ❧
            </div>

            {/* ── Кіріспе мәтін ── */}
            <p style={{ fontSize: 13.5, color: "#3a3630", textAlign: "center", lineHeight: 1.7, margin: "0 0 6px" }}>
              Осы сертификат төмендегі білім беру мекемесінің
            </p>
            <p style={{ fontSize: 18, color: "#1a2230", textAlign: "center", fontWeight: 700, margin: "0 0 6px", borderBottom: "0.5px solid #1a2230", display: "inline-block", width: "100%", paddingBottom: 8 }}>
              {data.school}
            </p>
            <p style={{ fontSize: 13.5, color: "#3a3630", textAlign: "center", lineHeight: 1.7, margin: "10px 0 26px" }}>
              сабақ кестесі автоматтандырылған жүйемен құрылып,<br />
              сапа стандарттарына сәйкестігі тексерілгенін куәландырады.
            </p>

            {/* ── Жалпы сапа баллы — басты көрсеткіш ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 28, margin: "0 0 28px", padding: "20px 0", background: "linear-gradient(180deg, rgba(154,125,58,0.05), transparent)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 64, fontWeight: 700, color: "#1a2230", lineHeight: 1 }}>{data.quality}</div>
                <div style={{ fontSize: 11, color: "#7a766e", letterSpacing: "2px", marginTop: 2 }}>100 ҰПАЙДАН</div>
              </div>
              <div style={{ width: "0.5px", height: 64, background: "#c9c4ba" }} />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 11, color: "#7a766e", letterSpacing: "1.5px", marginBottom: 4 }}>САПА ДЕҢГЕЙІ</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: grade.color }}>{grade.kk}</div>
              </div>
            </div>

            {/* ── Көрсеткіштер кестесі ── */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 24 }}>
              <tbody>
                {[
                  ["Сыныптар саны", `${data.classes}`, "Мұғалімдер саны", `${data.teachers}`],
                  ["Кабинеттер саны", `${data.rooms}`, "Жалпы сабақ саны", `${data.lessons}`],
                  ["Сынып сапасы (орташа)", `${data.avgClass}%`, "Апталық теңгерім", `${data.balance}%`],
                  ["Мұғалім жайлылығы", `${data.comfort}%`, "Мұғалім терезелері", `${data.windows}`],
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: "0.5px solid #e0dcd3" }}>
                    <td style={{ padding: "10px 12px 10px 0", color: "#5a5650" }}>{row[0]}</td>
                    <td style={{ padding: "10px 24px 10px 0", color: "#1a2230", fontWeight: 700, textAlign: "right" }}>{row[1]}</td>
                    <td style={{ padding: "10px 12px 10px 24px", color: "#5a5650", borderLeft: "0.5px solid #e0dcd3" }}>{row[2]}</td>
                    <td style={{ padding: "10px 0", color: "#1a2230", fontWeight: 700, textAlign: "right" }}>{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── Сапа кепілдіктері (тексеру нәтижелері) ── */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 28 }}>
              {[
                ["Конфликтер", data.conflicts === 0 ? "ЖОҚ ✓" : `${data.conflicts}`, data.conflicts === 0],
                ["Бос терезелер", data.gaps === 0 ? "ЖОҚ ✓" : `${data.gaps}`, data.gaps === 0],
                ["Стресс-тест", `${data.testsPass}/${data.testsTotal}`, testsPct >= 90],
                ["СанПиН", testsPct >= 80 ? "СӘЙКЕС ✓" : "ТЕКСЕР", testsPct >= 80],
              ].map(([label, val, ok], i) => (
                <div key={i} style={{ flex: 1, textAlign: "center", padding: "12px 6px", border: "0.5px solid #c9c4ba", background: ok ? "rgba(27,107,58,0.04)" : "rgba(138,74,27,0.04)" }}>
                  <div style={{ fontSize: 10, color: "#7a766e", letterSpacing: "1px", marginBottom: 5 }}>{label as string}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: (ok ? "#1b6b3a" : "#8a4a1b") }}>{val as string}</div>
                </div>
              ))}
            </div>

            {/* ── Төменгі реквизит: нөмір, күн, мөр ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "0.5px solid #c9c4ba", paddingTop: 18 }}>
              <div style={{ fontSize: 11.5, color: "#5a5650", lineHeight: 1.8 }}>
                <div>Сертификат №: <span style={{ color: "#1a2230", fontWeight: 700, letterSpacing: "0.5px" }}>{data.id}</span></div>
                <div>Берілген күні: <span style={{ color: "#1a2230", fontWeight: 700 }}>{dateStr}</span></div>
                <div style={{ fontSize: 10, color: "#9a948a", marginTop: 4, fontStyle: "italic" }}>Бұл құжат РАСПИС жүйесімен автоматты түрде жасалды</div>
              </div>

              {/* Мөр стилі — дөңгелек */}
              <div style={{ position: "relative", width: 92, height: 92, flexShrink: 0 }}>
                <div style={{ position: "absolute", inset: 0, border: "1.5px solid #1a2230", borderRadius: "50%" }} />
                <div style={{ position: "absolute", inset: 6, border: "0.5px solid #9a7d3a", borderRadius: "50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                  <div style={{ fontSize: 8, letterSpacing: "0.5px", color: "#1a2230", lineHeight: 1.2 }}>РАСПИС</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: grade.color, margin: "1px 0" }}>{data.quality}</div>
                  <div style={{ fontSize: 6.5, letterSpacing: "0.5px", color: "#7a766e" }}>QUALITY</div>
                  <div style={{ fontSize: 6.5, letterSpacing: "0.5px", color: "#7a766e" }}>VERIFIED</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Төменгі сілтеме */}
      <div className="cert-actions" style={{ textAlign: "center", marginTop: 18, fontSize: 11, color: "#9a948a", fontFamily: "'Times New Roman', serif" }}>
        Растау үшін QR-кодты қайта сканерлеңіз · raspis
      </div>
    </div>
  );
}
