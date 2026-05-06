"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import PhotoUpload from "@/components/ui/PhotoUpload";

export default function RubberDocumentsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const router = useRouter();

  const [idCard, setIdCard] = useState<string | null>(null);
  const [license, setLicense] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    const localSession = localStorage.getItem("rubjob_rubber_session");
    const rubberId = localSession ? JSON.parse(localSession).id : null;

    if (!rubberId || !idCard || !license || !vehicle) {
      showToast(t("rubber.verification.errorAllDocs"), "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/rubber/verify/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: rubberId,
          documents: [
            { type: "id_card", url: idCard },
            { type: "license", url: license },
            { type: "vehicle", url: vehicle }
          ]
        })
      });

      if (res.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          router.replace("/rubber");
        }, 3000);
      } else {
        const data = await res.json() as any;
        showToast(data.error || t("common.error"), "error");
      }
    } catch (err) {
      console.error(err);
      showToast(t("common.error"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-5 text-center bg-slate-50">
        <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center mb-8 shadow-xl shadow-emerald-500/10 scale-110">
          <Icons.Shield size={48} strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2 uppercase">{t("rubber.verification.submittedTitle")}</h1>
        <p className="text-sm text-slate-500 font-bold max-w-[280px] leading-relaxed">
          {t("rubber.verification.submittedDesc")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 pb-12">
      <header className="px-5 pt-12 pb-6 border-b border-slate-100 bg-white sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
            <Icons.Back size={18} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase">{t("rubber.verification.title")}</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase">{t("rubber.verification.sub")}</p>
          </div>
        </div>
      </header>

      <div className="px-5 py-8 space-y-8 animate-fade-in max-w-lg mx-auto w-full">
        <PhotoUpload 
          label={t("rubber.verification.idCard")} 
          required 
          onPhotoCapture={(url) => setIdCard(url)} 
        />
        
        <PhotoUpload 
          label={t("rubber.verification.license")} 
          required 
          onPhotoCapture={(url) => setLicense(url)} 
        />

        <PhotoUpload 
          label={t("rubber.verification.vehicle")} 
          required 
          onPhotoCapture={(url) => setVehicle(url)} 
        />

        <div className="pt-6">
          <Button 
            fullWidth 
            size="lg" 
            isLoading={isSubmitting}
            disabled={!idCard || !license || !vehicle}
            onClick={handleSubmit}
            className="bg-primary text-white py-5 rounded-xl font-black uppercase shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {t("rubber.verification.submit")}
          </Button>
          <p className="text-[9px] text-center text-slate-400 font-bold mt-4 uppercase px-4">
            {t("rubber.verification.agreeTerms")}
          </p>
        </div>
      </div>
    </div>
  );
}
