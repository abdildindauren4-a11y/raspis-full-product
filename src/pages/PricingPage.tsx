// filepath: src/pages/PricingPage.tsx
import { useState } from "react";
import { CreditCard, Sparkles, Telescope, CheckCircle2 } from "lucide-react";
import fireUrl from "@/assets/deco-fire.png";
import badge50Url from "@/assets/deco-badge50.png";
import booksUrl from "@/assets/deco-books.png";
import schoolProUrl from "@/assets/deco-school-pro.png";
import schoolPremiumUrl from "@/assets/deco-school-premium.png";
import schoolSuperUrl from "@/assets/deco-school-super.png";

// Тариф → 3D көрініс: арзаннан қымбатқа қарай «мектеп эволюциясы»
// (Free — кітап/қолмен әдіс, Pro — классикалық мектеп, Premium — заманауи,
// Super — футуристік AI-кампус). Көз өсуді көреді — қымбат картаға тартылады.
const PLAN_ART: Record<PlanId, { src: string; h: string }> = {
  free: { src: booksUrl, h: "max-h-16" },
  pro: { src: schoolProUrl, h: "max-h-24" },
  premium: { src: schoolPremiumUrl, h: "max-h-24" },
  super: { src: schoolSuperUrl, h: "max-h-24" },
};
import GlassCard from "@/components/shared/GlassCard";
import PaymentModal from "@/components/shared/PaymentModal";
import { btnP, btnG } from "@/components/shared/Form";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { PLAN_ORDER, PLANS, formatKzt, effectivePrice, type PlanId } from "@/lib/plans";
import { usePromo } from "@/lib/promo";

export default function PricingPage() {
  const { record, user } = useAuth();
  const { t } = useLang();
  const currentPlan = record?.plan ?? "free";
  const [payPlan, setPayPlan] = useState<PlanId | null>(null);
  // Акция күйі бұлттағы санауыштан: орындар толса — автоматты өшеді
  const promoState = usePromo();

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("plan.title")}</h1>
          <p className="text-muted-c mt-0.5 text-sm">{t("plan.subtitle")}</p>
        </div>
      </div>

      {promoState.active && (
        <div className="rounded-xl border border-[rgba(217,164,65,0.4)] bg-[rgba(217,164,65,0.1)] px-4 py-3 flex items-center gap-3">
          <img src={fireUrl} alt="" aria-hidden className="w-8 h-auto shrink-0" style={{ filter: "drop-shadow(0 3px 6px rgba(217,120,30,0.35))" }} />
          <p className="text-sm font-medium text-strong-c">
            {t("plan.promoBanner")
              .replace("{n}", String(promoState.seats))
              .replace("{p}", String(promoState.percent))}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const isCurrent = currentPlan === id;
          const promo = promoState.active && p.price > 0;
          return (
            <GlassCard
              key={id}
              hover={false}
              className={(isCurrent ? "!border-2 !border-[var(--accent)] " : "") + "relative !overflow-visible"}
            >
              {/* 3D −50% жапсырмасы — акция кезінде ақылы тарифтерде */}
              {promo && (
                <img
                  src={badge50Url}
                  alt={`−${promoState.percent}%`}
                  className="absolute -top-4 -right-3 w-14 rotate-12 pointer-events-none"
                  style={{ filter: "drop-shadow(0 4px 8px rgba(200,120,20,0.35))" }}
                />
              )}
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-strong-c">{p.name}</h3>
                {isCurrent && !promo ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wide accent-c bg-[rgba(74,144,217,0.12)] px-2 py-0.5 rounded-full">
                    {t("plan.current")}
                  </span>
                ) : null}
              </div>
              {promo && <p className="text-sm text-faint-c line-through mb-0.5">{formatKzt(p.price)}</p>}
              <p className="text-2xl font-bold gradient-text mb-1">
                {p.price === 0 ? "0 ₸" : formatKzt(effectivePrice(p.price, promoState.active))}
              </p>
              <p className="text-xs text-faint-c mb-5">{id === "free" ? " " : p.durationLabel}</p>
              {/* Тарифтің 3D көрінісі — карталардың бос бөлігі */}
              <div className="h-24 flex items-end justify-center mb-4">
                <img
                  src={PLAN_ART[id].src}
                  alt=""
                  aria-hidden
                  className={`w-auto object-contain ${PLAN_ART[id].h}`}
                  style={{ filter: "drop-shadow(0 8px 14px rgba(30,58,95,0.18))" }}
                />
              </div>
              <div className="space-y-2.5 mb-6 text-sm">
                <div className="flex items-center gap-2 text-soft-c">
                  <Sparkles className="w-4 h-4 accent-c shrink-0" /> {p.quickGenerations} {t("plan.quickUnit")}
                </div>
                <div className="flex items-center gap-2 text-soft-c">
                  <Telescope className="w-4 h-4 accent-c shrink-0" /> {p.deepSearches} {t("plan.deepUnit")}
                </div>
                <div className="flex items-center gap-2 text-soft-c">
                  <CheckCircle2 className="w-4 h-4 accent-c shrink-0" /> {t("plan.allFeatures")}
                </div>
              </div>
              {isCurrent ? (
                <button className={btnG + " w-full cursor-default"} disabled>{t("plan.current")}</button>
              ) : (
                <button className={btnP + " w-full"} onClick={() => setPayPlan(id)}>
                  {t("plan.select")}
                </button>
              )}
            </GlassCard>
          );
        })}
      </div>

      {payPlan && (
        <PaymentModal
          open={!!payPlan}
          onClose={() => setPayPlan(null)}
          planId={payPlan}
          userEmail={user?.email || record?.email || undefined}
        />
      )}
    </div>
  );
}
