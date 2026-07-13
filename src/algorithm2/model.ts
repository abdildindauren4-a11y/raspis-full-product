// filepath: src/algorithm2/model.ts
// Engine v2 — кесте күйі (ScheduleState): орналастыру, индекстер, кері қайтару.
// Барлық "кім қай уақытта бос емес" сұрақтарына O(1) жауап беретін матрицалар.

import type { Klass, Subject, CurItem, Slot } from "../algorithm/engine";
import type { TimeModel } from "./time";

// Бір сабақтың бір бөлігі: жай сабақта 1 бөлік, топқа бөлінген (split)
// сабақта — әр топқа бір бөлік (өз мұғалімі + өз кабинеті).
export interface Part {
  teacherId: string;
  roomId: string;
  groupId?: string;
  dpart?: 1 | 2;
}

// Орналастыру кандидаты — ережелер осыны тексереді ("осы жерге болады ма?")
export interface CandidatePlacement {
  cls: Klass;
  cu: CurItem;
  s: Subject;
  day: number;
  slot: number;
  shift: 1 | 2;
  parts: Part[];
  // Қос сабақтың (double) екінші жартысы: "бір күн — бір пән" ережесі бұған
  // бірінші жартысы тұрған жағдайда ғана рұқсат береді.
  partOfDouble?: 1 | 2;
}

const NO_ROOM = "__none__"; // кабинет талап етілмейтін сабақтар үшін sentinel

export class ScheduleState {
  readonly time: TimeModel;
  readonly slots: Slot[] = []; // v1 пішіміндегі дайын сабақтар (нәтижеге кетеді)
  private seq = 0;
  // teacherId/classId/roomId → ұяшық массиві (мәні = сол жерде тұрған classId,
  // бос болса null). Массивтер lazy жасалады.
  private tBusy = new Map<string, (string | null)[]>();
  private cBusy = new Map<string, (Slot[] | null)[]>();
  // Кабинетте бір мезгілде бірнеше сынып болуы мүмкін (спортзал gymMax) —
  // сондықтан мәні тізім
  private rBusy = new Map<string, (string[] | null)[]>();
  // `${classId}|${subjectId}|${day}` → сол күнгі сабақ саны
  private subjDay = new Map<string, number>();
  // `${classId}|${day}` → сол күнгі сабақ саны
  private dayCount = new Map<string, number>();

  constructor(time: TimeModel) { this.time = time; }

  private grid<T>(m: Map<string, (T | null)[]>, id: string): (T | null)[] {
    let g = m.get(id);
    if (!g) { g = new Array(this.time.cells).fill(null); m.set(id, g); }
    return g;
  }

  teacherAt(teacherId: string, day: number, slot: number): string | null {
    return this.grid(this.tBusy, teacherId)[this.time.cell(day, slot)];
  }
  classAt(classId: string, day: number, slot: number): Slot[] | null {
    return this.grid(this.cBusy, classId)[this.time.cell(day, slot)];
  }
  roomAt(roomId: string, day: number, slot: number): string | null {
    if (roomId === NO_ROOM) return null;
    const occ = this.grid(this.rBusy, roomId)[this.time.cell(day, slot)];
    return occ && occ.length ? occ[0] : null;
  }
  roomOcc(roomId: string, day: number, slot: number): string[] {
    if (roomId === NO_ROOM) return [];
    return this.grid(this.rBusy, roomId)[this.time.cell(day, slot)] || [];
  }
  subjCount(classId: string, subjectId: string, day: number): number {
    return this.subjDay.get(`${classId}|${subjectId}|${day}`) || 0;
  }
  lessonsOn(classId: string, day: number): number {
    return this.dayCount.get(`${classId}|${day}`) || 0;
  }

  // Кандидатты кестеге бекіту. Ережелер АЛДЫН АЛА тексерілген деп есептейді.
  place(p: CandidatePlacement, score: number): Slot[] {
    const cell = this.time.cell(p.day, p.slot);
    const made: Slot[] = [];
    for (const part of p.parts) {
      const sl: Slot = {
        key: "s" + ++this.seq,
        classId: p.cls.id, subjectId: p.s.id, teacherId: part.teacherId,
        roomId: part.roomId === NO_ROOM ? "" : part.roomId,
        groupId: part.groupId, dpart: part.dpart,
        day: p.day, slot: p.slot, shift: p.shift, score,
      };
      made.push(sl);
      this.slots.push(sl);
      this.grid(this.tBusy, part.teacherId)[cell] = p.cls.id;
      if (part.roomId !== NO_ROOM) {
        const rg = this.grid(this.rBusy, part.roomId);
        rg[cell] = (rg[cell] || []).concat(p.cls.id);
      }
    }
    const cg = this.grid(this.cBusy, p.cls.id);
    cg[cell] = (cg[cell] || []).concat(made) as Slot[];
    const sk = `${p.cls.id}|${p.s.id}|${p.day}`;
    this.subjDay.set(sk, (this.subjDay.get(sk) || 0) + 1);
    const dk = `${p.cls.id}|${p.day}`;
    this.dayCount.set(dk, (this.dayCount.get(dk) || 0) + 1);
    return made;
  }
}

export { NO_ROOM };
