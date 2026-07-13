// filepath: src/algorithm2/solver/improve.ts
// Improve-фаза: дайын кестені жақсарту.
// 1) Глобал пасс: әр сабаққа қазіргіден жақсы орын табылса — көшіру
// 2) Maximin: ең нашар сыныптың ұпайын көтеру (v1 ЭТАП 6 баламасы) —
//    сыныптар арасындағы әділдік (balance) осы жерде туады.

import type { Klass } from "../../algorithm/engine";
import type { RuleContext } from "../rules/types";
import type { CompiledRules } from "../rules/registry";
import { firstViolation, softScore } from "../rules/registry";
import type { CandidatePlacement, PlacedUnit } from "../model";
import type { Task } from "./seed";
import { findBest, commit, buildParts } from "./seed";

const unitTask = (u: PlacedUnit): Task =>
  ({ cls: u.p.cls, cu: u.p.cu, s: u.p.s, pr: 0, singles: 0, doubles: 0 });

function removeUnit(ctx: RuleContext, u: PlacedUnit, units: PlacedUnit[]): void {
  ctx.state.unplace(u);
  const i = units.indexOf(u);
  if (i >= 0) units.splice(i, 1);
}

// Бір сабақты қазіргіден жақсырақ ұяшыққа көшіру әрекеті.
// eps — «жақсырақ» деп санау табалдырығы (ұсақ тербелістен қорғайды).
function tryRelocate(ctx: RuleContext, rules: CompiledRules, u: PlacedUnit, units: PlacedUnit[], eps: number): boolean {
  if (u.p.partOfDouble) return false; // қос сабақ жұп болып қозғалады — өткіземіз
  if (!sourceIsEndpoint(ctx, u)) return false; // күн ортасынан алу тесік ашады
  removeUnit(ctx, u, units);
  const oldScore = softScore(rules, ctx, u.p); // ескі орынның бос күйдегі ұпайы
  const best = findBest(ctx, rules, unitTask(u), false);
  if (typeof best === "string" || best.score <= oldScore + eps ||
      !targetKeepsCompact(ctx, u.p.cls.id, best.p1.day, best.p1.slot)) {
    // жақсысы жоқ — орнына қайтарамыз
    units.push(ctx.state.place(u.p, u.made[0]?.score ?? 0, u.eff));
    return false;
  }
  commit(ctx, best, units);
  return true;
}

/* ── 1. Глобал пасс ── */
export function globalPass(ctx: RuleContext, rules: CompiledRules, units: PlacedUnit[]): number {
  let moved = 0;
  // Ең нашар орналасқандардан бастаймыз (слот ұпайы төмен)
  const order = [...units].sort((a, b) => (a.made[0]?.score ?? 0) - (b.made[0]?.score ?? 0));
  for (const u of order) {
    if (!units.includes(u)) continue; // басқа көшірулер әсерінен өзгерген
    if (tryRelocate(ctx, rules, u, units, 1.5)) moved++;
  }
  return moved;
}

/* ── 2. Maximin ── */
// v1 classScore формуласымен бірдей прокси: слот ұпайының орташасы (60%) +
// күндік балл біркелкілігі (40%)
function classScoreOf(ctx: RuleContext, c: Klass): number {
  const own = ctx.state.slots.filter((o) => o.classId === c.id && (!o.groupId || o.dpart === 1));
  if (!own.length) return -1; // бос сынып — maximin-ге қатыспайды
  const avg = own.reduce((a, o) => a + o.score, 0) / own.length;
  const dsc: number[] = [];
  for (let d = 1; d <= ctx.time.days; d++) dsc.push(ctx.state.scoreOn(c.id, d));
  const m = dsc.reduce((a, b) => a + b, 0) / ctx.time.days;
  const v = dsc.reduce((a, b) => a + (b - m) * (b - m), 0) / ctx.time.days;
  return avg * 10 * 0.6 + Math.max(0, 100 - v * 2) * 0.4;
}

// Күндік балл біркелкілігінің термі (classScore-дың 40%-ы): 100 - 2*дисперсия
function evenTerm(dsc: number[]): number {
  const m = dsc.reduce((a, b) => a + b, 0) / dsc.length;
  const v = dsc.reduce((a, b) => a + (b - m) * (b - m), 0) / dsc.length;
  return Math.max(0, 100 - v * 2);
}

// СЫНЫП ҰПАЙЫНЫҢ дельтасы (аналитикалық, арзан): сабақ(тар) көшкенде
// слот-ұпай орташасы (60%) мен күндік балл термі (40%) қалай өзгереді
function classDelta(
  n: number, dscBase: number[],
  moves: { fromDay: number; toDay: number; eff: number; oldP: number; newP: number }[],
): number {
  let dAvg = 0;
  const dsc = dscBase.slice();
  for (const mv of moves) {
    dAvg += ((mv.newP - mv.oldP) / n) * 10 * 0.6;
    if (mv.fromDay !== mv.toDay) {
      dsc[mv.fromDay - 1] -= mv.eff;
      dsc[mv.toDay - 1] += mv.eff;
    }
  }
  return dAvg + (evenTerm(dsc) - evenTerm(dscBase)) * 0.4;
}

// Сыныптың сол күнгі алғашқы/соңғы қолданылған слоты
function daySpan(ctx: RuleContext, clsId: string, day: number): { first: number; last: number } {
  let first = 0, last = 0;
  for (let sl = 1; sl <= ctx.time.slots; sl++) {
    if (ctx.state.classAt(clsId, day, sl)) { if (!first) first = sl; last = sl; }
  }
  return { first, last };
}
// Көшіру тесік АШПАУЫ керек: дереккөз — күн шеті (ортасынан алсақ тесік
// қалады), мақсат — бар қатарға жалғас (алшақ слотқа секірмейміз)
function sourceIsEndpoint(ctx: RuleContext, u: PlacedUnit): boolean {
  const { first, last } = daySpan(ctx, u.p.cls.id, u.p.day);
  return u.p.slot === first || u.p.slot === last;
}
function targetKeepsCompact(ctx: RuleContext, clsId: string, day: number, slot: number): boolean {
  const { first, last } = daySpan(ctx, clsId, day);
  if (!first) return true; // бос күн — кез келген слот жарайды
  return slot >= first - 1 && slot <= last + 1;
}

// Нашар сыныптың БІР сабағын сынып ұпайын нақты көтеретін ұяшыққа көшіру
function liftByRelocate(ctx: RuleContext, rules: CompiledRules, cls: Klass, own: PlacedUnit[], units: PlacedUnit[]): boolean {
  const n = own.length;
  const dscBase: number[] = [];
  for (let d = 1; d <= ctx.time.days; d++) dscBase.push(ctx.state.scoreOn(cls.id, d));
  for (const u of own) {
    if (!units.includes(u) || u.p.partOfDouble) continue;
    if (!sourceIsEndpoint(ctx, u)) continue; // ортасынан алу тесік ашады
    removeUnit(ctx, u, units);
    let best: { p: CandidatePlacement; delta: number; sc: number } | null = null;
    for (let day = 1; day <= ctx.time.days; day++) {
      for (let slot = 1; slot <= ctx.time.slots; slot++) {
        if (day === u.p.day && slot === u.p.slot) continue;
        if (!targetKeepsCompact(ctx, cls.id, day, slot)) continue;
        const parts = buildParts(ctx, unitTask(u), day, slot);
        if (typeof parts === "string") continue;
        const p: CandidatePlacement = { cls: u.p.cls, cu: u.p.cu, s: u.p.s, day, slot, shift: u.p.shift, parts };
        if (firstViolation(rules, ctx, p)) continue;
        const delta = classDelta(n, dscBase, [{
          fromDay: u.p.day, toDay: day, eff: u.eff,
          oldP: u.made[0]?.score ?? 0, newP: ctx.pScoreOf(u.p.s, slot),
        }]);
        if (delta > 0.5 && (!best || delta > best.delta))
          best = { p, delta, sc: softScore(rules, ctx, p) };
      }
    }
    if (best) { commit(ctx, { p1: best.p, score: best.sc }, units); return true; }
    units.push(ctx.state.place(u.p, u.made[0]?.score ?? 0, u.eff));
  }
  return false;
}

// Нашар сыныптың екі сабағының орнын алмастыру — сынып ұпайы өссе ғана
function liftBySwap(ctx: RuleContext, rules: CompiledRules, cls: Klass, own: PlacedUnit[], units: PlacedUnit[]): boolean {
  const n = own.length;
  const dscBase: number[] = [];
  for (let d = 1; d <= ctx.time.days; d++) dscBase.push(ctx.state.scoreOn(cls.id, d));
  for (let i = 0; i < own.length; i++) {
    for (let j = i + 1; j < own.length; j++) {
      const uA = own[i], uB = own[j];
      if (!units.includes(uA) || !units.includes(uB)) continue;
      if (uA.p.partOfDouble || uB.p.partOfDouble) continue;
      if (uA.p.day === uB.p.day && uA.p.slot === uB.p.slot) continue;
      const delta = classDelta(n, dscBase, [
        { fromDay: uA.p.day, toDay: uB.p.day, eff: uA.eff, oldP: uA.made[0]?.score ?? 0, newP: ctx.pScoreOf(uA.p.s, uB.p.slot) },
        { fromDay: uB.p.day, toDay: uA.p.day, eff: uB.eff, oldP: uB.made[0]?.score ?? 0, newP: ctx.pScoreOf(uB.p.s, uA.p.slot) },
      ]);
      if (delta <= 0.5) continue;
      // Дельта оң — енді ережелермен тексереміз
      removeUnit(ctx, uA, units);
      removeUnit(ctx, uB, units);
      const rollback = () => {
        units.push(ctx.state.place(uA.p, uA.made[0]?.score ?? 0, uA.eff));
        units.push(ctx.state.place(uB.p, uB.made[0]?.score ?? 0, uB.eff));
      };
      const partsA = buildParts(ctx, unitTask(uA), uB.p.day, uB.p.slot);
      if (typeof partsA === "string") { rollback(); continue; }
      const pA: CandidatePlacement = { cls: uA.p.cls, cu: uA.p.cu, s: uA.p.s, day: uB.p.day, slot: uB.p.slot, shift: uA.p.shift, parts: partsA };
      if (firstViolation(rules, ctx, pA)) { rollback(); continue; }
      const placedA = commit(ctx, { p1: pA, score: softScore(rules, ctx, pA) }, units);
      const partsB = buildParts(ctx, unitTask(uB), uA.p.day, uA.p.slot);
      const fail = () => { for (const pu of placedA) removeUnit(ctx, pu, units); rollback(); };
      if (typeof partsB === "string") { fail(); continue; }
      const pB: CandidatePlacement = { cls: uB.p.cls, cu: uB.p.cu, s: uB.p.s, day: uA.p.day, slot: uA.p.slot, shift: uB.p.shift, parts: partsB };
      if (firstViolation(rules, ctx, pB)) { fail(); continue; }
      commit(ctx, { p1: pB, score: softScore(rules, ctx, pB) }, units);
      return true;
    }
  }
  return false;
}

export function maximinPass(ctx: RuleContext, rules: CompiledRules, units: PlacedUnit[], maxIters: number): number {
  let lifted = 0;
  const stuck = new Set<string>();
  for (let iter = 0; iter < maxIters; iter++) {
    // Ең нашар (әлі тығырыққа тірелмеген) сыныпты табу
    let worst: Klass | null = null;
    let worstScore = Infinity;
    for (const c of ctx.input.classes) {
      if (stuck.has(c.id)) continue;
      const sc = classScoreOf(ctx, c);
      if (sc >= 0 && sc < worstScore) { worstScore = sc; worst = c; }
    }
    if (!worst) break;
    // Оның ең нашар орналасқан сабақтарынан бастап: алдымен көшіру,
    // болмаса сынып ішіндегі своп — екеуі де СЫНЫП ҰПАЙЫ өскенде ғана
    const own = units
      .filter((u) => u.p.cls.id === worst!.id)
      .sort((a, b) => (a.made[0]?.score ?? 0) - (b.made[0]?.score ?? 0));
    let improved = liftByRelocate(ctx, rules, worst, own, units);
    if (!improved) improved = liftBySwap(ctx, rules, worst, own, units);
    if (improved) lifted++;
    else stuck.add(worst.id);
  }
  return lifted;
}

export function improveSchedule(ctx: RuleContext, rules: CompiledRules, units: PlacedUnit[]): void {
  globalPass(ctx, rules, units);
  if (ctx.settings.maximin !== false) {
    // Екі раунд: maximin тығырыққа тірелгендерді глобал пасс қозғалтып,
    // екінші раундқа жаңа мүмкіндік ашады
    maximinPass(ctx, rules, units, Math.max(40, ctx.input.classes.length * 4));
    globalPass(ctx, rules, units);
    maximinPass(ctx, rules, units, Math.max(20, ctx.input.classes.length * 2));
  }
}
