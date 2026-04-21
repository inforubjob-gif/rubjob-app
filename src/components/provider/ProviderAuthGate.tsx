"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function ProviderAuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkAuth() {
      if (pathname === "/provider/login") {
        return;
      }
      try {
        const res = await fetch("/api/provider/me");
        if (res.ok) {
          const data = await res.json() as { provider: any };
          localStorage.setItem("rubjob_provider_session", JSON.stringify(data.provider));
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          router.push("/provider/login");
        }
      } catch (err) {
        setIsAuthenticated(false);
        router.push("/provider/login");
      }
    }
    checkAuth();
  }, [pathname, router]);

  if ((isAuthenticated === null || isAuthenticated === false) && pathname !== "/provider/login") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 relative z-[999]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}
