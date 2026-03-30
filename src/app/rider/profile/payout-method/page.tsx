"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function PayoutMethodPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [method, setMethod] = useState<"bank" | "promptpay">("bank");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 1000));
    setIsSaving(false);
    router.back();
  };

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 text-slate-900">
      <header className="px-5 pt-12 pb-4 border-b border-slate-100 flex items-center gap-3 sticky top-0 bg-white z-10">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
        >
          <Icons.Back size={20} />
        </button>
        <h1 className="text-lg font-black text-slate-900 tracking-tight">{t("staff.profile.payoutMethodPage.title")}</h1>
      </header>

      <main className="p-5 space-y-6 animate-fade-in">
        <div className="flex gap-3">
          <button
            onClick={() => setMethod("bank")}
            className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
              method === "bank" ? "border-primary bg-primary/5" : "border-slate-100 bg-white opacity-60"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${method === "bank" ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
              <Icons.Payment size={24} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest">{t("staff.profile.payoutMethodPage.bankAccount")}</span>
          </button>
          <button
            onClick={() => setMethod("promptpay")}
            className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
              method === "promptpay" ? "border-primary bg-primary/5" : "border-slate-100 bg-white opacity-60"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${method === "promptpay" ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
              <Icons.Phone size={24} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest">{t("staff.profile.payoutMethodPage.promptPay")}</span>
          </button>
        </div>

        <Card className="p-6 space-y-5 shadow-xl shadow-slate-200/50">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("staff.profile.payoutMethodPage.accountNumber")}</label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full bg-slate-50 rounded-xl px-4 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-slate-100"
              placeholder={method === "bank" ? "XXX-X-XXXXX-X" : "08X-XXX-XXXX"}
            />
          </div>

          {method === "bank" && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("staff.profile.payoutMethodPage.bankName")}</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-slate-50 rounded-xl px-4 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-slate-100 appearance-none"
              >
                <option value="">Select Bank</option>
                <option value="kbank">Kasikorn Bank (K-Bank)</option>
                <option value="scb">Siam Commercial Bank (SCB)</option>
                <option value="bbl">Bangkok Bank (BBL)</option>
                <option value="ktb">Krungthai Bank (KTB)</option>
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("staff.profile.payoutMethodPage.accountHolder")}</label>
            <input
              type="text"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              className="w-full bg-slate-50 rounded-xl px-4 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-slate-100"
              placeholder="Full Name"
            />
          </div>
        </Card>

        <div className="pt-4">
          <Button 
            onClick={handleSave}
            disabled={!accountNumber || !accountHolder || (method === "bank" && !bankName) || isSaving}
            className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-primary/30"
          >
            {isSaving ? "Saving..." : t("staff.profile.payoutMethodPage.saveMethod")}
          </Button>
        </div>
      </main>
    </div>
  );
}
