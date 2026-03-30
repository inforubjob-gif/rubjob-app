"use client";

import { useLiff } from "@/components/providers/LiffProvider";
import { Icons } from "@/components/ui/Icons";

export default function LoginView() {
  const { login, isReady } = useLiff();

  return (
    <div className="flex flex-col min-h-dvh bg-white relative overflow-hidden font-sans">
      {/* Top Gradient (Exact Match to Image) */}
      <div className="absolute top-0 left-0 right-0 h-[35%] bg-gradient-to-b from-[#F3B34E] via-[#F3B34E]/60 to-white z-0" />
      
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 pt-20">
        {/* Simple Logo (Using the official color variant) */}
        <div className="mb-8 w-full flex justify-center">
          <Icons.Logo size={120} variant="color" />
        </div>

        {/* Thai Welcome Text */}
        <p className="text-slate-800 font-bold text-sm mb-6 tracking-tight">
          กรุณาเข้าสู่ระบบ
        </p>

        {/* Action Button (Simplified Green) */}
        <div className="w-full max-w-[280px]">
          <button
            onClick={login}
            disabled={!isReady}
            className="w-full bg-[#70CC6C] hover:bg-[#60B85C] text-white py-4.5 px-6 rounded-[0.8rem] transition-all duration-200 shadow-sm active:scale-[0.98] disabled:opacity-50"
          >
            <span className="font-bold text-lg">Login With LINE</span>
          </button>
        </div>
      </main>

      {/* Empty bottom space to match image layout */}
      <div className="h-[15%]" />
    </div>
  );
}
