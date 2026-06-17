import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "@/store/dataStore";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  DoorOpen,
  BookOpen,
  UsersRound,
  Cpu,
  Sparkles,
  CalendarDays,
  ShieldCheck,
  History,
  Bot,
  FileDown,
  FileUp,
  Settings,
  User,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
} from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: GraduationCap, label: "Сыныптар", path: "/classes" },
  { icon: Users, label: "Мұғалімдер", path: "/teachers" },
  { icon: DoorOpen, label: "Кабинеттер", path: "/rooms" },
  { icon: BookOpen, label: "Пәндер", path: "/subjects" },
  { icon: UsersRound, label: "Топ бөлу", path: "/groups" },
  { icon: Cpu, label: "Алгоритм", path: "/algorithm" },
  { icon: Sparkles, label: "Генерация", path: "/generate" },
  { icon: CalendarDays, label: "Расписание", path: "/schedule" },
  { icon: History, label: "Нұсқалар", path: "/versions" },
  { icon: ShieldCheck, label: "Сапа есебі", path: "/quality" },
  { icon: Bot, label: "РАСПИС AI", path: "/ai-advisor" },
  { icon: FileUp, label: "Excel импорт", path: "/import" },
  { icon: FileDown, label: "Export", path: "/export" },
  { icon: Settings, label: "Баптаулар", path: "/settings" },
  { icon: User, label: "Профиль", path: "/profile" },
];

// Тек әкімшіге көрінетін мәзір
const adminItems = [
  { icon: Shield, label: "Әкімші панелі", path: "/admin" },
];

export default function Sidebar({ isCollapsed, setIsCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useData((s) => s.logout);
  const { logout: authLogout, role } = useAuth();
  // Әкімшіге admin элементтерін қосамыз
  const items = role === "admin" ? [...menuItems, ...adminItems] : menuItems;

  return (
    <motion.aside
      className={`fixed left-0 top-0 h-screen z-[1100] glass-strong border-r border-soft-c flex flex-col transition-transform duration-300
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      animate={{ width: isCollapsed ? 70 : 260 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ width: 260 }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-soft-c h-[70px]">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-white" />
              </div>
              <span className="font-['IBM_Plex_Sans'] text-xl font-bold gradient-text">
                РАСПИС
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Мобиль: жабу батырмасы */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-muted-c hover:bg-[rgba(127,127,127,0.15)] hover:text-strong-c"
          aria-label="Жабу"
        >
          <X className="w-5 h-5" />
        </button>
        {isCollapsed && (
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center mx-auto">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        {items.map((item, index) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03, duration: 0.3, ease: "easeOut" }}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? "bg-[rgba(0,198,255,0.12)] accent-c border-l-[3px] border-[var(--accent)]"
                  : "text-muted-c hover:bg-[rgba(127,127,127,0.1)] hover:text-soft-c"
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "accent-c" : ""}`} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-surface border border-soft-c rounded-lg text-sm text-strong-c whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[1400]">
                  {item.label}
                </div>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom: Collapse toggle + Logout */}
      <div className="p-3 border-t border-soft-c space-y-2">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl text-muted-c hover:bg-[rgba(127,127,127,0.1)] hover:text-soft-c transition-all duration-200"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm"
              >
                Жабу
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <button
          onClick={async () => { await authLogout(); logout(); navigate("/login"); }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-muted-c hover:bg-red-500/10 hover:status-bad transition-all duration-200">
          <LogOut className="w-5 h-5" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm"
              >
                Шығу
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
