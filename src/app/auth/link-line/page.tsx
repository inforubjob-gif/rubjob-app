"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import liff from "@line/liff";
import { Icons } from "@/components/ui/Icons";

function LinkLineContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "unauthorized">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initLiffAndLink() {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) throw new Error("LIFF ID not configured");

        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const profile = await liff.getProfile();
        const lineUserId = profile.userId;

        const type = searchParams.get("type"); // rider or store
        const accountId = searchParams.get("id");
        const token = searchParams.get("token");

        if (!type || !accountId || !token) {
          setStatus("error");
          setError("Link parameters are missing. Please return to the app and try again.");
          return;
        }

        const res = await fetch("/api/auth/link-line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, accountId, lineUserId, token }),
        });

        const data = await res.json() as any;

        if (res.ok && data.success) {
          setStatus("success");
          // Close LIFF automatically after 3 seconds
          setTimeout(() => liff.closeWindow(), 3000);
        } else {
          setStatus("error");
          setError(data.error || "Failed to link account");
        }
      } catch (err: any) {
        console.error("Linking error:", err);
        setStatus("error");
        setError(err.message || "An unexpected error occurred");
      }
    }

    initLiffAndLink();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-8 shadow-xl shadow-primary/5">
        <Icons.Logo variant="icon" size={48} />
      </div>

      {status === "loading" && (
        <div className="space-y-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <h2 className="text-xl font-black text-slate-900">กำลังเชื่อมต่อ LINE...</h2>
          <p className="text-slate-400 font-bold text-sm">กรุณารอสักครู่ ระบบกำลังยืนยันตัวตนของคุณ</p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4 animate-in fade-in zoom-in duration-500">
          <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <Icons.Check size={32} strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-black text-slate-900">เชื่อมต่อสำเร็จ!</h2>
          <p className="text-slate-500 font-bold">บัญชีของคุณเชื่อมต่อกับ LINE เรียบร้อยแล้ว</p>
          <p className="text-xs text-slate-400 mt-4">หน้านี้จะปิดตัวลงโดยอัตโนมัติ...</p>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-16 h-16 bg-rose-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
            <Icons.Close size={32} strokeWidth={3} />
          </div>
          <h2 className="text-xl font-black text-slate-900">เกิดข้อผิดพลาด</h2>
          <p className="text-rose-500 font-bold text-sm tracking-tight">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 font-black text-xs text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      )}
    </div>
  );
}

export default function LinkLinePage() {
  return (
    <Suspense fallback={null}>
      <LinkLineContent />
    </Suspense>
  );
}
