// filepath: src/algorithm2/rules/hard/maxLessonsPerDay.ts
// СанПиН: сыныптың күндік сабақ саны лимиті (деңгей бойынша).

import type { Rule } from "../types";

export const maxLessonsPerDay: Rule = {
  id: "max-lessons-per-day",
  title: "Күндік сабақ лимиті (СанПиН)",
  description: "Сыныптың бір күндегі сабақ саны деңгейлік лимиттен аспайды",
  kind: "hard", defaultEnabled: true, removable: true,
  params: [
    { key: "extra", label: "Лимиттен асуға рұқсат (сабақ)", type: "number", min: 0, max: 3, default: 0 },
  ],
  check(ctx, p, params) {
    const extra = Number(params.extra) || 0;
    const lim = ctx.maxLessonsOf(p.cls.grade) + extra;
    // Слот нөмірінің өзі лимиттен аспасын ЖӘНЕ күндік сан толмасын
    if (p.slot > lim) return `${p.slot}-сабақ ${p.cls.grade}-сынып лимитінен (${lim}) асады`;
    // Қос сабақ екі слот алады — алдын ала тексерісте екеуіне де орын болсын
    const add = p.partOfDouble ? 2 : 1;
    if (ctx.state.lessonsOn(p.cls.id, p.day) + add > lim)
      return `күндік сабақ лимиті (${lim}) толды`;
    return null;
  },
};
