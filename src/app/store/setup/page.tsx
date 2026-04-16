"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStoreAuth } from "@/components/providers/StoreProvider";

export default function StoreSetupPage() {
  const router = useRouter();
  const { store, isLoading } = useStoreAuth();

  useEffect(() => {
    if (!isLoading && store) {
      router.replace("/store");
    }
  }, [store, isLoading, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

