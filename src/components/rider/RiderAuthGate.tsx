"use client";

import { useState, useEffect } from "react";
import { Icons } from "@/components/ui/Icons";

export default function RiderAuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check rider session on mount
    const riderSession = localStorage.getItem("rubjob_rider_session");
    if (riderSession) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/rider/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Store rider info in localStorage
        localStorage.setItem("rubjob_rider_session", JSON.stringify(data.rider));
        setIsAuthenticated(true);
      } else {
        setError(data.error || "เข้าสู่ระบบไม่สำเร็จ");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return (
      <div className="flex flex-col min-h-dvh bg-slate-50 relative overflow-hidden p-6 justify-center">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -ml-32 -mb-32" />

        <div className="relative z-10 w-full max-w-sm mx-auto space-y-10">
          <div className="text-center">
            <div className="w-20 h-20 bg-primary rounded-[2rem] flex items-center justify-center text-slate-900 mx-auto shadow-xl shadow-primary/20 mb-6">
              <Icons.Truck size={40} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">RIDER PORTAL</h1>
            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Rubjob Delivery Service</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email (Authorized)</label>
              <div className="relative">
                <Icons.User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rider@rubjob.com"
                  className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold shadow-sm focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <Icons.Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold shadow-sm focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-500 text-xs font-bold p-4 rounded-xl text-center border border-rose-100 animate-fade-in shadow-sm shadow-rose-100/50">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 text-white rounded-2xl py-5 text-sm font-black uppercase tracking-widest shadow-xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-50 mt-4"
            >
              {isLoading ? "Checking..." : "Sign In to Work"}
            </button>
          </form>

          <div className="text-center">
            <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.2em]">Restricted to Active Hub Riders</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
