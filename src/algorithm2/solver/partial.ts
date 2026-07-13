// filepath: src/algorithm2/solver/partial.ts
// Ішінара режим (ақылды жаңарту):
// 1) ҚҰЛЫПТАУ: қайта құрылмайтын сыныптардың ескі слоттары сол күйінде
//    бекітіледі (кейінгі фазалар оларды қозғамайды — units тізіміне кірмейді)
// 2) ЯКОРЬ: қайта құрылатын сыныптардың ескі сабақтары жаңа деректе әлі
//    жарамды болса, дәл сол күн/слотына алдын ала қойылады — кесте бұрынғы
//    нұсқаға барынша ұқсас қалады. Жарамсыздары тасталып, орнын seed толтырады.

import type { Slot } from "../../algorithm/engine";
import { HOMEROOM_SUBJECT_ID } from "../../algorithm/engine";
import type { RuleContext } from "../rules/types";
import type { CompiledRules } from "../rules/registry";
import { firstViolation } from "../rules/registry";
import type { CandidatePlacement, Part, PlacedUnit } from "../model";
import type { Task } from "./seed";
import { buildParts } from "./seed";

/* ── 1. ҚҰЛЫПТАУ ── */
// Ескі нұсқадағы слот қазіргі деректе жоқ нәрсеге сілтесе (сынып/мұғалім/
// пән/кабинет өшірілген) — құлыптамай тастаймыз. Сынып сағаты да сүзіледі —
// оны нәтиже құрастыру өзі қайта қосады.
export function lockBaseSlots(ctx: RuleContext): void {
  const partial = ctx.input.partial;
  if (!partial) return;
  const targetSet = new Set(partial.classIds);
  // Бір сабақтың бөліктерін (топтар) бір орналастыруға жинаймыз
  const byLesson = new Map<string, Slot[]>();
  for (const b of partial.baseSlots) {
    if (targetSet.has(b.classId)) continue;
    if (b.subjectId === HOMEROOM_SUBJECT_ID) continue;
    const cls = ctx.classesById.get(b.classId);
    const s = ctx.subjectsById.get(b.subjectId);
    if (!cls || !s || !ctx.teachersById.get(b.teacherId)) continue;
    if (b.roomId && !ctx.roomsById.get(b.roomId)) continue;
    const k = `${b.classId}|${b.day}|${b.slot}`;
    const arr = byLesson.get(k);
    if (arr) arr.push(b); else byLesson.set(k, [b]);
  }
  for (const [, group] of byLesson) {
    const b0 = group[0];
    const cls = ctx.classesById.get(b0.classId)!;
    const s = ctx.subjectsById.get(b0.subjectId)!;
    const parts: Part[] = group.map((b) => ({
      teacherId: b.teacherId, roomId: b.roomId || "__none__",
      groupId: b.groupId, dpart: b.dpart,
    }));
    const p: CandidatePlacement = {
      cls, cu: { id: "__locked__", subjectId: s.id, hours: 0 }, s,
      day: b0.day, slot: b0.slot, shift: b0.shift, parts,
    };
    const made = ctx.state.place(p, b0.score, ctx.effOf(cls, s)).made;
    for (const sl of made) sl.locked = true;
  }
}

/* ── 2. ЯКОРЬ ── */
// tasks-тағы singles/doubles азайтылады; қойылғандар units-ке қосылады
// (кейінгі фазалар қажет болса жылжыта алады — v1 семантикасы, құлып ЕМЕС).
export function anchorOldPlacements(ctx: RuleContext, rules: CompiledRules, tasks: Task[], units: PlacedUnit[]): void {
  const partial = ctx.input.partial;
  if (!partial?.anchor) return;
  const targetSet = new Set(partial.classIds);
  const oldByKey = new Map<string, Slot[]>();
  for (const b of partial.baseSlots) {
    if (!targetSet.has(b.classId) || b.subjectId === HOMEROOM_SUBJECT_ID) continue;
    const k = `${b.classId}|${b.subjectId}`;
    const arr = oldByKey.get(k);
    if (arr) arr.push(b); else oldByKey.set(k, [b]);
  }
  for (const tk of tasks) {
    const oldSlots = (oldByKey.get(`${tk.cls.id}|${tk.s.id}`) || [])
      .slice().sort((a, b) => a.day - b.day || a.slot - b.slot);
    if (!oldSlots.length) continue;

    if (tk.cu.isSplit) {
      // Топ бөлінген пән: 1-топ слоты — күн/слот маркері; топтар қазіргі
      // мұғалім/кабинетпен қайта құрылады
      for (const o of oldSlots) {
        if (tk.singles <= 0) break;
        if (o.dpart !== 1 && o.groupId !== "Г1") continue;
        if (tryAnchor(ctx, rules, tk, o.day, o.slot, undefined, units)) tk.singles--;
      }
      continue;
    }

    // Қос сабақ жұптары — жұп күйінде сақтауға тырысамыз
    for (const o of oldSlots) {
      if (tk.doubles <= 0) break;
      if (o.dpart !== 1) continue;
      if (tryAnchorDouble(ctx, rules, tk, o.day, o.slot, o.roomId, units)) tk.doubles--;
    }
    // Жеке сағаттар — ескі кабинеті бос болса сонда, әйтпесе жаңасы
    for (const o of oldSlots) {
      if (tk.singles <= 0) break;
      if (o.dpart) continue; // жұп бөліктері жеке есептелмейді
      if (tryAnchor(ctx, rules, tk, o.day, o.slot, o.roomId, units)) tk.singles--;
    }
  }
}

// Бір сабақты ескі орнына қою әрекеті (ескі кабинет басымдықпен)
function tryAnchor(ctx: RuleContext, rules: CompiledRules, tk: Task, day: number, slot: number, oldRoomId: string | undefined, units: PlacedUnit[]): boolean {
  const cands: Part[][] = [];
  // Ескі кабинет (спортзалдан басқа; түрі сай болса) — бірінші үміткер
  if (oldRoomId && !tk.cu.isSplit && tk.cu.teacherId) {
    const oldRoom = ctx.roomsById.get(oldRoomId);
    if (oldRoom && oldRoom.type !== "gym" && (tk.s.room ? oldRoom.type === tk.s.room : true))
      cands.push([{ teacherId: tk.cu.teacherId, roomId: oldRoomId }]);
  }
  const built = buildParts(ctx, tk, day, slot);
  if (typeof built !== "string") cands.push(built);
  for (const parts of cands) {
    const p: CandidatePlacement = { cls: tk.cls, cu: tk.cu, s: tk.s, day, slot, shift: tk.cls.shift, parts };
    if (firstViolation(rules, ctx, p)) continue;
    units.push(ctx.state.place(p, ctx.pScoreOf(tk.s, slot), ctx.effOf(tk.cls, tk.s)));
    return true;
  }
  return false;
}

function tryAnchorDouble(ctx: RuleContext, rules: CompiledRules, tk: Task, day: number, slot: number, oldRoomId: string | undefined, units: PlacedUnit[]): boolean {
  if (!tk.cu.teacherId) return false;
  const mk = (parts: Part[], sl: number, dp: 1 | 2): CandidatePlacement =>
    ({ cls: tk.cls, cu: tk.cu, s: tk.s, day, slot: sl, shift: tk.cls.shift, parts, partOfDouble: dp });
  const roomsToTry: (string | undefined)[] = [oldRoomId, undefined];
  for (const rid of roomsToTry) {
    let parts1: Part[]; let parts2: Part[];
    if (rid && ctx.roomsById.get(rid) && ctx.roomsById.get(rid)!.type !== "gym") {
      parts1 = [{ teacherId: tk.cu.teacherId, roomId: rid, dpart: 1 }];
      parts2 = [{ teacherId: tk.cu.teacherId, roomId: rid, dpart: 2 }];
    } else {
      const b1 = buildParts(ctx, tk, day, slot);
      const b2 = buildParts(ctx, tk, day, slot + 1);
      if (typeof b1 === "string" || typeof b2 === "string") continue;
      parts1 = b1.map((x) => ({ ...x, dpart: 1 as const }));
      parts2 = b2.map((x) => ({ ...x, dpart: 2 as const }));
    }
    const p1 = mk(parts1, slot, 1);
    const p2 = mk(parts2, slot + 1, 2);
    if (firstViolation(rules, ctx, p1) || firstViolation(rules, ctx, p2)) continue;
    units.push(ctx.state.place(p1, ctx.pScoreOf(tk.s, slot), ctx.effOf(tk.cls, tk.s)));
    units.push(ctx.state.place(p2, ctx.pScoreOf(tk.s, slot + 1), ctx.effOf(tk.cls, tk.s)));
    return true;
  }
  return false;
}
