// filepath: src/pages/ClassesPage.tsx
import { useState } from "react";
import { Plus, Pencil, Trash2, BookOpen, AlertTriangle, Split } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { Modal, Field, inputCls, btnP, btnG, btnD } from "@/components/shared/Form";
import { useData } from "@/store/dataStore";
import { useLang } from "@/contexts/LangContext";
import type { Klass, CurItem } from "@/algorithm/engine";

const uid = () => Math.random().toString(36).slice(2, 10);

export default function ClassesPage() {
  const { t } = useLang();
  const { classes, teachers, subjects, setClasses } = useData();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Partial<Klass> | null>(null);
  const [curOf, setCurOf] = useState<string | null>(null);

  const filtered = classes.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const curClass = classes.find((c) => c.id === curOf) || null;

  const saveClass = () => {
    if (!form?.name || !form.grade) return;
    if (form.id) setClasses(classes.map((c) => (c.id === form.id ? { ...c, ...form } as Klass : c)));
    else setClasses([...classes, { id: uid(), name: form.name, grade: form.grade, students: form.students || 25, shift: (form.shift || 1) as 1 | 2, curriculum: [] }]);
    setForm(null);
  };
  const updateCur = (clsId: string, fn: (cur: CurItem[]) => CurItem[]) =>
    setClasses(classes.map((c) => (c.id === clsId ? { ...c, curriculum: fn(c.curriculum) } : c)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("classes.title")}</h1>
          <p className="text-muted-c mt-1">{t("classes.subtitle")}</p>
        </div>
        <button className={btnP + " flex items-center gap-2"} onClick={() => setForm({ grade: 5, students: 25, shift: 1 })}>
          <Plus className="w-4 h-4" /> {t("classes.add")}
        </button>
      </div>
      <input className={inputCls + " max-w-xs"} placeholder={t("com.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
      <GlassCard hover={false}>
        <div className="overflow-x-auto -mx-1 px-1"><table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-muted-c border-b border-soft-c">
              <th className="py-2">{t("cls.colClass")}</th><th>{t("cls.colStudents")}</th><th>{t("com.shift")}</th><th>{t("cls.colSubjCount")}</th><th>{t("cls.colHours")}</th><th>{t("com.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-soft-c hover:bg-[rgba(127,127,127,0.1)]">
                <td className="py-2.5 font-semibold text-strong-c">{c.name}</td>
                <td className="text-soft-c">{c.students}</td>
                <td><span className={`px-2 py-0.5 rounded text-xs ${c.shift === 1 ? "bg-emerald-500/15 status-good" : "bg-yellow-500/15 status-warn"}`}>{c.shift}{t("com.shiftSuffix")}</span></td>
                <td className="text-soft-c">{c.curriculum.length}</td>
                <td className="text-soft-c">{c.curriculum.reduce((s, x) => s + x.hours, 0)}</td>
                <td className="flex gap-2 py-2">
                  <button className={btnG + " !px-2.5 !py-1.5"} title={t("cls.curriculum")} onClick={() => setCurOf(c.id)}><BookOpen className="w-4 h-4" /></button>
                  <button className={btnG + " !px-2.5 !py-1.5"} onClick={() => setForm({ ...c })}><Pencil className="w-4 h-4" /></button>
                  <button className={btnD} onClick={() => { if (confirm(`${c.name} ${t("com.delete")}`)) setClasses(classes.filter((x) => x.id !== c.id)); }}><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-muted-c">{t("classes.empty")}</td></tr>}
          </tbody>
        </table></div>
      </GlassCard>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? t("fld.editClass") : t("fld.newClass")}>
        <Field label={t("cls.nameLabel")}><input className={inputCls} value={form?.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label={t("fld.parallel")}>
          <select className={inputCls} value={form?.grade || 5} onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })}>
            {Array.from({ length: 11 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} {t("com.gradeShort")}</option>)}
          </select>
        </Field>
        <Field label={t("cls.studentsLabel")}><input type="number" className={inputCls} value={form?.students || 25} onChange={(e) => setForm({ ...form, students: Number(e.target.value) })} /></Field>
        <Field label={t("fld.shift")}>
          <select className={inputCls} value={form?.shift || 1} onChange={(e) => setForm({ ...form, shift: Number(e.target.value) as 1 | 2 })}>
            <option value={1}>{t("fld.shift1")}</option><option value={2}>{t("fld.shift2")}</option>
          </select>
        </Field>
        <div className="flex gap-2 justify-end mt-4">
          <button className={btnG} onClick={() => setForm(null)}>Болдырмау</button>
          <button className={btnP} onClick={saveClass}>Сақтау</button>
        </div>
      </Modal>

      <Modal open={!!curClass} onClose={() => setCurOf(null)} title={`Оқу жоспары — ${curClass?.name || ""}`} wide>
        {curClass && <CurriculumEditor cls={curClass} subjects={subjects} teachers={teachers} update={(fn) => updateCur(curClass.id, fn)} />}
      </Modal>
    </div>
  );
}

function CurriculumEditor({ cls, subjects, teachers, update }: {
  cls: Klass; subjects: ReturnType<typeof useData.getState>["subjects"];
  teachers: ReturnType<typeof useData.getState>["teachers"];
  update: (fn: (cur: CurItem[]) => CurItem[]) => void;
}) {
  const { t } = useLang();
  const total = cls.curriculum.reduce((s, x) => s + x.hours, 0);
  const okTeachers = teachers.filter((t) => t.gradeMin <= cls.grade && t.gradeMax >= cls.grade && (t.shift === 3 || t.shift === cls.shift));
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-sm ${total > 36 ? "status-bad" : "text-muted-c"}`}>Барлығы: <b className="text-strong-c">{total}</b> сағ/апта {total > 36 && " — норма асты"}</span>
        <button className={btnP + " !py-1.5 text-xs"} onClick={() => update((c) => [...c, { id: uid(), subjectId: subjects[0].id, teacherId: okTeachers[0]?.id, hours: 2 }])}>+ Пән қосу</button>
      </div>
      <div className="space-y-2">
        {cls.curriculum.map((cu) => {
          const subj = subjects.find((s) => s.id === cu.subjectId);
          const tooMany = cu.hours > 5 && !subj?.canDouble;
          return (
            <div key={cu.id} className="rounded-xl border border-soft-c bg-surface p-3">
              <div className="grid grid-cols-6 lg:grid-cols-12 gap-2 items-center">
                <select className={inputCls + " col-span-6 lg:col-span-4"} value={cu.subjectId}
                  onChange={(e) => update((c) => c.map((x) => (x.id === cu.id ? { ...x, subjectId: e.target.value } : x)))}>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {!cu.isSplit && (
                  <select className={inputCls + " col-span-4 lg:col-span-4"} value={cu.teacherId || ""}
                    onChange={(e) => update((c) => c.map((x) => (x.id === cu.id ? { ...x, teacherId: e.target.value } : x)))}>
                    <option value="">{t("fld.pickTeacher")}</option>
                    {okTeachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}
                {cu.isSplit && <span className="col-span-6 lg:col-span-4 text-xs accent-c flex items-center gap-1.5"><Split className="w-3.5 h-3.5" /> Топтарға бөлінген</span>}
                <input type="number" min={1} max={7} className={inputCls + " col-span-2 lg:col-span-2"} value={cu.hours}
                  onChange={(e) => update((c) => c.map((x) => (x.id === cu.id ? { ...x, hours: Number(e.target.value) } : x)))} />
                <label className="col-span-2 lg:col-span-1 flex items-center gap-1 text-xs text-muted-c">
                  <input type="checkbox" checked={!!cu.isSplit}
                    onChange={(e) => update((c) => c.map((x) => (x.id === cu.id
                      ? { ...x, isSplit: e.target.checked, teacherId: e.target.checked ? undefined : okTeachers[0]?.id, groups: e.target.checked ? [{ teacherId: okTeachers[0]?.id || "" }, { teacherId: okTeachers[1]?.id || "" }] : undefined }
                      : x)))} /> топ
                </label>
                <button className={btnD + " col-span-2 lg:col-span-1"} onClick={() => update((c) => c.filter((x) => x.id !== cu.id))}>✕</button>
              </div>
              {tooMany && <p className="text-xs status-bad mt-1 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {cu.hours} сағ: бұл пәнде қос сабақ рұқсаты жоқ (макс 5). Пәндер бетінен «қос сабақ» қосыңыз.</p>}
              {cu.isSplit && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {(cu.groups || []).map((g, gi) => (
                    <div key={gi} className="flex items-center gap-2">
                      <span className="text-xs text-muted-c w-7">Г{gi + 1}</span>
                      <select className={inputCls} value={g.teacherId}
                        onChange={(e) => update((c) => c.map((x) => (x.id === cu.id ? { ...x, groups: x.groups!.map((gg, i) => (i === gi ? { ...gg, teacherId: e.target.value } : gg)) } : x)))}>
                        <option value="">{t("fld.pickTeacher")}</option>
                        {okTeachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {cls.curriculum.length === 0 && <p className="text-center text-muted-c py-6 text-sm">Оқу жоспары бос — пән қосыңыз</p>}
      </div>
    </div>
  );
}
