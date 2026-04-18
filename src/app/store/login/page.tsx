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
    <div className="flex flex-col min-h-dvh bg-gradient-to-b from-primary via-primary to-slate-50 relative overflow-hidden p-6 pt-3">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/5 rounded-full blur-[100px] -ml-48 -mb-48" />

      <div className="relative z-10 w-full max-w-sm mx-auto space-y-10">
        <div className="text-center px-4">
          <div className="mb-8 flex justify-center">
            <Icons.Logo variant="icon-white" size={80} className="drop-shadow-2xl" />
          </div>
          <h1 className="text-5xl font-black text-white leading-none drop-shadow-lg">
            {t("store.loginPage.title")}
          </h1>
          <p className="text-xs text-white/70 font-black uppercase mt-6 bg-white/10 backdrop-blur-sm py-1.5 px-6 rounded-full inline-block border border-white/10">
            {t("store.loginPage.portal")}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-2xl shadow-primary-dark/20">
          <div className="bg-white rounded-[1.75rem] p-8 space-y-6 shadow-sm">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-1">
                {t("store.loginPage.emailLabel")}
              </label>
              <div className="relative">
                <Icons.User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="branch@store.com"
                  className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-4 text-base font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all text-slate-700"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-1">
                {t("store.loginPage.passwordLabel")}
              </label>
              <div className="relative">
                <Icons.Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-4 text-base font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all text-slate-700"
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-500 text-xs font-bold p-4 rounded-xl text-center border border-rose-100 animate-shake shadow-inner">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-slate-900 hover:bg-black text-white rounded-xl py-5 text-base font-black uppercase shadow-xl shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-50 mt-2 flex items-center justify-center gap-3 group"
            >
              {isLoggingIn ? (
                <Icons.Refresh size={20} className="animate-spin" />
              ) : (
                <>
                  <span>{t("store.loginPage.button")}</span>
                  <Icons.ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
        
        <div className="text-center pb-8 sticky bottom-0">
          <p className="text-xs text-slate-400 font-bold uppercase leading-relaxed drop-shadow-sm">
            {t("store.loginPage.authorizedOnly")}
          </p>
        </div>
      </div>
    </div>
  );
}
