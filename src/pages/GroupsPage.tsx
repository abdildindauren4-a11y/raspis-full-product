// filepath: src/pages/GroupsPage.tsx
// Топқа бөлу — пәндерді топтарға бөлу (мыс. ағылшын тілі екі топқа).
// Топқа бөлінетін сыныпты ҚОСУ, мұғалім тағайындау, топты алып тастау.

import { useState } from "react";
import GlassCard from "@/components/shared/GlassCard";
import { useData } from "@/store/dataStore";
import { useLang } from "@/contexts/LangContext";
import { Users, Plus, X, Trash2 } from "lucide-react";
import { inputCls, btnG } from "@/components/shared/Form";
import type { Klass } from "@/algorithm/engine";

export default function GroupsPage() {
  const { t } = useLang();
  const { classes, teachers, subjects, setClasses } = useData();
  const sName = (id: string) => subjects.find((s) => s.id === id)?.name || id;

  // Топқа бөлінген пәндер (бар)
  const items = classes.flatMap((c) =>
    c.curriculum.filter((cu) => cu.isSplit).map((cu) => ({ cls: c, cu })));

  // «Қосу» формасы
  const [adding, setAdding] = useState(false);
  const [selClass, setSelClass] = useState("");
  const [selCurr, setSelCurr] = useState("");

  // Таңдалған сыныптың топқа БӨЛІНБЕГЕН пәндері (қосуға болатындар)
  const selectedClass = classes.find((c) => c.id === selClass);
  const availableCurr = selectedClass
    ? selectedClass.curriculum.filter((cu) => !cu.isSplit)
    : [];

  // Пәнді топқа бөлу (isSplit=true + 2 бос топ)
  const addSplit = () => {
    if (!selClass || !selCurr) return;
    const next: Klass[] = classes.map((c) => {
      if (c.id !== selClass) return c;
      return {
        ...c,
        curriculum: c.curriculum.map((cu) =>
          cu.id === selCurr
            ? { ...cu, isSplit: true, groups: [{ teacherId: "" }, { teacherId: "" }] }
            : cu
        ),
      };
    });
    setClasses(next);
    setAdding(false); setSelClass(""); setSelCurr("");
  };

  // Топ мұғалімін өзгерту
  const setGroupTeacher = (classId: string, currId: string, groupIdx: number, teacherId: string) => {
    setClasses(classes.map((c) => {
      if (c.id !== classId) return c;
      return {
        ...c,
        curriculum: c.curriculum.map((cu) => {
          if (cu.id !== currId) return cu;
          const groups = [...(cu.groups || [{ teacherId: "" }, { teacherId: "" }])];
          groups[groupIdx] = { ...groups[groupIdx], teacherId };
          return { ...cu, groups };
        }),
      };
    }));
  };

  // Топқа бөлуді алып тастау (isSplit=false)
  const removeSplit = (classId: string, currId: string) => {
    setClasses(classes.map((c) => {
      if (c.id !== classId) return c;
      return {
        ...c,
        curriculum: c.curriculum.map((cu) =>
          cu.id === currId ? { ...cu, isSplit: false, groups: undefined } : cu
        ),
      };
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("grp.title")}</h1>
          <p className="text-muted-c mt-1">{t("grp.subtitle2")}</p>
        </div>
        {!adding && (
          <button className={btnG + " flex items-center gap-2"} onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4" /> {t("grp.addSplit")}
          </button>
        )}
      </div>

      {/* Қосу формасы */}
      {adding && (
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-strong-c flex items-center gap-2"><Users className="w-4 h-4 accent-c" /> {t("grp.addSplitTitle")}</h3>
            <button onClick={() => { setAdding(false); setSelClass(""); setSelCurr(""); }} className="text-muted-c hover:text-strong-c"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Сынып таңдау */}
            <div>
              <label className="text-xs font-medium text-muted-c mb-1.5 block">{t("grp.chooseClass")}</label>
              <select className={inputCls} value={selClass} onChange={(e) => { setSelClass(e.target.value); setSelCurr(""); }}>
                <option value="">{t("grp.selectClass")}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {/* Пән таңдау */}
            <div>
              <label className="text-xs font-medium text-muted-c mb-1.5 block">{t("grp.chooseSubject")}</label>
              <select className={inputCls} value={selCurr} onChange={(e) => setSelCurr(e.target.value)} disabled={!selClass}>
                <option value="">{t("grp.selectSubject")}</option>
                {availableCurr.map((cu) => (
                  <option key={cu.id} value={cu.id}>{sName(cu.subjectId)} ({cu.hours} сағ)</option>
                ))}
              </select>
            </div>
          </div>
          {selClass && availableCurr.length === 0 && (
            <p className="text-xs text-amber-500 mt-3">{t("grp.allSplit")}</p>
          )}
          <button className="gradient-primary text-white rounded-xl px-4 py-2.5 mt-4 w-full font-medium disabled:opacity-50 flex items-center justify-center gap-2" disabled={!selClass || !selCurr} onClick={addSplit}>
            <Plus className="w-4 h-4" /> {t("grp.doSplit")}
          </button>
        </GlassCard>
      )}

      {/* Топқа бөлінген пәндер тізімі */}
      <GlassCard hover={false}>
        {items.length === 0 ? (
          <p className="text-center text-muted-c py-8 text-sm">
            {t("grp.emptyHint")} <button onClick={() => setAdding(true)} className="accent-c underline">{t("grp.addSplit")}</button> {t("grp.emptyHint2")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-c border-b border-soft-c">
                  <th className="py-2">{t("grp.colClass")}</th>
                  <th>{t("grp.colSubject")}</th>
                  <th>{t("grp.colHours")}</th>
                  <th>{t("grp.group1")}</th>
                  <th>{t("grp.group2")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map(({ cls, cu }) => (
                  <tr key={cls.id + cu.id} className="border-b border-soft-c">
                    <td className="py-2.5 font-semibold text-strong-c">{cls.name}</td>
                    <td className="text-soft-c">{sName(cu.subjectId)}</td>
                    <td className="text-soft-c">{cu.hours}</td>
                    {/* Топ 1 мұғалімі */}
                    <td className="py-1.5 pr-2">
                      <select
                        className={inputCls + " py-1 text-xs min-w-[120px]"}
                        value={cu.groups?.[0]?.teacherId || ""}
                        onChange={(e) => setGroupTeacher(cls.id, cu.id, 0, e.target.value)}
                      >
                        <option value="">{t("grp.selectTeacher")}</option>
                        {teachers.map((tt) => <option key={tt.id} value={tt.id}>{tt.name}</option>)}
                      </select>
                    </td>
                    {/* Топ 2 мұғалімі */}
                    <td className="py-1.5 pr-2">
                      <select
                        className={inputCls + " py-1 text-xs min-w-[120px]"}
                        value={cu.groups?.[1]?.teacherId || ""}
                        onChange={(e) => setGroupTeacher(cls.id, cu.id, 1, e.target.value)}
                      >
                        <option value="">{t("grp.selectTeacher")}</option>
                        {teachers.map((tt) => <option key={tt.id} value={tt.id}>{tt.name}</option>)}
                      </select>
                    </td>
                    {/* Алып тастау */}
                    <td>
                      <button onClick={() => removeSplit(cls.id, cu.id)} className="text-muted-c hover:text-red-500 p-1" title={t("grp.removeSplit")}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
