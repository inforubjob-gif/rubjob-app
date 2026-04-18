"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Store {
  id: string;
  name: string;
  email: string;
}

interface StoreContextType {
  store: Store | null;
  isLoading: boolean;
  refreshStore: () => Promise<void>;
  logout: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchStore();
  }, []);

  async function fetchStore() {
    try {
      const res = await fetch("/api/store/me");
      if (res.ok) {
        const data = await res.json();
        setStore(data.store);
        // Inject for backward compatibility with old store UI components
        localStorage.setItem("rubjob_store_session", JSON.stringify(data.store));
      } else {
        setStore(null);
      }
    } catch (err) {
      console.error("Failed to fetch store:", err);
      setStore(null);
    } finally {
      setIsLoading(false);
    }
  }

  const logout = async () => {
    try {
      await fetch("/api/store/logout", { method: "POST" });
    } catch (e) {}
    localStorage.removeItem("rubjob_store_session");
    setStore(null);
    router.push("/store/login");
  };

  return (
    <StoreContext.Provider value={{ store, isLoading, refreshStore: fetchStore, logout }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStoreAuth() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error("useStoreAuth must be used within a StoreProvider");
  }
  return context;
}
