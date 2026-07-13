// filepath: src/algorithm2/model.ts
// Engine v2 — кесте күйі (ScheduleState): орналастыру, индекстер, кері қайтару.
// Барлық "кім қай уақытта бос емес" сұрақтарына O(1) жауап беретін матрицалар.
// Мұғалім/кабинет матрицалары АУЫСЫМ бойынша бөлек — 1-ауысым мен 2-ауысым
// бір "слот нөмірінде" болса да нақты уақыты басқа.

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

// Бір орналастыру операциясы — кері қайтаруға (unplace) керек барлық із
export interface PlacedUnit {
  p: CandidatePlacement;
  made: Slot[];
  eff: number; // күндік балл/шаршау есебіне қосылған салмақ
}

const NO_ROOM = "__none__"; // кабинет талап етілмейтін сабақтар үшін sentinel

export class ScheduleState {
  readonly time: TimeModel;
  readonly slots: Slot[] = []; // v1 пішіміндегі дайын сабақтар (нәтижеге кетеді)
  private seq = 0;
  // id → ауысым қоса есептелген ұяшық массиві (lazy)
  private tBusy = new Map<string, (string | null)[]>();
  private cBusy = new Map<string, (Slot[] | null)[]>();
  // Кабинетте бір мезгілде бірнеше сынып болуы мүмкін (спортзал gymMax)
  private rBusy = new Map<string, (string[] | null)[]>();
  // `${classId}|${subjectId}|${day}` → сол күнгі сабақ саны
  private subjDay = new Map<string, number>();
  // `${classId}|${day}` → сол күнгі сабақ саны / балл / сабақ тізімі (шаршау)
  private dayCount = new Map<string, number>();
  private dayScore = new Map<string, number>();
  private dayLessons = new Map<string, { slot: number; score: number }[]>();

  constructor(time: TimeModel) { this.time = time; }

  private sCell(shift: 1 | 2, day: number, slot: number): number {
    return (shift - 1) * this.time.cells + this.time.cell(day, slot);
  }
  private grid<T>(m: Map<string, (T | null)[]>, id: string, len: number): (T | null)[] {
    let g = m.get(id);
    if (!g) { g = new Array(len).fill(null); m.set(id, g); }
    return g;
  }

  teacherAt(teacherId: string, shift: 1 | 2, day: number, slot: number): string | null {
    return this.grid(this.tBusy, teacherId, this.time.cells * 2)[this.sCell(shift, day, slot)];
  }
  classAt(classId: string, day: number, slot: number): Slot[] | null {
    return this.grid(this.cBusy, classId, this.time.cells)[this.time.cell(day, slot)];
  }
  subjectAt(classId: string, day: number, slot: number): string | null {
    const arr = this.classAt(classId, day, slot);
    return arr && arr.length ? arr[0].subjectId : null;
  }
  roomOcc(roomId: string, shift: 1 | 2, day: number, slot: number): string[] {
    if (roomId === NO_ROOM) return [];
    return this.grid(this.rBusy, roomId, this.time.cells * 2)[this.sCell(shift, day, slot)] || [];
  }
  subjCount(classId: string, subjectId: string, day: number): number {
    return this.subjDay.get(`${classId}|${subjectId}|${day}`) || 0;
  }
  lessonsOn(classId: string, day: number): number {
    return this.dayCount.get(`${classId}|${day}`) || 0;
  }
  scoreOn(classId: string, day: number): number {
    return this.dayScore.get(`${classId}|${day}`) || 0;
  }
  // Сол күнгі сабақтар тізімі (шаршау есебіне) — көшірме ЕМЕС, өзгертпеңіз
  lessonListOn(classId: string, day: number): { slot: number; score: number }[] {
    return this.dayLessons.get(`${classId}|${day}`) || [];
  }

  // Кандидатты кестеге бекіту. Ережелер АЛДЫН АЛА тексерілген деп есептейді.
  place(p: CandidatePlacement, score: number, eff: number): PlacedUnit {
    const cell = this.time.cell(p.day, p.slot);
    const sc = this.sCell(p.shift, p.day, p.slot);
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
      this.grid(this.tBusy, part.teacherId, this.time.cells * 2)[sc] = p.cls.id;
      if (part.roomId !== NO_ROOM) {
        const rg = this.grid(this.rBusy, part.roomId, this.time.cells * 2);
        rg[sc] = (rg[sc] || []).concat(p.cls.id);
      }
    }
    const cg = this.grid(this.cBusy, p.cls.id, this.time.cells);
    cg[cell] = (cg[cell] || []).concat(made) as Slot[];
    const sk = `${p.cls.id}|${p.s.id}|${p.day}`;
    this.subjDay.set(sk, (this.subjDay.get(sk) || 0) + 1);
    const dk = `${p.cls.id}|${p.day}`;
    this.dayCount.set(dk, (this.dayCount.get(dk) || 0) + 1);
    this.dayScore.set(dk, (this.dayScore.get(dk) || 0) + eff);
    const dl = this.dayLessons.get(dk) || [];
    dl.push({ slot: p.slot, score: eff });
    this.dayLessons.set(dk, dl);
    return { p, made, eff };
  }

  // Орналастыруды толық кері қайтару (repair/improve фазалары үшін)
  unplace(u: PlacedUnit): void {
    const { p } = u;
    const cell = this.time.cell(p.day, p.slot);
    const sc = this.sCell(p.shift, p.day, p.slot);
    for (const part of p.parts) {
      this.grid(this.tBusy, part.teacherId, this.time.cells * 2)[sc] = null;
      if (part.roomId !== NO_ROOM) {
        const rg = this.grid(this.rBusy, part.roomId, this.time.cells * 2);
        rg[sc] = (rg[sc] || []).filter((id) => id !== p.cls.id);
        if (rg[sc] && rg[sc]!.length === 0) rg[sc] = null;
      }
    }
    const cg = this.grid(this.cBusy, p.cls.id, this.time.cells);
    const keep = (cg[cell] || []).filter((s) => !u.made.includes(s as Slot));
    cg[cell] = keep.length ? (keep as Slot[]) : null;
    for (const m of u.made) {
      const i = this.slots.indexOf(m);
      if (i >= 0) this.slots.splice(i, 1);
    }
    const sk = `${p.cls.id}|${p.s.id}|${p.day}`;
    this.subjDay.set(sk, Math.max(0, (this.subjDay.get(sk) || 0) - 1));
    const dk = `${p.cls.id}|${p.day}`;
    this.dayCount.set(dk, Math.max(0, (this.dayCount.get(dk) || 0) - 1));
    this.dayScore.set(dk, Math.max(0, (this.dayScore.get(dk) || 0) - u.eff));
    const dl = this.dayLessons.get(dk) || [];
    const di = dl.findIndex((x) => x.slot === p.slot && x.score === u.eff);
    if (di >= 0) dl.splice(di, 1);
  }
}

export { NO_ROOM };
