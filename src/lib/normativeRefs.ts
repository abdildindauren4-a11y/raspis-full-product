// filepath: src/lib/normativeRefs.ts
// НОРМАТИВТІК СӘЙКЕСТІК — сапа есебіндегі әр стресс-тестті ҚР ресми
// талаптарымен байланыстырады. Мақсаты: завуч/директор/сарапшыға «бұл кесте
// қай норманың қай талабына сай» екенін ҚҰЖАТ ТІЛІМЕН көрсету (сату мен
// мемлекеттік жол үшін дәлел). Байланыс тест АТАУЫ бойынша (engine.ts:add()).

export type DocLangN = "kk" | "ru" | "en";

// Ресми дереккөздер
export const SANPIN_URL: Record<DocLangN, string> = {
  kk: "https://adilet.zan.kz/kaz/docs/V2100023890",
  ru: "https://adilet.zan.kz/rus/docs/V2100023890",
  en: "https://adilet.zan.kz/rus/docs/V2100023890",
};
export const PLAN500_URL: Record<DocLangN, string> = {
  kk: "https://adilet.zan.kz/kaz/docs/V1200008170",
  ru: "https://adilet.zan.kz/rus/docs/V1200008170",
  en: "https://adilet.zan.kz/rus/docs/V1200008170",
};

// Дереккөз түрі — топтау мен түс үшін
export type NormSource = "sanpin" | "plan500" | "method" | "logic";

export interface NormRef {
  source: NormSource;
  doc: Record<DocLangN, string>;     // құжат атауы (қысқа)
  clause: Record<DocLangN, string>;  // қай талап
  url?: Record<DocLangN, string>;
}

const SANPIN_DOC = { kk: "СанПиН (ҚР ДСМ-76)", ru: "СанПиН (ҚР ДСМ-76)", en: "SanPiN (QR DSM-76)" };
const PLAN500_DOC = { kk: "БҒМ № 500 бұйрығы", ru: "Приказ МОН № 500", en: "Order MoES No. 500" };
const METHOD_DOC = { kk: "Әдістемелік ұсыным", ru: "Метод. рекомендация", en: "Methodical guideline" };
const LOGIC_DOC = { kk: "Кестенің дұрыстығы", ru: "Корректность расписания", en: "Schedule correctness" };

// Тест атауы (engine.ts:add() дәл сол жол) → норматив
export const NORM_REFS: Record<string, NormRef> = {
  "Мұғалім конфликті жоқ": {
    source: "logic", doc: LOGIC_DOC,
    clause: { kk: "Бір мұғалім бір уақытта тек бір сыныпта", ru: "Один учитель в одно время — только в одном классе", en: "One teacher, one class at a time" },
  },
  "Кабинет конфликті жоқ": {
    source: "logic", doc: LOGIC_DOC,
    clause: { kk: "Бір кабинет бір уақытта тек бір сыныпқа", ru: "Один кабинет в одно время — только для одного класса", en: "One room, one class at a time" },
  },
  "Бастауыш (1-ауысым) 12:00-ге дейін": {
    source: "sanpin", doc: SANPIN_DOC, url: SANPIN_URL,
    clause: { kk: "Оқу режимі: бастауыш сыныптар таңғы ауысымда оқиды", ru: "Режим обучения: начальные классы — в первую смену", en: "Study regime: primary grades in the first shift" },
  },
  "Математика + Физика қатар емес": {
    source: "sanpin", doc: SANPIN_DOC, url: SANPIN_URL,
    clause: { kk: "Пәндердің қиындық шкаласы (4-қосымша): ауыр пәндерді дұрыс бөлу", ru: "Шкала трудности предметов (прил. 4): правильное распределение сложных предметов", en: "Subject difficulty scale (Annex 4): proper spacing of hard subjects" },
  },
  "Қазақ тілі + Орыс тілі қатар емес": {
    source: "method", doc: METHOD_DOC,
    clause: { kk: "Тіл пәндерін бір-бірінен бөлу (жүктемені теңдеу)", ru: "Разделение языковых предметов (баланс нагрузки)", en: "Separating language subjects (load balance)" },
  },
  "Апта балансы (Ср ≥ Жм)": {
    source: "sanpin", doc: SANPIN_DOC, url: SANPIN_URL,
    clause: { kk: "Апта ішіндегі жұмыс қабілеті динамикасы (қиын пәндер апта ортасында)", ru: "Динамика работоспособности в течение недели (сложное — к середине)", en: "Weekly performance dynamics (hard subjects mid-week)" },
  },
  "Оқу жоспары орындалды": {
    source: "plan500", doc: PLAN500_DOC, url: PLAN500_URL,
    clause: { kk: "Үлгілік оқу жоспарының апталық сағаттары толық орналасты", ru: "Недельные часы типового учебного плана размещены полностью", en: "Typical-plan weekly hours placed in full" },
  },
  "Спортзал ережелері": {
    source: "logic", doc: LOGIC_DOC,
    clause: { kk: "Спортзал сыйымдылығы (бір мезгілде рұқсат етілген сынып саны)", ru: "Вместимость спортзала (одновременно допустимое число классов)", en: "Gym capacity (classes allowed simultaneously)" },
  },
  "Бір күн — бір пән (қос сабақ ескерілген)": {
    source: "sanpin", doc: SANPIN_DOC, url: SANPIN_URL,
    clause: { kk: "Пәнді күндерге тарату; бастауышта қос сабаққа жол берілмейді", ru: "Распределение предмета по дням; в начальной школе сдвоенные уроки не допускаются", en: "Spreading a subject across days; no double lessons in primary" },
  },
  "Күндік балл лимиттері": {
    source: "sanpin", doc: SANPIN_DOC, url: SANPIN_URL,
    clause: { kk: "Күндік оқу жүктемесі мен қиындық баллдары нормадан аспайды", ru: "Дневная учебная нагрузка и баллы трудности не превышают норму", en: "Daily load and difficulty scores within the norm" },
  },
  "Тесіктер минималды (тек ресурс шегінде)": {
    source: "method", doc: METHOD_DOC,
    clause: { kk: "Оқушы/мұғалім кестесінде «терезе» (бос сабақ) болмауы", ru: "Отсутствие «окон» в расписании ученика/учителя", en: "No gaps ('windows') in student/teacher schedules" },
  },
  "Этаж ауысу нормада (≤3/күн)": {
    source: "method", doc: METHOD_DOC,
    clause: { kk: "Бір күнде этаж ауыстыруды азайту (жайлылық)", ru: "Минимизация смены этажей за день (комфорт)", en: "Minimizing floor changes per day (comfort)" },
  },
};

export function normRefFor(testName: string): NormRef | undefined {
  return NORM_REFS[testName];
}
