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
    // Clear the token cookie by setting a blank cookie or just redirecting 
    // to a route that handles logout if we had one.
    // For now, we'll just clear the state and redirect.
    // We could add an /api/store/logout if needed.
    setStore(null);
    router.push("/");
    window.location.reload();
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
