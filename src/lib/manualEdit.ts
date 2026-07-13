// filepath: src/lib/manualEdit.ts
// Қолмен реттеу валидаторы (M5): дайын кестеде сабақты басқа ұяшыққа жылжыту
// немесе екі сабақтың орнын ауыстыру қауіпсіз бе — тексереді. Ережелер
// бұзылса адам тілінде себебін қайтарады (жасыл/қызыл ұяшық + түсіндірме).
// Қозғалтқыштан тәуелсіз — дайын кесте слоттарымен ғана жұмыс істейді.
import type { Slot, Subject, Teacher, Klass, Room } from "@/algorithm/engine";
import { HOMEROOM_SUBJECT_ID, maxSlots } from "@/algorithm/engine";
import type { Settings } from "@/algorithm/engine";

export interface EditCtx {
  subjects: Map<string, Subject>;
  teachers: Map<string, Teacher>;
  classes: Map<string, Klass>;
  rooms: Map<string, Room>;
  settings: Settings;
}

// Бір сабақтың барлық бөлігі (қос сабақ жұбы / топтар) — бір «блок».
// Оны бүтін күйінде жылжытамыз.
export function lessonBlock(slots: Slot[], anchor: Slot): Slot[] {
  // Қос сабақ: сол сынып+пән+күн, dpart 1 және 2 (қатар слоттар)
  if (anchor.dpart) {
    return slots.filter((o) =>
      o.classId === anchor.classId && o.subjectId === anchor.subjectId &&
      o.day === anchor.day && o.dpart);
  }
  // Топқа бөлінген: сол сынып+пән+күн+слот, барлық топ
  if (anchor.groupId) {
    return slots.filter((o) =>
      o.classId === anchor.classId && o.subjectId === anchor.subjectId &&
      o.day === anchor.day && o.slot === anchor.slot && o.groupId);
  }
  return [anchor];
}

export function isMovable(block: Slot[]): { ok: boolean; reason?: string } {
  if (block[0].subjectId === HOMEROOM_SUBJECT_ID)
    return { ok: false, reason: "Сынып сағаты автоматты орналасады" };
  if (block.some((o) => o.dpart))
    return { ok: false, reason: "Қос сабақты жылжыту әзірге қолжетімсіз" };
  if (block.some((o) => o.groupId))
    return { ok: false, reason: "Топқа бөлінген сабақты жылжыту әзірге қолжетімсіз" };
  return { ok: true };
}

// «block» сабағын (toDay,toSlot)-қа қоюға бола ма? ignore — есепке алынбайтын
// слоттар (өзін немесе своптағы екінші блокты). null=болады, string=себеп.
export function moveViolation(
  slots: Slot[], block: Slot[], toDay: number, toSlot: number,
  ctx: EditCtx, ignore: Set<string>,
): string | null {
  const b = block[0];
  const cls = ctx.classes.get(b.classId);
  if (!cls) return "сынып табылмады";
  const subj = ctx.subjects.get(b.subjectId);
  const shift = b.shift;

  // Күндік сабақ лимитінен аспау
  if (toSlot > maxSlots(cls.grade, ctx.settings)) return "күндік сабақ лимитінен асады";

  // Мақсат ұяшық сынып үшін бос па (өзінен басқа)
  const clsBusy = slots.some((o) =>
    !ignore.has(o.key) && o.classId === b.classId && o.day === toDay && o.slot === toSlot &&
    (!o.groupId || o.groupId === "Г1"));
  if (clsBusy) return "сыныпта бұл уақытта сабақ бар";

  // Бір күн — бір пән (өзін есептемей)
  const sameDaySubj = slots.some((o) =>
    !ignore.has(o.key) && o.classId === b.classId && o.subjectId === b.subjectId &&
    o.day === toDay && (!o.groupId || o.groupId === "Г1"));
  if (sameDaySubj) return `${subj?.name || "пән"} бұл күні қойылып қойған`;

  // Пәннің «икстап тастау» торы
  if (subj?.bannedSlots?.includes(`${toDay}-${toSlot}`))
    return `${subj.name} бұл уақытқа тыйым салынған`;

  for (const part of block) {
    const t = ctx.teachers.get(part.teacherId);
    // Мұғалім бос па (басқа сыныпта емес пе)
    const tBusy = slots.some((o) =>
      !ignore.has(o.key) && o.teacherId === part.teacherId && o.shift === shift &&
      o.day === toDay && o.slot === toSlot);
    if (tBusy) return `${t?.name || "мұғалім"} бұл уақытта басқа сыныпта`;
    // Мұғалім қолжетімсіз уақыты
    if (t?.unavailable.includes(`${toDay}-${toSlot}`)) return `${t.name} бұл уақытта бос емес`;
    // Кабинет бос па. Спортзал (gymMax) — бірнеше сынып бөліседі,
    // сондықтан санын әрі жас тобы үйлесімін тексереміз.
    if (part.roomId) {
      const room = ctx.rooms.get(part.roomId);
      const occ = slots.filter((o) =>
        !ignore.has(o.key) && o.roomId === part.roomId && o.shift === shift &&
        o.day === toDay && o.slot === toSlot);
      if (room?.type === "gym") {
        const cap = room.gymMax || 1;
        if (occ.length >= cap) return "спортзал бұл уақытта толы";
        const groups = room.gymGroups && room.gymGroups.length ? room.gymGroups : [[1, 11]];
        const grp = groups.find((g) => g[0] <= cls.grade && cls.grade <= g[1]);
        for (const oc of occ) {
          const ocl = ctx.classes.get(oc.classId);
          if (ocl && grp && !(grp[0] <= ocl.grade && ocl.grade <= grp[1]))
            return "спортзалда басқа жас тобы бар";
        }
      } else if (occ.length > 0) {
        return "кабинет бұл уақытта бос емес";
      }
    }
  }
  return null;
}

// Блокты жаңа орынға жылжытылған слоттармен қайтару (score өзгермейді)
export function movedBlock(block: Slot[], toDay: number, toSlot: number): Slot[] {
  // Жалғыз сабақ — тек күн/слот өзгереді
  return block.map((o) => ({ ...o, day: toDay, slot: toSlot }));
}
