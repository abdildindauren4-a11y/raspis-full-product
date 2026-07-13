// filepath: src/components/shared/SlotMatrix.tsx
// «Икстап тастау» торы: апта × сабақ торы. Завуч ұяшықты басып Х қояды —
// сол күн/слотқа объект (мұғалім/пән) қойылмайды. Мәні "day-slot" жолдары
// массиві (мыс. "1-1", "3-5"). Мұғалім бетінде де, пән бетінде де ортақ.
import { useMemo } from "react";

const DAYS_S = ["", "Дс", "Сс", "Ср", "Бс", "Жм", "Сб"];

export default function SlotMatrix({ value, onChange, days = 5, slots = 8 }: {
  value: string[];
  onChange: (next: string[]) => void;
  days?: number;
  slots?: number;
}) {
  const set = useMemo(() => new Set(value), [value]);
  const toggle = (key: string) =>
    onChange(set.has(key) ? value.filter((x) => x !== key) : [...value, key]);
  // Бүкіл бағанды (күн) немесе жолды (сабақ нөмірі) бір басумен ауыстыру
  const toggleDay = (d: number) => {
    const keys = Array.from({ length: slots }, (_, i) => `${d}-${i + 1}`);
    const allOff = keys.every((k) => set.has(k));
    onChange(allOff ? value.filter((x) => !keys.includes(x)) : [...new Set([...value, ...keys])]);
  };

  return (
    <div className="overflow-x-auto">
      <div className="grid gap-1" style={{ gridTemplateColumns: `auto repeat(${slots}, 1fr)`, minWidth: 60 + slots * 44 }}>
        <div></div>
        {Array.from({ length: slots }, (_, i) => (
          <div key={i} className="text-center text-xs text-muted-c pb-0.5">{i + 1}</div>
        ))}
        {Array.from({ length: days }, (_, di) => {
          const d = di + 1;
          return (
            <FragmentRow key={d} d={d} slots={slots} set={set} toggle={toggle} toggleDay={toggleDay} />
          );
        })}
      </div>
    </div>
  );
}

function FragmentRow({ d, slots, set, toggle, toggleDay }: {
  d: number; slots: number; set: Set<string>;
  toggle: (k: string) => void; toggleDay: (d: number) => void;
}) {
  return (
    <>
      <button onClick={() => toggleDay(d)} title="Бүкіл күнді ауыстыру"
        className="text-xs text-muted-c pr-2 flex items-center hover:text-strong-c">
        {DAYS_S[d]}
      </button>
      {Array.from({ length: slots }, (_, i) => {
        const key = `${d}-${i + 1}`;
        const off = set.has(key);
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
