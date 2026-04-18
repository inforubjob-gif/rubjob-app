"use client";

import { useEffect } from "react";
import { useStoreAuth } from "@/components/providers/StoreProvider";
import { useRouter, usePathname } from "next/navigation";

export default function StoreAuthGate({ children }: { children: React.ReactNode }) {
  const { store, isLoading } = useStoreAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !store && pathname !== "/store/login") {
      router.push("/store/login");
    }
  }, [store, isLoading, pathname, router]);

  if (isLoading || (!store && pathname !== "/store/login")) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 relative z-[999]">
        <div className="w-12 h-12 border-4 border-primary-light border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // If on login page, or authenticated === true, show children
  return <>{children}</>;
}
