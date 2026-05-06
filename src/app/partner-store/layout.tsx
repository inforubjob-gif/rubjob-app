"use client";

import { StoreProvider } from "@/components/providers/StoreProvider";
import StoreAuthGate from "@/components/store/StoreAuthGate";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <StoreAuthGate>
        {children}
      </StoreAuthGate>
    </StoreProvider>
  );
}
