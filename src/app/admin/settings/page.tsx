"use client";

import { useState, useEffect } from "react";
import { Icons } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";

export default function SettingsAdminPage() {
  const [activeTab, setActiveTab] = useState<"admins" | "system">("admins");
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
      const data = await res.json();
      if (res.ok) {
        setSuccess("Admin created successfully!");
        setNewAdmin({ name: "", email: "", password: "", role: "admin" });
        fetchAdmins();
        setTimeout(() => setSuccess(""), 3000);
      } else {
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
          settingsMap[s.key] = s.type === 'number' ? Number(s.value) : s.value;
        });
        setLocalSettings(settingsMap);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  }

  const handleUpdateLocalSetting = (key: string, value: any) => {
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
      } else {
        setError("Failed to save settings.");
      }
    } catch (err) {
      setError("Connection error while saving settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const getSetting = (key: string) => localSettings[key];

  return (
    <div className="space-y-8 max-w-5xl pb-40">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Settings</h1>
          <p className="text-slate-500 font-medium tracking-tight">Manage application configuration and authorized personnel</p>
        </div>
        <div className="flex gap-2">
           <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-300 border border-slate-100 italic font-black text-xs shadow-sm">
             V1
           </div>
        </div>
      </header>
      
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab("admins")}
          className={`px-8 py-5 text-sm font-black border-b-2 transition-all ${activeTab === 'admins' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Admin Management
        </button>
        <button 
          onClick={() => setActiveTab("system")}
          className={`px-8 py-5 text-sm font-black border-b-2 transition-all ${activeTab === 'system' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Application Settings
        </button>
      </div>

      {(error || success) && (
        <div className={`p-5 rounded-[2rem] font-bold text-sm animate-fade-in flex items-center gap-3 ${error ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${error ? 'bg-rose-100' : 'bg-emerald-100'}`}>
             {error ? <Icons.Close size={16} /> : <Icons.Check size={16} />}
          </div>
          {error || success}
        </div>
      )}

      {activeTab === "admins" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Form */}
          <div className="lg:col-span-1">
            <Card className="p-8 bg-white border border-slate-200/60 shadow-xl overflow-hidden sticky top-8 rounded-[2.5rem]">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
                <Icons.User size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Add New Admin</h3>
              <p className="text-xs text-slate-400 font-medium mb-6">Authorize a new team member to access this portal.</p>
              
              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 block ml-1">Full Name</label>
                  <input 
                    type="text" 
                    value={newAdmin.name}
                    onChange={e => setNewAdmin({...newAdmin, name: e.target.value})}
                    placeholder="e.g. Somchai RUBJOB"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 block ml-1">Email Address</label>
                  <input 
                    type="email" 
                    value={newAdmin.email}
                    onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                    placeholder="admin@rubjob.com"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 block ml-1">Password</label>
                  <input 
                    type="password" 
                    value={newAdmin.password}
                    onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>

                <button 
                  disabled={isSaving}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-4 uppercase tracking-widest"
                >
                  {isSaving ? "Creating..." : "Create Account"}
                </button>
              </form>
            </Card>
          </div>

          {/* Admin List */}
          <div className="lg:col-span-2">
            <Card className="bg-white border border-slate-200/60 shadow-sm overflow-hidden rounded-[2.5rem]">
               <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-slate-900 text-lg">Authorized Personnel</h3>
                    <p className="text-xs text-slate-400 font-medium">Manage team members and roles</p>
                  </div>
                  <button onClick={fetchAdmins} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 transition-colors bg-slate-50/50">
                    <Icons.Refresh size={20} />
                  </button>
               </div>
               {isLoading ? (
                  <div className="p-20 flex justify-center"><div className="w-10 h-10 border-4 border-slate-100 border-t-primary rounded-full animate-spin" /></div>
               ) : (
                  <div className="divide-y divide-slate-50">
                    {admins.map(admin => (
                      <div key={admin.id} className="p-8 flex items-center justify-between hover:bg-slate-50/30 transition-colors group">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-[1.25rem] bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-black shadow-sm group-hover:scale-105 transition-transform">
                            {admin.name?.[0]?.toUpperCase() || 'A'}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 tracking-tight">{admin.name}</p>
                            <p className="text-xs text-slate-500 font-bold">{admin.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] ${admin.role === 'super_admin' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'bg-slate-100 text-slate-600'}`}>
                            {admin.role}
                          </div>
                          <button 
                            onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                            className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Icons.Trash size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {admins.length === 0 && <div className="p-20 text-center text-slate-400 font-bold bg-slate-50/30">No admins found in database.</div>}
                  </div>
               )}
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
          {/* Platform Status */}
          <Card className="p-10 bg-white border border-slate-200/60 shadow-xl rounded-[2.5rem]">
            <div className="flex items-center justify-between mb-8">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                <Icons.Settings size={32} />
              </div>
              <button 
                onClick={() => handleUpdateLocalSetting('is_open', getSetting('is_open') === 'true' ? 'false' : 'true')}
                className={`w-16 h-8 rounded-full relative transition-all duration-300 ${getSetting('is_open') === 'true' ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ${getSetting('is_open') === 'true' ? 'left-9' : 'left-1'}`} />
              </button>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Operation Status</h3>
            <p className="text-sm text-slate-500 mt-2 font-medium leading-relaxed">Global control for platform accessibility. Turning this off prevents all users from creating new orders.</p>
            <div className={`mt-8 inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest ${getSetting('is_open') === 'true' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
              <div className={`w-2 h-2 rounded-full ${getSetting('is_open') === 'true' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              Platform is currently {getSetting('is_open') === 'true' ? 'Active' : 'Offline'}
            </div>
          </Card>

          {/* Business Configuration */}
          <Card className="p-10 bg-white border border-slate-200/60 shadow-xl rounded-[2.5rem] md:row-span-2">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-inner">
              <Icons.Finance size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Financial Engine</h3>
            <p className="text-sm text-slate-500 mt-2 mb-10 font-medium leading-relaxed">Control the economics of your platform, including commission rates and order floor limits.</p>
            
            <div className="space-y-10">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Platform Commission</label>
                   <div className="text-3xl font-black text-indigo-600 font-mono tracking-tighter">
                     {getSetting('commission_rate')}<span className="text-sm ml-0.5 text-slate-400">%</span>
                   </div>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={getSetting('commission_rate') || 15}
                  onChange={(e) => handleUpdateLocalSetting('commission_rate', Number(e.target.value))}
                  className="w-full h-2.5 appearance-none bg-slate-100 rounded-lg cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[9px] font-black text-slate-300 uppercase tracking-widest">
                   <span>0% (Free)</span>
                   <span>50% (Max)</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-10 border-t border-slate-50">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Order Minimum Amount</label>
                 <div className="relative">
                   <input 
                    type="number"
                    value={getSetting('min_order_amount') || 0}
                    onChange={(e) => handleUpdateLocalSetting('min_order_amount', Number(e.target.value))}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-2xl font-black text-slate-700 transition-all focus:outline-none focus:border-indigo-200 focus:ring-8 focus:ring-indigo-50/50"
                   />
                   <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-sm tracking-widest">THB</div>
                 </div>
                 <p className="text-[10px] text-slate-400 font-medium italic mt-2 px-2">Customers cannot checkout if total is below this value.</p>
              </div>
            </div>
          </Card>

          {/* Delivery Configuration */}
          <Card className="p-10 bg-white border border-slate-200/60 shadow-xl rounded-[2.5rem]">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-inner">
              <Icons.Truck size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Logistics Rules</h3>
            <p className="text-sm text-slate-500 mt-2 mb-10 font-medium leading-relaxed">Set standard delivery radius and base fees for all partner stores on the platform.</p>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-2">Service Radius</label>
                 <div className="relative">
                   <input 
                    type="number"
                    value={getSetting('radius_km') || 5}
                    onChange={(e) => handleUpdateLocalSetting('radius_km', Number(e.target.value))}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-lg font-black text-slate-700 focus:border-amber-500/30 transition-all outline-none"
                   />
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">KM</div>
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-2">Base Delivery Fee</label>
                 <div className="relative">
                   <input 
                    type="number"
                    value={getSetting('delivery_fee_base') || 0}
                    onChange={(e) => handleUpdateLocalSetting('delivery_fee_base', Number(e.target.value))}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-lg font-black text-slate-700 focus:border-amber-500/30 transition-all outline-none"
                   />
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase font-mono">฿</div>
                 </div>
              </div>
            </div>
          </Card>

          {/* LINE API Integration */}
          <Card className="p-12 bg-slate-900 border border-slate-800 shadow-2xl rounded-[3rem] md:col-span-2 overflow-hidden relative">
            {/* Background elements for premium feel */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[100px] -ml-32 -mb-32" />

            <div className="flex items-center justify-between mb-10 relative z-10">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                <Icons.Chat size={32} />
              </div>
              <div className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">
                Messaging Integration System
              </div>
            </div>
            
            <h3 className="text-3xl font-black text-white tracking-tight relative z-10">Integration Keys</h3>
            <p className="text-base text-slate-400 mt-3 mb-12 font-medium leading-relaxed max-w-2xl relative z-10">
              Provide necessary credentials for your LINE Official Accounts. These keys enable secure two-way communication with your customers.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
              {/* Regular Channel */}
              <div className="space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                     <Icons.Check size={20} />
                  </div>
                  <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">Regular LINE (Client)</h4>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block ml-1">Channel Secret</label>
                    <input 
                      type="password"
                      value={getSetting('line_secret_regular') || ''}
                      onChange={(e) => handleUpdateLocalSetting('line_secret_regular', e.target.value)}
                      placeholder="Paste channel secret here"
                      className="w-full bg-white/[0.03] border-2 border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-slate-300 focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block ml-1">Access Token</label>
                    <textarea 
                      rows={3}
                      value={getSetting('line_token_regular') || ''}
                      onChange={(e) => handleUpdateLocalSetting('line_token_regular', e.target.value)}
                      placeholder="Paste long access token here..."
                      className="w-full bg-white/[0.03] border-2 border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-slate-300 focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all outline-none resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Help Channel */}
              <div className="space-y-8">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-500 border border-rose-500/20">
                      <Icons.Info size={20} />
                   </div>
                   <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">Help & Support LINE</h4>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block ml-1">Channel Secret</label>
                    <input 
                      type="password"
                      value={getSetting('line_secret_help') || ''}
                      onChange={(e) => handleUpdateLocalSetting('line_secret_help', e.target.value)}
                      placeholder="Paste channel secret here"
                      className="w-full bg-white/[0.03] border-2 border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-slate-300 focus:border-rose-500/50 focus:bg-white/[0.05] transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block ml-1">Access Token</label>
                    <textarea 
                      rows={3}
                      value={getSetting('line_token_help') || ''}
                      onChange={(e) => handleUpdateLocalSetting('line_token_help', e.target.value)}
                      placeholder="Paste long access token here..."
                      className="w-full bg-white/[0.03] border-2 border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-slate-300 focus:border-rose-500/50 focus:bg-white/[0.05] transition-all outline-none resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Floating Save Bar - Sticky Action Footer */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${hasChanges ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-95 pointer-events-none'}`}>
          <div className="bg-slate-900 border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] rounded-full px-4 py-3 flex items-center gap-6 backdrop-blur-xl">
             <div className="flex items-center gap-3 pl-4">
                <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(251,191,36,0.5)]">
                   <Icons.Settings size={18} className="text-slate-900" />
                </div>
                <div className="pr-4 border-r border-white/10">
                   <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Unsaved Changes Detected</p>
                   <p className="text-[9px] font-medium text-slate-400 mt-1">Please review and save your updates</p>
                </div>
             </div>
             
             <button 
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="bg-primary text-white h-12 px-10 rounded-full font-black text-sm shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group"
             >
                {isSaving ? (
                  <Icons.Refresh size={18} className="animate-spin" />
                ) : (
                  <div className="flex items-center gap-2">
                    <span>บันทึกการเปลี่ยนแปลงทั้งหมด</span>
                    <Icons.ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
             </button>
          </div>
      </div>
    </div>
  );
}
