// filepath: src/pages/SubjectsPage.tsx
import GlassCard from "@/components/shared/GlassCard";
import { inputCls, subjBg } from "@/components/shared/Form";
import { useData } from "@/store/dataStore";
import { useLang } from "@/contexts/LangContext";

export default function SubjectsPage() {
  const { t } = useLang();
  const { subjects, setSubjects } = useData();
  const upd = (id: string, patch: Partial<(typeof subjects)[number]>) =>
    setSubjects(subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("subjects.title")}</h1>
        <p className="text-muted-c mt-1">{t("subjects.subtitle")}</p>
      </div>
      <GlassCard hover={false}>
        <div className="overflow-x-auto -mx-1 px-1"><table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-muted-c border-b border-soft-c">
              <th className="py-2">Пән</th><th>Балл</th><th>Идеал орын</th><th>Арнайы каб</th><th>Қара тізім</th><th>Қос сабақ</th><th>Цифрлық</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.id} className="border-b border-soft-c hover:bg-[rgba(127,127,127,0.1)]">
                <td className="py-2 font-medium text-strong-c">{s.name}</td>
                <td>
                  <input type="number" min={1} max={11} value={s.score}
                    onChange={(e) => upd(s.id, { score: Number(e.target.value) })}
                    className={`w-14 text-center rounded-lg border px-1 py-0.5 text-xs ${subjBg(s.score)}`} />
                </td>
                <td>
                  <input value={s.ideal.join(",")}
                    onChange={(e) => upd(s.id, { ideal: e.target.value.split(",").map((x) => Number(x.trim())).filter((n) => n >= 1 && n <= 8) })}
                    className={inputCls + " !w-24 !py-1 text-xs"} />
                </td>
                <td className="text-muted-c text-xs">{s.room ? { regular: "—", physics: "Физика", chemistry: "Химия", computer: "Информ.", gym: "Спортзал" }[s.room] : "—"}</td>
                <td className="text-muted-c text-xs">{s.black.join(", ") || "—"}</td>
                <td><input type="checkbox" checked={s.canDouble} onChange={(e) => upd(s.id, { canDouble: e.target.checked })} /></td>
                <td className="text-xs text-muted-c">{s.digital ? "✓" : s.corr ? "түзету" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </GlassCard>
    </div>
  );
}
