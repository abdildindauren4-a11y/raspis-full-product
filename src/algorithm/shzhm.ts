// filepath: src/algorithm/shzhm.ts
// ШЖМ (шағын жинақты мектеп) ҚОЗҒАЛТҚЫШЫ — v3.
// Қарапайым қозғалтқыштан айырмасы: сынып емес, КЛАСС-КОМПЛЕКТ (2 сынып, бір
// мұғалім, бір кабинет, бір мезгілде) — кестенің бірлігі. Бір слотта комплекттегі
// әр сыныпқа бір пәннен қойылады: біреуімен мұғалім тікелей жұмыс істейді,
// екіншісі өзіндік жұмыс орындайды («жұптау ережесі»). Аралас мектеп:
// комплектіге кірмеген сыныптар жеке (қарапайымдай) жоспарланады.
// Дереккөз/дизайн: docs/SHZHM-RESEARCH-AND-DESIGN.md.
import type {
  AlgoInput, AlgoResult, Slot, Subject, Klass, Komplekt, StressTest,
  Unplaced, GapInfo, ProgressFn, Settings,
} from "./engine";
import { maxSlots, dayLimitS, calibrateSubjects } from "./engine";

const DAYS = 5;

// Пәннің «ең кеш сабақ» шегі (ауыр нақты пәндер алғашқы 4-те) — v1-мен бірдей автотану
function lateLimitOf(s: Subject): number | undefined {
  if (s.maxSlot) return s.maxSlot;
  const n = s.name.toLowerCase();
  return n.includes("математика") || n.includes("алгебра") || n.includes("геометрия") ? 4 : undefined;
}
// Өзіндік жұмысқа қолайлы (жұптау ережесінде «күтетін» сынып осыны істейді).
// ЗАВУЧ БЕЛГІЛЕСЕ — сол басым (selfStudy true/false); белгіленбесе —
// баллдан/атаудан автоматты анықтаймыз.
function selfStudyFriendly(s: Subject): boolean {
  if (s.selfStudy != null) return s.selfStudy;
  if (s.score <= 3) return true;
  return /сурет|бейнелеу|еңбек|технолог|дене|музык|черчен|изо|физкультур|труд|оқу\b|чтени/.test(s.name.toLowerCase());
}
// Мұғалім тікелей керек пе (ауыр пән): завуч өзіндік жұмыс деп белгілегенді —
// жеңіл санаймыз; әйтпесе баллдан.
const isHard = (s: Subject) => (s.selfStudy === true ? false : s.score >= 6);

interface Unit { subjectId: string; score: number; hard: boolean; soft: boolean; late?: number; ideal: number[]; }

// Сыныптың оқу жоспарын сабақ-бірліктерге жаю (әр сағат — бір бірлік)
function expand(cls: Klass, S: Map<string, Subject>): Unit[] {
  const out: Unit[] = [];
  for (const cu of cls.curriculum || []) {
    const s = S.get(cu.subjectId);
    if (!s || !cu.hours) continue;
    const eff = cls.grade <= 4 && s.primaryScore != null ? s.primaryScore : s.score;
    for (let i = 0; i < cu.hours; i++)
      out.push({ subjectId: s.id, score: eff, hard: isHard(s), soft: selfStudyFriendly(s), late: lateLimitOf(s), ideal: s.ideal });
  }
  // Ауырларын алдымен (ерте слотқа), сосын жеңілдерін
  return out.sort((a, b) => b.score - a.score);
}

export function generateShzhm(input: AlgoInput, onProgress?: ProgressFn): AlgoResult {
  const t0 = Date.now();
  const { school, classes, teachers, rooms, settings } = input;
  const komplekts = input.komplekts || [];
  const subjects = calibrateSubjects(input.subjects, settings); // СанПиН режимі ескеріледі
  const S = new Map(subjects.map((s) => [s.id, s]));
  const C = new Map(classes.map((c) => [c.id, c]));
  const R = new Map(rooms.map((r) => [r.id, r]));
  const prog = (p: number, st: number) => onProgress?.(p, st);

  // Жаһандық бос-еместік (мұғалім/кабинет/сынып бір мезгілде екі жерде болмайды)
  const tBusy = new Set<string>(), rBusy = new Set<string>(), cBusy = new Set<string>();
  const bt = (id: string, d: number, p: number) => `${id}|${d}|${p}`;
  const busyT = (id: string, d: number, p: number) => tBusy.has(bt(id, d, p));
  const busyR = (id: string, d: number, p: number) => rBusy.has(bt(id, d, p));

  const slots: Slot[] = [];
  const unplaced: Unplaced[] = [];
  const warnings: string[] = [];
  let hardPairCount = 0; // жұптау ережесінің бұзылуы (екі сынып та ауыр пән)
  let hardPairTotal = 0;

  const nm = (id: string) => C.get(id)?.name || "?";
  const skey = () => Math.random().toString(36).slice(2, 10);

  const place = (cls: Klass, u: Unit, d: number, p: number, tid: string, rid: string) => {
    slots.push({
      key: skey(), classId: cls.id, subjectId: u.subjectId, teacherId: tid, roomId: rid,
      day: d, slot: p, shift: cls.shift, score: u.score,
    });
    cBusy.add(bt(cls.id, d, p));
  };

  // Сынып C үшін (d,p)-ге лайық бірлік таңдау (жоқ болса — null)
  const dayHas = (placed: Record<number, Set<string>>, d: number, subjId: string) => placed[d]?.has(subjId);
  const pickUnit = (
    rem: Unit[], grade: number, d: number, p: number,
    dayCount: Record<number, number>, dayScore: Record<number, number>, placed: Record<number, Set<string>>,
    preferSoft: boolean, relax: boolean,
  ): number => {
    // қайтарады: rem ішіндегі индекс (немесе -1)
    const cap = maxSlots(grade, settings);
    if (p > cap) return -1;                     // сыныптың күндік шегінен асты
    if ((dayCount[d] || 0) >= cap) return -1;
    const limit = dayLimitS(grade, settings);
    let best = -1, bestRank = -Infinity;
    for (let i = 0; i < rem.length; i++) {
      const u = rem[i];
      if (!relax && dayHas(placed, d, u.subjectId)) continue;          // бір күн — бір пән
      if (u.late && p > u.late) continue;                             // ауыр пән кеш емес
      if ((dayScore[d] || 0) + u.score > limit) continue;             // күндік балл лимиті
      // Рейтинг: ерте слотқа ауыр (score жоғары), жұптау керек болса жеңіл басым,
      // ideal слотқа жақындық бонусы
      let rank = u.score;
      if (preferSoft) rank = u.soft ? 100 + (10 - u.score) : -u.score; // жеңілін бірінші
      const idealBonus = u.ideal?.includes(p) ? 2 : 0;
      rank += idealBonus;
      if (rank > bestRank) { bestRank = rank; best = i; }
    }
    return best;
  };

  // ═══ 1) КОМПЛЕКТІЛЕР ═══
  prog(10, 1);
  const komplektClassIds = new Set(komplekts.flatMap((k) => k.classIds));
  for (const K of komplekts) {
    const ids = K.classIds.filter((id) => C.has(id));
    if (ids.length < 2) { warnings.push(`«${K.name}»: комплектіде 2 сынып болуы керек`); continue; }
    const A = C.get(ids[0])!, B = C.get(ids[1])!;
    const T = K.teacherId, Rm = K.roomId;
    if (!T) { warnings.push(`«${K.name}»: мұғалім тағайындалмаған`); continue; }
    if (!Rm) { warnings.push(`«${K.name}»: кабинет тағайындалмаған`); continue; }
    const cap = Math.max(maxSlots(A.grade, settings), maxSlots(B.grade, settings));
    const remA = expand(A, S), remB = expand(B, S);
    const dcA: Record<number, number> = {}, dsA: Record<number, number> = {}, plA: Record<number, Set<string>> = {};
    const dcB: Record<number, number> = {}, dsB: Record<number, number> = {}, plB: Record<number, Set<string>> = {};
    const ensure = (o: Record<number, Set<string>>, d: number) => (o[d] || (o[d] = new Set()));

    // Баған-бойынша (period сыртта, day ішінде) — күндерге теңдеп, тығыз толтырады
    for (let pass = 0; pass < 2; pass++) {          // 2-ші өту — қалғанын релакспен
      const relax = pass === 1;
      for (let p = 1; p <= cap; p++) {
        for (let d = 1; d <= DAYS; d++) {
          if (busyT(T, d, p) || busyR(Rm, d, p)) continue;   // ортақ ресурс бос емес
          // A үшін таңда
          let ia = pickUnit(remA, A.grade, d, p, dcA, dsA, plA, false, relax);
          const ua = ia >= 0 ? remA[ia] : null;
          // B үшін — A ауыр болса, жеңілін басым (жұптау ережесі)
          const ib = pickUnit(remB, B.grade, d, p, dcB, dsB, plB, !!(ua && ua.hard), relax);
          const ub = ib >= 0 ? remB[ib] : null;
          if (!ua && !ub) continue;
          if (ua) {
            place(A, ua, d, p, T, Rm);
            dcA[d] = (dcA[d] || 0) + 1; dsA[d] = (dsA[d] || 0) + ua.score; ensure(plA, d).add(ua.subjectId);
            remA.splice(ia, 1);
          }
          if (ub) {
            place(B, ub, d, p, T, Rm);
            dcB[d] = (dcB[d] || 0) + 1; dsB[d] = (dsB[d] || 0) + ub.score; ensure(plB, d).add(ub.subjectId);
            remB.splice(ib, 1);
          }
          // Жұптау есебі: екеуі де ауыр болса — бұзу
          if (ua && ub) { hardPairTotal++; if (ua.hard && ub.hard) hardPairCount++; }
          tBusy.add(bt(T, d, p)); rBusy.add(bt(Rm, d, p));
        }
      }
    }
    // Сыймай қалғандар
    for (const [cls, rem] of [[A, remA], [B, remB]] as const)
      if (rem.length) {
        const byS = new Map<string, number>();
        for (const u of rem) byS.set(u.subjectId, (byS.get(u.subjectId) || 0) + 1);
        for (const [sid, n] of byS)
          unplaced.push({ className: cls.name, subject: S.get(sid)?.name || sid, placed: 0, need: n, reason: "комплект слоты жетпеді" });
      }
  }

  // ═══ 2) ЖЕКЕ СЫНЫПТАР (аралас мектеп) ═══
  prog(60, 2);
  const standalone = classes.filter((c) => !komplektClassIds.has(c.id));
  const firstRegular = rooms.find((r) => r.type === "regular");
  // Пәннің кабинетін табу (арнайы болса — сол типтен бос; әйтпесе негізгі/бос
  // қарапайым). Табылмаса null (мыс. спортзал жоқ) — сол бірлік осы слотта
  // орналаспайды, БІРАҚ басқа бірлікті сынауды бөгемейді.
  const resolveRoom = (cls: Klass, roomType: string | undefined, d: number, p: number): string | null => {
    if (roomType) { const rr = rooms.find((r) => r.type === roomType && !busyR(r.id, d, p)); return rr ? rr.id : null; }
    const home = cls.homeRoomId;
    if (home && R.has(home) && !busyR(home, d, p)) return home;
    const rr = rooms.find((r) => r.type === "regular" && !busyR(r.id, d, p));
    return rr ? rr.id : (home || firstRegular?.id || "");
  };
  for (const cls of standalone) {
    const cap = maxSlots(cls.grade, settings), limit = dayLimitS(cls.grade, settings);
    type SUnit = Unit & { tid?: string; roomType?: string };
    const units: SUnit[] = [];
    for (const cu of cls.curriculum || []) {
      const s = S.get(cu.subjectId); if (!s || !cu.hours) continue;
      const eff = cls.grade <= 4 && s.primaryScore != null ? s.primaryScore : s.score;
      for (let i = 0; i < cu.hours; i++)
        units.push({ subjectId: s.id, score: eff, hard: isHard(s), soft: selfStudyFriendly(s), late: lateLimitOf(s), ideal: s.ideal, tid: cu.teacherId, roomType: s.room || undefined });
    }
    units.sort((a, b) => b.score - a.score);
    const dc: Record<number, number> = {}, ds: Record<number, number> = {}, pl: Record<number, Set<string>> = {};
    for (let pass = 0; pass < 2; pass++) {
      const relax = pass === 1;
      for (let p = 1; p <= cap; p++) for (let d = 1; d <= DAYS; d++) {
        if (cBusy.has(bt(cls.id, d, p))) continue;
        if ((dc[d] || 0) >= cap) continue;
        // Осы слотқа лайық бірлікті РЕТІМЕН сынаймыз (біреуі ресурсқа сыймаса —
        // келесісін), сонда «кабинетсіз» пән слотты бөгемейді.
        const cands = units.map((u, i) => ({ u, i })).filter(({ u }) =>
          (relax || !dayHas(pl, d, u.subjectId)) &&
          !(u.late && p > u.late) &&
          (ds[d] || 0) + u.score <= limit,
        ).sort((a, b) => (b.u.score + (b.u.ideal?.includes(p) ? 2 : 0)) - (a.u.score + (a.u.ideal?.includes(p) ? 2 : 0)));
        for (const { u, i } of cands) {
          const tid = u.tid;
          if (tid && busyT(tid, d, p)) continue;         // мұғалім бос емес
          const rid = resolveRoom(cls, u.roomType, d, p);
          if (rid === null) continue;                    // кабинет жоқ — келесі бірлік
          place(cls, u, d, p, tid || "", rid);
          dc[d] = (dc[d] || 0) + 1; ds[d] = (ds[d] || 0) + u.score; (pl[d] || (pl[d] = new Set())).add(u.subjectId);
          if (tid) tBusy.add(bt(tid, d, p)); if (rid) rBusy.add(bt(rid, d, p));
          units.splice(i, 1);
          break;
        }
      }
    }
    if (units.length) {
      const byS = new Map<string, number>();
      for (const u of units) byS.set(u.subjectId, (byS.get(u.subjectId) || 0) + 1);
      for (const [sid, n] of byS) unplaced.push({ className: cls.name, subject: S.get(sid)?.name || sid, placed: 0, need: n, reason: "жеке сынып: слот/кабинет жетпеді" });
    }
  }

  // ═══ 3) САПА ЕСЕБІ ═══
  prog(90, 3);
  const tests: StressTest[] = [];
  const add = (name: string, passed: boolean, details = "") => tests.push({ name, passed, details });

  // Комплект-ІШІ мұғалім/кабинет ортақтығы — ЗАҢДЫ (ШЖМ). Тек комплектіден ТЫС
  // конфликт (әр түрлі комплект/жеке сыныпта бір мұғалім/кабинет қатар) — қате.
  const komplektOfClass = new Map<string, string>();
  for (const K of komplekts) for (const id of K.classIds) komplektOfClass.set(id, K.id);
  const sameUnit = (a: Slot, b: Slot) => {
    const ka = komplektOfClass.get(a.classId), kb = komplektOfClass.get(b.classId);
    return ka && kb && ka === kb; // бір комплект — ортақ ресурс заңды
  };
  let tConf = 0, rConf = 0;
  const byTime = new Map<string, Slot[]>();
  for (const s of slots) { const k = `${s.day}|${s.slot}`; (byTime.get(k) || byTime.set(k, []).get(k)!).push(s); }
  for (const arr of byTime.values()) {
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
      const a = arr[i], b = arr[j];
      if (a.teacherId && a.teacherId === b.teacherId && !sameUnit(a, b)) tConf++;
      if (a.roomId && a.roomId === b.roomId && !sameUnit(a, b)) rConf++;
    }
  }
  add("Мұғалім конфликті жоқ (комплект-аралық)", tConf === 0, tConf ? `${tConf} конфликт` : "");
  add("Кабинет конфликті жоқ (комплект-аралық)", rConf === 0, rConf ? `${rConf} конфликт` : "");
  add("Оқу жоспары орындалды", unplaced.length === 0, unplaced.length ? `${unplaced.length} пән сыймады` : "");
  // Жұптау ережесі (ШЖМ): комплект слотында екі сынып та ауыр пән — азайту керек
  // Жұптау — жұмсақ көрсеткіш: комплект слотында ЕКІ сынып та ауыр пән (мұғалім
  // екеуіне қатар керек) азайтылуы тиіс. Академиялық жүктеме ауыр болғанда
  // (математика/тіл ерте болуы міндетті) ~20% қалыпты — әдістеме «азайту» дейді.
  const pairRate = hardPairTotal ? hardPairCount / hardPairTotal : 0;
  add("Жұптау ережесі (біреуі өзіндік жұмыс)", pairRate <= 0.25, hardPairCount ? `${hardPairCount}/${hardPairTotal} слот екі жағы да ауыр` : "");
  // Күндік балл лимиті (СанПиН) — әр сынып бойынша
  let dayOver = 0;
  {
    const per = new Map<string, number>(); // classId|day → score
    for (const s of slots) { const k = `${s.classId}|${s.day}`; per.set(k, (per.get(k) || 0) + s.score); }
    for (const [k, sc] of per) { const cid = k.split("|")[0]; const g = C.get(cid)?.grade || 1; if (sc > dayLimitS(g, settings)) dayOver++; }
  }
  add("Күндік балл лимиттері (СанПиН)", dayOver === 0, dayOver ? `${dayOver} күн лимиттен асты` : "");

  // ═══ 4) САПА БАЛЛЫ ═══
  const totalNeed = classes.reduce((a, c) => a + (c.curriculum || []).reduce((x, cu) => x + cu.hours, 0), 0);
  const placedCount = slots.length;
  const coverage = totalNeed ? placedCount / totalNeed : 1;
  const passedTests = tests.filter((t) => t.passed).length;
  const testRate = tests.length ? passedTests / tests.length : 1;
  const pairScore = 1 - pairRate;
  const quality = Math.round(Math.max(0, Math.min(100, coverage * 60 + testRate * 25 + pairScore * 15)));

  const classScores: Record<string, number> = {};
  for (const c of classes) {
    const need = (c.curriculum || []).reduce((x, cu) => x + cu.hours, 0);
    const got = slots.filter((s) => s.classId === c.id).length;
    classScores[c.name] = need ? Math.round((got / need) * 100) : 100;
  }

  // Тесіктер (комплект/сынып күнінде бос слот) — ақпараттық
  const gaps: GapInfo[] = [];

  // Орналаспағандар — ЕСКЕРТУ (v1-дегідей), қатаң қате емес: кесте бар болса
  // көрсетеміз. success=false тек кесте мүлдем құрылмаса не конфликт болса.
  for (const u of unplaced)
    warnings.push(`${u.className} — ${u.subject}: ${u.need} сағат орналаспады (${u.reason})`);

  prog(100, 4);
  return {
    success: slots.length > 0 && tConf === 0 && rConf === 0,
    slots, quality, classScores, tests, unplaced, warnings, gaps,
    stats: {
      timeMs: Date.now() - t0, iters: 1, total: placedCount,
      comfort: Math.round(pairScore * 100), balance: Math.round(testRate * 100),
      avgClass: Math.round((Object.values(classScores).reduce((a, b) => a + b, 0) / (classes.length || 1))),
    },
  };
}
