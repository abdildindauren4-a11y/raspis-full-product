import { useState } from "react";
import { Copy, Check, MessageCircle } from "lucide-react";
import { Modal } from "@/components/shared/Form";
import { useLang } from "@/contexts/LangContext";
import { PAYMENT } from "@/lib/payment";
import { PLANS, LAUNCH_PROMO, formatKzt, effectivePrice, type PlanId } from "@/lib/plans";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  planId: PlanId;
  userEmail?: string;
}

// Kaspi арқылы қолмен төлем қабылдау модалы: аудару → чекті WhatsApp-қа
// жіберу → әкімші тарифті қосады. Автоматты төлем жүйесі қосылғанша осы схема.
export default function PaymentModal({ open, onClose, planId, userEmail }: PaymentModalProps) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const plan = PLANS[planId];
  const promo = LAUNCH_PROMO.active && plan.price > 0;
  const priceNow = formatKzt(effectivePrice(plan.price));

  const copyPhone = async () => {
    try {
      await navigator.clipboard.writeText(PAYMENT.kaspiPhone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard рұқсаты жоқ — елеусіз қалдырамыз */ }
  };

  const waText = encodeURIComponent(
    `${t("pay.waMessage")}: ${plan.name} — ${priceNow} / ${plan.durationLabel}${promo ? ` (−${LAUNCH_PROMO.percent}%)` : ""}${userEmail ? ` — ${userEmail}` : ""}`
  );
  const waLink = `https://wa.me/${PAYMENT.whatsappPhone}?text=${waText}`;

  return (
    <Modal open={open} onClose={onClose} title={`${t("pay.title")} — ${plan.name}`}>
      <div className="flex items-baseline gap-2 mb-1">
        {promo && <span className="text-base text-faint-c line-through">{formatKzt(plan.price)}</span>}
        <span className="text-2xl font-bold gradient-text">{priceNow}</span>
        <span className="text-sm text-muted-c">/ {plan.durationLabel}</span>
      </div>
      {promo && <p className="text-xs status-warn mb-4">{t("plan.promoBadge").replace("{p}", String(LAUNCH_PROMO.percent))}</p>}
      {!promo && <div className="mb-4"></div>}

      <div className="space-y-4">
        {/* 1-қадам: Kaspi аударым */}
        <div className="flex gap-3">
          <span className="w-6 h-6 rounded-full gradient-primary text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-strong-c">{t("pay.step1")}</p>
            <p className="text-xs text-muted-c mt-0.5 mb-2">{t("pay.step1desc")}</p>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-input-c border border-soft-c">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-strong-c">{PAYMENT.kaspiPhone}</p>
                <p className="text-xs text-muted-c">{PAYMENT.kaspiName}</p>
              </div>
              <button
                onClick={copyPhone}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-c border border-soft-c text-xs text-soft-c hover:accent-c transition-all shrink-0"
              >
                {copied ? <><Check className="w-3.5 h-3.5 status-good" /> {t("pay.copied")}</> : <><Copy className="w-3.5 h-3.5" /> {t("pay.copy")}</>}
              </button>
            </div>
          </div>
        </div>

        {/* 2-қадам: чекті WhatsApp-қа */}
        <div className="flex gap-3">
          <span className="w-6 h-6 rounded-full gradient-primary text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-strong-c">{t("pay.step2")}</p>
            <p className="text-xs text-muted-c mt-0.5 mb-2">{t("pay.step2desc")}</p>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90"
              style={{ background: "#25D366" }}
            >
              <MessageCircle className="w-4 h-4" /> {t("pay.whatsapp")}
            </a>
          </div>
        </div>

        {/* 3-қадам: тариф қосылады */}
        <div className="flex gap-3">
          <span className="w-6 h-6 rounded-full gradient-primary text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-strong-c">{t("pay.step3")}</p>
            <p className="text-xs text-muted-c mt-0.5">{t("pay.step3desc")}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
