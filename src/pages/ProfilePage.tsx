// filepath: src/pages/ProfilePage.tsx
import { Crown, CreditCard, User as UserIcon, Check, X, Mail, LogOut, Cloud, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GlassCard from "@/components/shared/GlassCard";
import { btnG } from "@/components/shared/Form";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/store/dataStore";
import { canUse, DEFAULT_PERMISSIONS, claimRole, loadSelfRoleEnabled, type Role, type Feature } from "@/lib/roles";

const ROLE_INFO: Record<Role, { label: string; icon: typeof Crown; cls: string; desc: string }> = {
  admin: { label: "Әкімші", icon: Crown, cls: "status-warn", desc: "Барлық функцияға толық рұқсат" },
  paid: { label: "Толық қолданушы", icon: CreditCard, cls: "status-good", desc: "Барлық негізгі функциялар ашық" },
  free: { label: "Тегін қолданушы", icon: UserIcon, cls: "text-muted-c", desc: "Негізгі функциялар қолжетімді" },
};

const FEATURE_LABELS: Record<Feature, string> = {
  generate: "Кесте генерациясы",
  excelExport: "Excel экспорт",
  cloudSync: "Бұлттық сақтау",
  excelImport: "Excel импорт",
  deepSearch: "Терең іздеу (көп нұсқа)",
  softMode: "Жұмсақ режим",
  aiAdvisor: "РАСПИС AI кеңесші",
  unlimitedClasses: "Шектеусіз сынып саны",
};

export default function ProfilePage() {
  const { user, role, record, configured, logout } = useAuth();
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
      setClaimed(`${r} рөлі алынды! Парақты жаңартыңыз.`);
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setClaimed("Қате — функция жабық болуы мүмкін.");
    }
  };

  const info = ROLE_INFO[role];
  const displayName = user?.displayName || record?.name || userName || "Пайдаланушы";
  const email = user?.email || record?.email || "";

  const handleLogout = async () => {
    await logout();
    storeLogout();
    navigate("/login");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">Профиль</h1>

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
              <info.icon className="w-3.5 h-3.5" /> {info.label}
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-c mt-4">{info.desc}</p>
      </GlassCard>

      {/* Бұлттық сақтау күйі */}
      {configured && user && (
        <GlassCard hover={false}>
          <div className="flex items-center gap-3">
            <Cloud className="w-5 h-5 status-good" />
            <div>
              <p className="font-medium text-strong-c text-sm">Бұлттық сақтау қосулы</p>
              <p className="text-xs text-muted-c mt-0.5">Деректеріңіз автоматты сақталады әрі кез келген құрылғыдан қолжетімді.</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Қолжетімді функциялар */}
      <GlassCard hover={false}>
        <h3 className="font-semibold text-strong-c mb-3">Қолжетімді функциялар</h3>
        <div className="space-y-2">
          {(Object.keys(FEATURE_LABELS) as Feature[]).map((f) => {
            const allowed = canUse(role, f, DEFAULT_PERMISSIONS);
            return (
              <div key={f} className="flex items-center justify-between gap-3 py-1.5">
                <span className={`text-sm ${allowed ? "text-soft-c" : "text-faint-c"}`}>{FEATURE_LABELS[f]}</span>
                {allowed ? (
                  <span className="flex items-center gap-1 text-xs status-good"><Check className="w-4 h-4" /> Ашық</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-faint-c"><X className="w-4 h-4" /> Жабық</span>
                )}
              </div>
            );
          })}
        </div>
        {role === "free" && (
          <div className="mt-4 p-3 rounded-lg bg-[rgba(74,144,217,0.08)] border border-soft-c">
            <p className="text-xs text-muted-c">Барлық функцияны ашу үшін толық нұсқаға өтіңіз. Байланыс: әкімшіге хабарласыңыз.</p>
          </div>
        )}
      </GlassCard>

      {/* "Өзіне рөл алу" — тек функция қосулы болса (бастапқы орнату үшін) */}
      {selfRoleOn && (
        <GlassCard hover={false}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 status-warn" />
            <h3 className="font-semibold text-strong-c">Өзіңе рөл алу</h3>
          </div>
          <p className="text-xs text-muted-c mb-4">
            Бұл уақытша функция (бастапқы орнату үшін). Әкімші оны жабады. Өзіңе рөл таңдаңыз:
          </p>
          <div className="flex flex-wrap gap-2">
            {(["free", "paid", "admin"] as Role[]).map((r) => (
              <button
                key={r}
                disabled={claiming}
                onClick={() => handleClaim(r)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-input-c border border-soft-c text-soft-c hover:bg-[rgba(74,144,217,0.1)] hover:accent-c transition-all disabled:opacity-50"
              >
                {ROLE_INFO[r].label}
              </button>
            ))}
          </div>
          {claimed && <p className="text-sm status-good mt-3">{claimed}</p>}
        </GlassCard>
      )}

      {/* Шығу */}
      <button className={btnG + " flex items-center gap-2"} onClick={handleLogout}>
        <LogOut className="w-4 h-4" /> Аккаунттан шығу
      </button>
    </div>
  );
}
