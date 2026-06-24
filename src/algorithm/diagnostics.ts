// filepath: src/algorithm/diagnostics.ts
// Диагностика: орналаспаған сабақтар мен ресурс жетіспеушілігін талдап,
// завучқа НАҚТЫ шешім ұсынады («мұғалім жетпейді → жүктеме арттыр» т.б.)

import type { Subject, Teacher, Room, Klass, RoomType } from "./engine";

export interface DiagInput {
  classes: Klass[];
  teachers: Teacher[];
  rooms: Room[];
  subjects: Subject[];
}

// Бір ескерту: маңыздылық деңгейі + хабар + нақты шешім
export interface DiagNote {
  level: "error" | "warning" | "info"; // қызыл / сары / көк
  category: "teacher" | "room" | "capacity" | "load" | "balance";
  title: string;     // қысқа тақырып
  detail: string;    // түсіндірме (не болды)
  fix: string;       // НАҚТЫ шешім (не істеу керек)
}

const ROOM_KK: Record<RoomType, string> = {
  regular: "қарапайым", physics: "физика", chemistry: "химия", computer: "информатика", gym: "спортзал",
};

// Бір ауысымдағы максимум слот (5 күн × сабақ/күн).
// Қарапайымдатылған: 5 күн × 7 слот = 35 (нақты лимит сыныпқа байланысты).
const SLOTS_PER_SHIFT = 35;

// ── Негізгі диагностика ──
export function diagnose(input: DiagInput): DiagNote[] {
  const notes: DiagNote[] = [];
  const { classes, teachers, rooms, subjects } = input;

  const subjById = new Map(subjects.map((s) => [s.id, s]));
  const subjByName = new Map(subjects.map((s) => [s.name, s]));
  const getSubj = (key: string) => subjById.get(key) || subjByName.get(key);

  // ═══ 1. МҰҒАЛІМ ЖҮКТЕМЕСІ ═══
  // Әр мұғалімге қанша сағат тағайындалған vs нормасы
  const teacherLoad = new Map<string, number>();
  for (const c of classes) {
    for (const cu of c.curriculum) {
      if (!cu.teacherId) continue;
      teacherLoad.set(cu.teacherId, (teacherLoad.get(cu.teacherId) || 0) + cu.hours);
    }
  }
  const overloaded: { name: string; load: number; norm: number }[] = [];
  for (const t of teachers) {
    const load = teacherLoad.get(t.id) || 0;
    if (load > t.norm) overloaded.push({ name: t.name, load, norm: t.norm });
  }
  if (overloaded.length > 0) {
    const worst = overloaded.sort((a, b) => (b.load - b.norm) - (a.load - a.norm)).slice(0, 3);
    notes.push({
      level: "warning",
      category: "load",
      title: `${overloaded.length} мұғалім нормадан артық жүктелген`,
      detail: worst.map((t) => `${t.name}: ${t.load} сағат (норма ${t.norm})`).join("; ") + (overloaded.length > 3 ? ` және тағы ${overloaded.length - 3}` : ""),
      fix: "Бұл мұғалімдердің «Аптасына сағат» нормасын арттырыңыз, немесе пәндерін басқа мұғалімге бөліңіз. Норма жеткіліксіз болса, кесте толық құрылмайды.",
    });
  }

  // ═══ 2. ПӘН БОЙЫНША МҰҒАЛІМ ЖЕТКІЛІКТІ МЕ ═══
  // Әр пәннің жалпы сағаты vs сол пәнді бере алатын мұғалімдердің бос сыйымдылығы
  const subjectHours = new Map<string, number>();   // пән → жалпы сағат
  const subjectTeachers = new Map<string, Set<string>>(); // пән → мұғалімдер
  for (const c of classes) {
    for (const cu of c.curriculum) {
      const s = getSubj(cu.subjectId);
      if (!s) continue;
      subjectHours.set(s.name, (subjectHours.get(s.name) || 0) + cu.hours);
      if (cu.teacherId) {
        if (!subjectTeachers.has(s.name)) subjectTeachers.set(s.name, new Set());
        subjectTeachers.get(s.name)!.add(cu.teacherId);
      }
    }
  }
  // Әр пәнге мұғалімдердің жалпы нормасы жете ме
  for (const [subjName, hours] of subjectHours) {
    const tIds = subjectTeachers.get(subjName);
    if (!tIds || tIds.size === 0) {
      notes.push({
        level: "error",
        category: "teacher",
        title: `«${subjName}» пәніне мұғалім тағайындалмаған`,
        detail: `Бұл пәнге аптасына ${hours} сағат керек, бірақ бірде-бір мұғалім тағайындалмаған.`,
        fix: `«Оқу жоспары» бетінде «${subjName}» пәніне мұғалім тағайындаңыз.`,
      });
      continue;
    }
    // Осы мұғалімдердің жалпы нормасы
    let totalNorm = 0;
    for (const tid of tIds) {
      const t = teachers.find((x) => x.id === tid);
      if (t) totalNorm += t.norm;
    }
    if (hours > totalNorm) {
      const shortage = hours - totalNorm;
      const extraTeachers = Math.ceil(shortage / 20); // ~20 сағат/мұғалім
      notes.push({
        level: "error",
        category: "teacher",
        title: `«${subjName}» — мұғалім жетіспейді`,
        detail: `Пәнге аптасына ${hours} сағат керек, бірақ тағайындалған ${tIds.size} мұғалімнің жалпы нормасы ${totalNorm} сағат. ${shortage} сағат артық.`,
        fix: `Тағы ${extraTeachers} «${subjName}» мұғалімін қосыңыз, немесе бар мұғалімдердің нормасын ${Math.ceil(hours / tIds.size)} сағатқа дейін арттырыңыз.`,
      });
    }
  }

  // ═══ 3. КАБИНЕТ ЖЕТКІЛІКТІ МЕ (түр бойынша) ═══
  // Әр арнайы кабинет түрінің сыйымдылығы vs сол кабинетті қажет ететін сағат
  const roomTypeCount = new Map<RoomType, number>();
  for (const r of rooms) roomTypeCount.set(r.type, (roomTypeCount.get(r.type) || 0) + 1);

  const specialHours = new Map<RoomType, number>(); // кабинет түрі → керек сағат
  for (const c of classes) {
    for (const cu of c.curriculum) {
      const s = getSubj(cu.subjectId);
      if (!s || !s.room) continue;
      // Топқа бөлінсе, екі топ қатар (бір уақыт) — бірақ екі кабинет керек болуы мүмкін
      specialHours.set(s.room, (specialHours.get(s.room) || 0) + cu.hours);
    }
  }
  for (const [roomType, hours] of specialHours) {
    if (roomType === "regular") continue; // қарапайым бөлек қаралады
    const count = roomTypeCount.get(roomType) || 0;
    const capacity = count * SLOTS_PER_SHIFT; // әр кабинет аптасына ~35 слот
    if (count === 0) {
      notes.push({
        level: "error",
        category: "room",
        title: `${ROOM_KK[roomType]} кабинеті жоқ`,
        detail: `«${ROOM_KK[roomType]}» түрін қажет ететін пәндерге аптасына ${hours} сағат керек, бірақ бұл түрдегі кабинет жоқ.`,
        fix: `«Кабинеттер» бетінде кемінде 1 «${ROOM_KK[roomType]}» кабинетін қосыңыз.`,
      });
    } else if (hours > capacity) {
      const shortage = hours - capacity;
      const extraRooms = Math.ceil(shortage / SLOTS_PER_SHIFT);
      notes.push({
        level: "error",
        category: "room",
        title: `${ROOM_KK[roomType]} кабинеті жетіспейді`,
        detail: `«${ROOM_KK[roomType]}» пәндеріне аптасына ${hours} сағат керек, бірақ ${count} кабинет тек ${capacity} сағатты көтереді. ${shortage} сағат сыймайды.`,
        fix: `Тағы ${extraRooms} «${ROOM_KK[roomType]}» кабинетін қосыңыз. Әйтпесе осы пәндердің бір бөлігі орналаспай қалады.`,
      });
    } else if (hours > capacity * 0.85) {
      // Тығыз (85%+) — ескерту
      notes.push({
        level: "warning",
        category: "room",
        title: `${ROOM_KK[roomType]} кабинеті тығыз`,
        detail: `«${ROOM_KK[roomType]}» жүктемесі ${hours}/${capacity} сағат (${Math.round(hours / capacity * 100)}%). Бос орын аз.`,
        fix: `Кесте құрылады, бірақ икемділік аз. Мүмкіндік болса тағы 1 «${ROOM_KK[roomType]}» кабинетін қосқан дұрыс.`,
      });
    }
  }

  // ═══ 4. ҚАРАПАЙЫМ КАБИНЕТ ЖЕТКІЛІКТІ МЕ ═══
  // Бір уақытта таңғы ауысымда қанша сынып сабақта vs қарапайым кабинет саны
  const regularCount = roomTypeCount.get("regular") || 0;
  const shift1Classes = classes.filter((c) => c.shift === 1).length;
  const shift2Classes = classes.filter((c) => c.shift === 2).length;
  const maxConcurrent = Math.max(shift1Classes, shift2Classes);
  // Арнайы кабинеттер де сыйғызады (физика, химия т.б.) — бірақ көбі қарапайымда
  if (regularCount > 0 && maxConcurrent > regularCount + (roomTypeCount.get("physics") || 0) + (roomTypeCount.get("chemistry") || 0) + (roomTypeCount.get("computer") || 0)) {
    const shortage = maxConcurrent - regularCount;
    notes.push({
      level: "warning",
      category: "room",
      title: "Қарапайым кабинет жеткіліксіз болуы мүмкін",
      detail: `Бір ауысымда ${maxConcurrent} сынып қатар оқиды, бірақ қарапайым кабинет ${regularCount}. Бір сабақта бәріне орын жетпеуі мүмкін.`,
      fix: `Тағы ${shortage} қарапайым кабинет қосыңыз, немесе сыныптарды екі ауысымға теңірек бөліңіз (қазір: таңғы ${shift1Classes}, түстен кейін ${shift2Classes}).`,
    });
  }

  // ═══ 5. СЫЙЫМДЫЛЫҚ: ТАР КАБИНЕТКЕ КӨП БАЛА ═══
  // Бастауыш сыныптың бекітілген кабинеті оқушыдан кіші ме
  for (const c of classes) {
    if (!c.homeRoomId) continue;
    const room = rooms.find((r) => r.id === c.homeRoomId);
    if (!room || !room.capacity) continue;
    if (c.students > room.capacity) {
      notes.push({
        level: "warning",
        category: "capacity",
        title: `${c.name}: кабинет сыйымдылығы жетпейді`,
        detail: `${c.name} сыныбында ${c.students} оқушы, бірақ бекітілген кабинет (${room.number}) тек ${room.capacity} орынға арналған.`,
        fix: `${c.name} үшін үлкенірек кабинет таңдаңыз, немесе кабинет (${room.number}) сыйымдылығын арттырыңыз.`,
      });
    }
  }
  // Жалпы: ең үлкен сынып vs ең үлкен кабинет
  const biggestClass = classes.reduce((m, c) => (c.students > m.students ? c : m), classes[0]);
  if (biggestClass) {
    const roomsWithCap = rooms.filter((r) => r.capacity && r.capacity > 0);
    if (roomsWithCap.length > 0) {
      const biggestRoom = roomsWithCap.reduce((m, r) => ((r.capacity || 0) > (m.capacity || 0) ? r : m), roomsWithCap[0]);
      if (biggestClass.students > (biggestRoom.capacity || 0)) {
        notes.push({
          level: "warning",
          category: "capacity",
          title: "Ең үлкен сыныпқа кабинет жетпейді",
          detail: `${biggestClass.name} сыныбында ${biggestClass.students} оқушы, бірақ ең үлкен кабинет тек ${biggestRoom.capacity} орын.`,
          fix: `Кемінде бір кабинеттің сыйымдылығын ${biggestClass.students} орынға дейін арттырыңыз, немесе бұл сыныпты топқа бөліңіз.`,
        });
      }
    }
  }

  // ═══ 6. ЖАЛПЫ САҒАТ vs ҚОЛ ЖЕТІМДІ СЛОТ ═══
  // Әр сыныптың апталық сағаты бір ауысым лимитінен аспай ма
  for (const c of classes) {
    // Топ қатар өтетінін ескереміз (бір пәннің топтары — бір уақыт)
    const bySubject = new Map<string, number>();
    for (const cu of c.curriculum) {
      const s = getSubj(cu.subjectId);
      const key = s?.name || cu.subjectId;
      // Топ болса, ең көп сағатты аламыз (қатар өтеді)
      bySubject.set(key, Math.max(bySubject.get(key) || 0, cu.hours));
    }
    const totalSlots = Array.from(bySubject.values()).reduce((a, b) => a + b, 0);
    if (totalSlots > SLOTS_PER_SHIFT) {
      const over = totalSlots - SLOTS_PER_SHIFT;
      notes.push({
        level: "error",
        category: "balance",
        title: `${c.name}: сабақ сыймайды`,
        detail: `${c.name} сыныбына аптасына ${totalSlots} слот керек, бірақ бір ауысымда тек ${SLOTS_PER_SHIFT} орын (5 күн × 7 сабақ). ${over} сабақ артық.`,
        fix: `${c.name} оқу жоспарынан ${over} сағат азайтыңыз (екінші дәреже пәндерден), немесе күндік сабақ санын арттырыңыз.`,
      });
    }
  }

  // Маңыздылық бойынша сұрыптау: қателер → ескертулер → ақпарат
  const order = { error: 0, warning: 1, info: 2 };
  notes.sort((a, b) => order[a.level] - order[b.level]);

  return notes;
}

// Қысқаша қорытынды (неше қате, ескерту)
export function diagSummary(notes: DiagNote[]): { errors: number; warnings: number; ok: boolean } {
  const errors = notes.filter((n) => n.level === "error").length;
  const warnings = notes.filter((n) => n.level === "warning").length;
  return { errors, warnings, ok: errors === 0 };
}
