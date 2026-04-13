"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import { Icons } from "@/components/ui/Icons";

export default function SettingsAdminPage() {
  const [activeTab, setActiveTab] = useState<"admins" | "system">("admins");
  const [admins, setAdmins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State for New Admin
  const [newAdmin, setNewAdmin] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/admins");
      const data = await res.json();
      if (data.admins) setAdmins(data.admins);
    } catch (err) {
      console.error("Failed to fetch admins:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!newAdmin.email || !newAdmin.password) {
      setError("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAdmin),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("เพิ่มแอดมินใหม่เรียบร้อยแล้ว");
        setNewAdmin({ email: "", password: "", name: "" });
        fetchAdmins();
      } else {
        setError(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      setError("การเชื่อมต่อล้มเหลว");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAdmin = async (id: string, email: string) => {
    if (!confirm(`คุณต้องการลบสิทธิ์แอดมินของ ${email} ใช่หรือไม่?`)) return;
    
    try {
      const res = await fetch("/api/admin/admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setAdmins(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      alert("ลบไม่สำเร็จ");
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <header>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-slate-500 font-medium">Manage authorized personnel and application configuration</p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab("admins")}
          className={`px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'admins' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Admin Management
        </button>
        <button 
          onClick={() => setActiveTab("system")}
          className={`px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'system' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Application Settings
        </button>
      </div>

      {activeTab === "admins" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Form */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-white border border-slate-200/60 shadow-xl overflow-hidden sticky top-8">
              <h3 className="text-lg font-black text-slate-900 mb-6">Add New Admin</h3>
              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1.5">Full Name</label>
                  <input 
                    type="text" 
                    value={newAdmin.name}
                    onChange={e => setNewAdmin({...newAdmin, name: e.target.value})}
                    placeholder="Admin Name"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1.5">Email Address</label>
                  <input 
                    type="email" 
                    value={newAdmin.email}
                    onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                    placeholder="admin@example.com"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1.5">Password</label>
                  <input 
                    type="password" 
                    value={newAdmin.password}
                    onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>

                {error && <p className="text-xs text-rose-500 font-bold bg-rose-50 p-3 rounded-lg">{error}</p>}
                {success && <p className="text-xs text-emerald-500 font-bold bg-emerald-50 p-3 rounded-lg">{success}</p>}

                <button 
                  disabled={isSaving}
                  className="w-full bg-primary text-white py-3 rounded-xl font-black text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSaving ? "Creating..." : "Create Admin Account"}
                </button>
              </form>
            </Card>
          </div>

          {/* Admin List */}
          <div className="lg:col-span-2">
            <Card className="bg-white border border-slate-200/60 shadow-sm overflow-hidden">
               <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-black text-slate-900">Authorized Personnel</h3>
                  <button onClick={fetchAdmins} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
                    <Icons.Refresh size={18} />
                  </button>
               </div>
               {isLoading ? (
                  <div className="p-20 flex justify-center"><div className="w-8 h-8 border-4 border-slate-100 border-t-primary rounded-full animate-spin" /></div>
               ) : (
                  <div className="divide-y divide-slate-50">
                    {admins.map(admin => (
                      <div key={admin.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                            {admin.name?.[0]?.toUpperCase() || 'A'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{admin.name}</p>
                            <p className="text-xs text-slate-500 font-medium">{admin.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${admin.role === 'super_admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                            {admin.role}
                          </div>
                          <button 
                            onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Icons.Trash size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {admins.length === 0 && <div className="p-10 text-center text-slate-400 font-bold">No admins found in database.</div>}
                  </div>
               )}
            </Card>
            <p className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest px-2">
              Note: Database admins take priority over environment variables.
            </p>
          </div>
        </div>
      ) : (
        <Card className="p-10 text-center bg-white border border-slate-200/60 shadow-sm">
           <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
              <Icons.Settings size={40} />
           </div>
           <h3 className="text-xl font-black text-slate-900 mb-2">Application Settings</h3>
           <p className="text-slate-500 max-w-md mx-auto mb-8 font-medium">Configure global parameters like the store radius fallback, commission rates, and business operating status.</p>
           <button className="bg-slate-100 text-slate-400 px-8 py-3 rounded-xl font-bold text-sm cursor-not-allowed">
              Coming Soon
           </button>
        </Card>
      )}
    </div>
  );
}
