// filepath: src/pages/LoginPage.tsx
import { useLang } from "@/contexts/LangContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CalendarCheck2, ShieldCheck, FileSpreadsheet, Bot } from "lucide-react";
import { useData } from "@/store/dataStore";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import logoUrl from "@/assets/logo.png";
import illuUrl from "@/assets/login-illustration.png";
import bgMobileUrl from "@/assets/login-bg-mobile.jpg";

// Төрт жұлдызды декоративті ұшқын (sparkle) — SVG
function Sparkle({ className, size = 16, color = "#4A90D9" }: { className?: string; size?: number; color?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M12 0c.7 6.5 5.5 11.3 12 12-6.5.7-11.3 5.5-12 12-.7-6.5-5.5-11.3-12-12C6.5 11.3 11.3 6.5 12 0z" />
    </svg>
  );
}

// Нүктелі тор — декор (CSS radial-gradient өрнегі)
function DotGrid({ className }: { className?: string }) {
  return (
    <div
      className={className}
      aria-hidden
      style={{
        backgroundImage: "radial-gradient(rgba(74,144,217,0.35) 1.5px, transparent 1.5px)",
        backgroundSize: "14px 14px",
      }}
    />
  );
}

export default function LoginPage() {
  const login = useData((s) => s.login);
  const navigate = useNavigate();
  const { user, signInGoogle, error, loading, configured } = useAuth();
  const { t } = useLang();
  const { theme } = useTheme();

  // Google арқылы кіргенде — басты бетке өту
  useEffect(() => {
    if (user) {
      login(user.displayName || user.email?.split("@")[0] || "Пайдаланушы");
      navigate("/");
    }
  }, [user, login, navigate]);

  const features = [
    { icon: CalendarCheck2, text: t("log.feat1") },
    { icon: ShieldCheck, text: t("log.feat2") },
    { icon: FileSpreadsheet, text: t("log.feat3") },
    { icon: Bot, text: t("log.feat4") },
  ];

  return (
    <div className="min-h-screen flex bg-app">
      {/* ── Сол жақ: брендинг + иллюстрация ── */}
      <div className="hidden lg:flex flex-col w-1/2 p-12 xl:p-16 relative overflow-hidden glass-strong border-r border-soft-c">
        {/* декор: нүктелер */}
        <DotGrid className="absolute top-24 right-14 w-24 h-16 opacity-60" />
        <DotGrid className="absolute bottom-40 left-8 w-20 h-14 opacity-40" />

        <div className="flex items-center gap-3 mb-10 relative">
          <img src={logoUrl} alt="РАСПИС" className="w-14 h-14 object-contain shrink-0" />
          <span className="font-['IBM_Plex_Sans'] text-3xl font-bold gradient-text">РАСПИС</span>
        </div>

        <h1 className="text-3xl xl:text-4xl font-bold text-strong-c mb-2 leading-tight relative">{t("log.tagline")}</h1>
        <p className="text-muted-c text-sm mb-8 relative">{t("log.sub")}</p>

        <ul className="space-y-3.5 text-soft-c text-sm relative">
          {features.map((f) => (
            <li key={f.text} className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-[rgba(74,144,217,0.12)] border border-[rgba(74,144,217,0.25)] flex items-center justify-center shrink-0">
                <f.icon className="w-4.5 h-4.5 accent-c" style={{ width: 18, height: 18 }} />
              </span>
              {f.text}
            </li>
          ))}
        </ul>

        {/* Иллюстрация: астында жұмсақ ақшыл дақ — ақ құмыра/экран қараңғыда да оқылады */}
        <div className="relative flex-1 flex items-end justify-center mt-6 min-h-[220px]">
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[130%] aspect-[2/1] rounded-[50%] pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.35) 45%, transparent 70%)" }}
            aria-hidden
          />
          <img
            src={illuUrl}
            alt=""
            className="relative w-full max-w-[560px] object-contain"
            style={{ filter: "drop-shadow(0 18px 32px rgba(30,58,95,0.18))" }}
          />
        </div>
      </div>

      {/* ── Оң жақ: кіру карточкасы ── */}
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
        {/* Телефонда: толық артқы фон иллюстрациясы (жарық тақырыпта ғана —
            сурет ақ фонды, қараңғыда жарқ етпес үшін жасырылады) */}
        {theme === "light" && (
          <img
            src={bgMobileUrl}
            alt=""
            aria-hidden
            className="lg:hidden absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        )}
        {/* декор: нүктелер, ұшқындар, жұмсақ дөңгелектер (телефонда фон суреттің
            өз декоры бар — CSS декор тек десктопта) */}
        <DotGrid className="hidden lg:block absolute top-16 left-10 w-24 h-16 opacity-50" aria-hidden />
        <DotGrid className="hidden lg:block absolute bottom-16 right-10 w-24 h-16 opacity-40" aria-hidden />
        <div className="hidden lg:block absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(74,144,217,0.10) 0%, transparent 70%)" }} aria-hidden />
        <div className="hidden lg:block absolute -bottom-24 -left-16 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(74,144,217,0.08) 0%, transparent 70%)" }} aria-hidden />

        <div className="glass-strong border border-soft-c rounded-2xl p-8 w-full max-w-sm relative shadow-xl">
          {/* Елтаңба-логотип + ұшқындар */}
          <div className="relative flex justify-center mb-5">
            <Sparkle className="absolute -left-1 top-2" size={14} color="#4A90D9" />
            <Sparkle className="absolute left-8 -top-1" size={9} color="#D9A441" />
            <Sparkle className="absolute -right-1 top-6" size={12} color="#D9A441" />
            <Sparkle className="absolute right-9 -top-2" size={8} color="#4A90D9" />
            <img src={logoUrl} alt="РАСПИС" className="w-20 h-20 object-contain" />
          </div>
          <div className="lg:hidden text-center mb-2">
            <span className="font-['IBM_Plex_Sans'] text-2xl font-bold gradient-text">РАСПИС</span>
          </div>

          <h2 className="text-xl font-bold text-strong-c mb-1 text-center">Қош келдіңіз!</h2>
          <p className="text-xs text-muted-c mb-6 text-center">Жалғастыру үшін Google аккаунтыңызбен кіріңіз</p>

          {!configured && (
            <div className="rounded-lg bg-[rgba(229,115,115,0.1)] border border-red-500/30 p-3 mb-4">
              <p className="text-xs status-bad">
                Firebase кілттері оқылмады. Dev серверді қайта іске қосыңыз: терминалда <span className="font-mono">Ctrl+C</span>, содан <span className="font-mono">npm run dev</span>.
              </p>
            </div>
          )}

          {/* Google логин батырмасы */}
          <button
            onClick={signInGoogle}
            disabled={loading || !configured}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-soft-c bg-surface-c hover:bg-[rgba(127,127,127,0.08)] transition-all font-medium text-strong-c disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin accent-c" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Google арқылы кіру
          </button>
          {error && <p className="text-xs status-bad mt-3 text-center">{error}</p>}

          <p className="text-xs text-faint-c mt-6 text-center">
            Деректеріңіз бұлтта қауіпсіз сақталады әрі кез келген құрылғыдан қолжетімді.
          </p>
        </div>
      </div>
    </div>
  );
}
