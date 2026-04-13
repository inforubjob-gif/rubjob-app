"use client";

import { useState, useEffect } from "react";
import { Icons } from "@/components/ui/Icons";

export default function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check session on mount
    const adminSession = localStorage.getItem("rubjob_admin_session");
    if (adminSession) {
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
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("rubjob_admin_session", email);
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
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 absolute inset-0 z-[100]">
        <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden">
          {/* Header Gradient */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 to-purple-600" />
          
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-800 ring-4 ring-slate-50">
              <Icons.Settings size={32} />
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">ระบบหลังบ้าน</h1>
            <p className="text-sm text-slate-500 mt-1">RUBJOB Administration</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">อีเมล (Email)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@rubjob.com"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all font-medium"
              />
            </div>
            
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">รหัสผ่าน (Password)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all font-medium"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-500 font-bold bg-rose-50 p-3 rounded-lg text-center animate-fade-in">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3.5 text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
            >
              {isLoading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ (Login)"}
            </button>
          </form>
          
          <div className="mt-8 text-center">
             <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-300">AUTHORIZED PERSONNEL ONLY</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
