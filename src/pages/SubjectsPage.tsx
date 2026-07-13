// filepath: src/pages/SubjectsPage.tsx
import { useState, Fragment } from "react";
import GlassCard from "@/components/shared/GlassCard";
import { inputCls, subjBg } from "@/components/shared/Form";
import SlotMatrix from "@/components/shared/SlotMatrix";
import { useData } from "@/store/dataStore";
import { useLang } from "@/contexts/LangContext";
import { CalendarX2, ChevronDown } from "lucide-react";

export default function SubjectsPage() {
  const { t } = useLang();
  const { subjects, setSubjects } = useData();
  const [openId, setOpenId] = useState<string | null>(null);
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
              <th className="py-2">{t("subj.colSubject")}</th><th>{t("subj.colScore")}</th><th>{t("subj.colIdeal")}</th><th>{t("subj.colSpecial")}</th><th>{t("subj.colBlacklist")}</th><th>{t("subj.colDouble")}</th><th>{t("subj.colDigital")}</th>
              <th className="text-center">Тыйым</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <Fragment key={s.id}>
                <tr className="border-b border-soft-c hover:bg-[rgba(127,127,127,0.1)]">
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
                  <td className="text-center">
                    <button onClick={() => setOpenId(openId === s.id ? null : s.id)}
                      title="Тыйым салынған уақыттарды баптау"
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                        s.bannedSlots?.length ? "status-bad bg-red-500/15" : "text-muted-c hover:bg-[rgba(127,127,127,0.12)]"}`}>
                      <CalendarX2 className="w-3.5 h-3.5" />
                      {s.bannedSlots?.length ? s.bannedSlots.length : ""}
                      <ChevronDown className={`w-3 h-3 transition-transform ${openId === s.id ? "rotate-180" : ""}`} />
                    </button>
                  </td>
                </tr>
                {openId === s.id && (
                  <tr className="border-b border-soft-c bg-input-c/40">
                    <td colSpan={9} className="p-3">
                      <p className="text-xs text-muted-c mb-2 flex items-center gap-1.5">
                        <CalendarX2 className="w-3.5 h-3.5 status-bad" />
                        «{s.name}» осы ұяшықтарға қойылмайды — басып Х қойыңыз (күн атауын бассаңыз — бүкіл күн):
                      </p>
                      <SlotMatrix value={s.bannedSlots || []} onChange={(bannedSlots) => upd(s.id, { bannedSlots })} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table></div>
        <p className="text-xs text-faint-c mt-3">
          «Тыйым» бағанындағы белгіні басып, әр пәннің қойылмайтын уақыттарын торда белгілеңіз (Х). Екі алгоритм-модель де сақтайды.
        </p>
      </GlassCard>
    </div>
  );
}
