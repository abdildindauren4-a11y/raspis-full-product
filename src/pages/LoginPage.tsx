// filepath: src/pages/LoginPage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Check, LogIn, Mail, Lock } from "lucide-react";
import { useData } from "@/store/dataStore";
import { useAuth } from "@/contexts/AuthContext";
import { inputCls, btnP } from "@/components/shared/Form";

export default function LoginPage() {
  const login = useData((s) => s.login);
  const navigate = useNavigate();
  const { user, configured, signInGoogle, error, loading } = useAuth();

  // Демо логин (Firebase қосылмаған жағдайда)
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  // Google арқылы кіргенде — басты бетке өту
  useEffect(() => {
    if (user) {
      login(user.displayName || user.email?.split("@")[0] || "Пайдаланушы");
      navigate("/");
    }
  }, [user, login, navigate]);

  const demoSubmit = () => {
    if (!email.includes("@") || pass.length < 4) { setErr("Email және кемінде 4 таңбалы құпиясөз енгізіңіз"); return; }
    login(email.split("@")[0]);
    navigate("/");
  };

  const features = [
    "Greedy + Maximin алгоритмі — конфликтсіз кесте",
    "18 қатаң ереже + СанПиН ауыртпалық балдары",
    "Кәсіби Excel импорт/экспорт",
    "РАСПИС AI — кеңесші және автоталдау",
  ];

  return (
    <div className="min-h-screen flex bg-app">
      {/* Сол жақ — брендинг */}
      <div className="hidden lg:flex flex-col justify-center w-1/2 p-16 glass-strong border-r border-soft-c">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center"><CalendarDays className="w-6 h-6 text-white" /></div>
          <span className="font-['IBM_Plex_Sans'] text-3xl font-bold gradient-text">РАСПИС</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-strong-c mb-4">Мектеп кестесін автоматты құру</h1>
        <ul className="space-y-3 text-muted-c text-sm">
          {features.map((t) => (
            <li key={t} className="flex items-center gap-2"><Check className="w-4 h-4 accent-c shrink-0" /> {t}</li>
          ))}
        </ul>
      </div>

      {/* Оң жақ — кіру */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="glass-strong border border-soft-c rounded-2xl p-8 w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-6 justify-center">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center"><CalendarDays className="w-5 h-5 text-white" /></div>
            <span className="font-['IBM_Plex_Sans'] text-2xl font-bold gradient-text">РАСПИС</span>
          </div>
          <h2 className="text-xl font-bold text-strong-c mb-1">Қош келдіңіз!</h2>
          <p className="text-xs text-muted-c mb-6">Жалғастыру үшін аккаунтқа кіріңіз</p>

          {configured ? (
            <>
              {/* Google логин (Firebase қосулы) */}
              <button
                onClick={signInGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-soft-c bg-surface-c hover:bg-[rgba(127,127,127,0.08)] transition-all font-medium text-strong-c disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google арқылы кіру
              </button>
              {error && <p className="text-xs status-bad mt-3 text-center">{error}</p>}
              <p className="text-xs text-faint-c mt-6 text-center">
                Деректеріңіз бұлтта қауіпсіз сақталады әрі кез келген құрылғыдан қолжетімді.
              </p>
            </>
          ) : (
            <>
              {/* Демо логин (Firebase қосылмаған) */}
              <div className="rounded-lg bg-[rgba(74,144,217,0.08)] border border-soft-c p-3 mb-4">
                <p className="text-xs text-muted-c">
                  <span className="font-medium text-soft-c">Демо режим.</span> Бұлттық сақтау үшін Firebase кілттерін .env файлға қосыңыз.
                </p>
              </div>
              <label className="block text-xs text-muted-c mb-1">Электрондық пошта</label>
              <div className="relative mb-3">
                <Mail className="w-4 h-4 text-faint-c absolute left-3 top-2.5" />
                <input className={inputCls + " !pl-9"} placeholder="name@school.kz" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <label className="block text-xs text-muted-c mb-1">Құпиясөз</label>
              <div className="relative mb-4">
                <Lock className="w-4 h-4 text-faint-c absolute left-3 top-2.5" />
                <input type="password" className={inputCls + " !pl-9"} placeholder="••••••" value={pass}
                  onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && demoSubmit()} />
              </div>
              {err && <p className="text-xs status-bad mb-3">{err}</p>}
              <button className={btnP + " w-full py-2.5 flex items-center justify-center gap-2"} onClick={demoSubmit}>
                <LogIn className="w-4 h-4" /> Кіру
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
