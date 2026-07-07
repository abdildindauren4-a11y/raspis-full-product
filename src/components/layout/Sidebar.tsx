import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useLang } from "@/contexts/LangContext";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "@/store/dataStore";
import { useAuth } from "@/contexts/AuthContext";
import logoUrl from "@/assets/logo.png";
import {
  LayoutDashboard,
  Database,
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
  CreditCard,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TransKey } from "@/i18n/translations";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

interface NavLeaf { icon: LucideIcon; key: TransKey; path: string }
interface NavGroup { icon: LucideIcon; key: TransKey; children: NavLeaf[] }
type NavItem = NavLeaf | NavGroup;

// Дерек енгізу беттері — бір «Деректер» модуліне жиналған (панель қысқа болуы үшін)
const dataChildren: NavLeaf[] = [
  { icon: GraduationCap, key: "nav.classes", path: "/classes" },
  { icon: Users, key: "nav.teachers", path: "/teachers" },
  { icon: DoorOpen, key: "nav.rooms", path: "/rooms" },
  { icon: BookOpen, key: "nav.subjects", path: "/subjects" },
  { icon: UsersRound, key: "nav.groups", path: "/groups" },
];

const menuItems: NavItem[] = [
  { icon: LayoutDashboard, key: "nav.dashboard", path: "/" },
  { icon: Database, key: "nav.data", children: dataChildren },
  { icon: Cpu, key: "nav.algorithm", path: "/algorithm" },
  { icon: Sparkles, key: "nav.generate", path: "/generate" },
  { icon: CalendarDays, key: "nav.schedule", path: "/schedule" },
  { icon: History, key: "nav.versions", path: "/versions" },
  { icon: ShieldCheck, key: "nav.quality", path: "/quality" },
  { icon: Bot, key: "nav.aiAdvisor", path: "/ai-advisor" },
  { icon: FileUp, key: "nav.import", path: "/import" },
  { icon: FileDown, key: "nav.export", path: "/export" },
  { icon: Settings, key: "nav.settings", path: "/settings" },
  { icon: User, key: "nav.profile", path: "/profile" },
  { icon: CreditCard, key: "nav.pricing", path: "/pricing" },
];

// Тек әкімшіге көрінетін мәзір
const adminItems: NavItem[] = [
  { icon: Shield, key: "nav.admin", path: "/admin" },
];

export default function Sidebar({ isCollapsed, setIsCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const { t } = useLang();
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useData((s) => s.logout);
  const { logout: authLogout, role } = useAuth();
  // Әкімшіге admin элементтерін қосамыз
  const items = role === "admin" ? [...menuItems, ...adminItems] : menuItems;

  // «Деректер» тобы: ішіндегі бет ашық болса — автоматты ашылады
  const dataActive = dataChildren.some((c) => c.path === location.pathname);
  const [dataOpen, setDataOpen] = useState(dataActive);
  useEffect(() => { if (dataActive) setDataOpen(true); }, [dataActive]);

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
              <img src={logoUrl} alt="РАСПИС" className="w-10 h-10 object-contain shrink-0" />
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
          <img src={logoUrl} alt="РАСПИС" className="w-10 h-10 object-contain mx-auto" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        {items.map((item, index) => {
          const Icon = item.icon;

          // ── «Деректер» тобы: ашылмалы модуль ──
          if ("children" in item) {
            return (
              <div key={item.key}>
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.3, ease: "easeOut" }}
                  onClick={() => {
                    // жиналған панельде: панельді ашып, топты жаямыз
                    if (isCollapsed) { setIsCollapsed(false); setDataOpen(true); }
                    else setDataOpen(!dataOpen);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                    dataActive
                      ? "bg-[rgba(0,198,255,0.12)] accent-c border-l-[3px] border-[var(--accent)]"
                      : "text-muted-c hover:bg-[rgba(127,127,127,0.1)] hover:text-soft-c"
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${dataActive ? "accent-c" : ""}`} />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-sm font-medium whitespace-nowrap overflow-hidden flex-1 text-left"
                      >
                        {t(item.key)}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {!isCollapsed && (
                    <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${dataOpen ? "" : "-rotate-90"}`} />
                  )}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-3 py-1.5 bg-surface border border-soft-c rounded-lg text-sm text-strong-c whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[1400]">
                      {t(item.key)}
                    </div>
                  )}
                </motion.button>
                {/* Ішкі модульдер */}
                <AnimatePresence>
                  {!isCollapsed && dataOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-4 pl-3 border-l border-soft-c space-y-0.5 py-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const childActive = location.pathname === child.path;
                          return (
                            <button
                              key={child.path}
                              onClick={() => navigate(child.path)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 ${
                                childActive
                                  ? "bg-[rgba(0,198,255,0.12)] accent-c"
                                  : "text-muted-c hover:bg-[rgba(127,127,127,0.1)] hover:text-soft-c"
                              }`}
                            >
                              <ChildIcon className={`w-4 h-4 flex-shrink-0 ${childActive ? "accent-c" : ""}`} />
                              <span className="text-[13px] font-medium whitespace-nowrap">{t(child.key)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          // ── Қарапайым элемент ──
          const isActive = location.pathname === item.path;
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
                    {t(item.key)}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-surface border border-soft-c rounded-lg text-sm text-strong-c whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[1400]">
                  {t(item.key)}
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
                {t("nav.collapse")}
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
                {t("nav.logout")}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
