import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Modal, btnP } from "@/components/shared/Form";
import { useLang } from "@/contexts/LangContext";
import type { GenerationKind } from "@/lib/roles";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  kind: GenerationKind;
}

// Генерация квотасы таусылғанда шығатын терезе — тарифтер бетіне бағыттайды.
export default function UpgradeModal({ open, onClose, kind }: UpgradeModalProps) {
  const navigate = useNavigate();
  const { t } = useLang();

  return (
    <Modal open={open} onClose={onClose} title={t("plan.upgradeTitle")}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <p className="text-sm text-muted-c">
          {kind === "deep" ? t("plan.upgradeDeepDesc") : t("plan.upgradeQuickDesc")}
        </p>
      </div>
      <button
        className={btnP + " w-full"}
        onClick={() => { onClose(); navigate("/pricing"); }}
      >
        {t("plan.viewPlans")}
      </button>
    </Modal>
  );
}
