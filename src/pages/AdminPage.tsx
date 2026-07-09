// filepath: src/pages/AdminPage.tsx
import { useState, useEffect } from "react";
import { Shield, Users, Search, Crown, CreditCard, User as UserIcon, Loader2, Eye, CalendarPlus } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { inputCls } from "@/components/shared/Form";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import type { TransKey } from "@/i18n/translations";
import {
  getAllUsers, setUserRole, setUserPlan, extendDataEntry,
  type UserRecord, type Role,
} from "@/lib/roles";
import { PLAN_ORDER, PLANS, type PlanId } from "@/lib/plans";

const ROLE_INFO: Record<Role, { label: string; icon: typeof Crown; cls: string }> = {
  admin: { label: "role.admin", icon: Crown, cls: "status-warn" },
  paid: { label: "role.paid", icon: CreditCard, cls: "status-good" },
  free: { label: "role.free", icon: UserIcon, cls: "text-muted-c" },
  demo: { label: "role.demo", icon: Eye, cls: "accent-c" },
};

export default function AdminPage() {
  const { role, configured } = useAuth();
  const { t } = useLang();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setUsers(await getAllUsers());
      setLoading(false);
    })();
  }, []);

  // Тек админге рұқсат
  if (role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="w-12 h-12 text-faint-c mb-3" />
        <p className="text-muted-c">{t("adm.onlyAdmin")}</p>
      </div>
    );
  }

  const changeRole = async (uid: string, newRole: Role) => {
    const ok = await setUserRole(uid, newRole);
    if (ok) setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)));
  };

  const changePlan = async (uid: string, plan: PlanId) => {
    const ok = await setUserPlan(uid, plan);
    if (ok) {
      // Жаңартылған мерзімдерді бұлттан қайта оқымай-ақ жергілікті есептейміз
      const limits = PLANS[plan];
      const paid = plan !== "free";
      const now = Date.now();
      setUsers((prev) => prev.map((u) => (u.uid === uid ? {
        ...u, plan,
        quickRemaining: limits.quickGenerations, deepRemaining: limits.deepSearches,
        planExpiresAt: paid ? now + limits.durationMs : 0,
        dataEntryUntil: paid ? now + 7 * 86400000 : 0,
      } : u)));
    }
  };

  const extendData = async (uid: string) => {
    const ok = await extendDataEntry(uid, 7);
    if (ok) setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, dataEntryUntil: Date.now() + 7 * 86400000 } : u)));
  };

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(query.toLowerCase()) || u.name.toLowerCase().includes(query.toLowerCase())
  );

  const stats = {
    total: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    paid: users.filter((u) => u.role === "paid").length,
    free: users.filter((u) => u.role === "free").length,
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center"><Shield className="w-5 h-5 text-white" /></div>
        <div>
          <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("adm.title")}</h1>
          <p className="text-muted-c mt-0.5 text-sm">{t("adm.subtitle")}</p>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t("adm.statAll"), value: stats.total, icon: Users },
          { label: t("role.admin"), value: stats.admin, icon: Crown },
          { label: t("role.paid"), value: stats.paid, icon: CreditCard },
          { label: t("role.free"), value: stats.free, icon: UserIcon },
        ].map((s) => (
          <GlassCard key={s.label} hover={false}>
            <div className="flex items-center gap-3">
              <s.icon className="w-5 h-5 accent-c" />
              <div>
                <p className="text-2xl font-bold text-strong-c">{s.value}</p>
                <p className="text-xs text-muted-c">{s.label}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-c py-10 justify-center"><Loader2 className="w-5 h-5 animate-spin accent-c" /> {t("adm.loading")}</div>
      ) : (
        <GlassCard hover={false}>
          {/* Іздеу */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-faint-c absolute left-3 top-2.5" />
            <input className={inputCls + " !pl-9"} placeholder={t("adm.searchUser")} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Users className="w-10 h-10 text-faint-c mx-auto mb-3" />
              {!configured ? (
                <>
                  <p className="text-strong-c font-medium mb-1">{t("adm.notConfigured")}</p>
                  <p className="text-sm text-muted-c max-w-md mx-auto">{t("adm.notConfiguredDesc")}</p>
                </>
              ) : query ? (
                <p className="text-muted-c text-sm">{t("adm.noMatch")}</p>
              ) : (
                <>
                  <p className="text-strong-c font-medium mb-1">{t("adm.noUsersYet")}</p>
                  <p className="text-sm text-muted-c max-w-md mx-auto">{t("adm.noUsersDesc")}</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((u) => {
                const info = ROLE_INFO[u.role];
                return (
                  <div key={u.uid} className="flex flex-col gap-3 p-3 rounded-lg bg-input-c border border-soft-c">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <info.icon className={`w-4 h-4 shrink-0 ${info.cls}`} />
                          <span className="font-medium text-strong-c truncate">{u.name}</span>
                        </div>
                        <p className="text-xs text-muted-c truncate mt-0.5">{u.email}</p>
                        <p className="text-xs text-faint-c mt-0.5">
                          {t("plan.quickRemaining")}: {u.quickRemaining} · {t("plan.deepRemaining")}: {u.deepRemaining}
                        </p>
                        {u.plan !== "free" && !!u.planExpiresAt && (
                          <p className="text-xs text-faint-c mt-0.5">
                            {t("plan.expires")}: {new Date(u.planExpiresAt).toLocaleDateString()} ·{" "}
                            {u.dataEntryUntil && Date.now() <= u.dataEntryUntil
                              ? `${t("adm.dataUntil")}: ${new Date(u.dataEntryUntil).toLocaleDateString()}`
                              : t("adm.dataClosed")}
                          </p>
                        )}
                      </div>
                      {/* Рөл таңдау */}
                      <div className="flex gap-1.5 shrink-0">
                        {(["free", "paid", "demo", "admin"] as Role[]).map((r) => (
                          <button
                            key={r}
                            onClick={() => changeRole(u.uid, r)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${u.role === r ? "gradient-primary text-white" : "bg-surface-c text-muted-c border border-soft-c hover:bg-[rgba(127,127,127,0.08)]"}`}
                          >
                            {t(ROLE_INFO[r].label as TransKey)}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Тариф таңдау + деректер терезесін ашу */}
                    <div className="flex flex-wrap gap-1.5">
                      {PLAN_ORDER.map((p) => (
                        <button
                          key={p}
                          onClick={() => changePlan(u.uid, p)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${u.plan === p ? "gradient-primary text-white" : "bg-surface-c text-muted-c border border-soft-c hover:bg-[rgba(127,127,127,0.08)]"}`}
                        >
                          {PLANS[p].name}
                        </button>
                      ))}
                      {u.plan !== "free" && (
                        <button
                          onClick={() => extendData(u.uid)}
                          className="px-2.5 py-1 rounded-md text-xs font-medium transition-all bg-surface-c status-good border border-emerald-400/30 hover:bg-emerald-500/10 flex items-center gap-1"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" /> {t("adm.extendData")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
