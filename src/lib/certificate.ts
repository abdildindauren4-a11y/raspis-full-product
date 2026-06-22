// filepath: src/lib/certificate.ts
// Сапа сертификаты үшін деректі QR-ға салу/оқу утилитасы.
// Деректі қысып, URL-ге base64 түрінде саламыз (бұлт керек емес).

import type { AlgoResult } from "@/algorithm/engine";

// Сертификатқа қажетті деректер (QR-ға сыятындай ықшам)
export interface CertData {
  school: string;      // мектеп аты
  quality: number;     // сапа баллы (0-100)
  classes: number;     // сынып саны
  teachers: number;    // мұғалім саны
  rooms: number;       // кабинет саны
  lessons: number;     // жалпы сабақ саны
  gaps: number;        // тесік саны
  conflicts: number;   // конфликт саны
  testsPass: number;   // өткен тесттер
  testsTotal: number;  // барлық тест
  avgClass: number;    // орташа сынып сапасы
  balance: number;     // апта балансы
  comfort: number;     // мұғалім жайлылығы
  windows: number;     // мұғалім терезелері
  date: string;        // құру күні (ISO)
  id: string;          // бірегей сертификат нөмірі
}

// Мұғалім терезелерін санау
function countWindows(r: AlgoResult): number {
  let w = 0;
  const td: Record<string, number[]> = {};
  for (const o of r.slots) {
    if (o.groupId || (o as any).dpart) continue;
    const k = `${o.teacherId}|${o.shift}|${o.day}`;
    (td[k] = td[k] || []).push(o.slot);
  }
  for (const k in td) {
    const sl = td[k].sort((a, b) => a - b);
    for (let i = 1; i < sl.length; i++) w += sl[i] - sl[i - 1] - 1;
  }
  return w;
}

// Конфликт санау
function countConflicts(r: AlgoResult): number {
  let c = 0;
  const ts: Record<string, boolean> = {}, cs: Record<string, boolean> = {};
  for (const o of r.slots) {
    if (o.groupId === "Г2") continue;
    const tk = `${o.teacherId}|${o.shift}|${o.day}|${o.slot}`;
    const ck = `${o.classId}|${o.day}|${o.slot}`;
    if (ts[tk]) c++; ts[tk] = true;
    if (cs[ck]) c++; cs[ck] = true;
  }
  return c;
}

// Бірегей сертификат нөмірі (күн + кездейсоқ)
function makeId(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `RP-${ymd}-${rnd}`;
}

// Нәтижеден сертификат деректерін құру
export function buildCertData(
  r: AlgoResult,
  schoolName: string,
  counts: { classes: number; teachers: number; rooms: number }
): CertData {
  return {
    school: schoolName || "Мектеп",
    quality: r.quality,
    classes: counts.classes,
    teachers: counts.teachers,
    rooms: counts.rooms,
    lessons: r.stats.total,
    gaps: r.gaps.length,
    conflicts: countConflicts(r),
    testsPass: r.tests.filter((t) => t.passed).length,
    testsTotal: r.tests.length,
    avgClass: r.stats.avgClass,
    balance: r.stats.balance,
    comfort: r.stats.comfort,
    windows: countWindows(r),
    date: new Date().toISOString(),
    id: makeId(),
  };
}

// Деректі base64-ке кодтау (URL-ге салу үшін, Юникодпен дұрыс)
export function encodeCert(data: CertData): string {
  const json = JSON.stringify(data);
  // Юникод (қазақ әріптері) base64-ке дұрыс кодталуы үшін
  const utf8 = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, h) =>
    String.fromCharCode(parseInt(h, 16))
  );
  return btoa(utf8);
}

// base64-тен деректі оқу
export function decodeCert(encoded: string): CertData | null {
  try {
    const utf8 = atob(encoded);
    const json = decodeURIComponent(
      Array.from(utf8).map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
    );
    return JSON.parse(json) as CertData;
  } catch {
    return null;
  }
}

// Толық сертификат URL-ін құру
export function certUrl(data: CertData, baseUrl?: string): string {
  const base = baseUrl || window.location.origin;
  return `${base}/certificate?d=${encodeCert(data)}`;
}
