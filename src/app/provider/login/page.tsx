"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function ProviderLoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("rubjob_provider_session");
    if (session) {
      router.replace("/provider");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/provider/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("rubjob_provider_session", JSON.stringify(data.provider));
        router.replace("/provider");
      } else {
        setError(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-gradient-to-b from-primary-dark via-primary to-slate-50 relative overflow-hidden p-6 justify-center items-center">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/5 rounded-full blur-[100px] -ml-48 -mb-48" />

      <div className="relative z-10 w-full max-w-sm mx-auto space-y-10">
        <div className="text-center px-4">
          <div className="mb-10 flex justify-center">
            <Icons.Logo variant="white" size={140} className="drop-shadow-2xl" />
          </div>
          <p className="text-xl text-white font-black uppercase mt-6 bg-white/10 backdrop-blur-sm py-3 px-10 rounded-full inline-block border border-white/20">
            ระบบผู้ให้บริการ
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-2xl shadow-primary-dark/20">
          <div className="bg-white rounded-[1.75rem] p-8 space-y-6 shadow-sm">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-1">
                อีเมลผู้ให้บริการ (Provider Email)
              </label>
              <div className="relative">
                <Icons.User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="provider@rubjob.com"
                  className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-4 text-base font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-1">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <Icons.Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-4 text-base font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all"
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
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-black text-white rounded-xl py-5 text-base font-black uppercase shadow-xl shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-50 mt-2 flex items-center justify-center gap-3 group"
            >
              {isLoading ? (
                <Icons.Refresh size={20} className="animate-spin" />
              ) : (
                <>
                  <span>เข้าสู่ระบบ</span>
                  <Icons.ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="flex flex-col items-center gap-6 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <button 
            onClick={() => alert("กรุณาติดต่อแอดมินผ่าน LINE @RUBJOB_HELP เพื่อขอรีเซ็ตรหัสผ่านครับ")}
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
          <p className="text-xs text-slate-400 font-bold uppercase leading-relaxed drop-shadow-sm">
            RUBJOB Provider Portal<br />Specialist & Service System
          </p>
        </div>
      </div>
    </div>
  );
}
