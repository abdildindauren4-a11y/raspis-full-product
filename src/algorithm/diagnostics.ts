// filepath: src/algorithm/diagnostics.ts
// ════════════════════════════════════════════════════════════════════
// РАСПИС ДИАГНОСТИКА ЖҮЙЕСІ — кәсіби деңгей
// Мектеп кестесінде болуы мүмкін барлық қателерді сериялық кодтармен
// талдап, әрқайсына нақты шешім ұсынады.
//
// КОД ЖҮЙЕСІ:
//   E = Error (қате — кесте толық құрылмайды)
//   W = Warning (ескерту — кесте құрылады, бірақ сапасы төмендейді)
//   I = Info (ақпарат — назар аударуға тұрарлық)
//
// КАТЕГОРИЯЛАР (нөмір бірінші саны):
//   1xx — Мұғалім (teacher)
//   2xx — Кабинет (room)
//   3xx — Сыйымдылық (capacity)
//   4xx — Жүктеме / баланс (load)
//   5xx — Пән / оқу жоспары (subject / curriculum)
//   6xx — Уақыт / слот / ауысым (time)
//   7xx — Топ / бөліну (group)
//   8xx — Конфигурация / жалпы (config)
// ════════════════════════════════════════════════════════════════════

import type { Subject, Teacher, Room, Klass, RoomType, School, Settings } from "./engine";
import { maxSlots } from "./engine";

export interface DiagInput {
  classes: Klass[];
  teachers: Teacher[];
  rooms: Room[];
  subjects: Subject[];
  school?: School;
  settings?: Settings; // maxLessons лимиті — сыйымдылық есептеріне
}

export interface DiagNote {
  code: string;        // сериялық код, мыс. "E101"
  level: "error" | "warning" | "info";
  category: "teacher" | "room" | "capacity" | "load" | "subject" | "time" | "group" | "config";
  title: string;       // қысқа тақырып
  detail: string;      // не болды (динамикалық)
  fix: string;         // нақты шешім
  ref?: string;        // қай бетте түзетеді
}

const ROOM_KK: Record<RoomType, string> = {
  regular: "қарапайым", physics: "физика", chemistry: "химия", computer: "информатика", gym: "спортзал",
};

// Бір ауысымдағы шамамен максимум слот (нақтысы сыныпқа қарай maxSlots арқылы)
const WEEK_DAYS = 5;
const NORM_PER_TEACHER = 20; // орташа мұғалім нормасы (есеп үшін)

// Категория → нөмір префиксі
const CAT_PREFIX: Record<DiagNote["category"], number> = {
  teacher: 100, room: 200, capacity: 300, load: 400,
  subject: 500, time: 600, group: 700, config: 800,
};

// ════════════════════════════════════════════════════════════════════
// НЕГІЗГІ ДИАГНОСТИКА
// ════════════════════════════════════════════════════════════════════
export function diagnose(input: DiagInput): DiagNote[] {
  const notes: DiagNote[] = [];
  const { classes, teachers, rooms, subjects, school, settings } = input;

  const subjById = new Map(subjects.map((s) => [s.id, s]));
  const subjByName = new Map(subjects.map((s) => [s.name, s]));
  const getSubj = (key: string) => subjById.get(key) || subjByName.get(key);
  const teacherById = new Map(teachers.map((t) => [t.id, t]));
  const roomById = new Map(rooms.map((r) => [r.id, r]));

  const add = (n: Omit<DiagNote, "code"> & { num: number }) => {
    const prefix = CAT_PREFIX[n.category];
    const letter = n.level === "error" ? "E" : n.level === "warning" ? "W" : "I";
    const { num, ...rest } = n;
    notes.push({ ...rest, code: `${letter}${prefix + num}` });
  };

  // ══════════════════════════════════════════════════════════
  // БЛОК 0: НЕГІЗГІ КОНФИГУРАЦИЯ (8xx)
  // ══════════════════════════════════════════════════════════
  if (classes.length === 0) {
    add({ num: 1, level: "error", category: "config", title: "Сынып жоқ",
      detail: "Жүйеде бірде-бір сынып енгізілмеген. Кесте құру мүмкін емес.",
      fix: "«Сыныптар» бетінде кемінде бір сынып қосыңыз.", ref: "Сыныптар" });
    return notes; // сыныпсыз әрі қарай талдаудың мәні жоқ
  }
  if (teachers.length === 0) {
    add({ num: 2, level: "error", category: "config", title: "Мұғалім жоқ",
      detail: "Жүйеде бірде-бір мұғалім енгізілмеген.",
      fix: "«Мұғалімдер» бетінде мұғалімдерді қосыңыз.", ref: "Мұғалімдер" });
  }
  if (rooms.length === 0) {
    add({ num: 3, level: "error", category: "config", title: "Кабинет жоқ",
      detail: "Жүйеде бірде-бір кабинет жоқ. Сабақтарды орналастыруға орын жоқ.",
      fix: "«Кабинеттер» бетінде кабинеттерді қосыңыз.", ref: "Кабинеттер" });
  }
  if (subjects.length === 0) {
    add({ num: 4, level: "error", category: "config", title: "Пән жоқ",
      detail: "Пәндер тізімі бос.",
      fix: "«Пәндер» бетінде пәндерді қосыңыз немесе үлгіні импорттаңыз.", ref: "Пәндер" });
  }

  // Оқу жоспары бос сыныптар
  const emptyClasses = classes.filter((c) => !c.curriculum || c.curriculum.length === 0);
  if (emptyClasses.length > 0) {
    add({ num: 5, level: "error", category: "config",
      title: `${emptyClasses.length} сыныптың оқу жоспары бос`,
      detail: `Мына сыныптарда сабақ жоқ: ${emptyClasses.map((c) => c.name).join(", ")}. Бұл сыныптарға кесте құрылмайды.`,
      fix: "Әр сыныпқа «Оқу жоспары» арқылы пәндер мен сағаттарды енгізіңіз.", ref: "Сыныптар → Оқу жоспары" });
  }

  // Оқушы саны көрсетілмеген сыныптар
  const noStudents = classes.filter((c) => !c.students || c.students <= 0);
  if (noStudents.length > 0) {
    add({ num: 6, level: "warning", category: "config",
      title: `${noStudents.length} сыныпта оқушы саны жоқ`,
      detail: `Мына сыныптарда оқушы саны 0: ${noStudents.map((c) => c.name).join(", ")}. Сыйымдылық тексерісі дұрыс жұмыс істемейді.`,
      fix: "Әр сыныптың оқушы санын көрсетіңіз.", ref: "Сыныптар" });
  }

  // Қайталанатын сынып атаулары
  const classNameCount = new Map<string, number>();
  classes.forEach((c) => classNameCount.set(c.name, (classNameCount.get(c.name) || 0) + 1));
  const dupClasses = [...classNameCount.entries()].filter(([, n]) => n > 1);
  if (dupClasses.length > 0) {
    add({ num: 7, level: "warning", category: "config",
      title: "Қайталанатын сынып атаулары",
      detail: `Бірдей атаулы сыныптар бар: ${dupClasses.map(([n, c]) => `${n} (${c} рет)`).join(", ")}. Бұл шатасуға әкеледі.`,
      fix: "Әр сыныпқа бірегей атау беріңіз (мыс. 5А, 5Б).", ref: "Сыныптар" });
  }

  // Қайталанатын кабинет нөмірлері
  const roomNumCount = new Map<string, number>();
  rooms.forEach((r) => roomNumCount.set(r.number, (roomNumCount.get(r.number) || 0) + 1));
  const dupRooms = [...roomNumCount.entries()].filter(([, n]) => n > 1);
  if (dupRooms.length > 0) {
    add({ num: 8, level: "warning", category: "config",
      title: "Қайталанатын кабинет нөмірлері",
      detail: `Бірдей нөмірлі кабинеттер: ${dupRooms.map(([n]) => n).join(", ")}.`,
      fix: "Әр кабинетке бірегей нөмір беріңіз.", ref: "Кабинеттер" });
  }

  // ══════════════════════════════════════════════════════════
  // БЛОК 1: МҰҒАЛІМ (1xx)
  // ══════════════════════════════════════════════════════════

  // Әр мұғалімге тағайындалған жүктеме
  const teacherLoad = new Map<string, number>();
  for (const c of classes) {
    for (const cu of c.curriculum || []) {
      if (cu.teacherId) teacherLoad.set(cu.teacherId, (teacherLoad.get(cu.teacherId) || 0) + cu.hours);
      // топ мұғалімдері
      for (const g of cu.groups || []) {
        if (g.teacherId) teacherLoad.set(g.teacherId, (teacherLoad.get(g.teacherId) || 0) + cu.hours);
      }
    }
  }

  // E101 — мұғалім нормадан асып кеткен
  const overloaded: { name: string; load: number; norm: number }[] = [];
  for (const t of teachers) {
    const load = teacherLoad.get(t.id) || 0;
    if (t.norm > 0 && load > t.norm) overloaded.push({ name: t.name, load, norm: t.norm });
  }
  if (overloaded.length > 0) {
    const worst = overloaded.sort((a, b) => (b.load - b.norm) - (a.load - a.norm)).slice(0, 4);
    add({ num: 1, level: "warning", category: "teacher",
      title: `${overloaded.length} мұғалім нормадан артық жүктелген`,
      detail: worst.map((t) => `${t.name}: ${t.load} сағат (норма ${t.norm}, +${t.load - t.norm})`).join("; ") + (overloaded.length > 4 ? ` және тағы ${overloaded.length - 4}` : ""),
      fix: "Бұл мұғалімдердің «Аптасына сағат» нормасын арттырыңыз немесе пәндерін басқа мұғалімдерге бөліңіз.", ref: "Мұғалімдер" });
  }

  // W102 — мұғалім нормасы 0 немесе тым аз
  const lowNorm = teachers.filter((t) => (teacherLoad.get(t.id) || 0) > 0 && t.norm <= 0);
  if (lowNorm.length > 0) {
    add({ num: 2, level: "error", category: "teacher",
      title: `${lowNorm.length} мұғалімнің нормасы 0`,
      detail: `Мына мұғалімдерге сабақ берілген, бірақ нормасы 0: ${lowNorm.map((t) => t.name).join(", ")}. Олардың сабақтары орналаспайды.`,
      fix: "Бұл мұғалімдерге дұрыс апталық норма (мыс. 18) қойыңыз.", ref: "Мұғалімдер" });
  }

  // I103 — мұғалім жүктемесі нормадан әлдеқайда аз (бос ресурс)
  const underUsed = teachers.filter((t) => {
    const load = teacherLoad.get(t.id) || 0;
    return t.norm > 0 && load > 0 && load < t.norm * 0.4;
  });
  if (underUsed.length >= 3) {
    add({ num: 3, level: "info", category: "teacher",
      title: `${underUsed.length} мұғалім аз жүктелген`,
      detail: `Кейбір мұғалімдер нормасының 40%-нан азын ғана алады. Бұл — бос ресурс. Қажет болса, оларға қосымша сабақ беруге болады.`,
      fix: "Тапшы пәндерді осы мұғалімдерге қайта бөлуге болады (рұқсат етілген сыныптар сай болса).", ref: "Мұғалімдер" });
  }

  // Пән бойынша мұғалім жеткіліктілігі
  const subjectHours = new Map<string, number>();
  const subjectTeachers = new Map<string, Set<string>>();
  for (const c of classes) {
    for (const cu of c.curriculum || []) {
      const s = getSubj(cu.subjectId);
      if (!s) continue;
      subjectHours.set(s.name, (subjectHours.get(s.name) || 0) + cu.hours);
      if (!subjectTeachers.has(s.name)) subjectTeachers.set(s.name, new Set());
      if (cu.teacherId) subjectTeachers.get(s.name)!.add(cu.teacherId);
      for (const g of cu.groups || []) if (g.teacherId) subjectTeachers.get(s.name)!.add(g.teacherId);
    }
  }

  for (const [subjName, hours] of subjectHours) {
    const tIds = subjectTeachers.get(subjName);
    // E104 — пәнге мұғалім мүлдем тағайындалмаған
    if (!tIds || tIds.size === 0) {
      add({ num: 4, level: "error", category: "teacher",
        title: `«${subjName}» — мұғалім тағайындалмаған`,
        detail: `Бұл пәнге аптасына ${hours} сағат керек, бірақ бірде-бір мұғалім тағайындалмаған. Сабақтар орналаспайды.`,
        fix: `«Оқу жоспары» бетінде «${subjName}» пәніне мұғалім тағайындаңыз.`, ref: "Сыныптар → Оқу жоспары" });
      continue;
    }
    // E105 — пәнге мұғалім жетіспейді (норма жетпейді)
    let totalNorm = 0;
    for (const tid of tIds) { const t = teacherById.get(tid); if (t) totalNorm += t.norm; }
    if (hours > totalNorm && totalNorm > 0) {
      const shortage = hours - totalNorm;
      const extra = Math.ceil(shortage / NORM_PER_TEACHER);
      add({ num: 5, level: "error", category: "teacher",
        title: `«${subjName}» — мұғалім жетіспейді`,
        detail: `Пәнге аптасына ${hours} сағат керек, бірақ ${tIds.size} мұғалімнің жалпы нормасы ${totalNorm} сағат. ${shortage} сағат артық қалады.`,
        fix: `Тағы ${extra} «${subjName}» мұғалімін қосыңыз, немесе бар мұғалімдердің нормасын арттырыңыз (әрқайсысы ~${Math.ceil(hours / tIds.size)} сағатқа).`, ref: "Мұғалімдер" });
    }
  }

  // W106 — мұғалім сынып деңгейіне сай емес (gradeMin/Max)
  const gradeMismatch: string[] = [];
  for (const c of classes) {
    for (const cu of c.curriculum || []) {
      const t = cu.teacherId ? teacherById.get(cu.teacherId) : null;
      if (!t) continue;
      if (c.grade < t.gradeMin || c.grade > t.gradeMax) {
        const s = getSubj(cu.subjectId);
        gradeMismatch.push(`${t.name} → ${c.name} (${s?.name || "пән"})`);
      }
    }
  }
  if (gradeMismatch.length > 0) {
    add({ num: 6, level: "warning", category: "teacher",
      title: `${gradeMismatch.length} жағдайда мұғалім сынып деңгейіне сай емес`,
      detail: `Мұғалімге рұқсат етілмеген сынып деңгейінде сабақ берілген: ${gradeMismatch.slice(0, 3).join("; ")}${gradeMismatch.length > 3 ? " және т.б." : ""}.`,
      fix: "Мұғалімнің «Диапазон» (gradeMin–gradeMax) параметрін кеңейтіңіз немесе сабақты сай мұғалімге беріңіз.", ref: "Мұғалімдер" });
  }

  // W107 — мұғалімде бос уақыт тым көп бұғатталған (unavailable)
  const heavyBlocked = teachers.filter((t) => {
    const load = teacherLoad.get(t.id) || 0;
    const totalSlots = WEEK_DAYS * 8; // шамамен
    return load > 0 && t.unavailable.length > totalSlots * 0.5;
  });
  if (heavyBlocked.length > 0) {
    add({ num: 7, level: "warning", category: "teacher",
      title: `${heavyBlocked.length} мұғалімде бос уақыт тым шектеулі`,
      detail: `Мына мұғалімдер уақытының жартысынан көбін бұғаттаған: ${heavyBlocked.map((t) => `${t.name} (${t.unavailable.length} слот жабық)`).join(", ")}. Сабақтарын орналастыру қиын.`,
      fix: "Бұл мұғалімдердің «Қолжетімсіз уақыт» тізімін қысқартыңыз немесе жүктемесін азайтыңыз.", ref: "Мұғалімдер" });
  }

  // ══════════════════════════════════════════════════════════
  // БЛОК 2: КАБИНЕТ (2xx)
  // ══════════════════════════════════════════════════════════

  const roomTypeCount = new Map<RoomType, number>();
  for (const r of rooms) roomTypeCount.set(r.type, (roomTypeCount.get(r.type) || 0) + 1);

  // Арнайы кабинет түріне керек сағат
  const specialHours = new Map<RoomType, number>();
  for (const c of classes) {
    for (const cu of c.curriculum || []) {
      const s = getSubj(cu.subjectId);
      if (!s || !s.room) continue;
      specialHours.set(s.room, (specialHours.get(s.room) || 0) + cu.hours);
    }
  }

  for (const [roomType, hours] of specialHours) {
    if (roomType === "regular") continue;
    const count = roomTypeCount.get(roomType) || 0;
    // әр кабинет аптасына шамамен WEEK_DAYS * 8 слот
    const capacity = count * WEEK_DAYS * 8;
    // E201 — арнайы кабинет түрі мүлдем жоқ
    if (count === 0) {
      add({ num: 1, level: "error", category: "room",
        title: `${ROOM_KK[roomType]} кабинеті жоқ`,
        detail: `«${ROOM_KK[roomType]}» түрін қажет ететін пәндерге аптасына ${hours} сағат керек, бірақ бұл түрдегі кабинет жоқ. Бұл сабақтар орналаспайды.`,
        fix: `«Кабинеттер» бетінде кемінде 1 «${ROOM_KK[roomType]}» кабинетін қосыңыз.`, ref: "Кабинеттер" });
    }
    // E202 — арнайы кабинет жетіспейді
    else if (hours > capacity) {
      const shortage = hours - capacity;
      const extra = Math.ceil(shortage / (WEEK_DAYS * 8));
      add({ num: 2, level: "error", category: "room",
        title: `${ROOM_KK[roomType]} кабинеті жетіспейді`,
        detail: `«${ROOM_KK[roomType]}» пәндеріне аптасына ${hours} сағат керек, бірақ ${count} кабинет тек ~${capacity} сағатты көтереді. ${shortage} сағат сыймайды.`,
        fix: `Тағы ${extra} «${ROOM_KK[roomType]}» кабинетін қосыңыз.`, ref: "Кабинеттер" });
    }
    // W203 — арнайы кабинет тығыз (85%+)
    else if (hours > capacity * 0.85) {
      add({ num: 3, level: "warning", category: "room",
        title: `${ROOM_KK[roomType]} кабинеті тығыз`,
        detail: `«${ROOM_KK[roomType]}» жүктемесі ${hours}/${capacity} сағат (${Math.round(hours / capacity * 100)}%). Икемділік аз — кесте құрылады, бірақ ауыстыру қиын болады.`,
        fix: `Мүмкіндік болса тағы 1 «${ROOM_KK[roomType]}» кабинетін қосқан дұрыс.`, ref: "Кабинеттер" });
    }
  }

  // Қарапайым кабинет жеткіліктілігі
  const regularCount = roomTypeCount.get("regular") || 0;
  const shift1 = classes.filter((c) => c.shift === 1).length;
  const shift2 = classes.filter((c) => c.shift === 2).length;
  const maxConcurrent = Math.max(shift1, shift2);
  const otherRooms = (roomTypeCount.get("physics") || 0) + (roomTypeCount.get("chemistry") || 0) + (roomTypeCount.get("computer") || 0);

  // E204 — қарапайым кабинет мүлдем жетпейді
  if (regularCount === 0 && classes.length > 0) {
    add({ num: 4, level: "error", category: "room",
      title: "Қарапайым кабинет жоқ",
      detail: `${classes.length} сынып бар, бірақ қарапайым кабинет жоқ. Көп пән қарапайым кабинетте өтеді.`,
      fix: "«Кабинеттер» бетінде қарапайым кабинеттер қосыңыз.", ref: "Кабинеттер" });
  }
  // W205 — қарапайым кабинет жеткіліксіз болуы мүмкін
  else if (regularCount > 0 && maxConcurrent > regularCount + otherRooms) {
    const shortage = maxConcurrent - regularCount;
    add({ num: 5, level: "warning", category: "room",
      title: "Қарапайым кабинет жеткіліксіз болуы мүмкін",
      detail: `Бір ауысымда ${maxConcurrent} сынып қатар оқиды, бірақ қарапайым кабинет ${regularCount} (+ ${otherRooms} арнайы). Бір сабақта бәріне орын жетпеуі мүмкін.`,
      fix: `Тағы ${shortage} қарапайым кабинет қосыңыз немесе сыныптарды екі ауысымға теңірек бөліңіз (қазір: таңғы ${shift1}, түстен кейін ${shift2}).`, ref: "Кабинеттер / Сыныптар" });
  }

  // W206 — спортзал ережесі (gymMax) тым шектеулі
  const gyms = rooms.filter((r) => r.type === "gym");
  const gymHours = specialHours.get("gym") || 0;
  if (gyms.length > 0 && gymHours > 0) {
    const tightGym = gyms.filter((g) => g.gymMax && g.gymMax < 2);
    if (tightGym.length === gyms.length && gyms.length > 0) {
      add({ num: 6, level: "info", category: "room",
        title: "Спортзал бір уақытта бір сыныпты ғана қабылдайды",
        detail: `Барлық спортзалда «бір уақытта макс 1 сынып» ережесі. Дене шынықтыру сабақтары созылып, тығыз болуы мүмкін.`,
        fix: "Спортзал үлкен болса, «бір уақытта 2 сынып» рұқсат етіңіз (gymMax арттыру).", ref: "Кабинеттер" });
    }
  }

  // I207 — оқу жоспарында бар, бірақ кабинеті жоқ арнайы пәндер
  const neededTypes = new Set<RoomType>();
  for (const c of classes) for (const cu of c.curriculum || []) {
    const s = getSubj(cu.subjectId);
    if (s?.room && s.room !== "regular") neededTypes.add(s.room);
  }
  const missingTypes = [...neededTypes].filter((rt) => (roomTypeCount.get(rt) || 0) === 0);
  if (missingTypes.length > 0 && missingTypes.length < neededTypes.size) {
    // (E201 толық жоқтарды қамтиды; бұл — жалпы ескерту)
    add({ num: 7, level: "info", category: "room",
      title: "Кейбір арнайы кабинет түрлері жоқ",
      detail: `Оқу жоспарында қажет, бірақ жоқ: ${missingTypes.map((rt) => ROOM_KK[rt]).join(", ")}.`,
      fix: "Қажет кабинет түрлерін қосыңыз.", ref: "Кабинеттер" });
  }

  // ══════════════════════════════════════════════════════════
  // БЛОК 3: СЫЙЫМДЫЛЫҚ (3xx)
  // ══════════════════════════════════════════════════════════

  // E301 — бекітілген кабинет оқушыдан кіші (бастауыш)
  const homeRoomSmall: string[] = [];
  for (const c of classes) {
    if (!c.homeRoomId) continue;
    const room = roomById.get(c.homeRoomId);
    if (!room || !room.capacity) continue;
    if (c.students > room.capacity) {
      homeRoomSmall.push(`${c.name} (${c.students} оқушы → каб. ${room.number}: ${room.capacity} орын)`);
    }
  }
  if (homeRoomSmall.length > 0) {
    add({ num: 1, level: "warning", category: "capacity",
      title: `${homeRoomSmall.length} сыныптың бекітілген кабинеті тар`,
      detail: `Бекітілген кабинет оқушы санынан кіші: ${homeRoomSmall.slice(0, 3).join("; ")}${homeRoomSmall.length > 3 ? " және т.б." : ""}.`,
      fix: "Бұл сыныптарға үлкенірек кабинет бекітіңіз немесе кабинет сыйымдылығын арттырыңыз.", ref: "Сыныптар / Кабинеттер" });
  }

  // W302 — ең үлкен сыныпқа сыятын кабинет жоқ
  const biggest = classes.reduce((m, c) => (c.students > m.students ? c : m), classes[0]);
  const roomsWithCap = rooms.filter((r) => r.capacity && r.capacity > 0);
  if (biggest && roomsWithCap.length > 0) {
    const biggestRoom = roomsWithCap.reduce((m, r) => ((r.capacity || 0) > (m.capacity || 0) ? r : m), roomsWithCap[0]);
    if (biggest.students > (biggestRoom.capacity || 0)) {
      add({ num: 2, level: "warning", category: "capacity",
        title: "Ең үлкен сыныпқа сыятын кабинет жоқ",
        detail: `${biggest.name} сыныбында ${biggest.students} оқушы, бірақ ең үлкен кабинет тек ${biggestRoom.capacity} орын. Бұл сынып ешбір кабинетке толық сыймайды.`,
        fix: `Кемінде бір кабинеттің сыйымдылығын ${biggest.students} орынға дейін арттырыңыз, немесе бұл сыныпты топқа бөліңіз.`, ref: "Кабинеттер" });
    }
  }

  // W303 — сыятын кабинеттер аз (көп үлкен сынып, аз үлкен кабинет)
  if (roomsWithCap.length > 0) {
    const avgStudents = classes.reduce((a, c) => a + (c.students || 0), 0) / classes.length;
    const bigClasses = classes.filter((c) => c.students > avgStudents * 1.1).length;
    const bigRooms = roomsWithCap.filter((r) => (r.capacity || 0) >= avgStudents * 1.1).length;
    if (bigClasses > 0 && bigRooms > 0 && bigClasses > bigRooms * WEEK_DAYS * 6) {
      add({ num: 3, level: "info", category: "capacity",
        title: "Үлкен сыныптарға кабинет тапшы болуы мүмкін",
        detail: `Орташадан үлкен ${bigClasses} сынып бар, бірақ оларға сыятын кабинет аз. Алгоритм оларды үлкен кабинеттерге сыйғызуға тырысады, бірақ тығыз болуы мүмкін.`,
        fix: "Үлкен сыйымдылықты кабинеттер санын арттырыңыз.", ref: "Кабинеттер" });
    }
  }

  // I304 — сыйымдылығы көрсетілмеген кабинеттер
  const noCap = rooms.filter((r) => !r.capacity || r.capacity <= 0);
  if (noCap.length > 0 && noCap.length < rooms.length) {
    add({ num: 4, level: "info", category: "capacity",
      title: `${noCap.length} кабинеттің сыйымдылығы көрсетілмеген`,
      detail: `Сыйымдылығы белгісіз кабинеттер шектеусіз деп саналады. Бұл тар кабинетке көп оқушы қойылуына әкелуі мүмкін.`,
      fix: "Барлық кабинеттің нақты сыйымдылығын көрсетіңіз.", ref: "Кабинеттер" });
  }

  // ══════════════════════════════════════════════════════════
  // БЛОК 4: ЖҮКТЕМЕ / БАЛАНС (4xx)
  // ══════════════════════════════════════════════════════════

  // Жалпы сұраныс vs ұсыныс (барлық сабақ vs барлық слот)
  let totalLessonHours = 0;
  for (const c of classes) for (const cu of c.curriculum || []) {
    const isGroup = cu.groups && cu.groups.length > 0;
    totalLessonHours += isGroup ? cu.hours : cu.hours; // топ қатар, бірақ кабинет бөлек
  }
  const totalTeacherCapacity = teachers.reduce((a, t) => a + Math.max(0, t.norm), 0);

  // E401 — жалпы мұғалім нормасы жалпы сабаққа жетпейді
  if (totalTeacherCapacity > 0 && totalLessonHours > totalTeacherCapacity) {
    const shortage = totalLessonHours - totalTeacherCapacity;
    const extra = Math.ceil(shortage / NORM_PER_TEACHER);
    add({ num: 1, level: "error", category: "load",
      title: "Жалпы мұғалім ресурсы жетіспейді",
      detail: `Барлық сыныпқа аптасына ${totalLessonHours} сабақ-сағат керек, бірақ мұғалімдердің жалпы нормасы ${totalTeacherCapacity} сағат. ${shortage} сағат артық.`,
      fix: `Жалпы алғанда тағы ~${extra} мұғалім қосыңыз немесе бар мұғалімдердің нормаларын арттырыңыз.`, ref: "Мұғалімдер" });
  }
  // W402 — жүктеме шегіне жақын (90%+)
  else if (totalTeacherCapacity > 0 && totalLessonHours > totalTeacherCapacity * 0.9) {
    add({ num: 2, level: "warning", category: "load",
      title: "Мұғалім ресурсы шегіне жақын",
      detail: `Жалпы жүктеме мұғалім ресурсының ${Math.round(totalLessonHours / totalTeacherCapacity * 100)}%-ын алады. Икемділік аз.`,
      fix: "Қор болуы үшін бірнеше мұғалімнің нормасын арттырыңыз немесе мұғалім қосыңыз.", ref: "Мұғалімдер" });
  }

  // Ауысым теңгерімсіздігі
  if (shift1 > 0 && shift2 > 0) {
    const ratio = Math.max(shift1, shift2) / Math.min(shift1, shift2);
    // W403 — ауысымдар тым теңгерімсіз
    if (ratio > 2.5) {
      add({ num: 3, level: "info", category: "load",
        title: "Ауысымдар арасында үлкен теңгерімсіздік",
        detail: `Таңғы ауысымда ${shift1} сынып, түстен кейін ${shift2}. Бір ауысым тым жүктелген, екіншісі бос. Кабинет/мұғалім тиімсіз қолданылуы мүмкін.`,
        fix: "Сыныптарды ауысымдар арасында теңірек бөлуге болады (мүмкіндік болса).", ref: "Сыныптар" });
    }
  }

  // ══════════════════════════════════════════════════════════
  // БЛОК 5: ПӘН / ОҚУ ЖОСПАРЫ (5xx)
  // ══════════════════════════════════════════════════════════

  // E501 — сыныпқа апталық сабақ ауысым лимитінен асады
  for (const c of classes) {
    const bySubject = new Map<string, number>();
    for (const cu of c.curriculum || []) {
      const s = getSubj(cu.subjectId);
      const key = s?.name || cu.subjectId;
      // топ қатар өтеді → ең көп сағатты аламыз
      bySubject.set(key, Math.max(bySubject.get(key) || 0, cu.hours));
    }
    const totalSlots = [...bySubject.values()].reduce((a, b) => a + b, 0);
    const limit = maxSlots(c.grade, settings) * WEEK_DAYS;
    if (totalSlots > limit) {
      const over = totalSlots - limit;
      add({ num: 1, level: "error", category: "subject",
        title: `${c.name}: сабақ сыймайды`,
        detail: `${c.name} сыныбына аптасына ${totalSlots} слот керек, бірақ бір ауысымда тек ${limit} орын (${WEEK_DAYS} күн × ${maxSlots(c.grade, settings)} сабақ). ${over} сабақ артық.`,
        fix: `${c.name} оқу жоспарынан ${over} сағат азайтыңыз (екінші дәреже пәндерден), немесе ${c.grade}-сынып үшін күндік сабақ лимитін арттырыңыз (Алгоритм бетінде).`, ref: "Сыныптар / Алгоритм" });
    }
  }

  // W502 — бір пән бір күнге сыймайтындай көп (мыс. 6 сағат, бірақ 5 күн)
  for (const c of classes) {
    for (const cu of c.curriculum || []) {
      const s = getSubj(cu.subjectId);
      if (!s) continue;
      // егер апталық сағат күн санынан көп болса, бір күнге 2+ түсуі сөзсіз
      if (cu.hours > WEEK_DAYS) {
        add({ num: 2, level: "info", category: "subject",
          title: `${c.name}: «${s.name}» аптасына ${cu.hours} рет`,
          detail: `«${s.name}» аптасына ${cu.hours} сағат — бұл ${WEEK_DAYS} күннен көп, демек кейбір күндері 2 рет өтеді. Оқушыға ауыр болуы мүмкін.`,
          fix: "Сағатты азайтуға немесе қос сабақ (×2) ретінде белгілеуге болады.", ref: "Сыныптар → Оқу жоспары" });
        break; // бір сыныпқа бір рет жеткілікті
      }
    }
  }

  // W503 — арнайы кабинет пәні бар, бірақ сол пәнге кабинет түрі жоқ (мұғалім жоқтан бөлек)
  // (E201/E202 кабинетті қамтиды — бұл пән тұрғысынан)

  // I504 — қара тізімі тым қатаң пәндер (барлық уақытты дерлік жабатын)
  for (const c of classes) {
    for (const cu of c.curriculum || []) {
      const s = getSubj(cu.subjectId);
      if (!s || !s.black || s.black.length === 0) continue;
      const totalCells = WEEK_DAYS * maxSlots(c.grade, settings);
      if (s.black.length > totalCells * 0.6) {
        add({ num: 4, level: "info", category: "subject",
          title: `«${s.name}» пәнінің қара тізімі тым қатаң`,
          detail: `«${s.name}» пәніне тыйым салынған ұяшықтар тым көп (${s.black.length}). Орналастыру қиындауы мүмкін.`,
          fix: "Қара тізімді (тыйым салынған уақыттарды) азайтыңыз.", ref: "Пәндер" });
        break;
      }
    }
  }

  // ══════════════════════════════════════════════════════════
  // БЛОК 6: УАҚЫТ / СЛОТ / АУЫСЫМ (6xx)
  // ══════════════════════════════════════════════════════════

  if (school) {
    // W601 — сабақ ұзақтығы әдеттен тыс
    if (school.lessonDuration && (school.lessonDuration < 30 || school.lessonDuration > 60)) {
      add({ num: 1, level: "info", category: "time",
        title: "Сабақ ұзақтығы әдеттен тыс",
        detail: `Сабақ ұзақтығы ${school.lessonDuration} мин деп қойылған. Әдеттегі норма — 40–45 мин.`,
        fix: "Сабақ ұзақтығын тексеріңіз (әдетте 40 немесе 45 мин).", ref: "Алгоритм" });
    }
    // W602 — үлкен үзіліс орны қисынсыз
    if (school.longBreakAfter && (school.longBreakAfter < 1 || school.longBreakAfter > 6)) {
      add({ num: 2, level: "info", category: "time",
        title: "Үлкен үзіліс орны тексеруді қажет етеді",
        detail: `Үлкен үзіліс ${school.longBreakAfter}-сабақтан кейін қойылған. Әдетте 2–4 сабақтан кейін.`,
        fix: "Үлкен үзіліс орнын тексеріңіз.", ref: "Алгоритм" });
    }
  }

  // I603 — мұғалім екі ауысымда да жұмыс істейді, бірақ ауысым аралық тыйым бар
  const interShiftConflict = teachers.filter((t) => t.shift === 3 && t.noInterShift && (teacherLoad.get(t.id) || 0) > 0);
  if (interShiftConflict.length > 0) {
    add({ num: 3, level: "info", category: "time",
      title: `${interShiftConflict.length} мұғалімде ауысым аралық шектеу`,
      detail: `Мына мұғалімдер екі ауысымда да жұмыс істейді, бірақ «ауысым аралық үзіліссіз» белгіленген: ${interShiftConflict.map((t) => t.name).join(", ")}. Бұл кестені шектейді.`,
      fix: "Қажет болса, бұл шектеуді алып тастаңыз немесе мұғалімді бір ауысымға тағайындаңыз.", ref: "Мұғалімдер" });
  }

  // ══════════════════════════════════════════════════════════
  // БЛОК 7: ТОП / БӨЛІНУ (7xx)
  // ══════════════════════════════════════════════════════════

  // E701 — топқа бөлінген пәнде топ мұғалімі жетіспейді
  for (const c of classes) {
    for (const cu of c.curriculum || []) {
      if (!cu.groups || cu.groups.length === 0) continue;
      const s = getSubj(cu.subjectId);
      const noTeacher = cu.groups.filter((g) => !g.teacherId).length;
      if (noTeacher > 0) {
        add({ num: 1, level: "error", category: "group",
          title: `${c.name}: «${s?.name || "пән"}» тобына мұғалім жоқ`,
          detail: `Топқа бөлінген, бірақ ${noTeacher} топқа мұғалім тағайындалмаған. Топтар қатар өтеді — әр топқа жеке мұғалім керек.`,
          fix: "Әр топқа жеке мұғалім тағайындаңыз.", ref: "Сыныптар → Оқу жоспары" });
      }
      // W702 — топтар бір мұғалімде (қатар өте алмайды)
      const tIds = cu.groups.map((g) => g.teacherId).filter(Boolean);
      if (tIds.length > 1 && new Set(tIds).size < tIds.length) {
        add({ num: 2, level: "warning", category: "group",
          title: `${c.name}: «${s?.name || "пән"}» топтары бір мұғалімде`,
          detail: `Топтар қатар (бір уақытта) өтуі керек, бірақ бір мұғалімге тағайындалған. Бір мұғалім екі топта бір уақытта бола алмайды.`,
          fix: "Әр топқа басқа-басқа мұғалім тағайындаңыз.", ref: "Сыныптар → Оқу жоспары" });
      }
    }
  }

  // ══════════════════════════════════════════════════════════
  // СОҢЫ: сұрыптау (қате → ескерту → ақпарат, код бойынша)
  // ══════════════════════════════════════════════════════════
  const order = { error: 0, warning: 1, info: 2 };
  notes.sort((a, b) => {
    if (order[a.level] !== order[b.level]) return order[a.level] - order[b.level];
    return a.code.localeCompare(b.code);
  });

  return notes;
}

// Қысқаша қорытынды
export function diagSummary(notes: DiagNote[]): { errors: number; warnings: number; infos: number; ok: boolean } {
  const errors = notes.filter((n) => n.level === "error").length;
  const warnings = notes.filter((n) => n.level === "warning").length;
  const infos = notes.filter((n) => n.level === "info").length;
  return { errors, warnings, infos, ok: errors === 0 };
}
