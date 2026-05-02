"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function AdminLoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as any;

      if (res.ok && data.success) {
        // Cookie is set by the API
        router.replace("/admin");
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-slate-900 relative overflow-hidden p-6 justify-center items-center">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] -ml-48 -mb-48" />

      <div className="relative z-10 w-full max-w-sm mx-auto space-y-10">
        <div className="text-center px-4 animate-float">
          <div className="mb-10 flex justify-center">
             <img 
               src="/images/rubjob-complete_Vertical-text-white.png" 
               alt="RUBJOB" 
               className="h-28 w-auto object-contain drop-shadow-2xl" 
             />
          </div>
          <p className="text-xl text-white font-black uppercase mt-6 bg-white/5 backdrop-blur-sm py-3 px-10 rounded-full inline-block border border-white/10 tracking-widest">
             ADMIN PORTAL
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 bg-white/5 backdrop-blur-md p-1 rounded-2xl border border-white/10 shadow-2xl">
          <div className="bg-white rounded-[1.5rem] p-8 space-y-6 shadow-sm">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">
                Email Address
              </label>
              <div className="relative">
                <Icons.User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@rubjob.com"
                  className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-4 text-base font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all text-slate-700"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">
                Password
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
              <div className="bg-rose-50 text-rose-500 text-xs font-bold p-4 rounded-xl text-center border border-rose-100 animate-shake">
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
                  <span>SIGN IN TO DASHBOARD</span>
                  <Icons.ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center pb-8">
          <p className="text-[10px] text-white/20 font-bold uppercase tracking-[0.3em]">
             SECURE ACCESS ONLY
          </p>
        </div>
      </div>
    </div>
  );
}
