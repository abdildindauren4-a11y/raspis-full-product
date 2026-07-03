import { useState, useMemo } from "react";
import { useLang } from "@/contexts/LangContext";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, AlertTriangle, Info, XCircle } from "lucide-react";
import { buildNotifications } from "@/lib/notify";
import { useData, useActiveVersion } from "@/store/dataStore";

// Хабарландыру қоңырауы — десктоп TopBar-да да, мобиль үстіңгі жолағында да
// қолданылады (бұрын тек десктопта болатын, сондықтан телефонда көрінбейтін).
export default function NotificationBell() {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);

  // Нақты хабарландырулар — қолданба күйінен (диагностика, кесте сапасы)
  const { classes, teachers, rooms, subjects, school, settings } = useData();
  const active = useActiveVersion();
  const notifications = useMemo(
    () => buildNotifications(
      { classes, teachers, rooms, subjects, school, settings, hasSchedule: !!active, quality: active?.result.quality },
      lang
    ),
    [classes, teachers, rooms, subjects, school, settings, active, lang]
  );

  const icon = (type: string) => {
    switch (type) {
      case "success": return <Check className="w-4 h-4 status-good" />;
      case "warning": return <AlertTriangle className="w-4 h-4 status-warn" />;
      case "error": return <XCircle className="w-4 h-4 status-bad" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl bg-input-c border border-soft-c text-muted-c hover:text-strong-c hover:bg-[rgba(127,127,127,0.1)] transition-all"
        aria-label={t("top.notifications")}
      >
        <Bell className="w-5 h-5" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-primary text-[10px] font-bold text-white flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-[1199]" onClick={() => setOpen(false)} />
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
                      {icon(notif.type)}
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
  );
}
