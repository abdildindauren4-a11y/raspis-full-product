// filepath: src/algorithm2/index.ts
// Engine v2 «Хамелеон» — generate2(input, config): v1-мен бірдей нәтиже пішімі.
// M1: ядро — уақыт моделі + ережелер реестрі + seed-фаза.
// (repair/improve/search және толық v1-паритет — M2.)

import type { AlgoInput, AlgoResult, ProgressFn, StressTest, GapInfo, Settings } from "../algorithm/engine";
import { maxSlots, pScore } from "../algorithm/engine";
import { buildTime } from "./time";
import { ScheduleState } from "./model";
import type { RuleContext, EngineV2Config } from "./rules/types";
import { compileRules } from "./rules/registry";
import { runSeed } from "./solver/seed";

export type { EngineV2Config, RuleConfigMap, Rule, ParamSchema } from "./rules/types";
export { ALL_RULES } from "./rules/registry";
export { explainPlacement } from "./explain";
export type { Violation } from "./explain";

export function generate2(input: AlgoInput, config?: EngineV2Config, onProgress?: ProgressFn): AlgoResult {
  const t0 = Date.now();
  const time = buildTime(config?.time);
  const state = new ScheduleState(time);
  const settings: Settings = input.settings;

  const ctx: RuleContext = {
    input, time, state, settings,
    subjectsById: new Map(input.subjects.map((s) => [s.id, s])),
    teachersById: new Map(input.teachers.map((t) => [t.id, t])),
    roomsById: new Map(input.rooms.map((r) => [r.id, r])),
    classesById: new Map(input.classes.map((c) => [c.id, c])),
    maxLessonsOf: (g) => maxSlots(g, settings),
  };

  const rules = compileRules(config?.rules);
  const seedRes = runSeed(ctx, rules, (pct) => onProgress?.(Math.round(pct * 80), 1));

  /* ── тесіктер (сынып кестесіндегі бос ұяшық) ── */
  const gaps: GapInfo[] = [];
  for (const c of input.classes) {
    for (let day = 1; day <= time.days; day++) {
      const used: number[] = [];
      for (let sl = 1; sl <= time.slots; sl++) if (state.classAt(c.id, day, sl)) used.push(sl);
      if (used.length < 2) continue;
      for (let sl = used[0] + 1; sl < used[used.length - 1]; sl++) {
        if (!state.classAt(c.id, day, sl))
          gaps.push({ className: c.name, day, slot: sl, reason: "сабақ арасындағы бос слот" });
      }
    }
  }

  /* ── сынып ұпайлары (v1 үлгісімен: слот сапасының орташасы, тесік айыппұлымен) ── */
  const classScores: Record<string, number> = {};
  for (const c of input.classes) {
    const own = state.slots.filter((o) => o.classId === c.id);
    if (!own.length) { classScores[c.id] = 0; continue; }
    const avg = own.reduce((a, o) => a + pScore(ctx.subjectsById.get(o.subjectId)!, o.slot, settings), 0) / own.length;
    const gp = gaps.filter((g) => g.className === c.name).length * 5;
    classScores[c.id] = Math.max(0, Math.round(avg * 10 - gp));
  }
  const scoreVals = Object.values(classScores);
  const avgClass = scoreVals.length ? Math.round(scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length) : 0;

  /* ── өзіндік тексеріс (stress-тесттер) ── */
  const tests: StressTest[] = selfCheck(ctx);

  const totalNeed = input.classes.reduce((a, c) => a + c.curriculum.reduce((x, cu) => x + cu.hours, 0), 0);
  const missing = seedRes.unplaced.reduce((a, u) => a + (u.need - u.placed), 0);
  const quality = Math.max(0, Math.round(avgClass - missing * 2 - gaps.length));

  onProgress?.(100, 9);
  return {
    success: true,
    slots: state.slots,
    quality,
    classScores,
    tests,
    unplaced: seedRes.unplaced,
    warnings: [],
    gaps,
    stats: {
      timeMs: Date.now() - t0, iters: 0, total: totalNeed,
      comfort: 0, balance: 0, avgClass,
    },
  };
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
    const cell = `${o.day}-${o.slot}`;
    const tk = `${o.teacherId}|${cell}`;
    if (tSeen.has(tk) && tSeen.get(tk) !== o.classId) tConf++;
    tSeen.set(tk, o.classId);
    const ck = `${o.classId}|${cell}`;
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
    if (!o.groupId) arr.push(o.slot);
    sdCount.set(sk, arr);
    const t = ctx.teachersById.get(o.teacherId);
    if (t && t.unavailable.includes(cell)) unav++;
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
