"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function RubberAuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkAuth() {
      const isPublicPage = pathname === "/rubber/login" || pathname === "/login" || pathname.startsWith("/rubber/reset-password") || pathname.startsWith("/reset-password");
      if (isPublicPage) {
        setIsAuthenticated(true);
        return; 
      }
      try {
        const res = await fetch("/api/rubber/me");
        if (res.ok) {
          const data = await res.json() as { rubber: any };
          // Inject session into localStorage for backward compatibility with rubber UI components
          localStorage.setItem("rubjob_rubber_session", JSON.stringify(data.rubber));
          // Reset retry counter on success
          sessionStorage.removeItem("rubber_auth_retries");
          setIsAuthenticated(true);
        } else {
          // Track redirect retries to prevent infinite loops
          const retries = parseInt(sessionStorage.getItem("rubber_auth_retries") || "0", 10);
          if (retries >= 2) {
            // After 3 failed attempts, stop the loop — show error
            localStorage.removeItem("rubjob_rubber_session");
            sessionStorage.removeItem("rubber_auth_retries");
            setAuthError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
            setIsAuthenticated(false);
            return;
          }
          sessionStorage.setItem("rubber_auth_retries", String(retries + 1));
          localStorage.removeItem("rubjob_rubber_session");
          setIsAuthenticated(false);
          router.push("/rubber/login");
        }
      } catch (err) {
        const retries = parseInt(sessionStorage.getItem("rubber_auth_retries") || "0", 10);
        if (retries >= 2) {
          localStorage.removeItem("rubjob_rubber_session");
          sessionStorage.removeItem("rubber_auth_retries");
          setAuthError("เครือข่ายมีปัญหา กรุณาตรวจสอบการเชื่อมต่อ");
          setIsAuthenticated(false);
          return;
        }
        sessionStorage.setItem("rubber_auth_retries", String(retries + 1));
        setIsAuthenticated(false);
        router.push("/rubber/login");
      }
    }
    checkAuth();
  }, [pathname, router]);

  // Show error screen when max retries exceeded (prevents infinite loop)
  if (authError) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-slate-50 px-6 text-center gap-4">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h2 className="text-lg font-black text-slate-900">{authError}</h2>
        <div className="flex flex-col gap-3 w-full max-w-[200px] mt-4">
          <button 
            onClick={() => { sessionStorage.removeItem("rubber_auth_retries"); window.location.reload(); }}
            className="w-full py-4 bg-primary text-white rounded-xl font-black uppercase text-xs"
          >
            ลองใหม่อีกครั้ง
          </button>
          <button 
            onClick={() => { sessionStorage.removeItem("rubber_auth_retries"); localStorage.removeItem("rubjob_rubber_session"); window.location.href = "/rubber/login"; }}
            className="w-full py-3 text-slate-400 text-xs font-black uppercase"
          >
            กลับหน้าล็อกอิน
          </button>
        </div>
      </div>
    );
  }

  // Prevent flicker on protected pages, or while waiting to redirect
  const isPublicPage = pathname === "/rubber/login" || pathname === "/login" || pathname.startsWith("/rubber/reset-password") || pathname.startsWith("/reset-password");
  if ((isAuthenticated === null || isAuthenticated === false) && !isPublicPage) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 relative z-[999]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // If on login page, or authenticated === true, show children
  return <>{children}</>;
}
