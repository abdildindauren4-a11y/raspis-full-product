// filepath: src/algorithm2/rules/hard/teacherAvailability.ts
// Мұғалім қолжетімділігі: бос емес уақыттары («икстап тастау» торының негізі),
// ауысымы және сынып диапазоны.

import type { Rule } from "../types";

export const teacherAvailability: Rule = {
  id: "teacher-availability",
  title: "Мұғалімнің бос емес уақыты",
  description: "Мұғалім Х қойылған ұяшықтарға (күн-сабақ) қойылмайды",
  kind: "hard", defaultEnabled: true, removable: true,
  check(ctx, p) {
    const key = `${p.day}-${p.slot}`;
    for (const part of p.parts) {
      const t = ctx.teachersById.get(part.teacherId);
      if (t && t.unavailable.includes(key))
        return `${t.name} бұл уақытта бос емес (Х белгіленген)`;
    }
    return null;
  },
};

export const teacherShiftGrade: Rule = {
  id: "teacher-shift-grade",
  title: "Мұғалімнің ауысымы мен сынып диапазоны",
  description: "Мұғалім өз ауысымында және өзі оқытатын сынып деңгейлерінде ғана жұмыс істейді",
  kind: "hard", defaultEnabled: true, removable: true,
  check(ctx, p) {
    for (const part of p.parts) {
      const t = ctx.teachersById.get(part.teacherId);
      if (!t) return "мұғалім табылмады";
      if (t.shift !== 3 && t.shift !== p.shift)
        return `${t.name} ${p.shift}-ауысымда жұмыс істемейді`;
      if (p.cls.grade < t.gradeMin || p.cls.grade > t.gradeMax)
        return `${t.name} ${p.cls.grade}-сынып деңгейін оқытпайды`;
    }
    return null;
  },
};
