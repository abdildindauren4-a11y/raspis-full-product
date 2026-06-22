// filepath: src/pages/ProfilePage.tsx
import { Crown, CreditCard, User as UserIcon, Check, X, Mail, LogOut, Cloud, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GlassCard from "@/components/shared/GlassCard";
import { btnG } from "@/components/shared/Form";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/store/dataStore";
import { useLang } from "@/contexts/LangContext";
import type { TransKey } from "@/i18n/translations";
import { canUse, DEFAULT_PERMISSIONS, claimRole, loadSelfRoleEnabled, type Role, type Feature } from "@/lib/roles";

const ROLE_INFO: Record<Role, { label: string; icon: typeof Crown; cls: string; desc: string }> = {
  admin: { label: "prof.adminLabel", icon: Crown, cls: "status-warn", desc: "prof.adminDesc" },
  paid: { label: "prof.paidLabel", icon: CreditCard, cls: "status-good", desc: "prof.paidDesc" },
  free: { label: "prof.freeLabel", icon: UserIcon, cls: "text-muted-c", desc: "prof.freeDesc" },
};

const FEATURE_LABELS: Record<Feature, TransKey> = {
  generate: "adm.featGenerate",
  excelExport: "adm.featExport",
  cloudSync: "adm.featCloud",
  excelImport: "adm.featImport",
  deepSearch: "prof.featDeep",
  softMode: "adm.featSoft",
  aiAdvisor: "prof.featAI",
  unlimitedClasses: "prof.featUnlimited",
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

      {/* Қолжетімді функциялар */}
      <GlassCard hover={false}>
        <h3 className="font-semibold text-strong-c mb-3">{t("prof.featuresTitle")}</h3>
        <div className="space-y-2">
          {(Object.keys(FEATURE_LABELS) as Feature[]).map((f) => {
            const allowed = canUse(role, f, DEFAULT_PERMISSIONS);
            return (
              <div key={f} className="flex items-center justify-between gap-3 py-1.5">
                <span className={`text-sm ${allowed ? "text-soft-c" : "text-faint-c"}`}>{t(FEATURE_LABELS[f] as TransKey)}</span>
                {allowed ? (
                  <span className="flex items-center gap-1 text-xs status-good"><Check className="w-4 h-4" /> {t("prof.open")}</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-faint-c"><X className="w-4 h-4" /> {t("prof.closed")}</span>
                )}
              </div>
            );
          })}
        </div>
        {role === "free" && (
          <div className="mt-4 p-3 rounded-lg bg-[rgba(74,144,217,0.08)] border border-soft-c">
            <p className="text-xs text-muted-c">{t("prof.upgradeHint")}</p>
          </div>
        )}
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
