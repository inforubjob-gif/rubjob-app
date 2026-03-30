"use client";

import { useLiff } from "@/components/providers/LiffProvider";
import { Icons } from "@/components/ui/Icons";

export default function LoginView() {
  const { login, isReady } = useLiff();

  return (
    <div className="flex flex-col min-h-dvh bg-slate-950 relative overflow-hidden text-white font-sans">
      {/* Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[40%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[60%] h-[30%] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
      
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
        {/* Animated Logo Section */}
        <div className="relative mb-12 group">
          <div className="absolute inset-0 bg-primary blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700" />
          <div className="relative w-32 h-32 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 flex items-center justify-center shadow-2xl">
            <Icons.Logo size={80} variant="icon" />
          </div>
        </div>

        {/* Text Content */}
        <div className="text-center space-y-4 mb-16">
          <h1 className="text-4xl font-[1000] tracking-tighter">
            RUB<span className="text-primary italic">JOB</span>
          </h1>
          <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-[240px] mx-auto uppercase tracking-[0.1em] opacity-80">
            Professional Laundry <br /> & Life Service Organizer
          </p>
        </div>

        {/* Buttons Section */}
        <div className="w-full max-w-xs space-y-4">
          <button
            onClick={login}
            disabled={!isReady}
            className="w-full group relative flex items-center justify-between bg-[#06C755] hover:bg-[#05b14c] text-white py-5 px-6 rounded-[1.8rem] transition-all duration-300 shadow-2xl shadow-[#06C755]/20 active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-2.5 rounded-xl group-hover:bg-white/30 transition-colors">
                <Icons.Line size={20} className="text-white" />
              </div>
              <span className="font-black text-sm uppercase tracking-widest">Login with LINE</span>
            </div>
            <Icons.Back size={16} className="rotate-180 opacity-40 group-hover:opacity-100 transition-opacity" />
          </button>
          
          <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-[0.15em] pt-4">
            By logging in, you agree to our <br />
            <span className="text-slate-400 underline decoration-slate-700">Terms</span> & <span className="text-slate-400 underline decoration-slate-700">Privacy Policy</span>
          </p>
        </div>
      </main>

      {/* Trust Indicator */}
      <footer className="relative z-10 p-10 flex flex-col items-center opacity-30 gap-2">
        <div className="flex items-center gap-1.5 grayscale">
          <Icons.Guarantee size={14} />
          <span className="text-[9px] font-black uppercase tracking-[0.3em]">Secure Verification</span>
        </div>
      </footer>
    </div>
  );
}
