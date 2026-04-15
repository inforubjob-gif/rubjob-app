"use client";

import { useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminAuthGate from "@/components/admin/AdminAuthGate";
import { Icons } from "@/components/ui/Icons";
import { ToastProvider } from "@/components/providers/ToastProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <AdminAuthGate>
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
          <main className="flex-1 overflow-y-auto relative p-4 md:p-8">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminAuthGate>
  );
}
