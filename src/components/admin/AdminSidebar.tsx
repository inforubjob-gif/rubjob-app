"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdmin } from "@/components/providers/AdminProvider";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { Language, RUBJOB_I18N } from "@/lib/i18n";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { admin, logout, hasPermission } = useAdmin();
  const { t, language, setLanguage } = useTranslation();

  const NAV_ITEMS = [
    { label: t("admin.nav.dashboard"), href: "/", icon: <Icons.Tasks size={20} />, permission: "dashboard" },
    { label: t("admin.nav.orders"), href: "/orders", icon: <Icons.FileText size={20} />, permission: "orders" },
    { label: t("admin.nav.users"), href: "/users", icon: <Icons.User size={20} />, permission: "users" },
    { label: t("admin.nav.stores"), href: "/stores", icon: <Icons.Office size={20} />, permission: "stores" },
    { label: t("admin.nav.rubbers"), href: "/rubbers", icon: <Icons.Car size={20} />, permission: "rubbers" },
    { label: t("admin.nav.providers"), href: "/providers", icon: <Icons.Stars size={20} />, permission: "stores" },
    { label: "Reviews", href: "/reviews", icon: <Icons.Star size={20} />, permission: "support" },
    { label: "Broadcast", href: "/broadcast", icon: <Icons.Bell size={20} />, permission: "support" },
    { label: t("admin.nav.coupons"), href: "/coupons", icon: <Icons.Ticket size={20} />, permission: "coupons" },
    { label: t("admin.nav.finance"), href: "/finance", icon: <Icons.Wallet size={20} />, permission: "finance" },
    { label: t("admin.nav.support"), href: "/support", icon: <Icons.Chat size={20} />, permission: "support" },
  ].filter(item => hasPermission(item.permission));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[60] md:hidden transition-opacity duration-300 animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside 
        className={`fixed inset-y-0 left-0 z-[70] w-72 md:w-20 xl:w-72 bg-slate-900 text-slate-300 flex flex-col shrink-0 h-full border-r border-slate-800 transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="h-24 flex items-center justify-between md:justify-center xl:justify-between px-8 md:px-0 xl:px-8 bg-slate-950/50 border-b border-white/5 shrink-0">
          <div className="flex items-center">
            <Icons.Logo size={36} variant="white" />
            <span className="ml-4 font-black text-white tracking-[0.2em] leading-tight uppercase block md:hidden xl:block">
              RUBJOB<br/>
              <span className="text-[10px] text-primary-light font-black uppercase">{t("admin.nav.portal")}</span>
            </span>
          </div>
          
          <button 
            onClick={onClose}
            className="md:hidden p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white"
          >
            <Icons.Close size={20} />
          </button>
        </div>
        
        <nav className="flex-1 px-5 md:px-2 xl:px-5 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
          {NAV_ITEMS.map((item) => {
             const isActive = item.href === "/" 
               ? (pathname === "/" || pathname === "/admin")
               : (pathname === item.href || pathname.startsWith(item.href + "/"));
             
             return (
               <Link 
                 key={item.href} 
                 href={item.href}
                 title={item.label}
                 onClick={() => {
                   if (window.innerWidth < 768) onClose();
                 }}
                 className={`flex items-center gap-4 md:gap-0 xl:gap-4 px-4 md:px-0 xl:px-4 py-3.5 md:py-4 xl:py-3.5 md:justify-center xl:justify-start rounded-xl text-sm font-bold transition-all group ${
                   isActive 
                     ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                     : 'text-slate-400 hover:bg-white/5 hover:text-white'
                 }`}
               >
                 <span className={`${isActive ? "text-white" : "text-slate-500"} group-hover:scale-110 transition-transform`}>{item.icon}</span>
                 <span className="block md:hidden xl:block whitespace-nowrap">{item.label}</span>
               </Link>
             );
          })}
        </nav>

        {/* Unified Account & Settings Card */}
        <div className="p-4 md:p-2 xl:p-4 border-t border-white/5 bg-slate-950/20 shrink-0">
           <Link 
             href="/admin/settings?tab=profile"
             title={admin?.name}
             onClick={() => {
               if (window.innerWidth < 768) onClose();
             }}
             className={`block group bg-white/5 rounded-xl p-4 md:p-2 xl:p-4 border border-white/5 shadow-inner transition-all hover:bg-white/10 hover:border-white/10 ${pathname === '/admin/settings' ? 'ring-2 ring-primary ring-offset-2 ring-offset-slate-900 bg-white/10' : ''}`}
           >
              <div className="flex items-center justify-between md:justify-center xl:justify-between gap-3">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 md:w-10 md:h-10 xl:w-12 xl:h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary overflow-hidden shrink-0 shadow-lg group-hover:scale-105 transition-transform font-black">
                       {admin?.avatarUrl ? <img src={admin.avatarUrl} className="w-full h-full object-cover" /> : admin?.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 block md:hidden xl:block">
                       <p className="font-black text-white text-xs truncate uppercase tracking-tight leading-none mb-1.5">{admin?.name}</p>
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{admin?.role?.replace('_', ' ')}</span>
                       </div>
                    </div>
                 </div>
                 <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-primary group-hover:bg-primary/10 transition-all block md:hidden xl:block shrink-0">
                    <Icons.Settings size={18} />
                 </div>
              </div>
           </Link>
        </div>
      </aside>
    </>
  );
}
