"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "@/components/ui/Icons";

export default function AdminSidebar() {
  const pathname = usePathname();

  const NAV_ITEMS = [
    { label: "Dashboard", href: "/admin", icon: <Icons.Tasks size={20} /> },
    { label: "Orders", href: "/admin/orders", icon: <Icons.FileText size={20} /> },
    { label: "Users & Roles", href: "/admin/users", icon: <Icons.User size={20} /> },
    { label: "Stores", href: "/admin/stores", icon: <Icons.Office size={20} /> },
    { label: "Riders", href: "/admin/riders", icon: <Icons.Car size={20} /> },
    { label: "Coupons", href: "/admin/coupons", icon: <Icons.Ticket size={20} /> },
    { label: "Finance", href: "/admin/finance", icon: <Icons.Wallet size={20} /> },
    { label: "Settings", href: "/admin/settings", icon: <Icons.Settings size={20} /> },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 h-full border-r border-slate-800">
      <div className="h-24 flex items-center px-8 bg-slate-950/50 border-b border-white/5 shrink-0">
        <Icons.Logo size={36} variant="white" />
        <span className="ml-4 font-black text-white tracking-[0.2em] leading-tight uppercase">
          RUBJOB<br/>
          <span className="text-[10px] text-primary-light font-black">ADMIN PORTAL</span>
        </span>
      </div>
      
      <nav className="flex-1 px-5 py-6 space-y-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
           const isActive = item.href === "/admin" 
             ? pathname === "/admin" 
             : pathname.startsWith(item.href);
           
           return (
             <Link 
               key={item.href} 
               href={item.href}
               className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
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
  );
}
