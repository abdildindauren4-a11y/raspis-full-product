import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "@/contexts/LangContext";
import { motion, AnimatePresence } from "framer-motion";
import { Search, User, Moon, Sun, Cloud } from "lucide-react";
import NotificationBell from "@/components/layout/NotificationBell";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/store/dataStore";

// Пайдаланушы аватары: Google фотосы болса — сурет, болмаса әріп/белгіше
export function UserAvatar({ size = 32, className = "" }: { size?: number; className?: string }) {
  const { user, record } = useAuth();
  const storeName = useData((s) => s.userName);
  const name = user?.displayName || record?.name || storeName || "";
  if (user?.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt={name}
        referrerPolicy="no-referrer"
        className={`rounded-full object-cover border border-soft-c ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`rounded-full gradient-primary flex items-center justify-center text-white font-bold ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {name ? name.charAt(0).toUpperCase() : <User style={{ width: size * 0.5, height: size * 0.5 }} />}
    </div>
  );
}

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLang();
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl text-muted-c hover:text-strong-c hover:bg-[rgba(var(--bg-card),0.5)] transition-all"
      title={theme === "dark" ? t("top.themeLight") : t("top.themeDark")}
    >
      {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

// Бұлтпен синхрондау күйін көрсететін индикатор.
// useCloudSync AppLayout-та бір рет іске қосылады — мұнда тек Firebase
// қосулы екенін тексеріп, белгі көрсетеміз (қайталанбас үшін).
function SyncIndicator() {
  const { user, configured } = useAuth();
  const { t } = useLang();
  if (!configured || !user) return null; // Firebase қосылмаған/кірмеген
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-input-c border border-soft-c"
      title={t("top.cloudTitle")}
    >
      <Cloud className="w-3.5 h-3.5 status-good" />
      <span className="text-xs text-muted-c hidden sm:inline">{t("top.cloud")}</span>
    </div>
  );
}

export default function TopBar() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const { user, record, logout: authLogout } = useAuth();
  const school = useData((s) => s.school);
  const storeLogout = useData((s) => s.logout);
  const userName = useData((s) => s.userName);
  const displayName = user?.displayName || record?.name || userName || t("prof.defaultName");
  const email = user?.email || record?.email || "";

  return (
    <header className="h-[70px] glass border-b border-soft-c flex items-center justify-between px-6 sticky top-0 z-[1100]">
      {/* Search */}
      <div className="relative w-[200px] xl:w-[320px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-c" />
        <input
          type="text"
          placeholder={t("top.search")}
          className="w-full pl-10 pr-4 py-2 bg-input-c border border-soft-c rounded-xl text-sm text-strong-c placeholder:text-muted-c focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Бұлтпен синхрондау индикаторы */}
        <SyncIndicator />
        {/* Тема ауыстыру */}
        <ThemeToggleButton />

        {/* Notifications */}
        <NotificationBell />

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-input-c border border-soft-c hover:bg-[rgba(127,127,127,0.1)] transition-all"
          >
            <UserAvatar size={32} />
            <div className="text-left hidden sm:block max-w-[180px]">
              <p className="text-sm font-medium text-strong-c truncate">{displayName}</p>
              <p className="text-xs text-muted-c truncate">{school.name}</p>
            </div>
          </button>

          <AnimatePresence>
            {showProfile && (
              <>
                <div className="fixed inset-0 z-[1199]" onClick={() => setShowProfile(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-2 w-[240px] glass-strong rounded-2xl border border-soft-c shadow-2xl z-[1200] overflow-hidden"
                >
                  <div className="p-4 border-b border-soft-c flex items-center gap-3">
                    <UserAvatar size={40} />
                    <div className="min-w-0">
                      <p className="font-medium text-strong-c truncate">{displayName}</p>
                      {email && <p className="text-xs text-muted-c truncate">{email}</p>}
                    </div>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => { setShowProfile(false); navigate("/profile"); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-soft-c hover:bg-[rgba(127,127,127,0.1)] transition-colors"
                    >
                      {t("top.profile")}
                    </button>
                    <button
                      onClick={() => { setShowProfile(false); navigate("/settings"); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-soft-c hover:bg-[rgba(127,127,127,0.1)] transition-colors"
                    >
                      {t("top.settings")}
                    </button>
                    <hr className="my-1 border-soft-c" />
                    <button
                      onClick={async () => { setShowProfile(false); await authLogout(); storeLogout(); navigate("/login"); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm status-bad hover:bg-red-500/10 transition-colors"
                    >
                      {t("top.logout")}
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
