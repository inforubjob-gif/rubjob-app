"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function PartnerLogin() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/partner/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        if (data.type === "store") router.push("/partner-store");
        else router.push("/partner-service");
      } else {
        setError(data.error || t("store.login.failed"));
      }
    } catch (err) {
      setError(t("store.login.errorConn"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-gradient-to-b from-primary via-primary to-slate-50 relative overflow-hidden p-6 justify-center items-center font-sans">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/5 rounded-full blur-[100px] -ml-48 -mb-48" />

      <div className="relative z-10 w-full max-w-sm mx-auto space-y-10">
        <div className="text-center px-4 animate-float">
          <div className="mb-10 flex justify-center">
             <img 
               src="/images/rubjob-complete_Vertical-text-white.png" 
               alt="RUBJOB" 
               className="h-28 w-auto object-contain drop-shadow-2xl" 
             />
          </div>
          <p className="text-xl text-white font-black uppercase mt-6 bg-white/10 backdrop-blur-sm py-3 px-10 rounded-full inline-block border border-white/20">
             พาร์ทเนอร์ (PARTNER)
          </p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-2xl shadow-primary-dark/20">
          <div className="bg-white rounded-[1.75rem] p-8 space-y-6 shadow-sm">
            {error && (
              <div className="bg-rose-50 text-rose-500 text-xs font-bold p-4 rounded-xl text-center border border-rose-100 animate-shake shadow-inner">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-1">
                {t("store.login.email")}
              </label>
              <div className="relative">
                <Icons.User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder={t("store.login.emailPlaceholder")} 
                  className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-4 text-base font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all" 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-1">
                {t("store.login.password")}
              </label>
              <div className="relative">
                <Icons.Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder={t("store.login.passwordPlaceholder")} 
                  className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-4 text-base font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all" 
                  required 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-black text-white rounded-xl py-5 text-base font-black uppercase shadow-xl shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-50 mt-2 flex items-center justify-center gap-3 group"
            >
              {loading ? (
                <Icons.Refresh size={20} className="animate-spin" />
              ) : (
                <>
                  <span>{t("store.login.submit")}</span>
                  <Icons.ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="flex flex-col items-center gap-6 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <button 
            onClick={() => alert(t("common.forgotPasswordMessage"))}
            className="text-white hover:text-white font-black uppercase transition-colors tracking-widest border-b border-white/40 pb-0.5 text-xs shadow-sm"
          >
            {t("common.forgotPassword")}
          </button>
          
          <a 
            href="https://line.me/R/ti/p/@rubjob" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 transition-all active:scale-95 group"
          >
            <Icons.Line size={20} className="text-[#06C755]" />
            <span className="text-white text-xs font-black uppercase">{t("common.contactAdmin")}</span>
            <Icons.ExternalLink size={14} className="text-white/40 group-hover:text-white/70 transition-colors" />
          </a>
        </div>

        <div className="text-center pb-8 sticky bottom-0">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em] drop-shadow-sm">
             RUBJOB - ผู้จัดการชีวิต LIFE OPERATOR
          </p>
        </div>
      </div>
    </div>
  );
}
