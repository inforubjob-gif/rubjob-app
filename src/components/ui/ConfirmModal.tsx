"use client";

import Modal from "./Modal";
import Button from "./Button";
import { useTranslation } from "@/components/providers/LanguageProvider";

type ConfirmVariant = "default" | "danger";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

const confirmButtonStyles: Record<ConfirmVariant, string> = {
  default: "bg-primary hover:bg-primary-heavy text-white shadow-lg shadow-primary/20",
  danger: "bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20",
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "default",
  isLoading = false,
}: ConfirmModalProps) {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {description && (
        <p className="text-sm text-slate-500 font-medium text-center mb-8 leading-relaxed">
          {description}
        </p>
      )}
      <div className="flex gap-3 w-full">
        <Button
          variant="outline"
          size="lg"
          fullWidth
          onClick={onClose}
          disabled={isLoading}
          className="rounded-xl font-black"
        >
          {cancelLabel || t("common.cancel")}
        </Button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`
            flex-1 rounded-xl py-3.5 text-sm font-black uppercase tracking-wider
            transition-all duration-150 active:scale-[0.96]
            disabled:opacity-50 disabled:pointer-events-none
            ${confirmButtonStyles[variant]}
          `}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t("common.processing")}
            </span>
          ) : (
            confirmLabel || t("common.confirm")
          )}
        </button>
      </div>
    </Modal>
  );
}
