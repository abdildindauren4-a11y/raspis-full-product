// filepath: src/contexts/LangContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translations, type Lang, type TransKey } from "@/i18n/translations";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TransKey) => string;
}

const LangContext = createContext<LangCtx | null>(null);
const STORAGE_KEY = "raspis-lang";

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "kk" || saved === "ru" || saved === "en" ? saved : "kk";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => setLangState(l);
  const t = (key: TransKey): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry.kk || key;
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang LangProvider ішінде қолданылуы керек");
  return ctx;
}
