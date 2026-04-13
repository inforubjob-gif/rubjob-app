"use client";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminAuthGate from "@/components/admin/AdminAuthGate";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // We use a fixed full-screen layout to escape the mobile constraints of the root AppWrapper
  return (
    <AdminAuthGate>
      <div className="fixed inset-0 z-50 bg-slate-50 flex overflow-hidden font-sans text-slate-900">
        {/* Sidebar */}
        <AdminSidebar />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50">
          <main className="flex-1 overflow-y-auto relative p-8">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminAuthGate>
  );
}
