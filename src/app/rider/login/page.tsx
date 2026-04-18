"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";

export default function RiderLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If already logged in, redirect to dashboard
    const riderSession = localStorage.getItem("rubjob_rider_session");
    if (riderSession) {
      router.replace("/rider");
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
      const res = await fetch("/api/rider/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Store rider info in localStorage
        localStorage.setItem("rubjob_rider_session", JSON.stringify(data.rider));
        router.replace("/rider");
      } else {
        setError(data.error || "เข้าสู่ระบบไม่สำเร็จ");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 relative overflow-hidden p-6 justify-center">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -ml-32 -mb-32" />

      <div className="relative z-10 w-full max-w-sm mx-auto space-y-10">
        <div className="text-center px-4">
          <div className="mb-10 flex justify-center">
            <img 
              src="/images/rubjob-complete_logo-color.png" 
              alt="RUBJOB Official Logo" 
              className="h-20 w-auto object-contain drop-shadow-md"
            />
          </div>
          <h2 className="text-30 font-black text-slate-900 tracking-tight leading-none underline decoration-primary decoration-4 underline-offset-8">เข้าสู่ระบบไรเดอร์</h2>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-6 bg-white/80 backdrop-blur-sm py-1 px-4 rounded-full inline-block border border-slate-100 italic">
            RUBJOB DELIVERY SERVICE
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 bg-white/40 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-xl shadow-slate-200/40">
          <div className="bg-white rounded-[1.75rem] p-6 space-y-5 shadow-sm border border-slate-50">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">อีเมลผู้ใช้งาน</label>
              <div className="relative">
                <Icons.User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rider@rubjob.com"
                  className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">รหัสผ่านลับ</label>
              <div className="relative">
                <Icons.Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-500 text-[11px] font-bold p-4 rounded-2xl text-center border border-rose-100 animate-shake shadow-inner">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 text-white rounded-2xl py-5 text-sm font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-50 mt-2 flex items-center justify-center gap-3 group"
            >
              {isLoading ? (
                <Icons.Refresh size={20} className="animate-spin" />
              ) : (
                <>
                  <span>เข้าสู่ระบบเพื่อเริ่มงาน</span>
                  <Icons.ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center pb-8">
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em] leading-relaxed">
            สำหรับไรเดอร์ที่ลงทะเบียนแล้วเท่านั้น <br/>
            พบปัญหาติดต่อ @RUBJOB_HELP
          </p>
        </div>
      </div>
    </div>
  );
}
