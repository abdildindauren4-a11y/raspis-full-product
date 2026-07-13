// filepath: src/algorithm2/rules/hard/oneSubjectPerDay.ts
// «Бір күн — бір пән»: сынып бір пәнді күніне бір рет қана оқиды.
// Қос сабақ (double, екі қатар слот) — жалғыз рұқсат етілген ерекшелік.

import type { Rule } from "../types";

export const oneSubjectPerDay: Rule = {
  id: "one-subject-per-day",
  title: "Бір күн — бір пән",
  description: "Пән бір күнде қайталанбайды (қос сабақтан басқа)",
  kind: "hard", defaultEnabled: true, removable: true,
  check(ctx, p) {
    const n = ctx.state.subjCount(p.cls.id, p.s.id, p.day);
    // Қос сабақтың екінші жартысы: біріншісімен бірге тексеріледі/қойылады,
    // сондықтан 0 (алдын ала тексеріс) немесе 1 (біріншісі қойылған) — жарайды
    if (p.partOfDouble === 2) return n <= 1 ? null : `${p.s.name} бұл күні қойылып қойған`;
    return n > 0 ? `${p.s.name} бұл күні қойылып қойған` : null;
  },
};
