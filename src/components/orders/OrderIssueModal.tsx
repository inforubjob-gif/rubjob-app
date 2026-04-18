"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

interface OrderIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  onSuccess?: () => void;
}

export default function OrderIssueModal({ isOpen, onClose, orderId, onSuccess }: OrderIssueModalProps) {
  const { t } = useTranslation();
  const [type, setType] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const issueTypes = [
    { id: "accident", label: t("orders.issueTypes.accident") },
    { id: "vehicle_broken", label: t("orders.issueTypes.vehicle_broken") },
    { id: "customer_not_reachable", label: t("orders.issueTypes.customer_not_reachable") },
    { id: "store_closed", label: t("orders.issueTypes.store_closed") },
    { id: "weather", label: t("orders.issueTypes.weather") },
    { id: "other", label: t("orders.issueTypes.other") },
  ];

  const handleSubmit = async () => {
    if (!type) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/report-issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message: details }),
      });
      
      if (res.ok) {
        alert(t("orders.issueSuccess"));
        onSuccess?.();
        onClose();
        // Reset state
        setType("");
        setDetails("");
      } else {
        const error = await res.json();
        alert(error.error || t("common.error"));
      }
    } catch (err) {
      console.error("Failed to report issue:", err);
      alert(t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("orders.issueModalTitle")}>
      <div className="w-full space-y-6">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-3">
            {t("orders.issueType")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {issueTypes.map((item) => (
              <button
                key={item.id}
                onClick={() => setType(item.label)}
                className={`p-3 text-[11px] font-bold rounded-xl border-2 transition-all text-left flex items-center justify-between ${
                  type === item.label
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-100 bg-slate-50 text-slate-500"
                }`}
              >
                {item.label}
                {type === item.label && <Icons.Check size={14} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-3">
            {t("orders.issueDetail")}
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t("orders.issueDetailPlaceholder")}
            rows={4}
            className="w-full p-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-primary focus:ring-0 text-sm transition-all resize-none outline-none font-medium"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-xl py-4 font-black uppercase text-xs"
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!type}
            className="flex-1 bg-primary text-white rounded-xl py-4 font-black uppercase text-xs shadow-xl shadow-primary/20"
          >
            {t("orders.submitIssue")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
