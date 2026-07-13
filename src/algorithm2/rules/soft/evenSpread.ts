// filepath: src/algorithm2/rules/soft/evenSpread.ts
// Жұмсақ ереже: аптаға тең бөлу — сыныптың күндері бірдей жүктелсін,
// сабақтар бір күнге үйіліп қалмасын (v1-дегі dayQuota/weekOrder баламасы).

import type { Rule } from "../types";

export const evenWeekSpread: Rule = {
  id: "even-week-spread",
  title: "Аптаға тең бөлу",
  description: "Сыныптың күндік жүктемесі апта бойына біркелкі таралады",
  kind: "soft", defaultEnabled: true, removable: true,
  defaultWeight: 2, // калибрленген: bigSeed-те тығырықты азайтады
  score(ctx, p) {
    // Күні неғұрлым бос болса — соғұрлым тартымды (0..6 шамасында)
    const used = ctx.state.lessonsOn(p.cls.id, p.day);
    const lim = ctx.maxLessonsOf(p.cls.grade);
    return Math.max(0, ((lim - used) / lim) * 6);
  },
};

export const compactDay: Rule = {
  id: "compact-day",
  title: "Тесіксіз күн",
  description: "Сабақ күннің басынан үзіліссіз тізіледі — сынып кестесінде тесік болмайды",
  kind: "soft", defaultEnabled: true, removable: true,
  defaultWeight: 4, // калибрленген: тесіктерді азайтады
  score(ctx, p) {
    // Күндегі келесі бос слотқа дәл жалғасса — жоғары ұпай; секіріп кетсе —
    // тесік ықтималдығы, ұпай төмен. lessonsOn = қойылған сан, келесі
    // үзіліссіз слот = сан+1 (1-слоттан бастап толады деп).
    const next = ctx.state.lessonsOn(p.cls.id, p.day) + 1;
    const jump = Math.max(0, p.slot - next);
    return Math.max(0, 6 - jump * 3);
  },
};
