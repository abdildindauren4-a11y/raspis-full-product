import type { ReactNode } from "react";
import { Lock, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { canEditData } from "@/lib/roles";
import { PAYMENT } from "@/lib/payment";

interface DataGuardProps {
  children: ReactNode;
}

// Деректер енгізу беттерінің қорғанышы (7 күндік терезе + демо-құлып).
// Бет мазмұнын көрсетеді, бірақ құлыпталған жағдайда өзгертуге тыйым салады:
// үстіне ескерту-баннер шығып, мазмұн басылмайтын болады (көру мүмкін).
export default function DataGuard({ children }: DataGuardProps) {
  const { role, record } = useAuth();
  const { t } = useLang();

  const isDemo = role === "demo";
  const locked = !canEditData(role, record);
  if (!locked) return <>{children}</>;

  const title = isDemo ? t("lock.demoTitle") : t("lock.dataTitle");
  const desc = isDemo ? t("lock.demoDesc") : t("lock.dataDesc");
  const waLink = `https://wa.me/${PAYMENT.whatsappPhone}?text=${encodeURIComponent(t("lock.waText"))}`;

  return (
    <div>
      <div className="mb-5 rounded-xl border border-yellow-400/30 bg-yellow-500/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <Lock className="w-5 h-5 status-warn shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-strong-c">{title}</p>
          <p className="text-xs text-muted-c mt-0.5">{desc}</p>
        </div>
        {!isDemo && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-white text-xs font-medium shrink-0 transition-all hover:opacity-90"
            style={{ background: "#25D366" }}
          >
            <MessageCircle className="w-4 h-4" /> {t("pay.whatsapp")}
          </a>
        )}
      </div>
      <div className="pointer-events-none opacity-50 select-none">
        {children}
      </div>
    </div>
  );
}
