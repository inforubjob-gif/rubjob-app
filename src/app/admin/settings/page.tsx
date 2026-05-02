"use client";

import { useState, useEffect } from "react";
import { Icons } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useAdmin } from "@/components/providers/AdminProvider";
import { useTranslation } from "@/components/providers/LanguageProvider";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SettingsContent() {
  const { t, language, setLanguage } = useTranslation();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as any) || "system";
  
  const [activeTab, setActiveTab] = useState<"admins" | "system" | "profile">(initialTab);
  const { admin, refreshAdmin, logout } = useAdmin();
  
  const [admins, setAdmins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin",
    permissions: ["dashboard", "orders", "users"]
  });

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    avatarUrl: "",
    password: ""
  });

  const MODULES = [
    { id: "dashboard", label: t("admin.nav.dashboard") },
    { id: "orders", label: t("admin.nav.orders") },
    { id: "users", label: t("admin.nav.users") },
    { id: "stores", label: t("admin.nav.stores") },
    { id: "riders", label: t("admin.nav.riders") },
    { id: "coupons", label: t("admin.nav.coupons") },
    { id: "finance", label: t("admin.nav.finance") },
    { id: "support", label: t("admin.nav.support") },
    { id: "settings", label: t("admin.nav.settings") },
  ];

  useEffect(() => {
    fetchAdmins();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (admin) {
      setProfileForm({
        name: admin.name || "",
        email: admin.email || "",
        avatarUrl: admin.avatarUrl || "",
        password: ""
      });
    }
  }, [admin]);

  async function fetchAdmins() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/admins");
      const data = await res.json() as any;
      if (data.admins) setAdmins(data.admins);
    } catch (err) {
      setError(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  }

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) {
      setError(t("admin.users.deleteError") || "Missing fields"); // Fallback check
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAdmin)
      });
      if (res.ok) {
        setSuccess(t("admin.settings.profileSuccess"));
        setNewAdmin({ name: "", email: "", password: "", role: "admin", permissions: ["dashboard", "orders", "users"] });
        fetchAdmins();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const data = await res.json() as any;
        setError(data.error || t("common.error"));
      }
    } catch (err) {
      setError(t("common.error"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/admins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: admin?.id, 
          ...profileForm,
          password: profileForm.password || undefined
        })
      });
      if (res.ok) {
        setSuccess(t("admin.settings.profileSuccess"));
        await refreshAdmin();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const data = await res.json() as any;
        setError(data.error || t("common.error"));
      }
    } catch (err) {
      setError(t("common.error"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    setSuccess(t("common.loading"));
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json() as any;
      if (res.ok && data.url) {
        setProfileForm(prev => ({ ...prev, avatarUrl: data.url }));
        setSuccess(t("common.success"));
        setTimeout(() => setSuccess(""), 2000);
      } else {
        setError(data.error || t("common.error"));
      }
    } catch (err) {
      setError(t("common.error"));
    } finally {
      setIsSaving(false);
    }
  };

  const togglePermission = (id: string) => {
    setNewAdmin(prev => ({
      ...prev,
      permissions: prev.permissions.includes(id) 
        ? prev.permissions.filter(p => p !== id) 
        : [...prev.permissions, id]
    }));
  };

  const handleDeleteAdmin = async (id: string, email: string) => {
    if (!confirm(t("admin.users.deleteConfirm").replace("{name}", email))) return;
    try {
      const res = await fetch("/api/admin/admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setSuccess(t("admin.settings.agentsDeauthorized"));
        fetchAdmins();
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      setError(t("common.error"));
    }
  };

  // System Settings State
  const [systemSettings, setSystemSettings] = useState<any[]>([]);
  const [localSettings, setLocalSettings] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json() as any;
      if (data.settings) {
        setSystemSettings(data.settings);
        const settingsMap: Record<string, any> = {};
        data.settings.forEach((s: any) => {
          settingsMap[s.key] = s.value;
        });
        setLocalSettings(settingsMap);
        setHasChanges(false);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  }

  const updateLocalSetting = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(localSettings).map(([key, value]) => ({
        key,
        value: String(value)
      }));
      
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (res.ok) {
        setHasChanges(false);
        setSuccess(t("admin.settings.floatingBtnDeploy") + " " + t("common.success"));
        setTimeout(() => setSuccess(""), 3000);
        fetchSettings();
      } else {
        setError(t("common.error"));
      }
    } catch (err) {
      setError(t("common.error"));
    } finally {
      setIsSaving(false);
    }
  };

  const getSetting = (key: string) => localSettings[key] || "";

  return (
    <div className="space-y-8 max-w-5xl pb-40">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             {activeTab === 'profile' ? <Icons.User size={36} className="text-primary" /> : <Icons.Settings size={36} className="text-primary" />}
             {activeTab === 'profile' ? t("admin.settings.profileTitle") : t("admin.settings.engineTitle")}
          </h1>
          <p className="text-slate-500 text-sm md:text-base font-medium tracking-tight">
             {activeTab === 'profile' ? t("admin.settings.profileSub") : t("admin.settings.engineSub")}
          </p>
        </div>
        <div className="w-fit bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-400">
            {t("admin.nav.settings")} v2.5
        </div>
      </header>
      
      <div className="flex bg-slate-100 p-1.5 rounded-xl w-full sm:w-fit overflow-x-auto no-scrollbar whitespace-nowrap">
        <button 
          onClick={() => setActiveTab("system")}
          className={`flex-1 sm:flex-none px-6 md:px-8 py-3.5 text-xs md:text-sm font-black rounded-xl transition-all ${activeTab === 'system' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className="flex items-center justify-center gap-2">
            <Icons.Settings size={18} />
            {t("admin.settings.tabSystem")}
          </div>
        </button>
        <button 
          onClick={() => setActiveTab("admins")}
          className={`flex-1 sm:flex-none px-6 md:px-8 py-3.5 text-xs md:text-sm font-black rounded-xl transition-all ${activeTab === 'admins' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className="flex items-center justify-center gap-2">
            <Icons.User size={18} />
            {t("admin.settings.tabAdmins")}
          </div>
        </button>
        <button 
          onClick={() => setActiveTab("profile")}
          className={`flex-1 sm:flex-none px-6 md:px-8 py-3.5 text-xs md:text-sm font-black rounded-xl transition-all ${activeTab === 'profile' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className="flex items-center justify-center gap-2">
             <div className="w-5 h-5 rounded-full bg-slate-200 border border-slate-300 overflow-hidden ring-2 ring-white">
                {admin?.avatarUrl ? <img src={admin.avatarUrl} className="w-full h-full object-cover" /> : <Icons.User size={14} />}
             </div>
             {t("admin.settings.tabProfile")}
          </div>
        </button>
      </div>

      {(error || success) && (
        <div className={`p-5 rounded-xl font-bold text-sm animate-fade-in flex items-center gap-3 border shadow-sm ${error ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${error ? 'bg-rose-100' : 'bg-emerald-100'}`}>
             {error ? <Icons.Close size={18} /> : <Icons.Check size={18} />}
          </div>
          {error || success}
        </div>
      )}

      {activeTab === "admins" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in relative z-10 pb-20">
          <div className="lg:col-span-4">
            <Card className="p-8 bg-white border border-slate-100 shadow-2xl rounded-xl sticky top-8">
              <div className="flex items-center gap-3 mb-8">
                 <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icons.User size={20} />
                 </div>
                 <h3 className="text-xl font-black text-slate-900 tracking-tight">{t("admin.settings.authTitle")}</h3>
              </div>
              
              <form onSubmit={handleAddAdmin} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">{t("admin.settings.authLabelName")}</label>
                    <input type="text" value={newAdmin.name} onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} placeholder={t("admin.settings.authLabelName")} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-black focus:border-primary transition-all outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">{t("admin.settings.authLabelEmail")}</label>
                    <input type="email" value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} placeholder="admin@email.com" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-black focus:border-primary transition-all outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">{t("admin.settings.authLabelPassword")}</label>
                    <input type="password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} placeholder="••••••••" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-black focus:border-primary transition-all outline-none" />
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">{t("admin.settings.authLabelRole")}</label>
                  <div className="flex gap-2">
                     {(['admin', 'super_admin'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setNewAdmin({...newAdmin, role: r})}
                          className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl border transition-all ${newAdmin.role === r ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                        >
                          {r === 'super_admin' ? 'Super' : 'Staff'}
                        </button>
                      ))}
                  </div>

                  {newAdmin.role === 'admin' && (
                    <div className="space-y-3">
                       <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">{t("admin.settings.modulePermissions")}</p>
                       <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                          {MODULES.map(mod => (
                            <button
                              key={mod.id}
                              type="button"
                              onClick={() => togglePermission(mod.id)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${newAdmin.permissions.includes(mod.id) ? 'bg-white text-primary shadow-sm border border-primary/10' : 'text-slate-400 hover:text-slate-500'}`}
                            >
                              <div className={`w-3 h-3 rounded-md border flex items-center justify-center ${newAdmin.permissions.includes(mod.id) ? 'bg-primary border-primary text-white' : 'border-slate-300'}`}>
                                 {newAdmin.permissions.includes(mod.id) && <Icons.Check size={8} />}
                              </div>
                              <span className="truncate">{mod.label}</span>
                            </button>
                          ))}
                       </div>
                    </div>
                  )}
                </div>

                <button disabled={isSaving} className="w-full bg-primary text-white py-5 rounded-xl font-black text-sm shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 uppercase tracking-[0.2em]">
                  {isSaving ? t("admin.settings.authBtnAuthorizing") : t("admin.settings.authBtnGrant")}
                </button>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-8 px-2">
               <h3 className="text-xl font-black text-slate-900 tracking-tight">{t("admin.settings.agentsTitle")}</h3>
               <div className="px-4 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
                  {admins.length} {t("admin.settings.personnelActive")}
               </div>
            </div>
            
            {isLoading ? (
               <div className="p-20 flex justify-center bg-white rounded-xl border border-slate-100 shadow-sm border-dashed">
                  <div className="w-10 h-10 border-4 border-slate-100 border-t-primary rounded-full animate-spin" />
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                  {admins.map(adminItem => {
                    const permissions = adminItem.permissions ? JSON.parse(adminItem.permissions) : [];
                    const isSelf = admin?.id === adminItem.id;
                    const isSuper = adminItem.role === 'super_admin';

                    return (
                      <Card key={adminItem.id} className="p-7 bg-white border border-slate-100 flex flex-col group rounded-xl hover:shadow-2xl hover:shadow-slate-200/50 transition-all relative overflow-hidden">
                         <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl -mr-12 -mt-12 transition-colors ${isSuper ? 'bg-rose-500/10' : 'bg-primary/10'}`} />
                         
                         <div className="flex items-start justify-between mb-6 relative z-10">
                            <div className="flex items-center gap-4">
                               <div className={`w-16 h-16 rounded-xl flex items-center justify-center font-black shadow-inner overflow-hidden border-4 border-white ring-1 ring-slate-100 ${isSuper ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                  {adminItem.avatarUrl ? <img src={adminItem.avatarUrl} className="w-full h-full object-cover" /> : adminItem.name?.[0]?.toUpperCase()}
                               </div>
                               <div>
                                  <div className="flex items-center gap-2 mb-1">
                                     <p className="font-black text-slate-900 tracking-tight">{adminItem.name}</p>
                                     {isSelf && <div className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-md text-[8px] font-black uppercase">{t("admin.settings.you")}</div>}
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{adminItem.email}</p>
                               </div>
                            </div>
                            
                            {!isSelf && (
                              <button onClick={() => handleDeleteAdmin(adminItem.id, adminItem.email)} className="w-10 h-10 bg-slate-50 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all flex items-center justify-center">
                                 <Icons.Trash size={16} />
                              </button>
                            )}
                         </div>

                         <div className="pt-6 border-t border-slate-50 relative z-10">
                            <div className="flex items-center justify-between mb-3">
                               <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{t("admin.settings.authorityLevel")}</span>
                               <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${isSuper ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'}`}>
                                 {isSuper ? t("admin.settings.authRoleMaster").split(' (')[0] : t("admin.settings.authRoleStandard")}
                               </span>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                               {isSuper ? (
                                 <div className="flex items-center gap-2 py-1 px-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                                    <Icons.Lock size={12} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">{t("admin.settings.unrestricted")}</span>
                                 </div>
                               ) : (
                                 permissions.length > 0 ? (
                                   permissions.map((p: string) => (
                                     <span key={p} className="px-2.5 py-1 bg-slate-50 text-slate-500 text-[9px] font-black uppercase rounded-lg border border-slate-100 group-hover:bg-white group-hover:border-slate-200 transition-colors">{p}</span>
                                   ))
                                 ) : (
                                   <span className="text-[9px] font-black text-rose-400 italic">{t("admin.settings.noModules")}</span>
                                 )
                               )}
                            </div>
                         </div>
                      </Card>
                    );
                  })}
               </div>
            )}
          </div>
        </div>
      ) : activeTab === "profile" ? (
        <div className="max-w-4xl mx-auto animate-fade-in relative z-10 pb-20">
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Identity Sidebar */}
              <div className="lg:col-span-4 transition-all">
                 <Card className="p-8 bg-white border border-slate-100 shadow-2xl rounded-xl text-center sticky top-8 relative overflow-hidden group">
                    <div className={`absolute top-0 left-0 w-full h-2 ${admin?.role === 'super_admin' ? 'bg-rose-500' : 'bg-primary'}`} />
                    
                    <div className="relative inline-block mb-6 pt-4">
                       <div className={`w-32 h-32 rounded-xl bg-slate-50 border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden ring-4 ${admin?.role === 'super_admin' ? 'ring-rose-50' : 'ring-primary/5'}`}>
                          {profileForm.avatarUrl ? <img src={profileForm.avatarUrl} className="w-full h-full object-cover" /> : <Icons.User size={48} className="text-slate-200" />}
                       </div>
                       <label className={`absolute -bottom-2 -right-2 w-10 h-10 ${admin?.role === 'super_admin' ? 'bg-rose-500' : 'bg-primary'} text-white rounded-xl flex items-center justify-center shadow-xl border-4 border-white cursor-pointer hover:scale-110 active:scale-95 transition-all`}>
                          <Icons.Camera size={18} />
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                       </label>
                    </div>

                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">{admin?.name}</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">{admin?.email}</p>
                    
                    <div className="flex flex-col gap-2">
                       <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${admin?.role === 'super_admin' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                          {admin?.role === 'super_admin' ? t("admin.settings.authRoleMaster").split(' (')[0] : t("admin.settings.authRoleStandard")}
                       </span>
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-50 space-y-4">
                       <div className="flex items-center justify-between px-2">
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{t("admin.settings.accountStatus")}</span>
                          <span className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                             {t("admin.settings.verified")}
                          </span>
                       </div>
                       <div className="flex items-center justify-between px-2">
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{t("admin.settings.language")}</span>
                          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{language === 'th' ? 'TH (ไทย)' : 'EN (Global)'}</span>
                       </div>
                    </div>
                 </Card>
              </div>

              {/* Main Content Areas */}
              <div className="lg:col-span-8 flex flex-col gap-8">
                 {/* Identity & Preferences */}
                 <Card className="p-10 bg-white border border-slate-100 shadow-xl rounded-xl">
                    <div className="flex items-center gap-3 mb-10">
                       <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                          <Icons.Settings size={20} />
                       </div>
                       <h3 className="text-xl font-black text-slate-900 tracking-tight">{t("admin.settings.credentials")}</h3>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("admin.settings.profileLabelPersona")}</label>
                             <input type="text" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-6 py-4 text-sm font-black focus:border-primary transition-all outline-none" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("admin.settings.authLabelEmail")}</label>
                             <input type="email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-6 py-4 text-sm font-black focus:border-primary transition-all outline-none" />
                          </div>
                       </div>

                       <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("admin.settings.languagePrefs")}</label>
                          <div className="grid grid-cols-2 gap-4">
                             {(['th', 'en'] as const).map((l) => (
                               <button
                                 key={l}
                                 type="button"
                                 onClick={() => setLanguage(l)}
                                 className={`flex items-center justify-center gap-3 py-4 text-[10px] font-black uppercase rounded-xl border-2 transition-all ${language === l ? 'bg-primary/5 text-primary border-primary shadow-sm' : 'bg-white text-slate-300 border-slate-100 hover:border-slate-200'}`}
                               >
                                 <div className={`w-3 h-3 rounded-full border-2 transition-all ${language === l ? 'bg-primary border-primary ring-4 ring-primary/10' : 'bg-white border-slate-200'}`} />
                                 {l === 'th' ? 'ไทย (TH)' : 'English (EN)'}
                               </button>
                             ))}
                          </div>
                       </div>

                       <div className="space-y-6 pt-8 border-t border-slate-50">
                          <div className="flex items-center gap-2 mb-4">
                             <Icons.Lock size={16} className="text-slate-400" />
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("admin.settings.profileLabelSecurity")}</span>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("admin.settings.profileLabelNewPassword")}</label>
                             <input type="password" value={profileForm.password} onChange={e => setProfileForm({...profileForm, password: e.target.value})} placeholder="••••••••" className="w-full bg-slate-100/50 border-2 border-slate-100 rounded-xl px-6 py-4 text-sm font-black focus:border-primary transition-all outline-none" />
                          </div>
                       </div>

                       <div className="flex items-center gap-4 pt-6">
                          <button disabled={isSaving} className="flex-1 bg-primary text-white py-5 rounded-xl font-black text-xs shadow-2xl shadow-primary/30 hover:scale-[1.01] active:scale-[0.98] transition-all uppercase tracking-[0.2em] relative overflow-hidden group">
                             <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                             {isSaving ? t("admin.settings.profileUpdating") : t("admin.settings.profileBtnUpdate")}
                          </button>
                          
                          <button 
                            type="button"
                            onClick={logout}
                            className="bg-rose-50 text-rose-500 px-6 py-5 rounded-xl font-black text-[10px] uppercase tracking-widest border border-rose-100 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                          >
                             {t("rider.profile.logout")}
                          </button>
                       </div>
                    </form>
                 </Card>
              </div>
           </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in relative z-10 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Platform Status Card */}
            <Card className="p-10 bg-white border border-slate-100 shadow-xl rounded-xl relative overflow-hidden group">
               <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] -mr-16 -mt-16 transition-all duration-700 ${getSetting("is_open") === "true" ? "bg-emerald-500/20 group-hover:bg-emerald-500/30" : "bg-rose-500/20 group-hover:bg-rose-500/30"}`} />
               
               <div className="flex items-center gap-4 mb-10 relative z-10">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-inner ${getSetting("is_open") === "true" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                    <Icons.Settings size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">{t("admin.settings.systemOpsTitle")}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                       <div className={`w-2 h-2 rounded-full ${getSetting("is_open") === "true" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("admin.settings.liveInfras")}</p>
                    </div>
                  </div>
               </div>

               <div className="space-y-8 relative z-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("admin.settings.systemLabelStatus")}</label>
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                       <button 
                         onClick={() => updateLocalSetting("is_open", "true")}
                         className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${getSetting("is_open") === "true" ? "bg-white text-emerald-600 shadow-lg shadow-emerald-500/10 border border-emerald-100" : "text-slate-400 hover:text-slate-500"}`}
                       >
                         {t("admin.settings.systemStatusOnline")}
                       </button>
                       <button 
                         onClick={() => updateLocalSetting("is_open", "false")}
                         className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${getSetting("is_open") === "false" ? "bg-white text-rose-600 shadow-lg shadow-rose-500/10 border border-rose-100" : "text-slate-400 hover:text-slate-500"}`}
                       >
                         {t("admin.settings.systemStatusOffline")}
                       </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("admin.settings.systemLabelRadius")}</label>
                    <div className="flex items-center gap-4">
                       <div className="flex-1 relative">
                          <input 
                            type="number" 
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-6 pr-16 py-4.5 text-xl text-slate-900 font-black focus:border-primary transition-all outline-none font-mono"
                            placeholder="5"
                            value={getSetting("radius_km")}
                            onChange={(e) => updateLocalSetting("radius_km", e.target.value)}
                          />
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs uppercase">{t("admin.settings.km")}</div>
                       </div>
                       <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                          <Icons.MapPin size={20} />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-50">
                    <div className="flex items-center justify-between">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">โหมดตัวคูณราคา (Surge Pricing)</label>
                       <div 
                         onClick={() => updateLocalSetting("surge_enabled", getSetting("surge_enabled") === "true" ? "false" : "true")}
                         className={`w-12 h-6 rounded-full transition-all cursor-pointer relative ${getSetting("surge_enabled") === "true" ? "bg-amber-400" : "bg-slate-200"}`}
                       >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${getSetting("surge_enabled") === "true" ? "left-7" : "left-1"}`} />
                       </div>
                    </div>
                    {getSetting("surge_enabled") === "true" && (
                       <div className="flex items-center gap-4 animate-in slide-in-from-top-2 duration-300">
                          <div className="flex-1 relative">
                             <input 
                               type="number" 
                               step="0.1"
                               className="w-full bg-amber-50 border-2 border-amber-100 rounded-xl pl-6 pr-12 py-3 text-lg text-amber-900 font-black focus:border-amber-400 outline-none transition-all"
                               placeholder="1.2"
                               value={getSetting("surge_multiplier")}
                               onChange={(e) => updateLocalSetting("surge_multiplier", e.target.value)}
                             />
                             <div className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400 font-black text-sm">×</div>
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 leading-tight">เพิ่มราคาอัตโนมัติ<br/>กระตุ้นพาร์ทเนอร์</div>
                       </div>
                    )}
                  </div>
               </div>
            </Card>

            {/* Finance Card */}
            <Card className="p-10 bg-white border border-slate-100 shadow-xl rounded-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[80px] -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-all duration-700" />
               
               <div className="flex items-center gap-4 mb-10 relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                    <Icons.Wallet size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">{t("admin.settings.financeTitle")}</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{t("admin.settings.financeSub")}</p>
                  </div>
               </div>

               <div className="space-y-8 relative z-10">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("admin.settings.financeLabelStoreGP")}</label>
                        <span className="text-[10px] font-black text-indigo-500">{t("admin.settings.profit")}</span>
                      </div>
                      <div className="relative group/input">
                        <input 
                          type="number" 
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-6 py-4.5 text-2xl text-slate-900 font-black focus:border-indigo-500 transition-all outline-none font-mono text-center"
                          placeholder="20"
                          value={getSetting("gp_store_percent")}
                          onChange={(e) => updateLocalSetting("gp_store_percent", e.target.value)}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-600 font-black text-lg opacity-30">%</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("admin.settings.financeLabelRiderGP")}</label>
                        <span className="text-[10px] font-black text-orange-500">{t("admin.settings.share")}</span>
                      </div>
                      <div className="relative group/input">
                        <input 
                          type="number" 
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-6 py-4.5 text-2xl text-slate-900 font-black focus:border-orange-500 transition-all outline-none font-mono text-center"
                          placeholder="10"
                          value={getSetting("gp_rider_percent")}
                          onChange={(e) => updateLocalSetting("gp_rider_percent", e.target.value)}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-600 font-black text-lg opacity-30">%</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("admin.settings.financeLabelBasePayout")}</label>
                    <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-xl">฿</div>
                      <input 
                        type="number" 
                        className="w-full bg-emerald-50/30 border-2 border-emerald-100/50 rounded-xl pl-16 pr-6 py-6 text-3xl text-slate-900 font-black focus:border-emerald-500 transition-all outline-none font-mono"
                        placeholder="25"
                        value={getSetting("rider_base_payout")}
                        onChange={(e) => updateLocalSetting("rider_base_payout", e.target.value)}
                      />
                      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t("admin.settings.fixedRate")}</span>
                      </div>
                    </div>
                  </div>
               </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Stripe Card */}
            <Card className="p-10 bg-white border border-slate-100 shadow-xl rounded-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[80px] -mr-16 -mt-16 group-hover:bg-primary/20 transition-all duration-700" />
               
               <div className="flex items-center gap-4 mb-10 relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-primary/5 text-primary flex items-center justify-center shadow-inner">
                    <Icons.Payment size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">{t("admin.settings.stripeTitle")}</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{t("admin.settings.stripeSub")}</p>
                  </div>
               </div>

               <div className="space-y-6 relative z-10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("admin.settings.stripeLabelPublishableKey")}</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-6 py-4 text-sm text-slate-900 font-black focus:border-primary transition-all outline-none"
                      placeholder="pk_test_..."
                      value={getSetting("stripe_publishable_key")}
                      onChange={(e) => updateLocalSetting("stripe_publishable_key", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("admin.settings.stripeLabelSecretKey")}</label>
                    <input 
                      type="password" 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-6 py-4 text-sm text-slate-900 font-black focus:border-primary transition-all outline-none"
                      placeholder="sk_test_..."
                      value={getSetting("stripe_secret_key")}
                      onChange={(e) => updateLocalSetting("stripe_secret_key", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("admin.settings.stripeLabelWebhookSecret")}</label>
                    <input 
                      type="password" 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-6 py-4 text-sm text-slate-900 font-black focus:border-primary transition-all outline-none"
                      placeholder="whsec_..."
                      value={getSetting("stripe_webhook_secret")}
                      onChange={(e) => updateLocalSetting("stripe_webhook_secret", e.target.value)}
                    />
                  </div>
               </div>
            </Card>
          </div>
        </div>
      )}

      {/* Floating Save Bar for System Settings */}
      {activeTab === 'system' && (
        <div className={`fixed bottom-8 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:right-auto z-50 transition-all duration-500 ${hasChanges ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-95 pointer-events-none'}`}>
            <div className="bg-slate-900 border border-white/10 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.6)] rounded-xl md:rounded-full px-4 md:px-5 py-3 md:py-4 flex flex-col md:flex-row items-center gap-4 md:gap-8 backdrop-blur-2xl">
               <div className="flex items-center gap-3 md:pl-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-400 rounded-xl md:rounded-xl flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(251,191,36,0.3)] shrink-0">
                     <Icons.Settings size={20} className="text-slate-900" />
                  </div>
                  <div>
                     <p className="text-[10px] md:text-[11px] font-black text-white uppercase tracking-widest leading-none">{t("admin.settings.floatingUnsaved")}</p>
                     <p className="hidden md:block text-[9px] font-medium text-slate-400 mt-2">{t("admin.settings.floatingReady")}</p>
                  </div>
               </div>
               <button 
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="bg-primary text-white h-12 md:h-14 px-8 md:px-12 rounded-xl md:rounded-xl font-black text-xs md:text-sm shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group w-full md:w-auto"
               >
                  {isSaving ? <Icons.Refresh size={18} className="animate-spin" /> : <span className="uppercase tracking-widest">{t("admin.settings.floatingBtnDeploy")}</span>}
               </button>
            </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsAdminPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-32">
        <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin shadow-lg" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
