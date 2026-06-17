// Мектеп деректері
export const schoolData = {
  name: '№12 Ғ. Мұстафин атындағы гимназия',
  city: 'Алматы',
  shiftCount: 2,
  shift1Start: '08:00',
  shift2Start: '14:00',
  lessonDuration: 45,
  shortBreak: 10,
  longBreak: 20,
  longBreakAfter: 3,
  interShiftGap: 40,
  workDays: ['Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма'],
};

// Статистикалар
export const stats = {
  students: 856,
  teachers: 64,
  classes: 28,
  rooms: 142,
  todayLessons: 14,
  roomUtilization: 92,
};

// Сыныптар
export const classes = [
  { id: 1, name: '11А', grade: 11, studentCount: 28, shift: 1 },
  { id: 2, name: '11Б', grade: 11, studentCount: 26, shift: 1 },
  { id: 3, name: '10А', grade: 10, studentCount: 30, shift: 1 },
  { id: 4, name: '10Б', grade: 10, studentCount: 29, shift: 1 },
  { id: 5, name: '10В', grade: 10, studentCount: 27, shift: 1 },
  { id: 6, name: '9А', grade: 9, studentCount: 32, shift: 1 },
  { id: 7, name: '9Б', grade: 9, studentCount: 31, shift: 1 },
  { id: 8, name: '9В', grade: 9, studentCount: 30, shift: 1 },
  { id: 9, name: '8А', grade: 8, studentCount: 33, shift: 1 },
  { id: 10, name: '8Б', grade: 8, studentCount: 32, shift: 1 },
  { id: 11, name: '8В', grade: 8, studentCount: 31, shift: 1 },
  { id: 12, name: '7А', grade: 7, studentCount: 34, shift: 2 },
  { id: 13, name: '7Б', grade: 7, studentCount: 33, shift: 2 },
  { id: 14, name: '7В', grade: 7, studentCount: 32, shift: 2 },
  { id: 15, name: '6А', grade: 6, studentCount: 35, shift: 2 },
  { id: 16, name: '6Б', grade: 6, studentCount: 34, shift: 2 },
  { id: 17, name: '6В', grade: 6, studentCount: 33, shift: 2 },
  { id: 18, name: '5А', grade: 5, studentCount: 36, shift: 2 },
  { id: 19, name: '5Б', grade: 5, studentCount: 35, shift: 2 },
  { id: 20, name: '5В', grade: 5, studentCount: 34, shift: 2 },
  { id: 21, name: '4А', grade: 4, studentCount: 32, shift: 2 },
  { id: 22, name: '4Б', grade: 4, studentCount: 31, shift: 2 },
  { id: 23, name: '3А', grade: 3, studentCount: 30, shift: 2 },
  { id: 24, name: '3Б', grade: 3, studentCount: 29, shift: 2 },
  { id: 25, name: '2А', grade: 2, studentCount: 28, shift: 2 },
  { id: 26, name: '2Б', grade: 2, studentCount: 27, shift: 2 },
  { id: 27, name: '1А', grade: 1, studentCount: 26, shift: 2 },
  { id: 28, name: '1Б', grade: 1, studentCount: 25, shift: 2 },
];

// Мұғалімдер
export const teachers = [
  { id: 1, name: 'Ахметова Л.М.', subjects: ['Математика'], weeklyNorm: 18, gradeRange: [5, 11], shift: 1 },
  { id: 2, name: 'Бектұрғанов Р.Е.', subjects: ['Физика'], weeklyNorm: 18, gradeRange: [7, 11], shift: 1 },
  { id: 3, name: 'Серікбаева Г.Т.', subjects: ['Химия'], weeklyNorm: 18, gradeRange: [8, 11], shift: 1 },
  { id: 4, name: 'Нұржанова А.К.', subjects: ['Биология'], weeklyNorm: 18, gradeRange: [5, 11], shift: 1 },
  { id: 5, name: 'Омаров Д.С.', subjects: ['Тарих'], weeklyNorm: 18, gradeRange: [5, 11], shift: 1 },
  { id: 6, name: 'Ибрагимова С.Н.', subjects: ['Қазақ тілі'], weeklyNorm: 18, gradeRange: [1, 11], shift: 1 },
  { id: 7, name: 'Петрова Е.В.', subjects: ['Орыс тілі'], weeklyNorm: 18, gradeRange: [1, 11], shift: 1 },
  { id: 8, name: 'Смит Дж.', subjects: ['Ағылшын тілі'], weeklyNorm: 18, gradeRange: [1, 11], shift: 1 },
  { id: 9, name: 'Қуанышев М.А.', subjects: ['География'], weeklyNorm: 18, gradeRange: [5, 11], shift: 1 },
  { id: 10, name: 'Алиева Р.Ш.', subjects: ['Информатика'], weeklyNorm: 18, gradeRange: [5, 11], shift: 1 },
  { id: 11, name: 'Ермеков Т.Б.', subjects: ['Дене шынықтыру'], weeklyNorm: 18, gradeRange: [1, 11], shift: 1 },
  { id: 12, name: 'Мұхамеджанова Д.К.', subjects: ['Музыка'], weeklyNorm: 18, gradeRange: [1, 9], shift: 1 },
  { id: 13, name: 'Сыздықов А.Р.', subjects: ['Сызу'], weeklyNorm: 18, gradeRange: [5, 9], shift: 1 },
  { id: 14, name: 'Төлеубекова Ж.М.', subjects: ['Шет тілі'], weeklyNorm: 18, gradeRange: [1, 11], shift: 2 },
  { id: 15, name: 'Жанабаев К.Н.', subjects: ['Математика'], weeklyNorm: 18, gradeRange: [5, 11], shift: 2 },
  { id: 16, name: 'Рахимова С.А.', subjects: ['Қазақ тілі'], weeklyNorm: 18, gradeRange: [1, 11], shift: 2 },
  { id: 17, name: 'Мұсабеков Е.Д.', subjects: ['Физика'], weeklyNorm: 18, gradeRange: [7, 11], shift: 2 },
  { id: 18, name: 'Оразбаева Л.Т.', subjects: ['Химия'], weeklyNorm: 18, gradeRange: [8, 11], shift: 2 },
  { id: 19, name: 'Исаев Б.Р.', subjects: ['Тарих'], weeklyNorm: 18, gradeRange: [5, 11], shift: 2 },
  { id: 20, name: 'Нұрмаханова А.С.', subjects: ['Биология'], weeklyNorm: 18, gradeRange: [5, 11], shift: 2 },
];

// Кабинеттер
export const rooms = [
  { id: 1, number: '101', type: 'құрама', capacity: 30, isSpecial: false },
  { id: 2, number: '102', type: 'құрама', capacity: 30, isSpecial: false },
  { id: 3, number: '103', type: 'құрама', capacity: 30, isSpecial: false },
  { id: 4, number: '104', type: 'құрама', capacity: 30, isSpecial: false },
  { id: 5, number: '105', type: 'лаборатория', capacity: 24, isSpecial: true, specialSubject: 'Химия' },
  { id: 6, number: '106', type: 'лаборатория', capacity: 24, isSpecial: true, specialSubject: 'Физика' },
  { id: 7, number: '107', type: 'компьютерлік', capacity: 20, isSpecial: true, specialSubject: 'Информатика' },
  { id: 8, number: '108', type: 'құрама', capacity: 30, isSpecial: false },
  { id: 9, number: '109', type: 'құрама', capacity: 30, isSpecial: false },
  { id: 10, number: '110', type: 'мұзыка', capacity: 25, isSpecial: true, specialSubject: 'Музыка' },
  { id: 11, number: '201', type: 'құрама', capacity: 30, isSpecial: false },
  { id: 12, number: '202', type: 'құрама', capacity: 30, isSpecial: false },
  { id: 13, number: '203', type: 'құрама', capacity: 30, isSpecial: false },
  { id: 14, number: '204', type: 'құрама', capacity: 30, isSpecial: false },
  { id: 15, number: '205', type: 'құрама', capacity: 30, isSpecial: false },
  { id: 16, number: '206', type: 'құрама', capacity: 30, isSpecial: false },
  { id: 17, number: '207', type: 'құрама', capacity: 30, isSpecial: false },
  { id: 18, number: '208', type: 'құрама', capacity: 30, isSpecial: false },
  { id: 19, number: '301', type: 'құрама', capacity: 30, isSpecial: false },
  { id: 20, number: '302', type: 'құрама', capacity: 30, isSpecial: false },
];

// Пәндер
export const subjects = [
  { id: 1, name: 'Математика', difficulty: 11, cognitiveCoeff: 0.95, idealSlots: [1, 2, 3], needsSpecialRoom: false },
  { id: 2, name: 'Физика', difficulty: 10, cognitiveCoeff: 0.92, idealSlots: [1, 2, 3], needsSpecialRoom: true, specialRoomType: 'лаборатория' },
  { id: 3, name: 'Химия', difficulty: 10, cognitiveCoeff: 0.90, idealSlots: [1, 2, 3], needsSpecialRoom: true, specialRoomType: 'лаборатория' },
  { id: 4, name: 'Ағылшын тілі', difficulty: 10, cognitiveCoeff: 0.85, idealSlots: [2, 3, 4], needsSpecialRoom: false },
  { id: 5, name: 'Информатика', difficulty: 9, cognitiveCoeff: 0.88, idealSlots: [1, 2, 3], needsSpecialRoom: true, specialRoomType: 'компьютерлік' },
  { id: 6, name: 'Биология', difficulty: 9, cognitiveCoeff: 0.85, idealSlots: [2, 3, 4], needsSpecialRoom: false },
  { id: 7, name: 'Тарих', difficulty: 8, cognitiveCoeff: 0.80, idealSlots: [3, 4, 5], needsSpecialRoom: false },
  { id: 8, name: 'Қазақ тілі', difficulty: 8, cognitiveCoeff: 0.82, idealSlots: [1, 2, 3], needsSpecialRoom: false },
  { id: 9, name: 'География', difficulty: 8, cognitiveCoeff: 0.78, idealSlots: [3, 4, 5], needsSpecialRoom: false },
  { id: 10, name: 'Дене шынықтыру', difficulty: 5, cognitiveCoeff: 0.60, idealSlots: [4, 5, 6], needsSpecialRoom: true, specialRoomType: 'спортзал' },
  { id: 11, name: 'Музыка', difficulty: 6, cognitiveCoeff: 0.65, idealSlots: [4, 5, 6], needsSpecialRoom: true, specialRoomType: 'мұзыка' },
  { id: 12, name: 'Сызу', difficulty: 7, cognitiveCoeff: 0.70, idealSlots: [3, 4, 5], needsSpecialRoom: false },
  { id: 13, name: 'Орыс тілі', difficulty: 8, cognitiveCoeff: 0.80, idealSlots: [2, 3, 4], needsSpecialRoom: false },
  { id: 14, name: 'Шет тілі', difficulty: 10, cognitiveCoeff: 0.85, idealSlots: [2, 3, 4], needsSpecialRoom: false },
];

// Бүгінгі сабақтар
export const todayLessons = [
  { id: 1, time: '08:00 - 08:45', subject: 'Математика', class: '11А', room: '101', teacher: 'Ахметова Л.М.', status: 'past' },
  { id: 2, time: '08:00 - 08:45', subject: 'Физика', class: '10А', room: '106', teacher: 'Бектұрғанов Р.Е.', status: 'past' },
  { id: 3, time: '08:55 - 09:40', subject: 'Қазақ тілі', class: '9А', room: '102', teacher: 'Ибрагимова С.Н.', status: 'past' },
  { id: 4, time: '08:55 - 09:40', subject: 'Ағылшын тілі', class: '11Б', room: '103', teacher: 'Смит Дж.', status: 'past' },
  { id: 5, time: '10:00 - 10:45', subject: 'Химия', class: '10Б', room: '105', teacher: 'Серікбаева Г.Т.', status: 'active' },
  { id: 6, time: '10:00 - 10:45', subject: 'Тарих', class: '9Б', room: '104', teacher: 'Омаров Д.С.', status: 'active' },
  { id: 7, time: '11:05 - 11:50', subject: 'Биология', class: '8А', room: '108', teacher: 'Нұржанова А.К.', status: 'upcoming' },
  { id: 8, time: '11:05 - 11:50', subject: 'География', class: '7А', room: '109', teacher: 'Қуанышев М.А.', status: 'upcoming' },
  { id: 9, time: '12:00 - 12:45', subject: 'Информатика', class: '10В', room: '107', teacher: 'Алиева Р.Ш.', status: 'upcoming' },
  { id: 10, time: '12:00 - 12:45', subject: 'Дене шынықтыру', class: '8Б', room: 'Спортзал', teacher: 'Ермеков Т.Б.', status: 'upcoming' },
  { id: 11, time: '13:00 - 13:45', subject: 'Математика', class: '9В', room: '101', teacher: 'Ахметова Л.М.', status: 'upcoming' },
  { id: 12, time: '13:00 - 13:45', subject: 'Музыка', class: '5А', room: '110', teacher: 'Мұхамеджанова Д.К.', status: 'upcoming' },
  { id: 13, time: '13:55 - 14:40', subject: 'Сызу', class: '7Б', room: '201', teacher: 'Сыздықов А.Р.', status: 'upcoming' },
  { id: 14, time: '13:55 - 14:40', subject: 'Орыс тілі', class: '6А', room: '202', teacher: 'Петрова Е.В.', status: 'upcoming' },
];

// Кесте нұсқалары
export const scheduleVersions = [
  { id: 1, name: 'Нұсқа #1', qualityScore: 87, createdAt: '2025-01-15 10:30', isActive: true },
  { id: 2, name: 'Нұсқа #2', qualityScore: 91, createdAt: '2025-01-15 11:45', isActive: false },
  { id: 3, name: 'Нұсқа #3', qualityScore: 84, createdAt: '2025-01-15 14:20', isActive: false },
];

// Сапа метрикалары
export const qualityMetrics = {
  overallScore: 87,
  criteria: [
    { name: 'Орналасу ұпайы', score: 92, weight: 60 },
    { name: 'Дисперсия', score: 78, weight: 40 },
    { name: 'Мұғалім жайлылығы', score: 85, weight: 0 },
    { name: 'Кабинет теңгерімі', score: 88, weight: 0 },
    { name: 'Ауыртпалық', score: 90, weight: 0 },
  ],
  issues: [
    { id: 1, type: 'critical', message: '3 кабинет конфликті анықталды', category: 'кабинет' },
    { id: 2, type: 'critical', message: '2 мұғалім терезесі бар', category: 'терезе' },
    { id: 3, type: 'warning', message: '5 сыныпта ауыртпалық шегі жақын', category: 'ауыртпалық' },
    { id: 4, type: 'warning', message: '2 қара тізім жұпты қатар', category: 'конфликт' },
    { id: 5, type: 'warning', message: 'Спортзал толтырылуы 95%', category: 'кабинет' },
    { id: 6, type: 'ok', message: 'Hard constraints толық орындалды', category: 'теңгерім' },
    { id: 7, type: 'ok', message: 'Апталық жоспар толық', category: 'жүктеме' },
  ],
};

// AI Кеңесші хабарламалары
export const aiChatMessages = [
  { id: 1, role: 'ai', content: 'Сәлем! Мен AI кеңесшімін. Сізге кестені жақсартуға көмектесемін. Қандай мәселе бар?' },
  { id: 2, role: 'user', content: 'Кабинеттердің толтырылуын қалай жақсартуға болады?' },
  { id: 3, role: 'ai', content: 'Кабинеттердің толтырылуын талдадым. 92% көрсеткіш жақсы, бірақ бірнеше түзетулер жасауға болады:\n\n1. **101 кабинет** — 5 сабақ қатар бос, оны шет тілі пәндеріне беру ұсынылады\n2. **Спортзал** — таңертеңгі слоттарды толығырақ пайдалану керек\n3. **Лаборатория 105** — Химия пәні үшін күндерді қайта бөлу керек\n\nОсы өзгерістерді енгізсеңіз, толтырылу 96-97% жетуі мүмкін.' },
];

// Хабарландырулар
export const notifications = [
  { id: 1, type: 'info', message: 'Жаңа кесте нұсқасы #2 дайын', time: '5 минут бұрын' },
  { id: 2, type: 'warning', message: '3 кабинет конфликті анықталды', time: '15 минут бұрын' },
  { id: 3, type: 'success', message: 'Алгоритм генерациясы аяқталды', time: '1 сағат бұрын' },
];

// Пән түстері
export const subjectColors: Record<string, string> = {
  'Математика': '#00C6FF',
  'Физика': '#8B5CF6',
  'Химия': '#F59E0B',
  'Биология': '#10B981',
  'Тарих': '#EC4899',
  'Қазақ тілі': '#3B82F6',
  'Орыс тілі': '#6366F1',
  'Ағылшын тілі': '#06B6D4',
  'География': '#84CC16',
  'Информатика': '#F97316',
  'Дене шынықтыру': '#EF4444',
  'Музыка': '#A855F7',
  'Сызу': '#14B8A6',
  'Шет тілі': '#06B6D4',
};

// Апта күндері
export const weekDays = ['Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма'];

// Сабақ уақыттары
export const lessonSlots = [
  { number: 1, start: '08:00', end: '08:45' },
  { number: 2, start: '08:55', end: '09:40' },
  { number: 3, start: '10:00', end: '10:45' },
  { number: 4, start: '11:05', end: '11:50' },
  { number: 5, start: '12:00', end: '12:45' },
  { number: 6, start: '13:00', end: '13:45' },
  { number: 7, start: '13:55', end: '14:40' },
];

// Жалған кесте деректері
export function generateMockSchedule() {
  const schedule: Record<string, Record<string, Record<number, { subject: string; teacher: string; room: string }>>> = {};
  
  classes.forEach((cls) => {
    schedule[cls.name] = {};
    weekDays.forEach((day) => {
      schedule[cls.name][day] = {};
      const dailySubjects = new Set<string>();
      
      for (let slot = 1; slot <= 7; slot++) {
        if (Math.random() > 0.9) continue; // 10% бос слот
        
        const availableSubjects = subjects.filter((s) => !dailySubjects.has(s.name));
        if (availableSubjects.length === 0) continue;
        
        const subject = availableSubjects[Math.floor(Math.random() * availableSubjects.length)];
        dailySubjects.add(subject.name);
        
        const teacher = teachers.find((t) => t.subjects.includes(subject.name)) || teachers[0];
        const room = rooms.find((r) => {
          if (subject.needsSpecialRoom) return r.specialSubject === subject.name;
          return !r.isSpecial;
        }) || rooms[0];
        
        schedule[cls.name][day][slot] = {
          subject: subject.name,
          teacher: teacher.name,
          room: room.number,
        };
      }
    });
  });
  
  return schedule;
}

export const mockSchedule = generateMockSchedule();
