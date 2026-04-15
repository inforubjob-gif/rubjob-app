"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Admin {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
  permissions: string[] | null;
  avatarUrl: string | null;
}

interface AdminContextType {
  admin: Admin | null;
  isLoading: boolean;
  refreshAdmin: () => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchAdmin();
  }, []);

  async function fetchAdmin() {
    try {
      const res = await fetch("/api/admin/me");
      if (res.ok) {
        const data = await res.json();
        setAdmin(data.admin);
      } else {
        setAdmin(null);
      }
    } catch (err) {
      console.error("Failed to fetch admin:", err);
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  }

  const logout = async () => {
    // Note: We don't have a logout API yet that clears the cookie, 
    // but we can clear localStorage as a fallback.
    localStorage.removeItem("rubjob_admin_session");
    // Ideally call an API to clear the cookie
    setAdmin(null);
    router.push("/admin");
    window.location.reload();
  };

  const hasPermission = (permission: string) => {
    if (!admin) return false;
    if (admin.role === 'super_admin') return true;
    if (!admin.permissions) return false;
    return admin.permissions.includes(permission);
  };

  return (
    <AdminContext.Provider value={{ admin, isLoading, refreshAdmin: fetchAdmin, logout, hasPermission }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}
