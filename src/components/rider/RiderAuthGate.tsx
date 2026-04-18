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

  // Prevent flicker on protected pages
  if (isAuthenticated === null && pathname !== "/rider/login") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // If on login page, or authenticated, show children
  return <>{children}</>;
}
