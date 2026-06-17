// filepath: src/pages/TeachersPage.tsx
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { Modal, Field, inputCls, btnP, btnG, btnD } from "@/components/shared/Form";
import { useData, useActiveVersion } from "@/store/dataStore";
import { useLang } from "@/contexts/LangContext";
import type { Teacher } from "@/algorithm/engine";

const uid = () => Math.random().toString(36).slice(2, 10);
const DAYS_S = ["", "Дс", "Сс", "Ср", "Бс", "Жм"];

export default function TeachersPage() {
  const { t } = useLang();
  const { teachers, setTeachers, classes } = useData();
  const active = useActiveVersion();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Partial<Teacher> | null>(null);

  const filtered = teachers.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
  const loadOf = (id: string) => active ? active.result.slots.filter((o) => o.teacherId === id).length : 0;

  const save = () => {
    if (!form?.name) return;
    const t: Teacher = {
      id: form.id || uid(), name: form.name, norm: form.norm || 18,
      gradeMin: form.gradeMin || 1, gradeMax: form.gradeMax || 11,
      shift: (form.shift || 1) as 1 | 2 | 3,
      unavailable: form.unavailable || [], noInterShift: !!form.noInterShift,
    };
    setTeachers(form.id ? teachers.map((x) => (x.id === t.id ? t : x)) : [...teachers, t]);
    setForm(null);
  };
  const toggleUnavail = (key: string) => {
    const u = form?.unavailable || [];
    setForm({ ...form, unavailable: u.includes(key) ? u.filter((x) => x !== key) : [...u, key] });
  };
  const usedBy = (id: string) => classes.filter((c) => c.curriculum.some((cu) => cu.teacherId === id || cu.groups?.some((g) => g.teacherId === id))).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("teachers.title")}</h1>
          <p className="text-muted-c mt-1">{t("teachers.subtitle")}</p>
        </div>
        <button className={btnP + " flex items-center gap-2"} onClick={() => setForm({ norm: 18, gradeMin: 5, gradeMax: 11, shift: 1, unavailable: [] })}>
          <Plus className="w-4 h-4" /> {t("teachers.add")}
        </button>
      </div>
      <input className={inputCls + " max-w-xs"} placeholder="🔍 Іздеу..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <GlassCard hover={false}>
        <div className="overflow-x-auto -mx-1 px-1"><table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-muted-c border-b border-soft-c">
              <th className="py-2">ФИО</th><th>Диапазон</th><th>Ауысым</th><th>Жүктеме / Норма</th><th>Шектеу</th><th>Әрекеттер</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const load = loadOf(t.id);
              return (
                <tr key={t.id} className="border-b border-soft-c hover:bg-[rgba(127,127,127,0.1)]">
                  <td className="py-2.5 font-medium text-strong-c">{t.name}</td>
                  <td><span className="px-2 py-0.5 rounded text-xs bg-[rgba(74,144,217,0.12)] accent-c">{t.gradeMin}–{t.gradeMax} сын.</span></td>
                  <td className="text-soft-c">{t.shift === 3 ? "1+2" : t.shift}</td>
                  <td className={load > t.norm ? "status-bad" : "text-soft-c"}>{active ? `${load} / ${t.norm}` : `— / ${t.norm}`}</td>
                  <td className="text-muted-c text-xs">{t.unavailable.length ? `${t.unavailable.length} слот` : "—"}</td>
                  <td className="flex gap-2 py-2">
                    <button className={btnG + " !px-2.5 !py-1.5"} onClick={() => setForm({ ...t })}><Pencil className="w-4 h-4" /></button>
                    <button className={btnD} onClick={() => {
                      const n = usedBy(t.id);
                      if (n > 0) { alert(`Бұл мұғалім ${n} сыныптың оқу жоспарында бар — алдымен сол жерден алып тастаңыз.`); return; }
                      if (confirm(`${t.name} жою?`)) setTeachers(teachers.filter((x) => x.id !== t.id));
                    }}><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </GlassCard>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Мұғалімді өңдеу" : "Жаңа мұғалім"} wide>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="ФИО"><input className={inputCls} value={form?.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Апталық норма (сағ)"><input type="number" className={inputCls} value={form?.norm || 18} onChange={(e) => setForm({ ...form, norm: Number(e.target.value) })} /></Field>
          <Field label="Мин. сынып">
            <select className={inputCls} value={form?.gradeMin || 1} onChange={(e) => setForm({ ...form, gradeMin: Number(e.target.value) })}>
              {Array.from({ length: 11 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </Field>
          <Field label="Макс. сынып">
            <select className={inputCls} value={form?.gradeMax || 11} onChange={(e) => setForm({ ...form, gradeMax: Number(e.target.value) })}>
              {Array.from({ length: 11 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </Field>
          <Field label="Ауысым">
            <select className={inputCls} value={form?.shift || 1} onChange={(e) => setForm({ ...form, shift: Number(e.target.value) as 1 | 2 | 3 })}>
              <option value={1}>1-ауысым</option><option value={2}>2-ауысым</option><option value={3}>Екеуі де</option>
            </select>
          </Field>
          <Field label="Ауысым аралық ауысу">
            <label className="flex items-center gap-2 text-sm text-soft-c mt-2">
              <input type="checkbox" checked={!!form?.noInterShift} onChange={(e) => setForm({ ...form, noInterShift: e.target.checked })} />
              Бір күнде тек бір ауысым
            </label>
          </Field>
        </div>
        <Field label="Қолжетімсіз уақыттар (басыңыз)">
          <div className="overflow-x-auto"><div className="grid gap-1 min-w-[420px]" style={{ gridTemplateColumns: "auto repeat(8, 1fr)" }}>
            <div></div>
            {Array.from({ length: 8 }, (_, i) => <div key={i} className="text-center text-xs text-muted-c">{i + 1}</div>)}
            {[1, 2, 3, 4, 5].map((d) => (
              <FragmentRow key={d} d={d} unavailable={form?.unavailable || []} toggle={toggleUnavail} />
            ))}
          </div></div>
        </Field>
        <div className="flex gap-2 justify-end mt-4">
          <button className={btnG} onClick={() => setForm(null)}>Болдырмау</button>
          <button className={btnP} onClick={save}>Сақтау</button>
        </div>
      </Modal>
    </div>
  );
}

function FragmentRow({ d, unavailable, toggle }: { d: number; unavailable: string[]; toggle: (k: string) => void }) {
  return (
    <>
      <div className="text-xs text-muted-c pr-2 flex items-center">{DAYS_S[d]}</div>
      {Array.from({ length: 8 }, (_, i) => {
        const key = `${d}-${i + 1}`;
        const off = unavailable.includes(key);
        return (
          <button key={key} onClick={() => toggle(key)}
            className={`h-7 rounded text-xs transition-all ${off ? "bg-red-500/30 status-bad" : "bg-input-c text-faint-c hover:bg-[rgba(127,127,127,0.15)]"}`}>
            {off ? "✕" : ""}
          </button>
        );
      })}
    </>
  );
}
