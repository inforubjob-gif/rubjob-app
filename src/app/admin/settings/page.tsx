  // System Settings State
  const [systemSettings, setSystemSettings] = useState<any[]>([]);
  const [localSettings, setLocalSettings] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchAdmins();
    fetchSettings();
  }, []);

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
    <div className="space-y-8 max-w-5xl pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Settings</h1>
          <p className="text-slate-500 font-medium">Manage authorized personnel and application configuration</p>
        </div>
        {hasChanges && (
          <button 
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="bg-primary text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 animate-slide-up"
          >
            {isSaving ? <Icons.Refresh size={18} className="animate-spin" /> : <Icons.Settings size={18} />}
            Save All Changes
          </button>
        )}
      </header>
      
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab("admins")}
          className={`px-6 py-4 text-sm font-black border-b-2 transition-all ${activeTab === 'admins' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Admin Management
        </button>
        <button 
          onClick={() => setActiveTab("system")}
          className={`px-6 py-4 text-sm font-black border-b-2 transition-all ${activeTab === 'system' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Application Settings
        </button>
      </div>

      {(error || success) && (
        <div className={`p-4 rounded-2xl font-bold text-sm animate-fade-in ${error ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
          {error || success}
        </div>
      )}

      {activeTab === "admins" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Form */}
          <div className="lg:col-span-1">
            <Card className="p-8 bg-white border border-slate-200/60 shadow-xl overflow-hidden sticky top-8 rounded-[2.5rem]">
              <h3 className="text-xl font-black text-slate-900 mb-6">Add New Admin</h3>
              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 block ml-1">Full Name</label>
                  <input 
                    type="text" 
                    value={newAdmin.name}
                    onChange={e => setNewAdmin({...newAdmin, name: e.target.value})}
                    placeholder="Admin Name"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 block ml-1">Email Address</label>
                  <input 
                    type="email" 
                    value={newAdmin.email}
                    onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                    placeholder="admin@example.com"
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
            <div className="mt-4 flex items-center gap-2 px-4">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                Note: Database settings prioritize server context.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
          {/* Platform Status */}
          <Card className="p-8 bg-white border border-slate-200/60 shadow-xl rounded-[2.5rem]">
            <div className="flex items-center justify-between mb-8">
              <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-[1.25rem] flex items-center justify-center shadow-inner">
                <Icons.Settings size={28} />
              </div>
              <button 
                onClick={() => handleUpdateLocalSetting('is_open', getSetting('is_open') === 'true' ? 'false' : 'true')}
                className={`w-16 h-8 rounded-full relative transition-all duration-300 ${getSetting('is_open') === 'true' ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ${getSetting('is_open') === 'true' ? 'left-9' : 'left-1'}`} />
              </button>
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Operation Status</h3>
            <p className="text-sm text-slate-500 mt-2 font-medium">Control the availability of the RUBJOB platform for all users.</p>
            <div className={`mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${getSetting('is_open') === 'true' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              Platform is currently {getSetting('is_open') === 'true' ? 'Open' : 'Closed'}
            </div>
          </Card>

          {/* Business Configuration */}
          <Card className="p-8 bg-white border border-slate-200/60 shadow-xl rounded-[2.5rem] md:row-span-2">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-[1.25rem] flex items-center justify-center mb-8 shadow-inner">
              <Icons.Finance size={28} />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Financial & Rules</h3>
            <p className="text-sm text-slate-500 mt-2 mb-8 font-medium">Configure commission rates and order minimums.</p>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between ml-1 mb-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform Commission (%)</label>
                   <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{getSetting('commission_rate')}%</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={getSetting('commission_rate') || 15}
                  onChange={(e) => handleUpdateLocalSetting('commission_rate', e.target.value)}
                  className="w-full h-8 appearance-none bg-transparent cursor-pointer accent-indigo-500"
                />
                <p className="text-[10px] text-slate-400 font-medium italic mt-1">
                  Commission taken from each laundry or helper service order.
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-50">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Minimum Order Amount (฿)</label>
                 <div className="relative">
                   <input 
                    type="number"
                    value={getSetting('min_order_amount') || 0}
                    onChange={(e) => handleUpdateLocalSetting('min_order_amount', e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-lg font-black text-slate-700 transition-all focus:outline-none focus:border-indigo-200 focus:ring-4 focus:ring-indigo-50"
                   />
                   <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 font-black">THB</div>
                 </div>
              </div>
            </div>
          </Card>

          {/* Delivery Configuration */}
          <Card className="p-8 bg-white border border-slate-200/60 shadow-xl rounded-[2.5rem]">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-[1.25rem] flex items-center justify-center mb-8 shadow-inner">
              <Icons.Settings size={28} />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Delivery Defaults</h3>
            <p className="text-sm text-slate-500 mt-2 mb-8 font-medium">Set fallback values for store range and fees.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Radius (Km)</label>
                 <input 
                  type="number"
                  value={getSetting('radius_km') || 5}
                  onChange={(e) => handleUpdateLocalSetting('radius_km', e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-black text-slate-700"
                 />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Base Fee (฿)</label>
                 <input 
                  type="number"
                  value={getSetting('delivery_fee_base') || 0}
                  onChange={(e) => handleUpdateLocalSetting('delivery_fee_base', e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-black text-slate-700"
                 />
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
