// filepath: src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import logoUrl from "@/assets/logo.png";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import NotificationBell from "@/components/layout/NotificationBell";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ClassesPage from "@/pages/ClassesPage";
import TeachersPage from "@/pages/TeachersPage";
import RoomsPage from "@/pages/RoomsPage";
import SubjectsPage from "@/pages/SubjectsPage";
import GroupsPage from "@/pages/GroupsPage";
import AlgorithmPage from "@/pages/AlgorithmPage";
import GeneratePage from "@/pages/GeneratePage";
import SchedulePage from "@/pages/SchedulePage";
import QualityPage from "@/pages/QualityPage";
import VersionsPage from "@/pages/VersionsPage";
import AIAdvisorPage from "@/pages/AIAdvisorPage";
import ExportPage from "@/pages/ExportPage";
import ImportPage from "@/pages/ImportPage";
import SettingsPage from "@/pages/SettingsPage";
import ProfilePage from "@/pages/ProfilePage";
import AdminPage from "@/pages/AdminPage";
import CertificatePage from "@/pages/CertificatePage";
import { useData } from "@/store/dataStore";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useLocation } from "react-router-dom";

function AppLayout({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false); // десктоп: тарылту
  const [mobileOpen, setMobileOpen] = useState(false);   // мобиль: drawer ашық па
  useCloudSync(); // бұлтпен автоматты синхрондау (Firebase қосулы болса)
  const location = useLocation();

  // бет ауысқанда мобиль менюді жабу
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // экран кеңейсе мобиль drawer-ды жабу
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-app">
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      {/* Мобиль overlay (фонды басқанда жабылады) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[1050] bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isCollapsed ? "lg:ml-[70px]" : "lg:ml-[260px]"
        } ml-0`}
      >
        {/* Мобиль үстіңгі жолағы — гамбургер + хабарландыру қоңырауы */}
        <div className="lg:hidden flex items-center gap-3 h-14 px-4 glass-strong border-b border-soft-c sticky top-0 z-[1040]">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-[rgba(127,127,127,0.12)] text-strong-c"
            aria-label="Меню"
          >
            <Menu className="w-6 h-6" />
          </button>
          <img src={logoUrl} alt="РАСПИС" className="w-8 h-8 object-contain shrink-0" />
          <span className="font-['IBM_Plex_Sans'] text-lg font-bold gradient-text">РАСПИС</span>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </div>
        <div className="hidden lg:block">
          <TopBar />
        </div>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto scrollbar-thin">
          {children}
          <footer className="mt-12 pt-6 border-t border-soft-c">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-faint-c">
              <span className="font-['IBM_Plex_Sans']">© {new Date().getFullYear()} РАСПИС — Мектеп кестесін автоматты құру жүйесі</span>
              <span className="font-['IBM_Plex_Sans'] tracking-wide">
                Авторы: <span className="text-soft-c font-semibold">ABDILDIN DAUREN</span>
              </span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const loggedIn = useData((s) => s.loggedIn);
  if (!loggedIn) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

const pages: [string, ReactNode][] = [
  ["/", <DashboardPage />], ["/classes", <ClassesPage />], ["/teachers", <TeachersPage />],
  ["/rooms", <RoomsPage />], ["/subjects", <SubjectsPage />], ["/groups", <GroupsPage />],
  ["/algorithm", <AlgorithmPage />], ["/generate", <GeneratePage />], ["/schedule", <SchedulePage />],
  ["/versions", <VersionsPage />], ["/quality", <QualityPage />], ["/ai-advisor", <AIAdvisorPage />],
  ["/import", <ImportPage />], ["/export", <ExportPage />], ["/settings", <SettingsPage />],
  ["/profile", <ProfilePage />], ["/admin", <AdminPage />],
];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/certificate" element={<CertificatePage />} />
      {pages.map(([path, el]) => (
        <Route key={path} path={path} element={<Protected>{el}</Protected>} />
      ))}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
