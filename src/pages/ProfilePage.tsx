// filepath: src/pages/ProfilePage.tsx
import { Crown, CreditCard, User as UserIcon, Mail, LogOut, Cloud, Sparkles, Zap, Telescope, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import GlassCard from "@/components/shared/GlassCard";
import { btnG, btnP } from "@/components/shared/Form";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/store/dataStore";
import { useLang } from "@/contexts/LangContext";
import type { TransKey } from "@/i18n/translations";
import { claimRole, loadSelfRoleEnabled, type Role } from "@/lib/roles";
import { PLANS } from "@/lib/plans";

const ROLE_INFO: Record<Role, { label: string; icon: typeof Crown; cls: string; desc: string }> = {
  admin: { label: "prof.adminLabel", icon: Crown, cls: "status-warn", desc: "prof.adminDesc" },
  paid: { label: "prof.paidLabel", icon: CreditCard, cls: "status-good", desc: "prof.paidDesc" },
  free: { label: "prof.freeLabel", icon: UserIcon, cls: "text-muted-c", desc: "prof.freeDesc" },
  demo: { label: "prof.demoLabel", icon: Eye, cls: "accent-c", desc: "prof.demoDesc" },
};

export default function ProfilePage() {
  const { user, role, record, configured, logout } = useAuth();
  const { t } = useLang();
  const storeLogout = useData((s) => s.logout);
  const userName = useData((s) => s.userName);
  const navigate = useNavigate();

  // "Өзіне рөл алу" функциясы қосулы ма (бұлттан)
  const [selfRoleOn, setSelfRoleOn] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState("");

  useEffect(() => {
    loadSelfRoleEnabled().then(setSelfRoleOn);
  }, []);

  const handleClaim = async (r: Role) => {
    if (!user) return;
    setClaiming(true);
    const ok = await claimRole(user.uid, r, user.email || "", user.displayName || "");
    setClaiming(false);
    if (ok) {
      setClaimed(`${r} ${t("prof.claimed")}`);
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setClaimed(t("prof.claimErr"));
    }
  };

  const info = ROLE_INFO[role];
  const displayName = user?.displayName || record?.name || userName || t("prof.defaultName");
  const email = user?.email || record?.email || "";

  const handleLogout = async () => {
    await logout();
    storeLogout();
    navigate("/login");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("prof.title")}</h1>

      {/* Негізгі ақпарат */}
      <GlassCard hover={false}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white text-2xl font-bold">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-strong-c truncate">{displayName}</h2>
            {email && <p className="text-sm text-muted-c flex items-center gap-1.5 mt-0.5"><Mail className="w-3.5 h-3.5" /> {email}</p>}
            <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-input-c border border-soft-c ${info.cls}`}>
              <info.icon className="w-3.5 h-3.5" /> {t(info.label as TransKey)}
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-c mt-4">{t(info.desc as TransKey)}</p>
      </GlassCard>

      {/* Бұлттық сақтау күйі */}
      {configured && user && (
        <GlassCard hover={false}>
          <div className="flex items-center gap-3">
            <Cloud className="w-5 h-5 status-good" />
            <div>
              <p className="font-medium text-strong-c text-sm">{t("prof.cloudOn")}</p>
              <p className="text-xs text-muted-c mt-0.5">{t("prof.cloudDesc")}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Тарифім мен квота */}
      <GlassCard hover={false}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-strong-c">{t("plan.myPlanTitle")}</h3>
          <span className="text-sm font-bold gradient-text">{record ? PLANS[record.plan].name : PLANS.free.name}</span>
        </div>
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between gap-3 py-1.5">
            <span className="text-sm text-soft-c flex items-center gap-2"><Zap className="w-4 h-4 accent-c" /> {t("plan.quickRemaining")}</span>
            <span className="text-sm font-semibold text-strong-c">{role === "admin" || role === "demo" ? t("plan.unlimited") : record?.quickRemaining ?? 0}</span>
          </div>
          <div className="flex items-center justify-between gap-3 py-1.5">
            <span className="text-sm text-soft-c flex items-center gap-2"><Telescope className="w-4 h-4 accent-c" /> {t("plan.deepRemaining")}</span>
            <span className="text-sm font-semibold text-strong-c">{role === "admin" || role === "demo" ? t("plan.unlimited") : record?.deepRemaining ?? 0}</span>
          </div>
          {record && record.plan !== "free" && !!record.planExpiresAt && (
            <div className="flex items-center justify-between gap-3 py-1.5">
              <span className="text-sm text-soft-c">{t("plan.expires")}</span>
              <span className="text-sm font-semibold text-strong-c">{new Date(record.planExpiresAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        <Link to="/pricing" className={btnP + " w-full text-center block"}>{t("plan.changePlan")}</Link>
      </GlassCard>

      {/* "Өзіне рөл алу" — тек функция қосулы болса (бастапқы орнату үшін) */}
      {selfRoleOn && (
        <GlassCard hover={false}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 status-warn" />
            <h3 className="font-semibold text-strong-c">{t("prof.claimTitle")}</h3>
          </div>
          <p className="text-xs text-muted-c mb-4">
            {t("prof.claimDesc")}
          </p>
          <div className="flex flex-wrap gap-2">
            {(["free", "paid", "admin"] as Role[]).map((r) => (
              <button
                key={r}
                disabled={claiming}
                onClick={() => handleClaim(r)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-input-c border border-soft-c text-soft-c hover:bg-[rgba(74,144,217,0.1)] hover:accent-c transition-all disabled:opacity-50"
              >
                {t(ROLE_INFO[r].label as TransKey)}
              </button>
            ))}
          </div>
          {claimed && <p className="text-sm status-good mt-3">{claimed}</p>}
        </GlassCard>
      )}

      {/* Шығу */}
      <button className={btnG + " flex items-center gap-2"} onClick={handleLogout}>
        <LogOut className="w-4 h-4" /> {t("prof.logout")}
      </button>
    </div>
  );
}
