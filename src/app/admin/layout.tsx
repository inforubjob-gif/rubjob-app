"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminAuthGate from "@/components/admin/AdminAuthGate";
import { Icons } from "@/components/ui/Icons";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { AdminProvider, useAdmin } from "@/components/providers/AdminProvider";
import { usePathname, useRouter } from "next/navigation";

function PermissionGate({ children }: { children: React.ReactNode }) {
  const { admin, hasPermission, isLoading } = useAdmin();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !admin) return;

    const pathPermissionMap: Record<string, string> = {
      "/admin/orders": "orders",
      "/admin/users": "users",
      "/admin/stores": "stores",
      "/admin/riders": "riders",
      "/admin/coupons": "coupons",
      "/admin/finance": "finance",
      "/admin/support": "support",
      "/admin/settings": "settings",
    };

    const requiredPermission = Object.entries(pathPermissionMap).find(([path]) => 
      pathname.startsWith(path)
    )?.[1];

    if (requiredPermission && !hasPermission(requiredPermission)) {
      console.warn(`Unauthorized access to ${pathname}.`);
      router.push("/admin");
    }
  }, [pathname, admin, isLoading, hasPermission, router]);

  if (isLoading) return null;
  return <>{children}</>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <AdminProvider>
      <AdminAuthGate>
        <PermissionGate>
          <ToastProvider>
            <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col lg:flex-row overflow-hidden font-sans text-slate-900">
            {/* Mobile Header */}
            <header className="lg:hidden h-20 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-[55]">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/20">
                    <Icons.Logo size={24} variant="white" />
                 </div>
                 <span className="font-black text-white text-xs tracking-widest uppercase">
                   Rubjob<br/>
                   <span className="text-[8px] text-primary-light">Admin</span>
                 </span>
              </div>
              
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-3 rounded-xl bg-white/5 text-slate-300 hover:text-white transition-colors border border-white/5"
              >
                <Icons.Tasks size={24} />
              </button>
            </header>

            {/* Sidebar */}
            <AdminSidebar 
              isOpen={isSidebarOpen} 
              onClose={() => setIsSidebarOpen(false)} 
            />
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50">
              <main className="flex-1 overflow-y-auto relative p-4 md:p-8 no-scrollbar">
                <div className="max-w-7xl mx-auto w-full">
                  {children}
                </div>
              </main>
            </div>
            </div>
          </ToastProvider>
        </PermissionGate>
      </AdminAuthGate>
    </AdminProvider>
  );
}
