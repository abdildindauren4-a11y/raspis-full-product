// filepath: src/lib/scheduleDiff.ts
// «Ақылды жаңарту» — белсенді кесте нұсқасын АҒЫМДАҒЫ деректермен салыстырып,
// қай сыныптардың кестесі ескіргенін (қайта құру керегін) анықтайды.
//
// Оқу жылының басында деректер тұрақсыз: сынып қосылады/азаяды, мұғалім
// кетеді/келеді, сағаттар өзгереді. Мұндайда бүкіл кестені қайта құру тиімсіз —
// басқа сыныптардың дайын кестесі бұзылады. Бұл модуль өзгеріске ұшыраған
// сыныптарды ғана тауып береді, GeneratePage оларды partial режимде қайта
// құрады да, қалғандарын құлыптап сол күйінде қалдырады.
import {
  HOMEROOM_SUBJECT_ID,
  type Slot, type Klass, type Teacher, type Subject, type Room,
} from "@/algorithm/engine";

export interface DiffReason {
  classId?: string; // қатысты сынып (жалпы өзгерісте бос)
  text: string;     // адамға түсінікті себеп
}

export interface ScheduleDiff {
  affectedClassIds: string[]; // қайта құрылатын сыныптар
  reasons: DiffReason[];      // не өзгергені (UI тізімі)
  keptCount: number;          // өзгеріссіз қалатын сыныптар саны
}

const DAY_KK = ["", "Дс", "Сс", "Ср", "Бс", "Жм"];

export function diffSchedule(
  baseSlots: Slot[],
  data: { classes: Klass[]; teachers: Teacher[]; subjects: Subject[]; rooms: Room[] }
): ScheduleDiff {
  const T: Record<string, Teacher> = {}; data.teachers.forEach((t) => (T[t.id] = t));
  const S: Record<string, Subject> = {}; data.subjects.forEach((s) => (S[s.id] = s));
  const R: Record<string, Room> = {}; data.rooms.forEach((r) => (R[r.id] = r));

  const affected = new Set<string>();
  const reasons: DiffReason[] = [];
  const seen = new Set<string>(); // себептерді қайталамау үшін
  const addReason = (classId: string | undefined, text: string) => {
    if (seen.has(text)) return;
    seen.add(text);
    reasons.push({ classId, text });
    if (classId) affected.add(classId);
  };

  // Сынып сағаты — нағыз сабақ емес (ЭТАП 9 қайта қосады), салыстырудан тыс
  const realSlots = baseSlots.filter((b) => b.subjectId !== HOMEROOM_SUBJECT_ID);
  const slotsByClass = new Map<string, Slot[]>();
  for (const b of realSlots) {
    const arr = slotsByClass.get(b.classId);
    if (arr) arr.push(b); else slotsByClass.set(b.classId, [b]);
  }

  // Ескі кестеде бар, қазір өшірілген сыныптар — қайта құру керек емес,
  // олардың слоттары жаңа нұсқада өздігінен түсіп қалады (құлыптау сүзгісі)
  const currentIds = new Set(data.classes.map((c) => c.id));
  const removedCount = [...slotsByClass.keys()].filter((cid) => !currentIds.has(cid)).length;
  if (removedCount)
    addReason(undefined, `${removedCount} сынып тізімнен өшірілген — сабақтары жаңа нұсқада алынады`);

  for (const cls of data.classes) {
    const own = slotsByClass.get(cls.id);

    // Жаңа сынып — кестеде мүлдем жоқ
    if (!own || !own.length) {
      addReason(cls.id, `«${cls.name}» — жаңа сынып, кестеде әлі жоқ`);
      continue;
    }

    // Слот бойынша тексеру: мұғалім/пән/кабинет әлі бар ма, талаптары өзгерді ме
    for (const b of own) {
      const t = b.teacherId ? T[b.teacherId] : null;
      if (!t) { addReason(cls.id, `«${cls.name}»: кестедегі мұғалім тізімнен өшірілген`); continue; }
      if (!S[b.subjectId]) { addReason(cls.id, `«${cls.name}»: кестедегі пән тізімнен өшірілген`); continue; }
      if (b.roomId && !R[b.roomId]) { addReason(cls.id, `«${cls.name}»: кестедегі кабинет өшірілген`); continue; }
      if (b.shift !== cls.shift) { addReason(cls.id, `«${cls.name}»: ауысымы өзгерген (кесте ${b.shift}-ауысымда құрылған)`); continue; }
      if (t.unavailable.includes(`${b.day}-${b.slot}`))
        addReason(cls.id, `«${cls.name}»: ${t.name} енді ${DAY_KK[b.day]} ${b.slot}-сабақта бос емес`);
      if (t.shift !== 3 && t.shift !== cls.shift)
        addReason(cls.id, `«${cls.name}»: ${t.name} ауысымы сәйкес келмейді`);
      if (cls.grade < t.gradeMin || cls.grade > t.gradeMax)
        addReason(cls.id, `«${cls.name}»: ${t.name} сынып деңгейі шектеуіне сәйкес емес`);
    }

    // Оқу жоспарымен салыстыру: сағат саны және мұғалім тағайындауы
    // (топқа бөлінген сабақта екі топ бір мезгілде — сағатты Г1 бойынша санаймыз)
    const hourCount = new Map<string, number>();
    for (const b of own)
      if (!b.groupId || b.groupId === "Г1")
        hourCount.set(b.subjectId, (hourCount.get(b.subjectId) || 0) + 1);

    const planned = new Map<string, number>();
    for (const cu of cls.curriculum)
      if (cu.hours) planned.set(cu.subjectId, (planned.get(cu.subjectId) || 0) + cu.hours);

    for (const [subId, need] of planned) {
      const have = hourCount.get(subId) || 0;
      const sName = S[subId]?.name || "?";
      if (have !== need)
        addReason(cls.id, `«${cls.name}»: «${sName}» сағаты өзгерген (кестеде ${have}, жоспарда ${need})`);
    }
    for (const [subId, have] of hourCount)
      if (!planned.has(subId) && S[subId])
        addReason(cls.id, `«${cls.name}»: «${S[subId].name}» жоспардан алынған (кестеде ${have} сағ қалған)`);

    // Мұғалім ауысқан ба (жоспардағы мұғалім ≠ кестедегі мұғалім)
    for (const cu of cls.curriculum) {
      if (!cu.hours) continue;
      const subSlots = own.filter((b) => b.subjectId === cu.subjectId);
      if (!subSlots.length) continue; // сағат сәйкессіздігі жоғарыда ұсталды
      const sName = S[cu.subjectId]?.name || "?";
      if (cu.isSplit) {
        const plannedT = new Set((cu.groups || []).map((g) => g.teacherId));
        if (subSlots.some((b) => b.teacherId && !plannedT.has(b.teacherId)))
          addReason(cls.id, `«${cls.name}»: «${sName}» топ мұғалімдері ауысқан`);
      } else if (cu.teacherId && subSlots.some((b) => b.teacherId !== cu.teacherId)) {
        addReason(cls.id, `«${cls.name}»: «${sName}» мұғалімі ауысқан`);
      }
    }
  }

  // Сынып ретімен (деректегі тәртіп) қайтарамыз — UI тұрақты көрінеді
  const order = data.classes.map((c) => c.id);
  const affectedClassIds = [...affected].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return {
    affectedClassIds,
    reasons,
    keptCount: data.classes.length - affectedClassIds.length,
  };
}
