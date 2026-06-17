// filepath: src/pages/GroupsPage.tsx
import GlassCard from "@/components/shared/GlassCard";
import { useData } from "@/store/dataStore";
import { useLang } from "@/contexts/LangContext";
import { Link } from "react-router-dom";

export default function GroupsPage() {
  const { t } = useLang();
  const { classes, teachers, subjects } = useData();
  const items = classes.flatMap((c) =>
    c.curriculum.filter((cu) => cu.isSplit).map((cu) => ({ cls: c, cu })));
  const tName = (id?: string) => teachers.find((t) => t.id === id)?.name || "—";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("grp.title")}</h1>
        <p className="text-muted-c mt-1">Топтарға бөлінген пәндер шолуы. Баптау — Сыныптар → Оқу жоспары ішінде.</p>
      </div>
      <GlassCard hover={false}>
        {items.length === 0 ? (
          <p className="text-center text-muted-c py-8 text-sm">
            Топқа бөлінген пән жоқ. <Link to="/classes" className="accent-c">Сыныптар бетінде</Link> оқу жоспарын ашып «топ» белгісін қойыңыз.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-c border-b border-soft-c">
                <th className="py-2">Сынып</th><th>Пән</th><th>Сағат</th><th>Топ 1</th><th>Топ 2</th>
              </tr>
            </thead>
            <tbody>
              {items.map(({ cls, cu }) => (
                <tr key={cu.id} className="border-b border-soft-c">
                  <td className="py-2.5 font-semibold text-strong-c">{cls.name}</td>
                  <td className="text-soft-c">{subjects.find((s) => s.id === cu.subjectId)?.name}</td>
                  <td className="text-soft-c">{cu.hours}</td>
                  <td className="text-muted-c">{tName(cu.groups?.[0]?.teacherId)}</td>
                  <td className="text-muted-c">{tName(cu.groups?.[1]?.teacherId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>
    </div>
  );
}
