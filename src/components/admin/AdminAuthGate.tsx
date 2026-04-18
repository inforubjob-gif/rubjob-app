"use client";

import { useState } from "react";
import { useAdmin } from "@/components/providers/AdminProvider";
import { Icons } from "@/components/ui/Icons";

export default function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const { admin, isLoading, refreshAdmin } = useAdmin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }

    setIsLoggingIn(true);
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
        await refreshAdmin();
      } else {
        setError(data.error || "เข้าสู่ระบบไม่สำเร็จ");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 absolute inset-0 z-[100]">
        <div className="bg-white rounded-xl w-full max-w-md p-10 shadow-2xl relative overflow-hidden border border-slate-100">
          {/* Header Brand Line */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary via-primary-dark to-primary" />
          
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-primary-light rounded-xl flex items-center justify-center ring-8 ring-primary-light/50 transition-transform hover:scale-105 duration-500">
              <Icons.Logo size={60} variant="color" />
            </div>
          </div>
          
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">ระบบหลังบ้าน</h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">RUBJOB Administration</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">อีเมล (Email)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@rubjob.com"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-700"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">รหัสผ่าน (Password)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-700"
              />
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-600 p-4 rounded-xl flex items-center gap-3 border border-rose-100 animate-fade-in">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <p className="text-xs font-bold">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-primary hover:bg-primary-dark text-white rounded-xl py-4.5 text-sm font-black shadow-xl shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 mt-4 uppercase tracking-widest"
            >
              {isLoggingIn ? "กำลังประมวลผล..." : "เข้าสู่ระบบ (Login)"}
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
