"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import { useStoreAuth } from "@/components/providers/StoreProvider";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function StoreLoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { refreshStore } = useStoreAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t("common.error"));
      return;
    }

    setIsLoggingIn(true);
    setError("");

    try {
      const res = await fetch("/api/store/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        await refreshStore();
        router.replace("/store");
      } else {
        setError(data.error || t("common.error"));
      }
    } catch (err) {
      setError(t("common.error"));
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-gradient-to-b from-primary via-primary to-slate-50 relative overflow-hidden p-6">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/5 rounded-full blur-[100px] -ml-48 -mb-48" />

      <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        <div className="flex justify-center mb-8">
          <Icons.Logo variant="icon-white" size={80} className="drop-shadow-xl" />
        </div>
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none drop-shadow-sm">
            {t("store.loginPage.title")}
          </h1>
          <p className="text-[10px] text-slate-400 mt-4 font-black uppercase tracking-[0.2em] bg-slate-50 py-1.5 px-6 rounded-full inline-block border border-slate-100 italic">
            {t("store.loginPage.portal")}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">
              {t("store.loginPage.emailLabel")}
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="branch@store.com"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-700"
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">
              {t("store.loginPage.passwordLabel")}
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-700"
              />
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-xl flex items-center gap-3 border border-rose-100 animate-in fade-in duration-300">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <p className="text-xs font-bold">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-slate-900 hover:bg-black text-white rounded-xl py-5 text-sm font-black shadow-xl shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-50 mt-4 uppercase tracking-[0.25em]"
          >
            {isLoggingIn ? t("common.processing") : t("store.loginPage.button")}
          </button>
        </form>
        
        <div className="mt-10 text-center border-t border-slate-50 pt-8">
           <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-300 italic">
             {t("store.loginPage.authorizedOnly")}
           </p>
        </div>
      </div>
    </div>
  );
}
