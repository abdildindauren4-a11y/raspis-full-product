// filepath: src/algorithm2/rules/hard/subjectSlots.ts
// Пәннің слот шектеулері: ең кеш сабақ шегі (математика/алгебра/геометрия ≤ 4)
// және түзету сабағының ерте қойылмауы.

import type { Rule } from "../types";

export const subjectMaxSlot: Rule = {
  id: "subject-max-slot",
  title: "Пәннің кеш сабақ шегі",
  description: "Математика тектес ауыр пәндер алғашқы сабақтарда ғана өтеді (пәнге жеке шек берілсе — сол)",
  kind: "hard", defaultEnabled: true, removable: true,
  params: [
    { key: "relaxBy", label: "Жұмсартқанда неше сабаққа кешігеді", type: "number", min: 0, max: 2, default: 0 },
  ],
  check(ctx, p, params) {
    const lim = ctx.lateLimitOf(p.s);
    if (!lim) return null;
    const relax = Number(params.relaxBy) || 0;
    const slot = p.partOfDouble === 2 ? p.slot : p.slot + (p.partOfDouble === 1 ? 1 : 0);
    if (slot > lim + relax)
      return `${p.s.name} ${lim + relax}-сабақтан кеш қойылмайды`;
    return null;
  },
};

export const corrLate: Rule = {
  id: "corr-late",
  title: "Түзету сабағы — күн соңында",
  description: "Коррекциялық сабақ 4-сабақтан ерте қойылмайды",
  kind: "hard", defaultEnabled: true, removable: true,
  params: [
    { key: "minSlot", label: "Ең ерте слот", type: "number", min: 2, max: 6, default: 4 },
  ],
  check(ctx, p, params) {
    if (!p.s.corr) return null;
    const min = Number(params.minSlot) || 4;
    if (p.slot < min) return `түзету сабағы ${min}-сабақтан ерте қойылмайды`;
    return null;
  },
};
