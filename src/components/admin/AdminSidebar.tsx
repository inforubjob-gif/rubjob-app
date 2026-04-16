"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdmin } from "@/components/providers/AdminProvider";
import { Icons } from "@/components/ui/Icons";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { admin, logout, hasPermission } = useAdmin();

  const NAV_ITEMS = [
    { label: "Dashboard", href: "/admin", icon: <Icons.Tasks size={20} />, permission: "dashboard" },
    { label: "Orders", href: "/admin/orders", icon: <Icons.FileText size={20} />, permission: "orders" },
    { label: "Users & Roles", href: "/admin/users", icon: <Icons.User size={20} />, permission: "users" },
    { label: "Stores", href: "/admin/stores", icon: <Icons.Office size={20} />, permission: "stores" },
    { label: "Riders", href: "/admin/riders", icon: <Icons.Car size={20} />, permission: "riders" },
    { label: "Coupons", href: "/admin/coupons", icon: <Icons.Ticket size={20} />, permission: "coupons" },
    { label: "Finance", href: "/admin/finance", icon: <Icons.Wallet size={20} />, permission: "finance" },
    { label: "Support Center", href: "/admin/support", icon: <Icons.Chat size={20} />, permission: "support" },
  ].filter(item => hasPermission(item.permission));

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
              <span className="text-[10px] text-primary-light font-black uppercase">Admin Portal</span>
            </span>
          </div>
          
          <button 
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white"
          >
            <Icons.Close size={20} />
          </button>
        </div>
        
        <nav className="flex-1 px-5 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
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

        {/* Profile Card & Settings Area */}
        <div className="p-4 border-t border-white/5 bg-slate-950/20 shrink-0">
           <div className="bg-white/5 rounded-3xl p-4 border border-white/5 shadow-inner">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary overflow-hidden shrink-0 shadow-sm font-black">
                    {admin?.avatarUrl ? <img src={admin.avatarUrl} className="w-full h-full object-cover" /> : admin?.name?.[0]?.toUpperCase()}
                 </div>
                 <div className="min-w-0">
                    <p className="font-black text-white text-xs truncate uppercase tracking-tight">{admin?.name}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase truncate">{admin?.role?.replace('_', ' ')}</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                 {hasPermission("settings") && (
                   <Link 
                     href="/admin/settings"
                     className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl text-[10px] font-black uppercase transition-all ${pathname === '/admin/settings' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                   >
                     <Icons.Settings size={18} />
                     Setts
                   </Link>
                 )}
                 <Link 
                   href="/"
                   className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 text-[10px] font-black uppercase transition-all"
                 >
                   <Icons.Back size={18} />
                   App
                 </Link>
                 <button 
                   onClick={logout}
                   className="col-span-2 flex items-center justify-center gap-2 mt-1 p-2.5 rounded-2xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-[10px] font-black uppercase tracking-widest transition-all"
                 >
                   <Icons.Lock size={14} />
                   Sign Out
                 </button>
              </div>
           </div>
        </div>
      </aside>
    </>
  );
}
