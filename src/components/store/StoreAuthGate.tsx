"use client";

import { useState } from "react";
import { useStoreAuth } from "@/components/providers/StoreProvider";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function StoreAuthGate({ children }: { children: React.ReactNode }) {
  const { store, isLoading, refreshStore } = useStoreAuth();
  const { t } = useTranslation();
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
      const res = await fetch("/api/store/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        await refreshStore();
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
        <div className="w-12 h-12 border-4 border-primary-light border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 absolute inset-0 z-[100]">
        <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl relative overflow-hidden border border-slate-100">
          {/* Header Brand Line */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-primary to-blue-500" />
          
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center ring-8 ring-blue-50 transition-transform hover:scale-105 duration-500">
              <Icons.Logo size={60} variant="color" />
            </div>
          </div>
          
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">ระบบจัดการร้านค้า</h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">RUBJOB Merchant Portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">อีเมลร้านค้า (Store Email)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="branch@store.com"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-700"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">รหัสผ่าน (Password)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-700"
              />
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl flex items-center gap-3 border border-rose-100 animate-fade-in">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <p className="text-xs font-bold">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4.5 text-sm font-black shadow-xl shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50 mt-4 uppercase tracking-widest"
            >
              {isLoggingIn ? "กำลังประมวลผล..." : "เข้าสู่ระบบร้านค้า"}
            </button>
          </form>
          
          <div className="mt-8 text-center">
             <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-300">AUTHORIZED STORES ONLY</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
