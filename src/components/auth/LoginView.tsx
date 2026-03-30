"use client";

import { useLiff } from "@/components/providers/LiffProvider";
import { Icons } from "@/components/ui/Icons";

export default function LoginView() {
  const { login, isReady } = useLiff();

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 relative overflow-hidden font-sans">
      {/* Brand Background Gradient (Consistent with HomePage) */}
      <div className="absolute top-0 left-0 right-0 h-[450px] bg-gradient-to-b from-primary via-primary/95 to-slate-50 z-0" />
      
      {/* Floating accent orbs (Subtle) */}
      <div className="absolute top-[20%] left-[-20%] w-[80%] h-[40%] bg-white/20 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute top-[10%] right-[-10%] w-[40%] h-[20%] bg-amber-200/30 rounded-full blur-[80px] pointer-events-none z-0" />

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
        {/* Refined Logo Container */}
        <div className="relative mb-10 group">
          <div className="absolute -inset-4 bg-white/30 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          <div className="relative w-36 h-36 bg-white rounded-[2.8rem] shadow-[0_20px_50px_rgba(255,159,28,0.15)] border-4 border-white flex items-center justify-center overflow-hidden transform group-hover:scale-[1.02] transition-transform duration-500">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-50" />
            <Icons.Logo size={95} variant="icon" />
          </div>
        </div>

        {/* Brand Text Content */}
        <div className="text-center space-y-3 mb-14">
          <h1 className="text-4xl font-[1000] tracking-tighter text-white drop-shadow-sm">
            RUB<span className="text-primary-dark italic">JOB</span>
          </h1>
          <div className="h-px w-12 bg-white/40 mx-auto" />
          <p className="text-white/90 font-bold text-[11px] leading-relaxed max-w-[260px] mx-auto uppercase tracking-[0.25em]">
            Professional Laundry <br /> & Life Service Organizer
          </p>
        </div>

        {/* Interactive Actions Section */}
        <div className="w-full max-w-xs space-y-5">
          <button
            onClick={login}
            disabled={!isReady}
            className="w-full group relative flex items-center justify-between bg-[#06C755] hover:bg-[#05b14c] text-white py-5 px-6 rounded-[2rem] transition-all duration-300 shadow-xl shadow-[#06C755]/20 active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-2.5 rounded-xl group-hover:bg-white/30 transition-colors">
                <Icons.Line size={22} className="text-white" />
              </div>
              <span className="font-black text-sm uppercase tracking-widest">{isReady ? "Login with LINE" : "Initializing..."}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <Icons.Back size={16} className="rotate-180 text-white" />
            </div>
          </button>
          
          <div className="flex flex-col items-center gap-4 pt-4">
            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-[0.15em] leading-loose">
              By logging in, you agree to our <br />
              <button className="text-primary-dark underline decoration-primary/20 underline-offset-4">Terms</button>
              <span className="mx-2 text-slate-300">•</span>
              <button className="text-primary-dark underline decoration-primary/20 underline-offset-4">Privacy Policy</button>
            </p>
          </div>
        </div>
      </main>

      {/* Modern Footer Branding */}
      <footer className="relative z-10 p-10 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-slate-100 shadow-sm">
          <Icons.Guarantee size={14} className="text-primary" />
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Secure Cloud Verification</span>
        </div>
      </footer>
    </div>
  );
}
