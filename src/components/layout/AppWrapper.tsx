"use client";

import { useLiff } from "@/components/providers/LiffProvider";
import LoginView from "@/components/auth/LoginView";
import { Icons } from "@/components/ui/Icons";

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const { isReady, isLoggedIn, error } = useLiff();

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-slate-50">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Initializing RUBJOB...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginView />;
  }

  return <>{children}</>;
}
