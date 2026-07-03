// filepath: src/lib/dataBudget.ts
// ТІРІ БЮДЖЕТ — деректерді енгізу кезінде сыйымдылықты есептеп,
// қатені генерацияға дейін көрсететін модуль.
//
// Есептер:
//   • Мұғалім бюджеті: оқу жоспарларында тағайындалған сағат / апталық норма
//   • Сынып бюджеті: апталық сағат / сыйымдылық (5 күн × күндік сабақ лимиті)
//   • Арнайы кабинет өткізу қабілеті: керек сағат / бос слот (ауысым бойынша)
//   • Ауысым сыйымдылығы: сабақ саны / (кабинет × слот)

import type { Klass, Teacher, Room, Subject, Settings, RoomType } from "@/algorithm/engine";
import { maxSlots, dayLimitS } from "@/algorithm/engine";

const WEEK_DAYS = 5;

export interface TeacherBudget {
  teacher: Teacher;
  assigned: number;         // оқу жоспарларында тағайындалған сағат
  free: number;             // norm - assigned (теріс = асып тұр)
  classes: string[];        // қай сыныптарда
  subjects: Set<string>;    // қай пәндерді береді (біліктілік — жоспардан шығарылады)
}

/** Барлық мұғалімнің оқу жоспарындағы жүктемесі (генерацияға дейінгі жоспар). */
export function teacherBudgets(teachers: Teacher[], classes: Klass[]): Map<string, TeacherBudget> {
  const map = new Map<string, TeacherBudget>();
  for (const t of teachers) map.set(t.id, { teacher: t, assigned: 0, free: t.norm, classes: [], subjects: new Set() });
  for (const c of classes) {
    for (const cu of c.curriculum || []) {
      const ids = cu.isSplit ? (cu.groups || []).map((g) => g.teacherId) : cu.teacherId ? [cu.teacherId] : [];
      for (const id of ids) {
        const b = map.get(id);
        if (!b) continue;
        b.assigned += cu.hours;
        b.subjects.add(cu.subjectId);
        if (!b.classes.includes(c.name)) b.classes.push(c.name);
      }
    }
  }
  for (const b of map.values()) b.free = b.teacher.norm - b.assigned;
  return map;
}

/** Сынып бюджеті: апталық сағат пен сыйымдылық (5 күн × сабақ лимиті). */
export function classBudget(cls: Klass, settings?: Settings): { total: number; capacity: number } {
  const total = (cls.curriculum || []).reduce((s, cu) => s + cu.hours, 0);
  return { total, capacity: WEEK_DAYS * maxSlots(cls.grade, settings) };
}

/** Сынып БАЛЛ бюджеті: апталық Σ(ауырлық×сағат) және балл сыйымдылығы.
    Сыйымдылық = 5 × күндік балл лимиті МИНУС ең ауыр пәннің баллы (headroom):
    күндер лимитке дейін толса, соңғы сабаққа орын қалмайды — алгоритм оны
    орналастыра алмай «күндік балл лимиті» деп қайтарады. */
export function classScoreBudget(
  cls: Klass, subjects: Subject[], settings?: Settings
): { total: number; capacity: number; tight: boolean } {
  const S = new Map(subjects.map((s) => [s.id, s]));
  let total = 0, maxScore = 0;
  for (const cu of cls.curriculum || []) {
    const su = S.get(cu.subjectId);
    if (!su) continue;
    const eff = cls.grade <= 4 && su.primaryScore != null ? su.primaryScore : su.score;
    total += eff * cu.hours;
    if (eff > maxScore) maxScore = eff;
  }
  const limit = dayLimitS(cls.grade, settings);
  const capacity = WEEK_DAYS * limit;
  // тығыз: соңғы (ең ауыр) сабаққа бос күн-қор қалмайды
  const tight = total > capacity - maxScore;
  return { total, capacity, tight };
}

/** Осы сыныпқа сай (диапазон + ауысым) әрі сағаты бос мұғалімдер, бос сағаты көбінен бастап.
    subjectId берілсе — сол ПӘНДІ басқа жерде беретіндер (біліктілігі сай) басым:
    олар болса тек солар қайтады; болмаса — жалпы тізім (жаңа мектеп/бос жоспар жағдайы). */
export function freeTeachersFor(
  cls: Klass, budgets: Map<string, TeacherBudget>, needHours: number, excludeId?: string, subjectId?: string
): TeacherBudget[] {
  const base = [...budgets.values()]
    .filter((b) =>
      b.teacher.id !== excludeId &&
      b.teacher.gradeMin <= cls.grade && cls.grade <= b.teacher.gradeMax &&
      (b.teacher.shift === 3 || b.teacher.shift === cls.shift) &&
      b.free >= needHours)
    .sort((a, b) => b.free - a.free);
  if (!subjectId) return base;
  const match = base.filter((b) => b.subjects.has(subjectId));
  return match.length ? match : base;
}

export interface RoomThroughput {
  type: RoomType;
  shift: 1 | 2;
  needed: number;    // осы ауысым сыныптарына керек сағат
  capacity: number;  // кабинет саны × 5 күн × 8 слот (спортзал: × gymMax)
}

/** Арнайы кабинеттердің (спортзал, физика...) өткізу қабілеті ауысым бойынша. */
export function roomThroughputs(classes: Klass[], subjects: Subject[], rooms: Room[]): RoomThroughput[] {
  const S = new Map(subjects.map((s) => [s.id, s]));
  const res: RoomThroughput[] = [];
  const types: RoomType[] = ["gym", "physics", "chemistry", "computer"];
  for (const type of types) {
    const typed = rooms.filter((r) => r.type === type);
    for (const shift of [1, 2] as const) {
      let needed = 0;
      for (const c of classes.filter((c) => c.shift === shift))
        for (const cu of c.curriculum || []) {
          const s = S.get(cu.subjectId);
          if (s?.room === type) needed += cu.hours * (cu.isSplit && type !== "gym" ? 1 : 1);
        }
      if (needed === 0) continue;
      const perRoom = type === "gym" ? (typed[0]?.gymMax || 1) : 1;
      const capacity = typed.length * WEEK_DAYS * 8 * perRoom;
      res.push({ type, shift, needed, capacity });
    }
  }
  return res;
}

/** Ауысым сыйымдылығы: барлық сабақ саны ≤ кабинет × 5 күн × 8 слот. */
export function shiftCapacity(classes: Klass[], rooms: Room[]): { shift: 1 | 2; needed: number; capacity: number }[] {
  const res: { shift: 1 | 2; needed: number; capacity: number }[] = [];
  const roomCount = rooms.length;
  for (const shift of [1, 2] as const) {
    const cls = classes.filter((c) => c.shift === shift);
    if (!cls.length) continue;
    const needed = cls.reduce((s, c) => s + (c.curriculum || []).reduce((x, cu) => x + cu.hours, 0), 0);
    res.push({ shift, needed, capacity: roomCount * WEEK_DAYS * 8 });
  }
  return res;
}

export const ROOM_TYPE_KK: Record<RoomType, string> = {
  regular: "қарапайым", physics: "физика", chemistry: "химия",
  computer: "информатика", gym: "спортзал",
};
