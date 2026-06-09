"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import GlobalInput from "@/components/ui/GlobalInput";
import Button from "@/components/ui/Button";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("ลิงก์ไม่ถูกต้อง กรุณาขอรีเซ็ตรหัสผ่านใหม่");
      return;
    }
    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/rubber/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json() as any;

      if (res.ok && data.success) {
        setIsSuccess(true);
      } else {
        setError(data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่");
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-10 shadow-2xl text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Icons.Shield size={32} className="text-rose-500" />
          </div>
          <h1 className="text-xl font-black text-slate-900 mb-2">ลิงก์ไม่ถูกต้อง</h1>
          <p className="text-sm text-slate-500 mb-6">กรุณาขอรีเซ็ตรหัสผ่านใหม่อีกครั้ง</p>
          <button
            onClick={() => router.push("/rubber/login")}
            className="w-full py-4 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary-heavy transition-all"
          >
            กลับไปหน้าเข้าสู่ระบบ
          </button>
        </div>
      </div>
    );
  }

  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!isSuccess) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          try { window.close(); } catch {}
          // Fallback: if window.close() doesn't work (some browsers block it)
          setTimeout(() => router.push("/rubber/login"), 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSuccess, router]);

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-600 to-emerald-700 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-10 shadow-2xl text-center max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Icons.CheckCircle size={40} className="text-emerald-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">เปลี่ยนรหัสผ่านสำเร็จ! ✅</h1>
          <p className="text-sm text-slate-500 mb-2">คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว</p>
          <p className="text-xs text-slate-400 mb-8">หน้านี้จะปิดตัวลงใน {countdown} วินาที...</p>
          <button
            onClick={() => { try { window.close(); } catch {} router.push("/rubber/login"); }}
            className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
          >
            ปิดหน้านี้
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary via-primary to-slate-50 flex flex-col relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex-1 flex flex-col justify-center px-6 relative z-10 max-w-md mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl ring-4 ring-white/20">
            <Icons.Shield size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase mb-1">
            ตั้งรหัสผ่านใหม่
          </h1>
          <p className="text-sm font-bold text-white/70 uppercase tracking-widest">
            Rubjob Rubber
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-black/10 border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <form onSubmit={handleSubmit} className="space-y-6">
            <GlobalInput
              label="รหัสผ่านใหม่"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              icon={<Icons.Shield size={20} />}
              required
              disabled={isLoading}
              className="text-slate-900"
            />

            <GlobalInput
              label="ยืนยันรหัสผ่านใหม่"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              icon={<Icons.Shield size={20} />}
              required
              disabled={isLoading}
              className="text-slate-900"
            />

            {error && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-center gap-3 animate-shake">
                <div className="w-8 h-8 bg-rose-500 text-white rounded-lg flex items-center justify-center shrink-0">
                  <Icons.Shield size={16} />
                </div>
                <p className="text-xs font-black text-rose-600 leading-tight">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              variant="primary"
              isLoading={isLoading}
              className="font-black uppercase tracking-wider h-14"
            >
              🔐 เปลี่ยนรหัสผ่าน
            </Button>
          </form>
        </div>

        <div className="mt-10 text-center">
          <div className="opacity-40 text-[10px] font-black uppercase tracking-widest text-white flex items-center justify-center gap-4">
            <span className="h-[1px] w-8 bg-current" />
            RUBJOB
            <span className="h-[1px] w-8 bg-current" />
          </div>
        </div>
      </div>
    </div>
  );
}
