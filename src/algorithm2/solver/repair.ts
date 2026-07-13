// filepath: src/algorithm2/solver/repair.ts
// Repair-фаза: seed сыйғыза алмағанды жөндеу.
// 1) Дефицит: кедергі сабақты басқа жерге жылжытып, орнына орналаспағанды қою
// 2) Тесік: сынып күніндегі бос ұяшықты сол/басқа күннің сабағымен жабу
// 3) softFill: жұмсақ режим — қалаулы ережелерді шкала бойынша жұмсартып қою

import type { Settings } from "../../algorithm/engine";
import type { RuleContext, RuleConfigMap } from "../rules/types";
import type { CompiledRules } from "../rules/registry";
import { compileRules, firstViolation, softScore } from "../rules/registry";
import type { CandidatePlacement, PlacedUnit } from "../model";
import type { MissingUnit, Task } from "./seed";
import { findBest, commit, buildParts } from "./seed";

const unitTask = (u: PlacedUnit): Task =>
  ({ cls: u.p.cls, cu: u.p.cu, s: u.p.s, pr: 0, singles: 0, doubles: 0 });

// Орналастырылған бірлікті дәл сол күйінде қайтару (сәтсіз әрекеттен кейін)
function restore(ctx: RuleContext, u: PlacedUnit, units: PlacedUnit[]): void {
  const nu = ctx.state.place(u.p, u.made[0]?.score ?? 0, u.eff);
  units.push(nu);
}

function removeUnit(ctx: RuleContext, u: PlacedUnit, units: PlacedUnit[]): void {
  ctx.state.unplace(u);
  const i = units.indexOf(u);
  if (i >= 0) units.splice(i, 1);
}

/* ── 1. ДЕФИЦИТ: кедергіні жылжыту ── */
export function repairDeficit(
  ctx: RuleContext, rules: CompiledRules, missing: MissingUnit[], units: PlacedUnit[],
): MissingUnit[] {
  const still: MissingUnit[] = [];
  for (const m of missing) {
    // Алдымен жай қайта әрекет — бұрынғы жөндеулер орын босатқан болуы мүмкін
    const direct = findBest(ctx, rules, m.task, m.isDouble);
    if (typeof direct !== "string") { commit(ctx, direct, units); continue; }
    if (m.isDouble || m.task.cu.isSplit || !m.task.cu.teacherId) { still.push(m); continue; }
    if (!tryMoveBlocker(ctx, rules, m, units)) still.push(m);
  }
  return still;
}

function tryMoveBlocker(ctx: RuleContext, rules: CompiledRules, m: MissingUnit, units: PlacedUnit[]): boolean {
  const t = m.task;
  const tid = t.cu.teacherId!;
  const shift = t.cls.shift;
  for (let day = 1; day <= ctx.time.days; day++) {
    if (ctx.state.subjCount(t.cls.id, t.s.id, day) > 0) continue;
    for (let slot = 1; slot <= ctx.time.slots; slot++) {
      // Кедергіні анықтау: сыныптың өз сабағы немесе мұғалімнің басқа сабағы
      const clsBusy = ctx.state.classAt(t.cls.id, day, slot);
      const occupantCls = ctx.state.teacherAt(tid, shift, day, slot);
      let blocker: PlacedUnit | undefined;
      if (clsBusy && clsBusy.length) {
        if (occupantCls && occupantCls !== t.cls.id) continue; // қос кедергі — өткіземіз
        blocker = units.find((u) => u.p.cls.id === t.cls.id && u.p.day === day && u.p.slot === slot);
      } else if (occupantCls) {
        blocker = units.find((u) =>
          u.p.day === day && u.p.slot === slot && u.p.cls.id === occupantCls &&
          u.p.parts.some((pt) => pt.teacherId === tid));
      } else continue; // ұяшық бос — findBest бұрын қарап шыққан (басқа себеп)
      if (!blocker || blocker.p.partOfDouble || blocker.p.cu.isSplit) continue;
      removeUnit(ctx, blocker, units);
      // Алдымен МАҚСАТТЫ сабақты босаған ұяшыққа қоямыз (әйтпесе findBest
      // кедергіні дәл сол жерге қайта қоюы мүмкін)
      const parts = buildParts(ctx, t, day, slot);
      if (typeof parts === "string") { restore(ctx, blocker, units); continue; }
      const cand: CandidatePlacement = { cls: t.cls, cu: t.cu, s: t.s, day, slot, shift, parts };
      if (firstViolation(rules, ctx, cand)) { restore(ctx, blocker, units); continue; }
      const sc = softScore(rules, ctx, cand);
      const placedTarget = commit(ctx, { p1: cand, score: sc }, units);
      // Енді кедергіге жаңа орын іздейміз
      const alt = findBest(ctx, rules, unitTask(blocker), false);
      if (typeof alt === "string") {
        for (const pu of placedTarget) removeUnit(ctx, pu, units);
        restore(ctx, blocker, units);
        continue;
      }
      commit(ctx, alt, units);
      return true;
    }
  }
  return false;
}

/* ── 2. ТЕСІК: бос ұяшықты жабу ── */
export function repairGaps(ctx: RuleContext, rules: CompiledRules, units: PlacedUnit[]): number {
  let fixed = 0;
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (const cls of ctx.input.classes) {
      for (let day = 1; day <= ctx.time.days; day++) {
        const used: number[] = [];
        for (let sl = 1; sl <= ctx.time.slots; sl++) if (ctx.state.classAt(cls.id, day, sl)) used.push(sl);
        if (used.length < 2) continue;
        for (let hole = used[0] + 1; hole < used[used.length - 1]; hole++) {
          if (ctx.state.classAt(cls.id, day, hole)) continue;
          if (fillHole(ctx, rules, cls.id, day, hole, units)) { fixed++; changed = true; }
        }
      }
    }
    if (!changed) break;
  }
  return fixed;
}

function fillHole(ctx: RuleContext, rules: CompiledRules, classId: string, day: number, hole: number, units: PlacedUnit[]): boolean {
  // Үміткерлер: сол күннің тесіктен КЕЙІНГІ сабақтары (жоғары тарту),
  // сосын басқа күндердің СОҢҒЫ сабақтары (күн ортасынан алу жаңа тесік
  // ашады — тек күн соңынан аламыз, сол пән тесік күнінде жоқ болса)
  const lastOf = (d: number) => {
    let last = 0;
    for (let sl = 1; sl <= ctx.time.slots; sl++) if (ctx.state.classAt(classId, d, sl)) last = sl;
    return last;
  };
  // Реттілік: сол күн → басқа күннің соңы → басқа күннің ортасы (соңғысы
  // жаңа тесік ашуы мүмкін, оны келесі өтім жабады)
  const rank = (u: PlacedUnit) =>
    u.p.day === day ? 0 : u.p.slot === lastOf(u.p.day) ? 1 : 2;
  const cand = units
    .filter((u) => u.p.cls.id === classId && !u.p.partOfDouble)
    .filter((u) => u.p.day !== day || u.p.slot > hole)
    .sort((a, b) => rank(a) - rank(b));
  for (const u of cand) {
    if (u.p.day !== day && ctx.state.subjCount(classId, u.p.s.id, day) > 0) continue;
    removeUnit(ctx, u, units);
    const t = unitTask(u);
    const parts = buildParts(ctx, t, day, hole);
    if (typeof parts === "string") { restore(ctx, u, units); continue; }
    const p: CandidatePlacement = { cls: u.p.cls, cu: u.p.cu, s: u.p.s, day, slot: hole, shift: u.p.shift, parts };
    if (firstViolation(rules, ctx, p)) { restore(ctx, u, units); continue; }
    // Көшіру жаңа тесік ашпасын: көшкен сабақтың ескі орны күн соңы болуы керек
    // (day-ішілік жылжуда әрқашан солай: hole < ескі слот, ескі слот кейін
    // тексерілетін тесіктерде қайта жабылады)
    const sc = softScore(rules, ctx, p);
    commit(ctx, { p1: p, score: sc }, units);
    return true;
  }
  return false;
}

/* ── 3. SOFTFILL: қалаулы ережелерді жұмсартып толтыру ── */
// v1 семантикасы: физика заңы (конфликттер) ЕШҚАШАН бұзылмайды; лимиттер
// relax шкаласымен кеңейеді; шаршау/қара тізім рұқсат болса өшеді;
// информатика/түзету ережелері жұмсақ режимде тексерілмейді.
export function relaxedRuleConfig(base: RuleConfigMap | undefined, relax: Settings["relax"]): RuleConfigMap {
  const rx = relax || { extraSlots: 2, extraScore: 20, allowFatigue: true, allowBlacklist: true, allowDigital: true };
  return {
    ...base,
    "max-lessons-per-day": { params: { extra: rx.extraSlots } },
    "day-score-limit": { params: { extra: rx.extraScore } },
    "subject-max-slot": { params: { relaxBy: 1 } },
    "fatigue-threshold": { enabled: !rx.allowFatigue },
    "blacklist-pair": { enabled: !rx.allowBlacklist },
    "digital-then-light": { enabled: false },
    "corr-late": { enabled: false },
  };
}

export function softFill(
  ctx: RuleContext, strictRules: CompiledRules, missing: MissingUnit[], units: PlacedUnit[],
  baseCfg: RuleConfigMap | undefined, warnings: string[],
): MissingUnit[] {
  const relaxed = compileRules(relaxedRuleConfig(baseCfg, ctx.settings.relax));
  const still: MissingUnit[] = [];
  for (const m of missing) {
    const best = findBest(ctx, relaxed, m.task, m.isDouble);
    if (typeof best === "string") { still.push(m); continue; }
    // Қатаң конфигте қандай қалаулы ереже бұзылғанын жазып қоямыз
    const v = firstViolation(strictRules, ctx, best.p1);
    commit(ctx, best, units);
    warnings.push(
      `${m.task.cls.name}: «${m.task.s.name}» жеңілдетумен қойылды${v ? ` (${v})` : ""}`,
    );
  }
  return still;
}
