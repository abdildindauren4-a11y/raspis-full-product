// filepath: src/pages/KomplektsPage.tsx
// ШЖМ (шағын жинақты мектеп) — класс-комплектілерді басқару беті.
// Тек «Мектеп түрі: ШЖМ» болғанда көрінеді (Sidebar шартты көрсетеді).
// Комплект = 2 сыныптың бір мұғалім, бір кабинетте біріктірілген тобы.
// Аралас мектеп: комплектіге кірмеген сыныптар «жеке» болып қала береді.
import { useState } from "react";
import { Plus, Pencil, Trash2, Layers, Info } from "lucide-react";
import { Link } from "react-router-dom";
import GlassCard from "@/components/shared/GlassCard";
import { Modal, Field, inputCls, btnP, btnG, btnD } from "@/components/shared/Form";
import { useData } from "@/store/dataStore";
import { useLang } from "@/contexts/LangContext";
import type { Komplekt } from "@/algorithm/engine";

const uid = () => Math.random().toString(36).slice(2, 10);

export default function KomplektsPage() {
  const { t } = useLang();
  const { school, komplekts, setKomplekts, classes, teachers, rooms } = useData();
  const [form, setForm] = useState<Partial<Komplekt> | null>(null);

  const clsById = new Map(classes.map((c) => [c.id, c]));
  const tById = new Map(teachers.map((tt) => [tt.id, tt]));
  const rById = new Map(rooms.map((r) => [r.id, r]));
  // Комплектіде тұрған сынып ид-тері (басқа комплектіге қосуға болмайды)
  const usedClassIds = new Set(komplekts.flatMap((k) => k.classIds));
  // Жеке (комплектіге кірмеген) сыныптар — аралас мектеп
  const standalone = classes.filter((c) => !usedClassIds.has(c.id));

  const toggleClass = (id: string) => {
    const cur = form?.classIds || [];
    if (cur.includes(id)) setForm({ ...form, classIds: cur.filter((x) => x !== id) });
    else if (cur.length < 2) setForm({ ...form, classIds: [...cur, id] }); // 2 сыныптық
  };

  const save = () => {
    if (!form || (form.classIds || []).length !== 2) return;
    const ids = form.classIds!;
    const nm = form.name?.trim() || ids.map((i) => clsById.get(i)?.name || "?").join("-") + " " + t("komp.komplektWord");
    const k: Komplekt = { id: form.id || uid(), name: nm, classIds: ids, teacherId: form.teacherId, roomId: form.roomId };
    setKomplekts(form.id ? komplekts.map((x) => (x.id === k.id ? k : x)) : [...komplekts, k]);
    setForm(null);
  };

  // Өңдеу кезінде осы комплектінің сыныптары да таңдауға қолжетімді болсын
  const editingIds = new Set(form?.classIds || []);
  const selectableClasses = classes.filter((c) => !usedClassIds.has(c.id) || editingIds.has(c.id));

  if (school.type !== "shzhm")
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3 text-center px-4">
        <Layers className="w-10 h-10 text-faint-c" />
        <p className="text-muted-c">{t("komp.onlyShzhm")}</p>
        <Link to="/settings" className="accent-c text-sm hover:underline">{t("komp.toSettings")} →</Link>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("komp.title")}</h1>
          <p className="text-muted-c mt-1">{t("komp.subtitle")}</p>
        </div>
        <button className={btnP + " flex items-center gap-2"} onClick={() => setForm({ classIds: [] })}>
          <Plus className="w-4 h-4" /> {t("komp.add")}
        </button>
      </div>

      <div className="rounded-xl border border-[rgba(74,144,217,0.25)] bg-[rgba(74,144,217,0.08)] p-3 flex gap-2.5 text-xs text-soft-c">
        <Info className="w-4 h-4 accent-c shrink-0 mt-0.5" />
        <p>{t("komp.hint")}</p>
      </div>

      {/* Комплектілер тізімі */}
      <GlassCard hover={false}>
        {komplekts.length === 0 ? (
          <p className="text-center text-muted-c py-8 text-sm">{t("komp.empty")}</p>
        ) : (
          <div className="space-y-2">
            {komplekts.map((k) => (
              <div key={k.id} className="rounded-xl border border-soft-c bg-surface p-3 flex items-center gap-3 flex-wrap">
                <Layers className="w-5 h-5 accent-c shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-strong-c text-sm">{k.name}</p>
                  <p className="text-xs text-muted-c">
                    {k.classIds.map((i) => clsById.get(i)?.name || "?").join(" + ")}
                    {k.teacherId && ` · ${t("komp.teacher")}: ${tById.get(k.teacherId)?.name || "—"}`}
                    {k.roomId && ` · ${t("komp.room")}: ${rById.get(k.roomId)?.number || "—"}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className={btnG + " !px-2.5 !py-1.5"} onClick={() => setForm({ ...k })}><Pencil className="w-4 h-4" /></button>
                  <button className={btnD} onClick={() => { if (confirm(`${k.name} ${t("com.delete")}`)) setKomplekts(komplekts.filter((x) => x.id !== k.id)); }}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Жеке (комплектіге кірмеген) сыныптар — аралас мектеп */}
      {standalone.length > 0 && (
        <GlassCard hover={false}>
          <h3 className="font-semibold text-strong-c mb-2 text-sm">{t("komp.standalone")} ({standalone.length})</h3>
          <p className="text-xs text-muted-c mb-3">{t("komp.standaloneDesc")}</p>
          <div className="flex flex-wrap gap-1.5">
            {standalone.map((c) => (
              <span key={c.id} className="px-2.5 py-1 rounded-lg text-xs bg-input-c border border-soft-c text-soft-c">{c.name}</span>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Комплект қосу/өңдеу */}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? t("komp.edit") : t("komp.new")} wide>
        <Field label={t("komp.nameLabel")}>
          <input className={inputCls} placeholder={t("komp.namePlaceholder")} value={form?.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label={`${t("komp.pickClasses")} (${(form?.classIds || []).length}/2)`}>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {selectableClasses.map((c) => {
              const on = (form?.classIds || []).includes(c.id);
              return (
                <button key={c.id} type="button" onClick={() => toggleClass(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${on ? "gradient-primary text-white border-transparent" : "bg-input-c border-soft-c text-muted-c hover:border-[var(--accent)]"}`}>
                  {c.name}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-faint-c mt-1.5">{t("komp.pickClassesHint")}</p>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t("komp.teacher")}>
            <select className={inputCls} value={form?.teacherId || ""} onChange={(e) => setForm({ ...form, teacherId: e.target.value || undefined })}>
              <option value="">{t("komp.pickTeacher")}</option>
              {teachers.map((tt) => <option key={tt.id} value={tt.id}>{tt.name}</option>)}
            </select>
          </Field>
          <Field label={t("komp.room")}>
            <select className={inputCls} value={form?.roomId || ""} onChange={(e) => setForm({ ...form, roomId: e.target.value || undefined })}>
              <option value="">{t("komp.pickRoom")}</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.number}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button className={btnG} onClick={() => setForm(null)}>{t("com.cancel")}</button>
          <button className={btnP} disabled={(form?.classIds || []).length !== 2} onClick={save}>{t("com.save")}</button>
        </div>
      </Modal>
    </div>
  );
}
