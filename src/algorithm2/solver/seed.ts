// filepath: src/algorithm2/solver/seed.ts
// Seed-фаза: бастапқы орналастыру. Приоритет кезегі (арнайы кабинет → топ →
// сағат көп → ауыр пән) бойынша әр тапсырмаға ережелерден өткен ішіндегі
// ЕҢ ЖАҚСЫ (soft ұпайы max) орын таңдалады. v1-дің дәлелденген эвристикасы —
// бірақ шарттар кодқа тігілмеген: бәрі ережелер реестрінен оқылады.

import type { Klass, CurItem, Subject, Unplaced } from "../../algorithm/engine";
import type { RuleContext } from "../rules/types";
import type { CompiledRules } from "../rules/registry";
import { firstViolation, softScore } from "../rules/registry";
import type { CandidatePlacement, Part } from "../model";
import { NO_ROOM } from "../model";

interface Task {
  cls: Klass; cu: CurItem; s: Subject;
  pr: number;          // приоритет (үлкені бұрын)
  singles: number; doubles: number;
}

export interface SeedResult { unplaced: Unplaced[] }

export function runSeed(ctx: RuleContext, rules: CompiledRules, onProgress?: (pct: number) => void): SeedResult {
  const { input, time } = ctx;

  /* ── тапсырмалар кезегі ── */
  const tasks: Task[] = [];
  for (const cls of input.classes) {
    for (const cu of cls.curriculum) {
      if (!cu.hours) continue;
      const s = ctx.subjectsById.get(cu.subjectId);
      if (!s) continue;
      // Аптада күн санынан көп сағат — қос сабақсыз сыймайды
      const doubles = Math.max(0, cu.hours - time.days);
      const singles = cu.hours - doubles * 2;
      const pr =
        (s.room ? 1000 : 0) +          // арнайы кабинет — тапшы ресурс, бірінші
        (cu.isSplit ? 500 : 0) +       // топқа бөлінген — екі мұғалім бірден керек
        cu.hours * 20 +                // сағаты көбі бұрын
        s.score;                       // ауыры бұрын
      tasks.push({ cls, cu, s, pr, singles, doubles });
    }
  }
  tasks.sort((a, b) => b.pr - a.pr);

  /* ── орналастыру ── */
  const unplaced: Unplaced[] = [];
  let done = 0;
  for (const t of tasks) {
    let miss = 0;
    let lastReason = "";
    for (let d = 0; d < t.doubles; d++) {
      const r = placeUnit(ctx, rules, t, true);
      if (r) { miss += 2; lastReason = r; }
    }
    for (let sN = 0; sN < t.singles; sN++) {
      const r = placeUnit(ctx, rules, t, false);
      if (r) { miss += 1; lastReason = r; }
    }
    if (miss > 0) {
      unplaced.push({
        className: t.cls.name, subject: t.s.name,
        placed: t.cu.hours - miss, need: t.cu.hours, reason: lastReason,
      });
    }
    done++;
    if (onProgress && done % 10 === 0) onProgress(done / tasks.length);
  }
  return { unplaced };
}

// Бір бірлікті (жалғыз сабақ немесе қос сабақ) ең жақсы орынға қою.
// Сәтті болса null, болмаса — соңғы себеп.
function placeUnit(ctx: RuleContext, rules: CompiledRules, t: Task, isDouble: boolean): string | null {
  const { time } = ctx;
  const shift = t.cls.shift;
  let best: { p1: CandidatePlacement; p2?: CandidatePlacement; score: number } | null = null;
  let lastReason = "орын табылмады";

  for (let day = 1; day <= time.days; day++) {
    const maxSlot = Math.min(time.slots, ctx.maxLessonsOf(t.cls.grade));
    for (let slot = 1; slot <= maxSlot - (isDouble ? 1 : 0); slot++) {
      const parts = buildParts(ctx, t, day, slot);
      if (typeof parts === "string") { lastReason = parts; continue; }
      const p1: CandidatePlacement = { cls: t.cls, cu: t.cu, s: t.s, day, slot, shift, parts, partOfDouble: isDouble ? 1 : undefined };
      const v1r = firstViolation(rules, ctx, p1);
      if (v1r) { lastReason = v1r; continue; }
      let p2: CandidatePlacement | undefined;
      if (isDouble) {
        const parts2 = buildParts(ctx, t, day, slot + 1);
        if (typeof parts2 === "string") { lastReason = parts2; continue; }
        p2 = { cls: t.cls, cu: t.cu, s: t.s, day, slot: slot + 1, shift, parts: parts2, partOfDouble: 2 };
        const v2r = firstViolation(rules, ctx, p2);
        if (v2r) { lastReason = v2r; continue; }
      }
      const sc = softScore(rules, ctx, p1) + (p2 ? softScore(rules, ctx, p2) : 0);
      if (!best || sc > best.score) best = { p1, p2, score: sc };
    }
  }

  if (!best) return lastReason;
  const avg = best.score / (best.p2 ? 2 : 1);
  ctx.state.place(best.p1, Math.round(avg * 10) / 10);
  if (best.p2) ctx.state.place(best.p2, Math.round(avg * 10) / 10);
  return null;
}

// Сабақтың бөліктерін (мұғалім+кабинет) құру. Топқа бөлінген сабақта әр
// топқа жеке бөлік. Кабинет табылмаса — себеп қайтарылады.
function buildParts(ctx: RuleContext, t: Task, day: number, slot: number): Part[] | string {
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
  const free = (id: string) => {
    if (taken.has(id)) return false;
    const r = ctx.roomsById.get(id);
    const cap = r?.type === "gym" ? r.gymMax || 1 : 1; // спортзал бөлісіледі
    return ctx.state.roomOcc(id, day, slot).length < cap;
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
