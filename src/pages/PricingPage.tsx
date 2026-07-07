// filepath: src/pages/PricingPage.tsx
import { useState } from "react";
import { CreditCard, Sparkles, Telescope, CheckCircle2 } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import PaymentModal from "@/components/shared/PaymentModal";
import { btnP, btnG } from "@/components/shared/Form";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { PLAN_ORDER, PLANS, type PlanId } from "@/lib/plans";

export default function PricingPage() {
  const { record, user } = useAuth();
  const { t } = useLang();
  const currentPlan = record?.plan ?? "free";
  const [payPlan, setPayPlan] = useState<PlanId | null>(null);

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const isCurrent = currentPlan === id;
          return (
            <GlassCard
              key={id}
              hover={false}
              className={isCurrent ? "!border-2 !border-[var(--accent)]" : ""}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-strong-c">{p.name}</h3>
                {isCurrent && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide accent-c bg-[rgba(74,144,217,0.12)] px-2 py-0.5 rounded-full">
                    {t("plan.current")}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold gradient-text mb-1">{p.priceLabel}</p>
              <p className="text-xs text-faint-c mb-5">{id === "free" ? " " : t("plan.duration")}</p>
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
