"use client";

import { Icons } from "@/components/ui/Icons";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-white px-6 text-center animate-in fade-in duration-500">
      <div className="relative w-full max-w-sm mx-auto">
        {/* Mascot Illustration */}
        <div className="mb-10 relative">
          <img 
            src="/images/มาสคอต-ตากผ้า.png" 
            alt="Loading Mascot" 
            className="w-full max-w-[240px] mx-auto animate-float drop-shadow-2xl"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent path-mask" />
        </div>

        {/* Loading Content */}
        <div className="space-y-6">
          <div className="flex justify-center">
            <Icons.Logo variant="color" size={80} className="animate-pulse opacity-50 transition-opacity" />
          </div>
          
          <div className="space-y-3">
             <div className="flex items-center justify-center gap-2">
                <Icons.Refresh size={16} className="text-primary animate-spin" />
                <span className="text-[10px] font-black uppercase text-slate-400">
                  Processing Laundry...
                </span>
             </div>
             
             {/* Premium Progress Bar */}
             <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden mx-auto border border-slate-50">
                <div className="h-full bg-gradient-to-r from-primary to-orange-400 w-1/3 animate-loading-bar rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
             </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-2 opacity-30">
        <p className="text-[8px] font-black uppercase text-slate-300">Rubjob Logistics Engine</p>
      </div>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(1deg); }
        }
        @keyframes loading-bar {
          0% { transform: translateX(-100%); width: 30%; }
          50% { transform: translateX(50%); width: 60%; }
          100% { transform: translateX(250%); width: 30%; }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-loading-bar {
          animation: loading-bar 2.5s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
        }
        .path-mask {
          mask-image: radial-gradient(circle, black, transparent 70%);
        }
      `}</style>
    </div>
  );
}
