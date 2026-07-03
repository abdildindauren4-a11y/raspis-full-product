// filepath: src/lib/curriculumTemplates.ts
// ОҚУ ЖОСПАРЫ ҮЛГІЛЕРІ (ҚР үлгілік оқу жоспары негізінде, 5 күндік апта)
// + мұғалімді автотағайындау — деректі қолмен теру қатесін азайтады.

import type { Klass, Subject, Teacher, CurItem } from "@/algorithm/engine";
import { teacherBudgets, type TeacherBudget } from "@/lib/dataBudget";

const uid = () => Math.random().toString(36).slice(2, 10);

/** Параллель бойынша үлгілік апталық сағаттар: [пән атауы, сағат] */
export function templateFor(grade: number): [string, number][] {
  if (grade <= 2)
    return [["Математика", 4], ["Қазақ тілі", 4], ["Орыс тілі", 2], ["Ағылшын тілі", 1],
      ["Дүниетану", 1], ["Дене шынықтыру", 2], ["Музыка", 1], ["Көркем еңбек", 1]];
  if (grade <= 4)
    return [["Математика", 4], ["Қазақ тілі", 4], ["Орыс тілі", 2], ["Ағылшын тілі", 2],
      ["Дүниетану", 1], ["Жаратылыстану", 1], ["Дене шынықтыру", 2], ["Музыка", 1],
      ["Көркем еңбек", 1], ["Өзін-өзі тану", 1]];
  if (grade <= 6)
    return [["Математика", 5], ["Қазақ тілі", 3], ["Орыс тілі", 2], ["Әдебиет", 2],
      ["Ағылшын тілі", 3], ["Тарих", 2], ["Информатика", 1],
      ["Дене шынықтыру", 2], ["Музыка", 1], ["Көркем еңбек", 1], ["Өзін-өзі тану", 1],
      ...(grade === 5 ? [["Жаратылыстану", 2]] as [string, number][]
                      : [["Биология", 1], ["География", 2]] as [string, number][])];
  if (grade <= 8)
    return [["Алгебра", 3], ["Геометрия", 2], ["Қазақ тілі", 3], ["Орыс тілі", 2],
      ["Әдебиет", 2], ["Ағылшын тілі", 3], ["Физика", 2], ...(grade >= 8 ? [["Химия", 2]] as [string, number][] : []),
      ["Биология", 2], ["География", 1], ["Тарих", 2], ["Дүниежүзі тарихы", 1],
      ["Информатика", 1], ["Дене шынықтыру", 2], ["Өзін-өзі тану", 1]];
  return [["Алгебра", 3], ["Геометрия", 2], ["Қазақ тілі", 2], ["Орыс тілі", 2],
    ["Әдебиет", 2], ["Ағылшын тілі", 3], ["Физика", grade >= 10 ? 3 : 2], ["Химия", 2],
    ["Биология", 2], ["География", 1], ["Тарих", 2], ["Дүниежүзі тарихы", 1],
    ["Информатика", 2], ["Дене шынықтыру", 2], ["Өзін-өзі тану", 1]];
}

/** Үлгіден оқу жоспарын құру: пайдаланушының пән тізімінен атауы бойынша табады.
    Табылмаған пәндер тізіммен қайтады (пайдаланушыға ескерту үшін). */
export function buildFromTemplate(cls: Klass, subjects: Subject[]): { items: CurItem[]; missing: string[] } {
  const byName = new Map(subjects.map((s) => [s.name, s]));
  const items: CurItem[] = [];
  const missing: string[] = [];
  for (const [name, hours] of templateFor(cls.grade)) {
    const s = byName.get(name);
    if (s) items.push({ id: uid(), subjectId: s.id, hours });
    else missing.push(name);
  }
  return { items, missing };
}

/** Мұғалімі жоқ жолдарға (жеке + топтар) ЕҢ БОС мұғалімді автотағайындау.
    Бюджет тағайындау барысында азайтылып отырады — бір мұғалімге бәрін
    үйіп тастамайды. Өзгертілген жолдар санын қайтарады. */
export function autoAssignTeachers(
  cls: Klass, curriculum: CurItem[], teachers: Teacher[], allClasses: Klass[]
): { items: CurItem[]; assigned: number; unassigned: string[] } {
  // ағымдағы бюджет (осы сыныптың толтырылмағандары әлі есепте жоқ)
  const budgets = teacherBudgets(teachers, allClasses);
  const eligible = (need: number, exclude?: Set<string>): TeacherBudget | null => {
    const list = [...budgets.values()]
      .filter((b) =>
        b.teacher.gradeMin <= cls.grade && cls.grade <= b.teacher.gradeMax &&
        (b.teacher.shift === 3 || b.teacher.shift === cls.shift) &&
        (!exclude || !exclude.has(b.teacher.id)))
      .sort((a, b) => b.free - a.free);
    const fit = list.find((b) => b.free >= need);
    return fit || null; // сыймаса — тағайындамаймыз (жасырын асып кетпес үшін)
  };
  let assigned = 0;
  const unassigned: string[] = [];
  const items = curriculum.map((cu) => {
    if (cu.isSplit) {
      const used = new Set((cu.groups || []).map((g) => g.teacherId).filter(Boolean));
      const groups = (cu.groups || []).map((g) => {
        if (g.teacherId) return g;
        const b = eligible(cu.hours, used);
        if (!b) { unassigned.push(cu.subjectId); return g; }
        b.free -= cu.hours; b.assigned += cu.hours; used.add(b.teacher.id); assigned++;
        return { ...g, teacherId: b.teacher.id };
      });
      return { ...cu, groups };
    }
    if (cu.teacherId) return cu;
    const b = eligible(cu.hours);
    if (!b) { unassigned.push(cu.subjectId); return cu; }
    b.free -= cu.hours; b.assigned += cu.hours; assigned++;
    return { ...cu, teacherId: b.teacher.id };
  });
  return { items, assigned, unassigned };
}
