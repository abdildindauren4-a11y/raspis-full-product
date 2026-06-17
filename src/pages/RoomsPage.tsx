// filepath: src/pages/RoomsPage.tsx
import { useState } from "react";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { Modal, Field, inputCls, btnP, btnG, btnD } from "@/components/shared/Form";
import { useData } from "@/store/dataStore";
import { useLang } from "@/contexts/LangContext";
import type { Room, RoomType } from "@/algorithm/engine";

const uid = () => Math.random().toString(36).slice(2, 10);
const TYPES: Record<RoomType, string> = { regular: "Қарапайым", physics: "Физика", chemistry: "Химия", computer: "Информатика", gym: "Спортзал" };

export default function RoomsPage() {
  const { t } = useLang();
  const { rooms, setRooms, subjects, classes } = useData();
  const [form, setForm] = useState<Partial<Room> | null>(null);

  // арнайы кабинет жетіспеуін ескерту
  const neededTypes = new Set<RoomType>();
  classes.forEach((c) => c.curriculum.forEach((cu) => {
    const s = subjects.find((x) => x.id === cu.subjectId);
    if (s?.room) neededTypes.add(s.room);
  }));
  const missing = [...neededTypes].filter((t) => !rooms.some((r) => r.type === t));

  const save = () => {
    if (!form?.number) return;
    const r: Room = {
      id: form.id || uid(), number: form.number, type: (form.type || "regular") as RoomType,
      capacity: form.capacity || 30,
      gymMax: form.type === "gym" ? form.gymMax || 1 : undefined,
      gymGroups: form.type === "gym" ? form.gymGroups || [[1, 4], [5, 7], [8, 11]] : undefined,
    };
    setRooms(form.id ? rooms.map((x) => (x.id === r.id ? r : x)) : [...rooms, r]);
    setForm(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("rooms.title")}</h1>
          <p className="text-muted-c mt-1">{t("rooms.subtitle")}</p>
        </div>
        <button className={btnP + " flex items-center gap-2"} onClick={() => setForm({ type: "regular", capacity: 30 })}>
          <Plus className="w-4 h-4" /> {t("rooms.add")}
        </button>
      </div>
      {missing.length > 0 && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm status-bad">
          <AlertTriangle className="w-4 h-4 inline mr-1.5" /> Оқу жоспарларында бар, бірақ кабинеті ЖОҚ: {missing.map((t) => TYPES[t]).join(", ")}. Генерация осыған тоқтайды!
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {(Object.keys(TYPES) as RoomType[]).map((t) => (
          <GlassCard key={t} hover={false}>
            <p className="text-2xl font-bold gradient-text">{rooms.filter((r) => r.type === t).length}</p>
            <p className="text-xs text-muted-c">{TYPES[t]}</p>
          </GlassCard>
        ))}
      </div>
      <GlassCard hover={false}>
        <div className="overflow-x-auto -mx-1 px-1"><table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-muted-c border-b border-soft-c">
              <th className="py-2">№ Кабинет</th><th>Тип</th><th>Сыйымдылық</th><th>Спортзал ережесі</th><th>Әрекеттер</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id} className="border-b border-soft-c hover:bg-[rgba(127,127,127,0.1)]">
                <td className="py-2.5 font-medium text-strong-c">{r.number}</td>
                <td><span className={`px-2 py-0.5 rounded text-xs ${r.type === "regular" ? "bg-[rgba(127,127,127,0.15)] text-muted-c" : r.type === "gym" ? "bg-emerald-500/15 status-good" : "bg-[rgba(74,144,217,0.12)] accent-c"}`}>{TYPES[r.type]}</span></td>
                <td className="text-soft-c">{r.capacity || 30}</td>
                <td className="text-muted-c text-xs">{r.type === "gym" ? `макс ${r.gymMax} сынып · топтар: ${(r.gymGroups || []).map((g) => g.join("-")).join(", ")}` : "—"}</td>
                <td className="flex gap-2 py-2">
                  <button className={btnG + " !px-2.5 !py-1.5"} onClick={() => setForm({ ...r })}><Pencil className="w-4 h-4" /></button>
                  <button className={btnD} onClick={() => { if (confirm(`${r.number} жою?`)) setRooms(rooms.filter((x) => x.id !== r.id)); }}><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </GlassCard>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Кабинетті өңдеу" : "Жаңа кабинет"}>
        <Field label="№ / Атауы"><input className={inputCls} value={form?.number || ""} onChange={(e) => setForm({ ...form, number: e.target.value })} /></Field>
        <Field label="Тип">
          <select className={inputCls} value={form?.type || "regular"} onChange={(e) => setForm({ ...form, type: e.target.value as RoomType })}>
            {(Object.keys(TYPES) as RoomType[]).map((t) => <option key={t} value={t}>{TYPES[t]}</option>)}
          </select>
        </Field>
        <Field label="Сыйымдылық"><input type="number" className={inputCls} value={form?.capacity || 30} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></Field>
        {form?.type === "gym" && (
          <Field label="Бір уақытта макс сынып">
            <input type="number" min={1} max={4} className={inputCls} value={form?.gymMax || 1} onChange={(e) => setForm({ ...form, gymMax: Number(e.target.value) })} />
            <p className="text-xs text-muted-c mt-1">Рұқсат топтары: 1-4, 5-7, 8-11 (бір топтың сыныптары ғана бірге кіре алады)</p>
          </Field>
        )}
        <div className="flex gap-2 justify-end mt-4">
          <button className={btnG} onClick={() => setForm(null)}>Болдырмау</button>
          <button className={btnP} onClick={save}>Сақтау</button>
        </div>
      </Modal>
    </div>
  );
}
