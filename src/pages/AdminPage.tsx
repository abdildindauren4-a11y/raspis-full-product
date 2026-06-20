// filepath: src/pages/AdminPage.tsx
import { useState, useEffect } from "react";
import { Shield, Users, Search, Crown, CreditCard, User as UserIcon, Check, Loader2, Settings2, AlertTriangle } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { btnP, inputCls } from "@/components/shared/Form";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllUsers, setUserRole, loadPermissions, savePermissions,
  loadSelfRoleEnabled, setSelfRoleEnabled,
  DEFAULT_PERMISSIONS, type UserRecord, type Role, type Feature,
} from "@/lib/roles";

const ROLE_INFO: Record<Role, { label: string; icon: typeof Crown; cls: string }> = {
  admin: { label: "Әкімші", icon: Crown, cls: "status-warn" },
  paid: { label: "Толық", icon: CreditCard, cls: "status-good" },
  free: { label: "Тегін", icon: UserIcon, cls: "text-muted-c" },
};

const FEATURE_LABELS: Record<Feature, string> = {
  generate: "Кесте генерациясы",
  excelExport: "Excel экспорт",
  cloudSync: "Бұлттық сақтау",
  excelImport: "Excel импорт",
  deepSearch: "Терең іздеу",
  softMode: "Жұмсақ режим",
  aiAdvisor: "РАСПИС AI",
  unlimitedClasses: "Шектеусіз сынып",
};

export default function AdminPage() {
  const { role } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [perms, setPerms] = useState<Record<Feature, Role>>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [tab, setTab] = useState<"users" | "permissions">("users");
  const [selfRoleOn, setSelfRoleOn] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [u, p, sr] = await Promise.all([getAllUsers(), loadPermissions(), loadSelfRoleEnabled()]);
      setUsers(u); setPerms(p); setSelfRoleOn(sr);
      setLoading(false);
    })();
  }, []);

  const [toggleMsg, setToggleMsg] = useState("");
  const toggleSelfRole = async () => {
    const next = !selfRoleOn;
    setSelfRoleOn(next); // UI бірден жаңарады (күтпейміз)
    setToggleMsg("");
    const ok = await setSelfRoleEnabled(next);
    if (!ok) {
      // Firestore жаза алмады — кері қайтарамыз әрі хабарлаймыз
      setSelfRoleOn(!next);
      setToggleMsg("Сақталмады. Firestore «config» ережесін тексеріңіз.");
      setTimeout(() => setToggleMsg(""), 4000);
    }
  };

  // Тек админге рұқсат
  if (role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="w-12 h-12 text-faint-c mb-3" />
        <p className="text-muted-c">Бұл бөлім тек әкімшіге қолжетімді.</p>
      </div>
    );
  }

  const changeRole = async (uid: string, newRole: Role) => {
    const ok = await setUserRole(uid, newRole);
    if (ok) setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)));
  };

  const changePerm = (feature: Feature, newRole: Role) => {
    setPerms((prev) => ({ ...prev, [feature]: newRole }));
  };

  const savePerms = async () => {
    const ok = await savePermissions(perms);
    setSavedMsg(ok ? "Сақталды ✓" : "Қате");
    setTimeout(() => setSavedMsg(""), 2000);
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
          <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">Әкімші панелі</h1>
          <p className="text-muted-c mt-0.5 text-sm">Пайдаланушылар мен рұқсаттарды басқару</p>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Барлығы", value: stats.total, icon: Users },
          { label: "Әкімші", value: stats.admin, icon: Crown },
          { label: "Толық", value: stats.paid, icon: CreditCard },
          { label: "Тегін", value: stats.free, icon: UserIcon },
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

      {/* "Өзіне рөл алу" қосқышы — қауіпсіздік үшін маңызды */}
      <div className={`rounded-xl border p-4 ${selfRoleOn ? "border-red-500/40 bg-[rgba(229,115,115,0.08)]" : "border-soft-c bg-input-c"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-2.5">
            <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${selfRoleOn ? "status-bad" : "text-faint-c"}`} />
            <div>
              <p className="text-sm font-medium text-strong-c">«Өзіне рөл алу» функциясы</p>
              <p className="text-xs text-muted-c mt-0.5">
                {selfRoleOn
                  ? "ҚОСУЛЫ — кез келген кірген адам өзіне әкімші бола алады. Орнатуды бітірген соң ДЕРЕУ жабыңыз!"
                  : "Жабық — рөлдерді тек осы панельден бересіз (қауіпсіз)."}
              </p>
            </div>
          </div>
          <button
            onClick={toggleSelfRole}
            className={`w-12 h-7 rounded-full shrink-0 transition-all relative ${selfRoleOn ? "bg-red-500" : "bg-[rgba(127,127,127,0.3)]"}`}
          >
            <div className={`w-6 h-6 rounded-full bg-white absolute top-0.5 transition-all ${selfRoleOn ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
        {toggleMsg && <p className="text-xs status-bad mt-2">{toggleMsg}</p>}
      </div>

      {/* Қойындылар */}
      <div className="flex gap-2">
        <button onClick={() => setTab("users")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "users" ? "gradient-primary text-white" : "bg-input-c text-muted-c border border-soft-c"}`}>
          <Users className="w-4 h-4 inline mr-1.5" />Пайдаланушылар
        </button>
        <button onClick={() => setTab("permissions")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "permissions" ? "gradient-primary text-white" : "bg-input-c text-muted-c border border-soft-c"}`}>
          <Settings2 className="w-4 h-4 inline mr-1.5" />Рұқсат деңгейлері
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-c py-10 justify-center"><Loader2 className="w-5 h-5 animate-spin accent-c" /> Жүктелуде…</div>
      ) : tab === "users" ? (
        <GlassCard hover={false}>
          {/* Іздеу */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-faint-c absolute left-3 top-2.5" />
            <input className={inputCls + " !pl-9"} placeholder="Email немесе атау бойынша іздеу" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-c py-8 text-sm">Пайдаланушы табылмады</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((u) => {
                const info = ROLE_INFO[u.role];
                return (
                  <div key={u.uid} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-input-c border border-soft-c">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <info.icon className={`w-4 h-4 shrink-0 ${info.cls}`} />
                        <span className="font-medium text-strong-c truncate">{u.name}</span>
                      </div>
                      <p className="text-xs text-muted-c truncate mt-0.5">{u.email}</p>
                    </div>
                    {/* Рөл таңдау */}
                    <div className="flex gap-1.5 shrink-0">
                      {(["free", "paid", "admin"] as Role[]).map((r) => (
                        <button
                          key={r}
                          onClick={() => changeRole(u.uid, r)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${u.role === r ? "gradient-primary text-white" : "bg-surface-c text-muted-c border border-soft-c hover:bg-[rgba(127,127,127,0.08)]"}`}
                        >
                          {ROLE_INFO[r].label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      ) : (
        <GlassCard hover={false}>
          <p className="text-sm text-muted-c mb-4">Әр функция қай деңгейден бастап қолжетімді екенін реттеңіз:</p>
          <div className="space-y-2">
            {(Object.keys(FEATURE_LABELS) as Feature[]).map((f) => (
              <div key={f} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-input-c border border-soft-c">
                <span className="text-sm text-strong-c">{FEATURE_LABELS[f]}</span>
                <div className="flex gap-1.5">
                  {(["free", "paid", "admin"] as Role[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => changePerm(f, r)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${perms[f] === r ? "gradient-primary text-white" : "bg-surface-c text-muted-c border border-soft-c hover:bg-[rgba(127,127,127,0.08)]"}`}
                    >
                      {ROLE_INFO[r].label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button className={btnP + " flex items-center gap-2"} onClick={savePerms}>
              <Check className="w-4 h-4" /> Сақтау
            </button>
            {savedMsg && <span className="text-sm status-good">{savedMsg}</span>}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
