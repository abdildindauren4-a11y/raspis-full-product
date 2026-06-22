import { useState } from "react";
import { useLang } from "@/contexts/LangContext";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Search, User, Check, AlertTriangle, Info, Moon, Sun, Cloud } from "lucide-react";
import { notifications } from "@/lib/mockData";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

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
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <Check className="w-4 h-4 status-good" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 status-warn" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

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
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-xl bg-input-c border border-soft-c text-muted-c hover:text-strong-c hover:bg-[rgba(127,127,127,0.1)] transition-all"
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-primary text-[10px] font-bold text-white flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-[1199]" onClick={() => setShowNotifications(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-2 w-[300px] sm:w-[360px] max-w-[90vw] glass-strong rounded-2xl border border-soft-c shadow-2xl z-[1200] overflow-hidden"
                >
                  <div className="p-4 border-b border-soft-c">
                    <h3 className="font-['IBM_Plex_Sans'] font-semibold text-strong-c">{t("top.notifications")}</h3>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="flex items-start gap-3 p-4 hover:bg-[rgba(127,127,127,0.1)] transition-colors border-b border-soft-c last:border-0"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[rgba(127,127,127,0.1)] flex items-center justify-center flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div>
                          <p className="text-sm text-soft-c">{notif.message}</p>
                          <p className="text-xs text-muted-c mt-1">{notif.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-input-c border border-soft-c hover:bg-[rgba(127,127,127,0.1)] transition-all"
          >
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-strong-c">Администратор</p>
              <p className="text-xs text-muted-c">№12 Гимназия</p>
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
                  <div className="p-4 border-b border-soft-c">
                    <p className="font-medium text-strong-c">Администратор</p>
                    <p className="text-xs text-muted-c">admin@school12.kz</p>
                  </div>
                  <div className="p-2">
                    <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-soft-c hover:bg-[rgba(127,127,127,0.1)] transition-colors">
                      {t("top.profile")}
                    </button>
                    <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-soft-c hover:bg-[rgba(127,127,127,0.1)] transition-colors">
                      {t("top.settings")}
                    </button>
                    <hr className="my-1 border-soft-c" />
                    <button className="w-full text-left px-3 py-2 rounded-lg text-sm status-bad hover:bg-red-500/10 transition-colors">
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
