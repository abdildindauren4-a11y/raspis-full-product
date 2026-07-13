// filepath: src/algorithm2/rules/hard/sanpin.ts
// СанПиН жүктеме ережелері: күндік балл лимиті және шаршау шегі.
// (Күндік САБАҚ САНЫ лимиті — maxLessonsPerDay.ts-те.)

import type { Rule } from "../types";

export const dayScoreLimit: Rule = {
  id: "day-score-limit",
  title: "Күндік балл лимиті",
  description: "Сыныптың бір күндегі пән қиындықтарының қосындысы деңгейлік лимиттен аспайды",
  kind: "hard", defaultEnabled: true, removable: true,
  params: [
    { key: "extra", label: "Лимиттен асуға рұқсат (балл)", type: "number", min: 0, max: 30, default: 0 },
  ],
  check(ctx, p, params) {
    const extra = Number(params.extra) || 0;
    const lim = ctx.dayLimitOf(p.cls.grade) + extra;
    const eff = ctx.effOf(p.cls, p.s) * (p.partOfDouble ? 2 : 1);
    if (ctx.state.scoreOn(p.cls.id, p.day) + eff > lim)
      return `күндік ауыртпалық лимиті (${lim} балл) асады`;
    return null;
  },
};

export const fatigueThreshold: Rule = {
  id: "fatigue-threshold",
  title: "Шаршау шегі",
  description: "Ауыр пән сынып шаршап тұрған уақытқа қойылмайды (үзілістер шаршауды азайтады)",
  kind: "hard", defaultEnabled: true, removable: true,
  check(ctx, p) {
    if (ctx.effOf(p.cls, p.s) <= 4) return null; // жеңіл пәнге шек жоқ
    const f = ctx.fatigueAt(p.cls.id, p.day, p.slot);
    if (f > ctx.fatigueThrOf(p.cls.grade))
      return `сынып бұл уақытта шаршаған (шаршау ${Math.round(f)} > шегі ${ctx.fatigueThrOf(p.cls.grade)})`;
    return null;
  },
};
