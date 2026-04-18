"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function RiderAuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkAuth() {
      if (pathname === "/rider/login") {
        // Allow rendering login without checking session
        return; 
      }
      try {
        const res = await fetch("/api/rider/me");
        if (res.ok) {
          const data = await res.json() as { rider: any };
          // Inject session into localStorage for backward compatibility with rider UI components
          localStorage.setItem("rubjob_rider_session", JSON.stringify(data.rider));
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          router.push("/rider/login");
        }
      } catch (err) {
        setIsAuthenticated(false);
        router.push("/rider/login");
      }
    }
    checkAuth();
  }, [pathname, router]);

  // Prevent flicker on protected pages, or while waiting to redirect
  if ((isAuthenticated === null || isAuthenticated === false) && pathname !== "/rider/login") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 relative z-[999]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // If on login page, or authenticated === true, show children
  return <>{children}</>;
}
