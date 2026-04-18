"use client";

import { useLiff } from "@/components/providers/LiffProvider";
import { Icons } from "@/components/ui/Icons";

export default function LoginView() {
  const { login, isReady } = useLiff();

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-primary via-primary to-slate-50 flex flex-col items-center px-6 pt-6 pb-12 transition-all duration-700 relative overflow-hidden font-sans">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/5 rounded-full blur-[100px] -ml-48 -mb-48" />
      
      <main className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center">
        {/* Simple Logo (Standardized with other portals) */}
        <div className="mb-12 flex justify-center">
          <Icons.Logo size={100} variant="icon-white" className="drop-shadow-2xl" />
        </div>

        <div className="w-full space-y-8 text-center">
          <div className="space-y-4">
            <h2 className="text-5xl font-black text-white tracking-tight leading-none drop-shadow-lg">
              rubjob
            </h2>
            <p className="text-xs text-white/70 font-black uppercase tracking-[0.25em] bg-white/10 backdrop-blur-sm py-1.5 px-6 rounded-full inline-block border border-white/10 italic">
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
                <span className="font-extrabold text-xl uppercase tracking-wider">Login With LINE</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer to match Rider look */}
      <div className="absolute bottom-8 left-0 right-0 text-center px-6">
        <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] leading-relaxed drop-shadow-sm">
          RUBJOB — LAUNDRY & LIFE SERVICE
        </p>
      </div>
    </div>
  );
}
