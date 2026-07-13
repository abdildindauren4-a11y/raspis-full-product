// filepath: src/algorithm2/solver/seed.ts
// Seed-фаза: бастапқы орналастыру. Приоритет кезегі (арнайы кабинет → топ →
// сағат көп → ауыр пән) бойынша әр тапсырмаға ережелерден өткен ішіндегі
// ЕҢ ЖАҚСЫ (soft ұпайы max) орын таңдалады. v1-дің дәлелденген эвристикасы —
// бірақ шарттар кодқа тігілмеген: бәрі ережелер реестрінен оқылады.

import type { Klass, CurItem, Subject } from "../../algorithm/engine";
import type { RuleContext } from "../rules/types";
import type { CompiledRules } from "../rules/registry";
import { firstViolation, softScore } from "../rules/registry";
import type { CandidatePlacement, Part, PlacedUnit } from "../model";
import { NO_ROOM } from "../model";

export interface Task {
  cls: Klass; cu: CurItem; s: Subject;
  pr: number;          // приоритет (үлкені бұрын)
  singles: number; doubles: number;
}

// Орналаспай қалған бірлік — repair/softFill фазалары қайта әрекеттенеді
export interface MissingUnit { task: Task; isDouble: boolean; lastReason: string }

export interface SeedResult { missing: MissingUnit[]; units: PlacedUnit[] }

export function buildTasks(ctx: RuleContext): Task[] {
  const tasks: Task[] = [];
  // Ішінара режимде тек қайта құрылатын сыныптарға тапсырма жасалады
  const targets = ctx.input.partial ? new Set(ctx.input.partial.classIds) : null;
  for (const cls of ctx.input.classes) {
    if (targets && !targets.has(cls.id)) continue;
    for (const cu of cls.curriculum) {
      if (!cu.hours) continue;
      const s = ctx.subjectsById.get(cu.subjectId);
      if (!s) continue;
      // Аптада күн санынан көп сағат — қос сабақсыз сыймайды
      const doubles = Math.max(0, cu.hours - ctx.time.days);
      const singles = cu.hours - doubles * 2;
      const pr =
        (s.room ? 1000 : 0) +          // арнайы кабинет — тапшы ресурс, бірінші
        (cu.isSplit ? 500 : 0) +       // топқа бөлінген — екі мұғалім бірден керек
        (ctx.lateLimitOf(s) ? 300 : 0) + // слот шегі барлар (математика ≤4) — ерте орналассын
        cu.hours * 20 +                // сағаты көбі бұрын
        s.score +                      // ауыры бұрын
        ctx.rng() * 15;                // multi-seed: кезек ретін сәл araластыру
      tasks.push({ cls, cu, s, pr, singles, doubles });
    }
  }
  tasks.sort((a, b) => b.pr - a.pr);
  return tasks;
}

export function runSeed(ctx: RuleContext, rules: CompiledRules, tasks: Task[], onProgress?: (pct: number) => void): SeedResult {
  const missing: MissingUnit[] = [];
  const units: PlacedUnit[] = [];
  let done = 0;
  for (const t of tasks) {
    for (let d = 0; d < t.doubles; d++) {
      const r = placeUnit(ctx, rules, t, true, units);
      if (typeof r === "string") missing.push({ task: t, isDouble: true, lastReason: r });
    }
    for (let sN = 0; sN < t.singles; sN++) {
      const r = placeUnit(ctx, rules, t, false, units);
      if (typeof r === "string") missing.push({ task: t, isDouble: false, lastReason: r });
    }
    done++;
    if (onProgress && done % 10 === 0) onProgress(done / tasks.length);
  }
  return { missing, units };
}

// Бір бірлікті (жалғыз сабақ немесе қос сабақ) ең жақсы орынға қою.
// Сәтті болса орналастыру(лар), болмаса — соңғы себеп (string).
export function placeUnit(
  ctx: RuleContext, rules: CompiledRules, t: Task, isDouble: boolean,
  units?: PlacedUnit[],
): PlacedUnit[] | string {
  const best = findBest(ctx, rules, t, isDouble);
  if (typeof best === "string") return best;
  return commit(ctx, best, units);
}

export interface BestSpot { p1: CandidatePlacement; p2?: CandidatePlacement; score: number }

// Ережелерден өткен ұяшықтар ішінен soft ұпайы ең жоғарысын табу
export function findBest(ctx: RuleContext, rules: CompiledRules, t: Task, isDouble: boolean): BestSpot | string {
  const { time } = ctx;
  const shift = t.cls.shift;
  let best: BestSpot | null = null;
  let lastReason = "орын табылмады";

  for (let day = 1; day <= time.days; day++) {
    for (let slot = 1; slot <= time.slots - (isDouble ? 1 : 0); slot++) {
      let parts = buildParts(ctx, t, day, slot);
      if (typeof parts === "string") { lastReason = parts; continue; }
      // Қос сабақ жұбы dpart белгісімен жүреді (экспорт/якорь таниды)
      if (isDouble && !t.cu.isSplit) parts = parts.map((x) => ({ ...x, dpart: 1 as const }));
      const p1: CandidatePlacement = { cls: t.cls, cu: t.cu, s: t.s, day, slot, shift, parts, partOfDouble: isDouble ? 1 : undefined };
      const v1r = firstViolation(rules, ctx, p1);
      if (v1r) { lastReason = v1r; continue; }
      let p2: CandidatePlacement | undefined;
      if (isDouble) {
        let parts2 = buildParts(ctx, t, day, slot + 1);
        if (typeof parts2 === "string") { lastReason = parts2; continue; }
        if (!t.cu.isSplit) parts2 = parts2.map((x) => ({ ...x, dpart: 2 as const }));
        p2 = { cls: t.cls, cu: t.cu, s: t.s, day, slot: slot + 1, shift, parts: parts2, partOfDouble: 2 };
        const v2r = firstViolation(rules, ctx, p2);
        if (v2r) { lastReason = v2r; continue; }
      }
      const sc = softScore(rules, ctx, p1) + (p2 ? softScore(rules, ctx, p2) : 0) + ctx.rng() * 0.4;
      if (!best || sc > best.score) best = { p1, p2, score: sc };
    }
  }
  return best || lastReason;
}

export function commit(ctx: RuleContext, best: BestSpot, units?: PlacedUnit[]): PlacedUnit[] {
  const eff = ctx.effOf(best.p1.cls, best.p1.s);
  // Слотқа жазылатын ұпай — пәннің орналасу сапасы (v1-мен бірдей шкала,
  // сынып ұпайы осыдан есептеледі)
  const out = [ctx.state.place(best.p1, ctx.pScoreOf(best.p1.s, best.p1.slot), eff)];
  if (best.p2) out.push(ctx.state.place(best.p2, ctx.pScoreOf(best.p2.s, best.p2.slot), eff));
  if (units) units.push(...out);
  return out;
}

// Сабақтың бөліктерін (мұғалім+кабинет) құру. Топқа бөлінген сабақта әр
// топқа жеке бөлік. Кабинет табылмаса — себеп қайтарылады.
export function buildParts(ctx: RuleContext, t: Task, day: number, slot: number): Part[] | string {
  if (t.cu.isSplit && t.cu.groups?.length) {
    const parts: Part[] = [];
    const taken = new Set<string>();
    for (let gi = 0; gi < t.cu.groups.length; gi++) {
      const g = t.cu.groups[gi];
      const room = findRoom(ctx, t, day, slot, g.roomId, taken);
      if (room === null) return "топқа бос кабинет табылмады";
      parts.push({ teacherId: g.teacherId, roomId: room, groupId: t.cu.id + "-g" + (gi + 1), dpart: (gi + 1) as 1 | 2 });
      if (room !== NO_ROOM) taken.add(room);
    }
    return parts;
  }
  if (!t.cu.teacherId) return "мұғалім тағайындалмаған";
  const room = findRoom(ctx, t, day, slot, undefined, new Set());
  if (room === null) return "бос кабинет табылмады";
  return [{ teacherId: t.cu.teacherId, roomId: room }];
}

// Бос кабинет іздеу: талап етілген түр бойынша; regular болса сыныптың
// бекітілген кабинеті (homeRoomId) бірінші кезекте.
function findRoom(ctx: RuleContext, t: Task, day: number, slot: number, preferId: string | undefined, taken: Set<string>): string | null {
  const need = t.s.room || "regular";
  const shift = t.cls.shift;
  const free = (id: string) => {
    if (taken.has(id)) return false;
    const r = ctx.roomsById.get(id);
    const cap = r?.type === "gym" ? r.gymMax || 1 : 1; // спортзал бөлісіледі
    return ctx.state.roomOcc(id, shift, day, slot).length < cap;
  };
  if (preferId && free(preferId)) return preferId;
  if (need === "regular" && t.cls.homeRoomId && free(t.cls.homeRoomId)) {
    const hr = ctx.roomsById.get(t.cls.homeRoomId);
    if (hr && hr.type === "regular") return t.cls.homeRoomId;
  }
  for (const r of ctx.input.rooms) {
    if (r.type === need && free(r.id)) return r.id;
  }
  // Арнайы талап жоқ пән regular таппаса — кез келген бос кабинетке отыра алады
  if (!t.s.room) {
    for (const r of ctx.input.rooms) if (free(r.id)) return r.id;
  }
  return null;
}
