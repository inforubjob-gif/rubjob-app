"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "@/components/ui/Icons";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const NAV_ITEMS = [
    { label: "Dashboard", href: "/admin", icon: <Icons.Tasks size={20} /> },
    { label: "Orders", href: "/admin/orders", icon: <Icons.FileText size={20} /> },
    { label: "Users & Roles", href: "/admin/users", icon: <Icons.User size={20} /> },
    { label: "Stores", href: "/admin/stores", icon: <Icons.Office size={20} /> },
    { label: "Riders", href: "/admin/riders", icon: <Icons.Car size={20} /> },
    { label: "Coupons", href: "/admin/coupons", icon: <Icons.Ticket size={20} /> },
    { label: "Finance", href: "/admin/finance", icon: <Icons.Wallet size={20} /> },
    { label: "Support Center", href: "/admin/support", icon: <Icons.Chat size={20} /> },
    { label: "Settings", href: "/admin/settings", icon: <Icons.Settings size={20} /> },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[60] lg:hidden transition-opacity duration-300 animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside 
        className={`fixed inset-y-0 left-0 z-[70] w-72 bg-slate-900 text-slate-300 flex flex-col shrink-0 h-full border-r border-slate-800 transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-24 flex items-center justify-between px-8 bg-slate-950/50 border-b border-white/5 shrink-0">
          <div className="flex items-center">
            <Icons.Logo size={36} variant="white" />
            <span className="ml-4 font-black text-white tracking-[0.2em] leading-tight uppercase">
              RUBJOB<br/>
              <span className="text-[10px] text-primary-light font-black">ADMIN PORTAL</span>
            </span>
          </div>
          
          <button 
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white"
          >
            <Icons.Close size={20} />
          </button>
        </div>
        
        <nav className="flex-1 px-5 py-6 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
             const isActive = item.href === "/admin" 
               ? pathname === "/admin" 
               : pathname.startsWith(item.href);
             
             return (
               <Link 
                 key={item.href} 
                 href={item.href}
                 onClick={() => {
                   if (window.innerWidth < 1024) onClose();
                 }}
                 className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                   isActive 
                     ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                     : 'text-slate-400 hover:bg-white/5 hover:text-white'
                 }`}
               >
                 <span className={isActive ? "text-white" : "text-slate-500"}>{item.icon}</span>
                 {item.label}
               </Link>
             );
          })}
        </nav>

        <div className="p-8 border-t border-white/5 shrink-0 space-y-3">
           <Link href="/" className="flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 text-white transition-all w-full">
              <Icons.Back size={18} />
              Exit to App
           </Link>
           <button 
             onClick={() => {
               localStorage.removeItem("rubjob_admin_session");
               window.location.reload();
             }}
             className="flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all w-full"
           >
              <Icons.Lock size={18} />
              Sign Out
           </button>
        </div>
      </aside>
    </>
  );
}
