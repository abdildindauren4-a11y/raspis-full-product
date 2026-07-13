// filepath: src/algorithm2/rules/hard/interShift.ts
// Ауысым аралық үзіліс: мұғалім екі ауысымда да жұмыс істесе (shift=3),
// бір ауысымның соңғы сабағы мен екіншісінің алғашқы сабағы арасында
// кемінде interShiftGap минут болуы керек (немесе мүлдем рұқсат жоқ —
// noInterShift).

import type { Rule } from "../types";

export const interShiftGap: Rule = {
  id: "inter-shift-gap",
  title: "Ауысым аралық үзіліс",
  description: "Екі ауысымда жұмыс істейтін мұғалімге ауысымдар арасында демалыс уақыты қалдырылады",
  kind: "hard", defaultEnabled: true, removable: true,
  check(ctx, p) {
    const gap = ctx.input.school.interShiftGap;
    const other: 1 | 2 = p.shift === 1 ? 2 : 1;
    const tl = ctx.timeline;
    for (const part of p.parts) {
      const t = ctx.teachersById.get(part.teacherId);
      if (!t || t.shift !== 3) continue;
      // Мұғалімнің сол күнгі БАСҚА ауысымдағы сабақтары
      const used: number[] = [];
      for (let sl = 1; sl <= ctx.time.slots && sl < tl[other].length; sl++)
        if (ctx.state.teacherAt(part.teacherId, other, p.day, sl)) used.push(sl);
      if (!used.length) continue;
      if (t.noInterShift) return `${t.name} бір күнде екі ауысымда жұмыс істемейді`;
      if (p.shift === 2) {
        const lastEnd1 = Math.max(...used.map((sl) => tl[1][sl].endMin));
        if (tl[2][p.slot].startMin - lastEnd1 < gap)
          return `${t.name}: ауысым аралық үзіліс (${gap} мин) жетпейді`;
      } else {
        const firstStart2 = Math.min(...used.map((sl) => tl[2][sl].startMin));
        if (firstStart2 - tl[1][p.slot].endMin < gap)
          return `${t.name}: ауысым аралық үзіліс (${gap} мин) жетпейді`;
      }
    }
    return null;
  },
};
