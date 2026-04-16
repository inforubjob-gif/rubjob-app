"use client";

import { useState, useEffect } from "react";
import { Icons } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useAdmin } from "@/components/providers/AdminProvider";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function SettingsAdminPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"admins" | "system" | "profile">("system");
  const { admin, refreshAdmin } = useAdmin();
  
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
      const data = await res.json();
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
        const data = await res.json();
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
        const data = await res.json();
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
      const data = await res.json();
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
      const data = await res.json();
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
        <div className="w-fit bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-400">
            {t("admin.nav.settings")} v2.5
        </div>
      </header>
      
      <div className="flex bg-slate-100 p-1.5 rounded-[2rem] w-full sm:w-fit overflow-x-auto no-scrollbar whitespace-nowrap">
        <button 
          onClick={() => setActiveTab("system")}
          className={`flex-1 sm:flex-none px-6 md:px-8 py-3.5 text-xs md:text-sm font-black rounded-[1.75rem] transition-all ${activeTab === 'system' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className="flex items-center justify-center gap-2">
            <Icons.Settings size={18} />
            {t("admin.settings.tabSystem")}
          </div>
        </button>
        <button 
          onClick={() => setActiveTab("admins")}
          className={`flex-1 sm:flex-none px-6 md:px-8 py-3.5 text-xs md:text-sm font-black rounded-[1.75rem] transition-all ${activeTab === 'admins' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className="flex items-center justify-center gap-2">
            <Icons.User size={18} />
            {t("admin.settings.tabAdmins")}
          </div>
        </button>
        <button 
          onClick={() => setActiveTab("profile")}
          className={`flex-1 sm:flex-none px-6 md:px-8 py-3.5 text-xs md:text-sm font-black rounded-[1.75rem] transition-all ${activeTab === 'profile' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
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
        <div className={`p-5 rounded-3xl font-bold text-sm animate-fade-in flex items-center gap-3 border shadow-sm ${error ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${error ? 'bg-rose-100' : 'bg-emerald-100'}`}>
             {error ? <Icons.Close size={18} /> : <Icons.Check size={18} />}
          </div>
          {error || success}
        </div>
      )}

      {activeTab === "admins" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in relative z-10">
          <div className="lg:col-span-1">
            <Card className="p-8 bg-white border border-slate-100 shadow-xl rounded-[2.5rem] sticky top-8">
              <h3 className="text-xl font-black text-slate-900 mb-6 font-sans">{t("admin.settings.authTitle")}</h3>
              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">{t("admin.settings.authLabelName")}</label>
                  <input type="text" value={newAdmin.name} onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} placeholder={t("admin.settings.authLabelName")} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">{t("admin.settings.authLabelEmail")}</label>
                  <input type="email" value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} placeholder="admin@email.com" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">{t("admin.settings.authLabelPassword")}</label>
                  <input type="password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} placeholder="••••••••" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all font-mono" />
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">{t("admin.settings.authLabelRole")}</label>
                  <select 
                    value={newAdmin.role} 
                    onChange={e => setNewAdmin({...newAdmin, role: e.target.value as any})}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold shadow-sm outline-none appearance-none"
                  >
                    <option value="admin">{t("admin.settings.authRoleStandard")}</option>
                    <option value="super_admin">{t("admin.settings.authRoleMaster")}</option>
                  </select>

                  {newAdmin.role === 'admin' && (
                    <div className="grid grid-cols-2 gap-2 mt-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                       {MODULES.map(mod => (
                         <button
                           key={mod.id}
                           type="button"
                           onClick={() => togglePermission(mod.id)}
                           className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${newAdmin.permissions.includes(mod.id) ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white text-slate-400 border border-slate-100'}`}
                         >
                           {newAdmin.permissions.includes(mod.id) ? <Icons.Check size={12} /> : <div className="w-3 h-3 rounded-md border border-slate-200" />}
                           {mod.label}
                         </button>
                       ))}
                    </div>
                  )}
                </div>

                <button disabled={isSaving} className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 uppercase tracking-widest">
                  {isSaving ? t("admin.settings.authBtnAuthorizing") : t("admin.settings.authBtnGrant")}
                </button>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-xl font-black text-slate-900 mb-6 px-2">{t("admin.settings.agentsTitle")}</h3>
            {isLoading ? (
               <div className="p-20 flex justify-center bg-white rounded-[2.5rem] border border-slate-50 shadow-sm">
                  <div className="w-10 h-10 border-4 border-slate-100 border-t-primary rounded-full animate-spin" />
               </div>
            ) : (
               <div className="space-y-4 pb-20">
                  {admins.map(adminItem => {
                    const permissions = adminItem.permissions ? JSON.parse(adminItem.permissions) : [];
                    return (
                      <Card key={adminItem.id} className="p-6 bg-white border border-slate-100 flex items-center justify-between group rounded-[2.5rem] hover:shadow-2xl hover:shadow-slate-100 transition-all">
                         <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shadow-inner overflow-hidden border border-indigo-100 ring-4 ring-slate-50">
                               {adminItem.avatarUrl ? <img src={adminItem.avatarUrl} className="w-full h-full object-cover" /> : adminItem.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                               <div className="flex items-center gap-3">
                                  <p className="font-black text-slate-900 tracking-tight text-lg">{adminItem.name}</p>
                                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${adminItem.role === 'super_admin' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                    {adminItem.role === 'super_admin' ? t("admin.settings.authRoleMaster").split(' (')[0] : t("admin.settings.authRoleStandard")}
                                  </span>
                               </div>
                               <p className="text-xs text-slate-400 font-bold mb-2">{adminItem.email}</p>
                               <div className="flex flex-wrap gap-1.5">
                                  {adminItem.role === 'super_admin' ? (
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] px-1">Unrestricted Intelligence Bound</span>
                                  ) : (
                                    permissions.map((p: string) => (
                                      <span key={p} className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[9px] font-black uppercase rounded-lg border border-slate-100">{p}</span>
                                    ))
                                  )}
                               </div>
                            </div>
                         </div>
                         {admin?.id !== adminItem.id && (
                           <button onClick={() => handleDeleteAdmin(adminItem.id, adminItem.email)} className="p-4 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100">
                              <Icons.Trash size={20} />
                           </button>
                         )}
                      </Card>
                    );
                  })}
               </div>
            )}
          </div>
        </div>
      ) : activeTab === "profile" ? (
        <div className="max-w-3xl mx-auto animate-fade-in relative z-10">
           <Card className="p-10 bg-white border border-slate-100 shadow-2xl rounded-[3rem] overflow-hidden">
              <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
                 <div className="relative group">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-slate-50 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden ring-1 ring-slate-100">
                       {profileForm.avatarUrl ? <img src={profileForm.avatarUrl} className="w-full h-full object-cover" /> : <Icons.User size={48} className="text-slate-200" />}
                    </div>
                    <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg border-4 border-white cursor-pointer hover:scale-110 active:scale-95 transition-all">
                       <Icons.Camera size={18} />
                       <input 
                         type="file" 
                         className="hidden" 
                         accept="image/*"
                         onChange={handleImageUpload}
                       />
                    </label>
                 </div>
                 <div className="text-center md:text-left">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{admin?.name}</h2>
                    <p className="text-slate-400 font-bold flex items-center justify-center md:justify-start gap-2 mt-1 uppercase text-xs tracking-widest">
                       <Badge variant={admin?.role === 'super_admin' ? 'danger' : 'info'}>{admin?.role === 'super_admin' ? t("admin.settings.authRoleMaster").split(' (')[0] : t("admin.settings.authRoleStandard")}</Badge>
                       <span className="w-1 h-1 rounded-full bg-slate-300" />
                       {admin?.email}
                    </p>
                 </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("admin.settings.profileLabelPersona")}</label>
                       <input type="text" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4.5 text-sm font-black focus:border-primary transition-all outline-none" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("admin.settings.authLabelEmail")}</label>
                       <input type="email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4.5 text-sm font-black focus:border-primary transition-all outline-none" />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Avatar Image URL (Optional)</label>
                    <input type="text" value={profileForm.avatarUrl} onChange={e => setProfileForm({...profileForm, avatarUrl: e.target.value})} placeholder="https://..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4.5 text-sm font-black focus:border-primary transition-all outline-none" />
                 </div>

                 <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                       <Icons.Lock size={16} className="text-slate-400" />
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("admin.settings.profileLabelSecurity")}</span>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("admin.settings.profileLabelNewPassword")}</label>
                       <input type="password" value={profileForm.password} onChange={e => setProfileForm({...profileForm, password: e.target.value})} placeholder="••••••••" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4.5 text-sm font-black focus:border-primary transition-all outline-none" />
                    </div>
                 </div>

                 <button disabled={isSaving} className="w-full bg-primary text-white py-5 rounded-2xl font-black text-sm shadow-2xl shadow-primary/30 hover:scale-[1.01] active:scale-[0.98] transition-all uppercase tracking-[0.2em]">
                    {isSaving ? t("admin.settings.profileUpdating") : t("admin.settings.profileBtnUpdate")}
                 </button>
              </form>
           </Card>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in relative z-10">
          <section className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-xl shadow-slate-200/20">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                <Icons.Settings size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t("admin.settings.systemOpsTitle")}</h2>
                <p className="text-sm text-slate-400 font-medium">{t("admin.settings.systemOpsSub")}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t("admin.settings.systemLabelStatus")}</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-3xl">
                   <button 
                     onClick={() => updateLocalSetting("is_open", "true")}
                     className={`py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${getSetting("is_open") === "true" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400"}`}
                   >
                     {t("admin.settings.systemStatusOnline")}
                   </button>
                   <button 
                     onClick={() => updateLocalSetting("is_open", "false")}
                     className={`py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${getSetting("is_open") === "false" ? "bg-white text-rose-600 shadow-sm" : "text-slate-400"}`}
                   >
                     {t("admin.settings.systemStatusOffline")}
                   </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t("admin.settings.systemLabelRadius")}</label>
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-200/50 rounded-xl flex items-center justify-center text-slate-500">
                    <Icons.MapPin size={20} />
                  </div>
                  <input 
                    type="number" 
                    className="w-full bg-slate-50 border-none rounded-[1.75rem] pl-20 pr-6 py-5 text-xl text-slate-900 font-black focus:ring-4 focus:ring-primary/10 transition-all font-mono"
                    placeholder="5"
                    value={getSetting("radius_km")}
                    onChange={(e) => updateLocalSetting("radius_km", e.target.value)}
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-sm uppercase">KM</div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-[100px] -mr-32 -mt-32" />
            <div className="flex items-center gap-4 mb-10 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                <Icons.Wallet size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t("admin.settings.financeTitle")}</h2>
                <p className="text-sm text-slate-400 font-medium">{t("admin.settings.financeSub")}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 mb-10">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t("admin.settings.financeLabelStoreGP")}</label>
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-600 font-black text-lg">%</div>
                  <input 
                    type="number" 
                    className="w-full bg-indigo-50/30 border-none rounded-[1.5rem] pl-14 pr-6 py-5 text-2xl text-slate-900 font-black focus:ring-4 focus:ring-indigo-100 font-mono"
                    placeholder="20"
                    value={getSetting("gp_store_percent")}
                    onChange={(e) => updateLocalSetting("gp_store_percent", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t("admin.settings.financeLabelRiderGP")}</label>
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-orange-600 font-black text-lg">%</div>
                  <input 
                    type="number" 
                    className="w-full bg-orange-50/30 border-none rounded-[1.5rem] pl-14 pr-6 py-5 text-2xl text-slate-900 font-black focus:ring-4 focus:ring-orange-100 font-mono"
                    placeholder="10"
                    value={getSetting("gp_rider_percent")}
                    onChange={(e) => updateLocalSetting("gp_rider_percent", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t("admin.settings.financeLabelBasePayout")}</label>
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-lg">฿</div>
                  <input 
                    type="number" 
                    className="w-full bg-emerald-50/30 border-none rounded-[1.5rem] pl-14 pr-6 py-5 text-2xl text-slate-900 font-black focus:ring-4 focus:ring-emerald-100 font-mono"
                    placeholder="25"
                    value={getSetting("rider_base_payout")}
                    onChange={(e) => updateLocalSetting("rider_base_payout", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Floating Save Bar for System Settings */}
      {activeTab === 'system' && (
        <div className={`fixed bottom-8 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:right-auto z-50 transition-all duration-500 ${hasChanges ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-95 pointer-events-none'}`}>
            <div className="bg-slate-900 border border-white/10 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.6)] rounded-[2rem] md:rounded-full px-4 md:px-5 py-3 md:py-4 flex flex-col md:flex-row items-center gap-4 md:gap-8 backdrop-blur-2xl">
               <div className="flex items-center gap-3 md:pl-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-400 rounded-xl md:rounded-2xl flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(251,191,36,0.3)] shrink-0">
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
                  className="bg-primary text-white h-12 md:h-14 px-8 md:px-12 rounded-xl md:rounded-[1.25rem] font-black text-xs md:text-sm shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group w-full md:w-auto"
               >
                  {isSaving ? <Icons.Refresh size={18} className="animate-spin" /> : <span className="uppercase tracking-widest">{t("admin.settings.floatingBtnDeploy")}</span>}
               </button>
            </div>
        </div>
      )}
    </div>
  );
}
