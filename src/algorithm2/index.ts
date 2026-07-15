// filepath: src/algorithm2/index.ts
// Engine v2 «Хамелеон» — generate2(input, config): v1-мен бірдей нәтиже пішімі.
// M1: ядро (уақыт моделі + ережелер реестрі + seed) ✅
// M2: v1 ережелерінің толық köшірмесі + repair + softFill (жалғасуда)

import type { AlgoInput, AlgoResult, ProgressFn, StressTest, GapInfo, Settings, Unplaced, Subject, Klass } from "../algorithm/engine";
import { maxSlots, dayLimitS, fatThrS, pScore, buildTimeline, HOMEROOM_SUBJECT_ID, calibrateSubjects } from "../algorithm/engine";
import { buildTime } from "./time";
import { ScheduleState } from "./model";
import type { PlacedUnit } from "./model";
import type { RuleContext, EngineV2Config } from "./rules/types";
import { compileRules } from "./rules/registry";
import { runSeed, buildTasks } from "./solver/seed";
import { repairDeficit, repairGaps, softFill } from "./solver/repair";
import { improveSchedule } from "./solver/improve";
import { lockBaseSlots, anchorOldPlacements } from "./solver/partial";

export type { EngineV2Config, RuleConfigMap, Rule, ParamSchema } from "./rules/types";
export { ALL_RULES } from "./rules/registry";
export { explainPlacement } from "./explain";
export type { Violation } from "./explain";

// v1 fatigueAt-пен бірдей шаршау есебі: слот коэффициенті өскен сайын
// ауырлық көбейеді, үзілістер (әсіресе үлкені) шаршауды азайтады
const SLOT_K = [0, 1.0, 1.0, 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9];

// mulberry32 — детерминистік жеңіл RNG (multi-seed іздеу үшін)
function mulberry32(a: number): () => number {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const missOf = (r: AlgoResult) => r.unplaced.reduce((a, u) => a + (u.need - u.placed), 0);
const betterThan = (a: AlgoResult, b: AlgoResult) => {
  const ma = missOf(a), mb = missOf(b);
  if (ma !== mb) return ma < mb;
  if (a.gaps.length !== b.gaps.length) return a.gaps.length < b.gaps.length;
  return a.quality > b.quality;
};

// Search-фаза (multi-seed): АРЗАН барлау → ҚЫМБАТ жақсарту стратегиясы.
// Алдымен детерминистік жеңіл әрекет (improve-сіз). Мінсіз болса — соған
// бір рет improve қосамыз. Болмаса — тағы бірнеше жеңіл тұқымды сынап,
// ЕҢ ЖАҚСЫ тұқымды таңдап, оған ҒАНА improve жүргіземіз (improve — ең
// қымбат фаза, сондықтан бір-ақ рет орындалады).
export function generate2(input: AlgoInput, config?: EngineV2Config, onProgress?: ProgressFn): AlgoResult {
  // СанПиН режимі: ресми баллдар (1-11) ішкі калибрленген шкалаға келтіріледі
  // (v1-мен бірдей, бір-ақ рет — runOnce қайталауларына дейін)
  input = { ...input, subjects: calibrateSubjects(input.subjects, input.settings) };
  const t0 = Date.now();
  const MAX_LIGHT = 4;
  const rngOf = (a: number) => (a === 0 ? () => 0 : mulberry32(((input.seed || 1) * 31 + a) | 0));

  // Уақыт бюджеті: барлау (multi-seed) бір мезгілде бір толық жүгіруден
  // аспауы үшін. Артық шектелген (тыйым көп) мектепте сыймаған сабақтар
  // бәрібір сыймайды — 4 рет қайталау босқа уақыт. Бюджет асса, барлауды
  // тоқтатып, қолда бары мен бір толық жүгіруге көшеміз.
  const EXPLORE_BUDGET_MS = 450;

  const totalNeed = input.classes.reduce((a, c) => a + c.curriculum.reduce((x, cu) => x + cu.hours, 0), 0);
  const overLimit = Math.max(8, totalNeed * 0.03);

  // 1) Жеңіл барлау — детерминистік тұқымнан бастап
  let bestLight = runOnce(input, config, rngOf(0), false, onProgress);
  let bestA = 0;
  let used = 1;
  let noGain = 0;
  // Бірінші әрекеттің өзі артық шектелген болса (тыйым тым көп) — қайта
  // тұқымдау сыймаған сабақтарды сыйғыза алмайды. Барлауды мүлдем бастамай,
  // бірден қайтарамыз (завуч тыйымды азайтуы керек, жауап тез келсін).
  const firstOver = missOf(bestLight) > overLimit;
  if (!firstOver && (missOf(bestLight) > 0 || bestLight.gaps.length > 0)) {
    for (let a = 1; a < MAX_LIGHT && noGain < 2; a++) {
      if (Date.now() - t0 > EXPLORE_BUDGET_MS) break; // бюджет бітті — тоқта
      used++;
      const res = runOnce(input, config, rngOf(a), false);
      if (betterThan(res, bestLight)) { bestLight = res; bestA = a; noGain = 0; }
      else noGain++;
      if (missOf(bestLight) === 0 && bestLight.gaps.length === 0) break;
    }
  }

  // Артық шектелген (сыймаған сабақ көп) — improve бәрібір өтпейді,
  // қосымша толық жүгіру тек босқа қайта seed жасайды. Жеңіл нәтижені
  // бірден қайтарамыз (завуч тыйымды азайтуы керек, жауап тез келсін).
  const bestOverConstrained = missOf(bestLight) > overLimit;

  let winner = bestLight;
  if (!bestOverConstrained) {
    // 2) Ең жақсы тұқымға ТОЛЫҚ (improve) жүргізу — бір-ақ рет
    const best = runOnce(input, config, rngOf(bestA), true);
    used++;
    // improve сирек жағдайда тесік ашса — жеңіл нұсқа жеңе алады
    winner = betterThan(bestLight, best) ? bestLight : best;
  }

  winner.stats.timeMs = Date.now() - t0;
  winner.stats.iters = used;
  onProgress?.(100, 9);
  return winner;
}

function runOnce(input: AlgoInput, config: EngineV2Config | undefined, rng: () => number, full: boolean, onProgress?: ProgressFn): AlgoResult {
  const t0 = Date.now();
  const time = buildTime(config?.time);
  const state = new ScheduleState(time);
  const settings: Settings = input.settings;

  // Пәннің «ең кеш сабақ» шегі — алдын ала есептеледі (ыстық жолда
  // toLowerCase болмауы үшін), v1-мен бірдей автотану
  const LATE: Record<string, number | undefined> = {};
  for (const s of input.subjects) {
    if (s.maxSlot) { LATE[s.id] = s.maxSlot; continue; }
    const n = s.name.toLowerCase();
    LATE[s.id] = n.includes("математика") || n.includes("алгебра") || n.includes("геометрия") ? 4 : undefined;
  }
  const effOf = (cls: Klass, s: Subject) =>
    s.elective ? 0 : cls.grade <= 4 && s.primaryScore != null ? s.primaryScore : s.score;

  const ctx: RuleContext = {
    input, time, state, settings,
    subjectsById: new Map(input.subjects.map((s) => [s.id, s])),
    teachersById: new Map(input.teachers.map((t) => [t.id, t])),
    roomsById: new Map(input.rooms.map((r) => [r.id, r])),
    classesById: new Map(input.classes.map((c) => [c.id, c])),
    maxLessonsOf: (g) => maxSlots(g, settings),
    dayLimitOf: (g) => dayLimitS(g, settings),
    fatigueThrOf: (g) => fatThrS(g, settings),
    effOf,
    pScoreOf: (s, slot) => pScore(s, slot, settings),
    lateLimitOf: (s) => LATE[s.id],
    fatigueAt: (cid, day, target) => {
      let f = 0;
      const arr = state.lessonListOn(cid, day).filter((x) => x.slot < target).sort((a, b) => a.slot - b.slot);
      for (const x of arr)
        f = Math.max(0, f + x.score * (SLOT_K[x.slot] ?? 1.9) - (x.slot === input.school.longBreakAfter ? 4.0 : 1.5));
      return f;
    },
    timeline: buildTimeline(input.school),
    rng,
  };

  const rules = compileRules(config?.rules);
  const warnings: string[] = [];

  /* ── ішінара режим: құлыптау + якорь ── */
  lockBaseSlots(ctx);
  const tasks = buildTasks(ctx);
  const units: PlacedUnit[] = [];
  anchorOldPlacements(ctx, rules, tasks, units);

  /* ── seed ── */
  const seedRes = runSeed(ctx, rules, tasks, (pct) => onProgress?.(Math.round(pct * 55), 1));
  units.push(...seedRes.units);

  /* ── repair: дефицит (кедергіні жылжыту, бірнеше өтім) ── */
  onProgress?.(60, 5);
  let missing = seedRes.missing;
  for (let i = 0; i < 3 && missing.length; i++) {
    const before = missing.length;
    missing = repairDeficit(ctx, rules, missing, units);
    if (missing.length === before) break;
  }

  /* ── softFill: жұмсақ режим (тек сұралса) ── */
  if (input.softFill && missing.length) {
    missing = softFill(ctx, rules, missing, units, config?.rules, warnings);
  }

  /* ── repair: тесіктерді жабу (improve алдында — тығыз бастау) ── */
  onProgress?.(65, 7);
  repairGaps(ctx, rules, units);

  /* ── improve: глобал жылжыту + maximin (әділдік) — тек толық режимде ──
     Артық шектелген (тыйым тым көп) кестеде сабақтар сыймай тұр — слоттарды
     дәлдеудің мәні жоқ, сапаны сыймаған сабақтар анықтайды. Мұндайда improve
     өткіземіз: завуч тыйымды азайтуы керек, ал жауап ЖЫЛДАМ келуі маңызды. */
  const missNow = missing.reduce((a, m) => a + (m.isDouble ? 2 : 1), 0);
  const totalNeededQuick = input.classes.reduce((a, c) => a + c.curriculum.reduce((x, cu) => x + cu.hours, 0), 0);
  const overConstrained = missNow > Math.max(8, totalNeededQuick * 0.03);
  onProgress?.(70, 6);
  if (full && !overConstrained) {
    improveSchedule(ctx, rules, units);
    // improve кейбір жерде тесік қалдыруы мүмкін — соңғы тазалау
    repairGaps(ctx, rules, units);
  }

  /* ── қорытынды есептер — v1 (ЭТАП 9) формулаларымен бірдей ── */
  onProgress?.(90, 9);
  const gaps = collectGaps(ctx);
  const unplaced = collectUnplaced(missing);
  const tests = selfCheck(ctx);

  // Сынып ұпайы: слот сапасының орташасы (60%) + күндік балл біркелкілігі (40%)
  const classScores: Record<string, number> = {};
  for (const c of input.classes) {
    const own = state.slots.filter((o) => o.classId === c.id && (!o.groupId || o.dpart === 1));
    if (!own.length) { classScores[c.name] = 0; continue; }
    const avg = own.reduce((a, o) => a + o.score, 0) / own.length;
    const dsc: number[] = [];
    for (let d = 1; d <= time.days; d++) dsc.push(state.scoreOn(c.id, d));
    const m = dsc.reduce((a, b) => a + b, 0) / time.days;
    const v = dsc.reduce((a, b) => a + (b - m) * (b - m), 0) / time.days;
    classScores[c.name] = Math.round(avg * 10 * 0.6 + Math.max(0, 100 - v * 2) * 0.4);
  }
  const vals = Object.values(classScores).filter((v) => v > 0);
  const avgC = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const minC = vals.length ? Math.min(...vals) : 0;
  const balance = avgC ? (minC / avgC) * 100 : 100;

  // Мұғалім жайлылығы: терезелер үлесі
  let wins = 0, span = 0;
  for (const t of input.teachers) for (const sh of [1, 2] as const) for (let d = 1; d <= time.days; d++) {
    const ss: number[] = [];
    for (let sl = 1; sl <= time.slots; sl++) if (state.teacherAt(t.id, sh, d, sl)) ss.push(sl);
    if (ss.length < 2) continue;
    const mn = ss[0], mx = ss[ss.length - 1];
    wins += mx - mn + 1 - ss.length; span += mx - mn + 1;
  }
  const comfort = span ? Math.max(0, 100 - (wins / span) * 100) : 100;
  const stressPct = (tests.filter((t) => t.passed).length / tests.length) * 100;
  const missCount = unplaced.reduce((a, u) => a + (u.need - u.placed), 0);
  const quality = Math.max(0, Math.round(avgC * 0.35 + balance * 0.25 + comfort * 0.2 + stressPct * 0.2) - Math.min(25, missCount));
  const totalNeed = input.classes.reduce((a, c) => a + c.curriculum.reduce((x, cu) => x + cu.hours, 0), 0);
  warnings.push(...unplaced.map((u) => `${u.className} — ${u.subject}: ${u.placed}/${u.need} орналасты (${u.reason})`));

  /* СЫНЫП САҒАТЫ: барлық есеп аяқталған соң қосылады (v1-мен бірдей) —
     нағыз пән емес, әр сыныптың сол күнгі соңғы сабағынан кейінгі слот */
  if (settings.homeroom?.enabled) {
    const hd = settings.homeroom.day;
    for (const c of input.classes) {
      let last = 0;
      for (let sl = 1; sl <= time.slots; sl++) if (state.classAt(c.id, hd, sl)) last = sl;
      if (!last || last >= maxSlots(c.grade, settings)) continue;
      state.slots.push({
        key: `hr-${c.id}-${hd}`, classId: c.id, subjectId: HOMEROOM_SUBJECT_ID,
        teacherId: "", roomId: c.homeRoomId || "", day: hd, slot: last + 1,
        shift: c.shift, score: 0,
      });
    }
  }

  onProgress?.(100, 9);
  return {
    success: true,
    slots: state.slots,
    quality,
    classScores,
    tests,
    unplaced,
    warnings,
    gaps,
    stats: {
      timeMs: Date.now() - t0, iters: 0, total: totalNeed,
      comfort: Math.round(comfort), balance: Math.round(balance), avgClass: Math.round(avgC),
    },
  };
}

function collectGaps(ctx: RuleContext): GapInfo[] {
  const gaps: GapInfo[] = [];
  // Ішінара режимде тек қайта құрылған сыныптардың тесігі есептеледі
  // (құлыпталғандардікі өзгертілмейді — есепке алу шешім бермейді)
  const targets = ctx.input.partial ? new Set(ctx.input.partial.classIds) : null;
  for (const c of ctx.input.classes) {
    if (targets && !targets.has(c.id)) continue;
    for (let day = 1; day <= ctx.time.days; day++) {
      const used: number[] = [];
      for (let sl = 1; sl <= ctx.time.slots; sl++) if (ctx.state.classAt(c.id, day, sl)) used.push(sl);
      if (used.length < 2) continue;
      for (let sl = used[0] + 1; sl < used[used.length - 1]; sl++) {
        if (!ctx.state.classAt(c.id, day, sl))
          gaps.push({ className: c.name, day, slot: sl, reason: "сабақ арасындағы бос слот" });
      }
    }
  }
  return gaps;
}

// Орналаспағандарды v1 пішіміне жинақтау (сынып+пән бойынша топтап)
function collectUnplaced(missing: { task: { cls: Klass; s: Subject; cu: { hours: number } }; isDouble: boolean; lastReason: string }[]): Unplaced[] {
  const byKey = new Map<string, Unplaced & { miss: number }>();
  for (const m of missing) {
    const k = `${m.task.cls.id}|${m.task.s.id}`;
    const cur = byKey.get(k) || {
      className: m.task.cls.name, subject: m.task.s.name,
      placed: 0, need: m.task.cu.hours, reason: m.lastReason, miss: 0,
    };
    cur.miss += m.isDouble ? 2 : 1;
    cur.reason = m.lastReason;
    byKey.set(k, cur);
  }
  return [...byKey.values()].map(({ miss, ...u }) => ({ ...u, placed: u.need - miss }));
}

// Дайын кестені тәуелсіз қайта тексеру: конфликтілер мен негізгі ережелер
// шынымен бұзылмағанын дәлелдейді (алгоритмге сенбей, нәтижені тексереді).
function selfCheck(ctx: RuleContext): StressTest[] {
  const { state, input } = ctx;
  let tConf = 0, cConf = 0, rConf = 0, dupDay = 0, unav = 0;
  const tSeen = new Map<string, string>();
  const cSeen = new Map<string, string>();
  const rSeen = new Map<string, string[]>(); // кабинет-ұяшық → сыныптар (спортзал бөлісуі мүмкін)
  const sdCount = new Map<string, number[]>(); // classId|subjId|day → slots
  for (const o of state.slots) {
    const cell = `${o.shift}|${o.day}-${o.slot}`; // ауысымдар уақыты бөлек
    const tk = `${o.teacherId}|${cell}`;
    if (tSeen.has(tk) && tSeen.get(tk) !== o.classId) tConf++;
    tSeen.set(tk, o.classId);
    const ck = `${o.classId}|${o.day}-${o.slot}`;
    // Топқа бөлінген сабақтың бөліктері бір ұяшықта заңды (groupId бар)
    if (cSeen.has(ck) && !o.groupId) cConf++;
    cSeen.set(ck, o.groupId || "");
    if (o.roomId) {
      const rk = `${o.roomId}|${cell}`;
      const list = rSeen.get(rk) || [];
      if (!list.includes(o.classId)) list.push(o.classId);
      rSeen.set(rk, list);
    }
    const sk = `${o.classId}|${o.subjectId}|${o.day}`;
    const arr = sdCount.get(sk) || [];
    if (!o.groupId || o.dpart === 1) arr.push(o.slot);
    sdCount.set(sk, arr);
    const t = ctx.teachersById.get(o.teacherId);
    if (t && t.unavailable.includes(`${o.day}-${o.slot}`)) unav++;
  }
  for (const [rk, list] of rSeen) {
    const roomId = rk.split("|")[0];
    const r = input.rooms.find((x) => x.id === roomId);
    const cap = r?.type === "gym" ? r.gymMax || 1 : 1;
    if (list.length > cap) rConf++;
  }
  for (const [, arr] of sdCount) {
    if (arr.length <= 1) continue;
    arr.sort((a, b) => a - b);
    // 1-ден көп болса тек қатар тұрған қос сабақ (2 слот) болуы мүмкін
    if (arr.length > 2 || arr[1] - arr[0] !== 1) dupDay++;
  }
  const mk = (name: string, bad: number, details: string): StressTest =>
    ({ name, passed: bad === 0, details: bad === 0 ? "бұзушылық жоқ" : `${bad} ${details}` });
  return [
    mk("Мұғалім конфликті", tConf, "қақтығыс табылды"),
    mk("Сынып конфликті", cConf, "қақтығыс табылды"),
    mk("Кабинет конфликті", rConf, "қақтығыс табылды"),
    mk("Бір күн — бір пән", dupDay, "бұзушылық"),
    mk("Мұғалім бос емес уақыты", unav, "бұзушылық"),
  ];
}
