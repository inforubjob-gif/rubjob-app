"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function RubberAuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkAuth() {
      const isLoginPage = pathname === "/rubber/login" || pathname === "/login";
      if (isLoginPage) {
        setIsAuthenticated(true);
        return; 
      }
      try {
        const res = await fetch("/api/rubber/me");
        if (res.ok) {
          const data = await res.json() as { rubber: any };
          // Inject session into localStorage for backward compatibility with rubber UI components
          localStorage.setItem("rubjob_rubber_session", JSON.stringify(data.rubber));
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          router.push("/rubber/login");
        }
      } catch (err) {
        setIsAuthenticated(false);
        router.push("/rubber/login");
      }
    }
    checkAuth();
  }, [pathname, router]);

  // Prevent flicker on protected pages, or while waiting to redirect
  const isLoginPage = pathname === "/rubber/login" || pathname === "/login";
  if ((isAuthenticated === null || isAuthenticated === false) && !isLoginPage) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 relative z-[999]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // If on login page, or authenticated === true, show children
  return <>{children}</>;
}
