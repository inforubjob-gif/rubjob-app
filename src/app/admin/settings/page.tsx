"use client";

import { useState, useEffect } from "react";
import { Icons } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";

export default function SettingsAdminPage() {
  const [activeTab, setActiveTab] = useState<"admins" | "system">("system"); // Default to system to see changes
  const [admins, setAdmins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin"
  });

  // System Settings State
  const [systemSettings, setSystemSettings] = useState<any[]>([]);
  const [localSettings, setLocalSettings] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchAdmins();
    fetchSettings();
  }, []);

  async function fetchAdmins() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.users) setAdmins(data.users);
    } catch (err) {
      setError("Failed to fetch admin list.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) {
      setError("Please fill in all fields.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAdmin)
      });
      if (res.ok) {
        setSuccess("Admin created successfully!");
        setNewAdmin({ name: "", email: "", password: "", role: "admin" });
        fetchAdmins();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create admin.");
      }
    } catch (err) {
      setError("Connection error.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAdmin = async (id: number, email: string) => {
    if (!confirm(`Are you sure you want to delete admin ${email}?`)) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess("Admin deleted.");
        fetchAdmins();
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      setError("Failed to delete admin.");
    }
  };

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
        setSuccess("System settings updated successfully!");
        setTimeout(() => setSuccess(""), 3000);
        fetchSettings();
      } else {
        setError("Failed to save settings.");
      }
    } catch (err) {
      setError("Connection error while saving settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const getSetting = (key: string) => localSettings[key] || "";

  return (
    <div className="space-y-8 max-w-5xl pb-40">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">System Settings</h1>
          <p className="text-slate-500 text-sm md:text-base font-medium tracking-tight">Manage authorized personnel and application configuration</p>
        </div>
        <div className="w-fit bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-400">
           Admin Engine v2.0
        </div>
      </header>
      
      {/* Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-[2rem] w-full sm:w-fit overflow-x-auto no-scrollbar whitespace-nowrap">
        <button 
          onClick={() => setActiveTab("system")}
          className={`flex-1 sm:flex-none px-6 md:px-8 py-3.5 text-xs md:text-sm font-black rounded-[1.75rem] transition-all ${activeTab === 'system' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className="flex items-center justify-center gap-2">
            <Icons.Settings size={18} />
            System
          </div>
        </button>
        <button 
          onClick={() => setActiveTab("admins")}
          className={`flex-1 sm:flex-none px-6 md:px-8 py-3.5 text-xs md:text-sm font-black rounded-[1.75rem] transition-all ${activeTab === 'admins' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className="flex items-center justify-center gap-2">
            <Icons.User size={18} />
            Admins
          </div>
        </button>
      </div>

      {(error || success) && (
        <div className={`p-5 rounded-3xl font-bold text-sm animate-fade-in flex items-center gap-3 ${error ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${error ? 'bg-rose-100' : 'bg-emerald-100'}`}>
             {error ? <Icons.Close size={18} /> : <Icons.Check size={18} />}
          </div>
          {error || success}
        </div>
      )}

      {activeTab === "admins" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          {/* Add Form */}
          <div className="lg:col-span-1">
            <Card className="p-8 bg-white border border-slate-100 shadow-xl rounded-[2.5rem] sticky top-8">
              <h3 className="text-xl font-black text-slate-900 mb-6">Add New Admin</h3>
              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">Full Name</label>
                  <input type="text" value={newAdmin.name} onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} placeholder="Full name" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">Email</label>
                  <input type="email" value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} placeholder="admin@email.com" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">Password</label>
                  <input type="password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} placeholder="••••••••" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all font-mono" />
                </div>
                <button disabled={isSaving} className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all mt-4 uppercase tracking-widest">
                  {isSaving ? "Creating..." : "Create Account"}
                </button>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-xl font-black text-slate-900 mb-6 px-2">Authorized Personnel</h3>
            {isLoading ? (
               <div className="p-20 flex justify-center bg-white rounded-[2.5rem] border border-slate-50 shadow-sm">
                  <div className="w-10 h-10 border-4 border-slate-100 border-t-primary rounded-full animate-spin" />
               </div>
            ) : (
               <div className="space-y-4">
                  {admins.map(admin => (
                    <Card key={admin.id} className="p-6 bg-white border border-slate-100 flex items-center justify-between group rounded-[2rem] hover:shadow-xl hover:shadow-slate-100 transition-all">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shadow-sm">
                             {admin.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                             <p className="font-black text-slate-900 tracking-tight">{admin.name}</p>
                             <p className="text-xs text-slate-400 font-bold">{admin.email}</p>
                          </div>
                       </div>
                       <button onClick={() => handleDeleteAdmin(admin.id, admin.email)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                          <Icons.Trash size={18} />
                       </button>
                    </Card>
                  ))}
                  {admins.length === 0 && (
                    <div className="p-20 text-center bg-white rounded-[2.5rem] border border-slate-50 shadow-inner">
                       <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mx-auto mb-4">
                          <Icons.User size={28} />
                       </div>
                       <p className="text-sm font-black text-slate-400">No authorized personnel found.</p>
                       <p className="text-xs text-slate-300 font-medium mt-1">Add a new admin using the form on the left.</p>
                    </div>
                  )}
               </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Business & Operations */}
          <section className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-xl shadow-slate-200/20">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                <Icons.Settings size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Business & Operations</h2>
                <p className="text-sm text-slate-400 font-medium">Core platform status and search configuration</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Platform Status</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-3xl">
                   <button 
                     onClick={() => updateLocalSetting("is_open", "true")}
                     className={`py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${getSetting("is_open") === "true" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400"}`}
                   >
                     Online
                   </button>
                   <button 
                     onClick={() => updateLocalSetting("is_open", "false")}
                     className={`py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${getSetting("is_open") === "false" ? "bg-white text-rose-600 shadow-sm" : "text-slate-400"}`}
                   >
                     Offline
                   </button>
                </div>
                <p className="text-[10px] text-slate-400 font-medium px-2 italic">
                   {getSetting("is_open") === "true" ? "🟢 Live: Platform is currently accepting new orders." : "🔴 Maintenance: Booking is disabled for all users."}
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Default Service Radius (km)</label>
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-200/50 rounded-xl flex items-center justify-center text-slate-500">
                    <Icons.MapPin size={20} />
                  </div>
                  <input 
                    type="number" 
                    className="w-full bg-slate-50 border-none rounded-[1.75rem] pl-20 pr-6 py-5 text-xl text-slate-900 font-black focus:ring-4 focus:ring-primary/10 transition-all"
                    placeholder="5"
                    value={getSetting("radius_km")}
                    onChange={(e) => updateLocalSetting("radius_km", e.target.value)}
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-sm uppercase">KM</div>
                </div>
              </div>
            </div>
          </section>

          {/* Financial Engine & GP Formula */}
          <section className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-[100px] -mr-32 -mt-32" />
            
            <div className="flex items-center gap-4 mb-10 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                <Icons.Wallet size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Financial Engine</h2>
                <p className="text-sm text-slate-400 font-medium">Configure GP splits and minimum order rules</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 mb-10">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Store GP (%)</label>
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-600 font-black text-lg">%</div>
                  <input 
                    type="number" 
                    className="w-full bg-indigo-50/30 border-none rounded-[1.5rem] pl-14 pr-6 py-5 text-2xl text-slate-900 font-black focus:ring-4 focus:ring-indigo-100"
                    placeholder="20"
                    value={getSetting("gp_store_percent")}
                    onChange={(e) => updateLocalSetting("gp_store_percent", e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium px-1 italic">Hired from Store laundry sales</p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Rider GP (%)</label>
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-orange-600 font-black text-lg">%</div>
                  <input 
                    type="number" 
                    className="w-full bg-orange-50/30 border-none rounded-[1.5rem] pl-14 pr-6 py-5 text-2xl text-slate-900 font-black focus:ring-4 focus:ring-orange-100"
                    placeholder="10"
                    value={getSetting("gp_rider_percent")}
                    onChange={(e) => updateLocalSetting("gp_rider_percent", e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium px-1 italic">Hired from Rider delivery fees</p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Rider Base Payout (฿)</label>
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-lg">฿</div>
                  <input 
                    type="number" 
                    className="w-full bg-emerald-50/30 border-none rounded-[1.5rem] pl-14 pr-6 py-5 text-2xl text-slate-900 font-black focus:ring-4 focus:ring-emerald-100"
                    placeholder="25"
                    value={getSetting("rider_base_payout")}
                    onChange={(e) => updateLocalSetting("rider_base_payout", e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium px-1 italic">Fixed initial pay per order</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 pt-10 border-t border-slate-50">
               <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Minimum Order Amount (฿)</label>
                  <div className="relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-200/50 rounded-xl flex items-center justify-center text-slate-400">
                      <Icons.Payment size={20} />
                    </div>
                    <input 
                      type="number" 
                      className="w-full bg-slate-50 border-none rounded-[1.75rem] pl-20 pr-6 py-5 text-xl text-slate-900 font-black focus:ring-4 focus:ring-primary/10"
                      placeholder="0"
                      value={getSetting("min_order_amount")}
                      onChange={(e) => updateLocalSetting("min_order_amount", e.target.value)}
                    />
                  </div>
               </div>

               <div className="bg-slate-50 rounded-[1.75rem] p-6 flex flex-col justify-center border border-slate-100">
                  <div className="flex items-baseline gap-1.5 mb-2">
                     <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Formula:</span>
                     <p className="text-xs text-slate-500 font-bold uppercase">Revenue Distribution</p>
                  </div>
                  <p className="text-sm font-black text-slate-900 tracking-tight leading-relaxed">
                     Admin = (Laundry × {getSetting("gp_store_percent") || 20}%) + (Delivery × {getSetting("gp_rider_percent") || 10}%)
                  </p>
               </div>
            </div>
          </section>

          {/* LINE API Integration */}
          <section className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] -mr-48 -mt-48" />
            
            <div className="flex items-center justify-between mb-12 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-3xl flex items-center justify-center shadow-inner">
                  <Icons.Chat size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">LINE Messaging API</h2>
                  <p className="text-slate-400 font-medium">Integration for Regular & Support channels</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
              {/* Regular */}
              <div className="space-y-6">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                  Regular Channel
                </h4>
                <div className="space-y-4">
                  <input type="password" value={getSetting("line_secret_regular")} onChange={(e) => updateLocalSetting("line_secret_regular", e.target.value)} placeholder="Channel Secret" className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-slate-200 focus:border-emerald-500/50 outline-none transition-all" />
                  <textarea rows={3} value={getSetting("line_token_regular")} onChange={(e) => updateLocalSetting("line_token_regular", e.target.value)} placeholder="Access Token" className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-slate-400 focus:border-emerald-500/50 outline-none transition-all resize-none font-mono" />
                </div>
              </div>
              {/* Help */}
              <div className="space-y-6">
                <h4 className="text-xs font-black text-rose-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.5)]" />
                  Support Channel
                </h4>
                <div className="space-y-4">
                  <input type="password" value={getSetting("line_secret_help")} onChange={(e) => updateLocalSetting("line_secret_help", e.target.value)} placeholder="Channel Secret" className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-slate-200 focus:border-rose-500/50 outline-none transition-all" />
                  <textarea rows={3} value={getSetting("line_token_help")} onChange={(e) => updateLocalSetting("line_token_help", e.target.value)} placeholder="Access Token" className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-slate-400 focus:border-rose-500/50 outline-none transition-all resize-none font-mono" />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Floating Save Bar - Sticky Action Footer */}
      <div className={`fixed bottom-8 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:right-auto z-50 transition-all duration-500 ${hasChanges ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-95 pointer-events-none'}`}>
          <div className="bg-slate-900 border border-white/10 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.6)] rounded-[2rem] md:rounded-full px-4 md:px-5 py-3 md:py-4 flex flex-col md:flex-row items-center gap-4 md:gap-8 backdrop-blur-2xl">
             <div className="flex items-center gap-3 md:pl-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-400 rounded-xl md:rounded-2xl flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(251,191,36,0.3)] shrink-0">
                   <Icons.Settings size={20} className="text-slate-900" />
                </div>
                <div className="md:pr-6 md:border-r md:border-white/10">
                   <p className="text-[10px] md:text-[11px] font-black text-white uppercase tracking-widest leading-none">Unsaved Updates</p>
                   <p className="hidden md:block text-[9px] font-medium text-slate-400 mt-2">New GP formula ready to deploy</p>
                </div>
             </div>
             
             <button 
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="bg-primary text-white h-12 md:h-14 px-8 md:px-12 rounded-xl md:rounded-[1.25rem] font-black text-xs md:text-sm shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group w-full md:w-auto"
             >
                {isSaving ? (
                  <Icons.Refresh size={18} className="animate-spin" />
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="uppercase tracking-widest text-[10px] md:text-sm">บันทึกทั้งหมด</span>
                    <Icons.ArrowRight size={16} className="group-hover:translate-x-1.5 transition-transform" />
                  </div>
                )}
             </button>
          </div>
      </div>
    </div>
  );
}
