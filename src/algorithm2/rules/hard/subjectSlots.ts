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

export const subjectSlotMatrix: Rule = {
  id: "subject-slot-matrix",
  title: "Пәннің тыйым салынған ұяшықтары",
  description: "Пән апта торында Х қойылған уақыттарға (күн-сабақ) орналастырылмайды",
  kind: "hard", defaultEnabled: true, removable: true,
  check(_ctx, p) {
    const banned = p.s.bannedSlots;
    if (!banned || !banned.length) return null;
    const key = `${p.day}-${p.slot}`;
    if (banned.includes(key)) return `${p.s.name} бұл уақытқа қойылмайды (Х белгіленген)`;
    // Қос сабақтың екінші жартысы да тексеріледі
    if (p.partOfDouble === 1 && banned.includes(`${p.day}-${p.slot + 1}`))
      return `${p.s.name} қос сабағының екінші жартысы тыйым салынған уақытқа түседі`;
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
  check(_ctx, p, params) {
    if (!p.s.corr) return null;
    const min = Number(params.minSlot) || 4;
    if (p.slot < min) return `түзету сабағы ${min}-сабақтан ерте қойылмайды`;
    return null;
  },
};
