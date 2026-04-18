"use client";

import { useLiff } from "@/components/providers/LiffProvider";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function LoginView() {
  const { login, isReady } = useLiff();
  const { t } = useTranslation();

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-primary via-primary to-slate-50 flex flex-col items-center justify-center px-6 py-12 transition-all duration-700 relative overflow-hidden font-sans">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/5 rounded-full blur-[100px] -ml-48 -mb-48" />
      
      <main className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center">
        {/* Simple Logo (Standardized with other portals) */}
        <div className="mb-14 flex justify-center">
          <Icons.Logo size={140} variant="white" className="drop-shadow-2xl" />
        </div>

        <div className="w-full space-y-8 text-center">
          <div className="space-y-4">
            <p className="text-xs text-white/70 font-black uppercase bg-white/10 backdrop-blur-sm py-1.5 px-6 rounded-full inline-block border border-white/10">
              กรุณาเข้าสู่ระบบ
            </p>
          </div>

          {/* Action Button (Simplified Green) */}
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-2xl shadow-primary-dark/20 w-full mt-10">
            <div className="bg-white rounded-[1.5rem] p-6 shadow-sm">
              <button
                onClick={login}
                disabled={!isReady}
                className="w-full bg-[#70CC6C] hover:bg-[#60B85C] text-white py-5 px-6 rounded-xl transition-all duration-200 shadow-xl shadow-green-100 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group"
              >
                <span className="font-extrabold text-xl uppercase">Login With LINE</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <a 
            href="https://line.me/R/ti/p/@rubjob" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white/5 hover:bg-white/10 backdrop-blur-sm px-6 py-2.5 rounded-full border border-white/10 transition-all active:scale-95 group"
          >
            <Icons.Line size={18} className="text-[#06C755]" />
            <span className="text-white/60 text-[10px] font-black uppercase tracking-widest group-hover:text-white transition-colors">{t("common.contactAdmin")}</span>
          </a>
        </div>
      </main>

      {/* Footer to match Rider look */}
      <div className="absolute bottom-8 left-0 right-0 text-center px-6">
        <p className="text-xs text-slate-400 font-bold uppercase leading-relaxed drop-shadow-sm">
          RUBJOB - ผู้จัดการชีวิต LIFE OPERATOR
        </p>
      </div>
    </div>
  );
}
